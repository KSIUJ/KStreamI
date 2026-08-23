import asyncio
import json
from typing import Any

import pytest
import pytest_asyncio
from fastapi import WebSocketDisconnect

from app.api import signaling
from app.core.session import Session, SessionState


DISCONNECT = object()
MESSAGE_TIMEOUT_SECONDS = 0.5


class FakeWebSocket:
    def __init__(self) -> None:
        self.incoming: asyncio.Queue[str | object] = asyncio.Queue()
        self.outgoing: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self.accepted = False
        self.closeCode: int | None = None
        self.handlerTask: asyncio.Task | None = None

    async def accept(self) -> None:
        self.accepted = True

    async def receive_text(self) -> str:
        message = await self.incoming.get()
        if message is DISCONNECT:
            raise WebSocketDisconnect(code=1000)
        assert isinstance(message, str)
        return message

    async def send_json(self, message: dict[str, Any]) -> None:
        await self.outgoing.put(message)

    async def close(self, code: int = 1000) -> None:
        self.closeCode = code

    async def clientSend(self, message: dict[str, Any]) -> None:
        await self.incoming.put(json.dumps(message))

    async def clientSendRaw(self, message: str) -> None:
        await self.incoming.put(message)

    async def disconnect(self) -> None:
        await self.incoming.put(DISCONNECT)

    async def nextMessage(
        self, timeout: float = MESSAGE_TIMEOUT_SECONDS
    ) -> dict[str, Any]:
        return await asyncio.wait_for(self.outgoing.get(), timeout)

    def drainMessages(self) -> list[dict[str, Any]]:
        messages = []
        while not self.outgoing.empty():
            messages.append(self.outgoing.get_nowait())
        return messages

    def pendingMessages(self) -> list[dict[str, Any]]:
        return list(self.outgoing._queue)


class FailingWebSocket:
    async def send_json(self, _message: dict[str, Any]) -> None:
        raise RuntimeError("peer already disconnected")


@pytest.mark.asyncio
class TestSignaling:
    @pytest_asyncio.fixture(autouse=True)
    async def isolateSession(self):
        self.originalSession = signaling.session
        self.originalPendingTimeout = signaling.PENDING_TIMEOUT_SECONDS
        signaling.session = Session()
        self.handlerTasks: list[asyncio.Task] = []

        yield

        signaling.session.resetIdle()
        for task in self.handlerTasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*self.handlerTasks, return_exceptions=True)
        signaling.session = self.originalSession
        signaling.PENDING_TIMEOUT_SECONDS = self.originalPendingTimeout

    async def startReceiver(
        self,
    ) -> tuple[FakeWebSocket, dict[str, Any], dict[str, Any]]:
        websocket = FakeWebSocket()
        task = asyncio.create_task(signaling.ws_rec(websocket))
        websocket.handlerTask = task
        self.handlerTasks.append(task)

        hello = await self.assertMessageType(websocket, "SERVER_HELLO")
        clients = await self.assertMessageType(websocket, "CLIENT_LIST_UPDATE")
        assert websocket.accepted
        return websocket, hello, clients

    async def startSender(
        self,
    ) -> tuple[FakeWebSocket, dict[str, Any]]:
        websocket = FakeWebSocket()
        task = asyncio.create_task(signaling.ws_sender(websocket))
        websocket.handlerTask = task
        self.handlerTasks.append(task)

        hello = await self.assertMessageType(websocket, "SERVER_HELLO")
        assert websocket.accepted
        return websocket, hello

    async def joinSender(
        self,
        sender: FakeWebSocket,
        receiver: FakeWebSocket,
        joinCode: str,
        clientName: str,
    ) -> dict[str, Any]:
        await sender.clientSend(
            {
                "type": "JOIN_REQUEST",
                "payload": {"joinCode": joinCode, "clientName": clientName},
            }
        )
        response = await self.assertMessageType(sender, "JOIN_RESPONSE")
        assert response["payload"]["success"]
        await self.assertMessageType(receiver, "CLIENT_LIST_UPDATE")
        return response

    async def assertMessageType(
        self, websocket: FakeWebSocket, expectedType: str
    ) -> dict[str, Any]:
        message = await websocket.nextMessage()
        assert message["type"] == expectedType, message
        return message

    async def waitUntil(self, predicate, timeout: float = MESSAGE_TIMEOUT_SECONDS) -> None:
        deadline = asyncio.get_running_loop().time() + timeout
        while not predicate():
            if asyncio.get_running_loop().time() >= deadline:
                pytest.fail("Timed out waiting for signaling messages")
            await asyncio.sleep(0.001)

    async def test_malformed_messages_do_not_stop_sender_handler(self) -> None:
        receiver, receiverHello, _ = await self.startReceiver()
        sender, _ = await self.startSender()
        malformedMessages = [
            "{",
            json.dumps({"type": "JOIN_REQUEST", "payload": []}),
            json.dumps({"type": "OFFER", "payload": None}),
            json.dumps({"type": [], "payload": {}}),
        ]

        for malformedMessage in malformedMessages:
            await sender.clientSendRaw(malformedMessage)
            error = await self.assertMessageType(sender, "ERROR")
            assert error["payload"]["code"] == "MALFORMED_ENVELOPE"

        assert sender.handlerTask is not None
        assert not sender.handlerTask.done()
        await self.joinSender(
            sender,
            receiver,
            receiverHello["payload"]["joinCode"],
            "Sender",
        )

    async def test_second_receiver_is_rejected_without_replacing_first(self) -> None:
        receiver, receiverHello, _ = await self.startReceiver()
        secondReceiver = FakeWebSocket()
        task = asyncio.create_task(signaling.ws_rec(secondReceiver))
        secondReceiver.handlerTask = task
        self.handlerTasks.append(task)

        error = await self.assertMessageType(secondReceiver, "ERROR")
        assert error["payload"] == {
            "code": "INVALID_STATE",
            "message": "Receiver already connected.",
        }
        await asyncio.wait_for(task, MESSAGE_TIMEOUT_SECONDS)

        assert secondReceiver.accepted
        assert secondReceiver.closeCode == 1008
        assert signaling.session.wsRec is receiver
        assert receiver.handlerTask is not None
        assert not receiver.handlerTask.done()

        sender, _ = await self.startSender()
        await self.joinSender(
            sender,
            receiver,
            receiverHello["payload"]["joinCode"],
            "Sender",
        )

    async def test_full_casting_flow_can_switch_senders_and_restart(self) -> None:
        receiver, receiverHello, _ = await self.startReceiver()
        joinCode = receiverHello["payload"]["joinCode"]

        senderA, senderAHello = await self.startSender()
        senderB, senderBHello = await self.startSender()
        senderAId = senderAHello["payload"]["clientId"]
        senderBId = senderBHello["payload"]["clientId"]
        await self.joinSender(senderA, receiver, joinCode, "Sender A")
        await self.joinSender(senderB, receiver, joinCode, "Sender B")

        await senderA.clientSend(
            {"type": "OFFER", "payload": {"sdp": "offer-from-A"}}
        )
        offer = await self.assertMessageType(receiver, "OFFER")
        assert offer["payload"] == {"sdp": "offer-from-A", "clientId": senderAId}
        assert (await self.assertMessageType(senderA, "STATE_UPDATE"))["payload"]["isBusy"]
        assert (await self.assertMessageType(senderB, "STATE_UPDATE"))["payload"]["isBusy"]
        activeState = await self.assertMessageType(receiver, "STATE_UPDATE")
        assert activeState["payload"] == {"state": "ACTIVE", "activeClientId": senderAId}

        await receiver.clientSend(
            {"type": "ANSWER", "payload": {"sdp": "answer-for-A"}}
        )
        answer = await self.assertMessageType(senderA, "ANSWER")
        assert answer["payload"]["sdp"] == "answer-for-A"

        senderIce = {
            "candidate": "candidate-from-A",
            "sdpMid": "0",
            "sdpMLineIndex": 0,
        }
        await senderA.clientSend({"type": "ICE_CANDIDATE", "payload": senderIce})
        assert (
            await self.assertMessageType(receiver, "ICE_CANDIDATE")
        )["payload"] == senderIce

        receiverIce = {
            "candidate": "candidate-from-receiver",
            "sdpMid": "0",
            "sdpMLineIndex": 0,
        }
        await receiver.clientSend(
            {"type": "ICE_CANDIDATE", "payload": receiverIce}
        )
        assert (
            await self.assertMessageType(senderA, "ICE_CANDIDATE")
        )["payload"] == receiverIce

        await receiver.clientSend({"type": "STOP_CASTING", "payload": {}})
        await self.assertMessageType(senderA, "STOP_CASTING")
        assert not (await self.assertMessageType(senderA, "STATE_UPDATE"))["payload"]["isBusy"]
        assert not (await self.assertMessageType(senderB, "STATE_UPDATE"))["payload"]["isBusy"]
        idleState = await self.assertMessageType(receiver, "STATE_UPDATE")
        assert idleState["payload"] == {"state": "IDLE", "activeClientId": None}

        await receiver.clientSend(
            {"type": "SELECT_CLIENT", "payload": {"clientId": senderBId}}
        )
        await self.assertMessageType(senderB, "CAST_REQUEST")
        assert (await self.assertMessageType(senderA, "STATE_UPDATE"))["payload"]["isBusy"]
        assert (await self.assertMessageType(senderB, "STATE_UPDATE"))["payload"]["isBusy"]
        pendingState = await self.assertMessageType(receiver, "STATE_UPDATE")
        assert pendingState["payload"] == {"state": "PENDING", "activeClientId": senderBId}

        await senderB.clientSend(
            {"type": "OFFER", "payload": {"sdp": "offer-from-B"}}
        )
        offer = await self.assertMessageType(receiver, "OFFER")
        assert offer["payload"] == {"sdp": "offer-from-B", "clientId": senderBId}
        activeState = await self.assertMessageType(receiver, "STATE_UPDATE")
        assert activeState["payload"] == {"state": "ACTIVE", "activeClientId": senderBId}

        await receiver.clientSend(
            {"type": "ANSWER", "payload": {"sdp": "answer-for-B"}}
        )
        await self.assertMessageType(senderB, "ANSWER")

        await senderB.clientSend({"type": "STOP_CASTING", "payload": {}})
        await self.assertMessageType(receiver, "STOP_CASTING")
        assert not (await self.assertMessageType(senderA, "STATE_UPDATE"))["payload"]["isBusy"]
        assert not (await self.assertMessageType(senderB, "STATE_UPDATE"))["payload"]["isBusy"]
        idleState = await self.assertMessageType(receiver, "STATE_UPDATE")
        assert idleState["payload"] == {"state": "IDLE", "activeClientId": None}
        assert signaling.session.state == SessionState.IDLE

    async def test_sender_can_reject_pending_request(self) -> None:
        receiver, receiverHello, _ = await self.startReceiver()
        sender, senderHello = await self.startSender()
        senderId = senderHello["payload"]["clientId"]
        await self.joinSender(
            sender, receiver, receiverHello["payload"]["joinCode"], "Sender"
        )

        await receiver.clientSend(
            {"type": "SELECT_CLIENT", "payload": {"clientId": senderId}}
        )
        await self.assertMessageType(sender, "CAST_REQUEST")
        await self.assertMessageType(sender, "STATE_UPDATE")
        await self.assertMessageType(receiver, "STATE_UPDATE")

        await sender.clientSend({"type": "STOP_CASTING", "payload": {}})
        state = await self.assertMessageType(sender, "STATE_UPDATE")
        assert not state["payload"]["isBusy"]
        state = await self.assertMessageType(receiver, "STATE_UPDATE")
        assert state["payload"] == {"state": "IDLE", "activeClientId": None}
        assert signaling.session.state == SessionState.IDLE

        await receiver.clientSend(
            {"type": "SELECT_CLIENT", "payload": {"clientId": senderId}}
        )
        await self.assertMessageType(sender, "CAST_REQUEST")

    async def test_pending_request_times_out(self) -> None:
        signaling.PENDING_TIMEOUT_SECONDS = 0.01
        receiver, receiverHello, _ = await self.startReceiver()
        sender, senderHello = await self.startSender()
        senderId = senderHello["payload"]["clientId"]
        await self.joinSender(
            sender, receiver, receiverHello["payload"]["joinCode"], "Sender"
        )

        await receiver.clientSend(
            {"type": "SELECT_CLIENT", "payload": {"clientId": senderId}}
        )
        await self.assertMessageType(sender, "CAST_REQUEST")
        assert (await self.assertMessageType(sender, "STATE_UPDATE"))["payload"]["isBusy"]
        assert (
            await self.assertMessageType(receiver, "STATE_UPDATE")
        )["payload"]["state"] == "PENDING"

        await self.assertMessageType(sender, "STOP_CASTING")
        assert not (await self.assertMessageType(sender, "STATE_UPDATE"))["payload"]["isBusy"]
        state = await self.assertMessageType(receiver, "STATE_UPDATE")
        assert state["payload"] == {"state": "IDLE", "activeClientId": None}
        assert signaling.session.state == SessionState.IDLE

    async def test_second_offer_is_rejected(self) -> None:
        receiver, receiverHello, _ = await self.startReceiver()
        senderA, senderAHello = await self.startSender()
        senderB, senderBHello = await self.startSender()
        joinCode = receiverHello["payload"]["joinCode"]
        await self.joinSender(senderA, receiver, joinCode, "Sender A")
        await self.joinSender(senderB, receiver, joinCode, "Sender B")

        await asyncio.gather(
            senderA.clientSend(
                {"type": "OFFER", "payload": {"sdp": "offer-from-A"}}
            ),
            senderB.clientSend(
                {"type": "OFFER", "payload": {"sdp": "offer-from-B"}}
            ),
        )

        await self.waitUntil(
            lambda: any(
                message["type"] == "ERROR"
                for message in senderA.pendingMessages()
                + senderB.pendingMessages()
            )
        )
        receiverMessages = receiver.drainMessages()
        senderMessages = senderA.drainMessages() + senderB.drainMessages()
        offers = [message for message in receiverMessages if message["type"] == "OFFER"]
        errors = [message for message in senderMessages if message["type"] == "ERROR"]

        assert len(offers) == 1, receiverMessages
        assert len(errors) == 1, senderMessages
        assert errors[0]["payload"]["code"] == "BUSY"
        assert signaling.session.state == SessionState.ACTIVE
        assert signaling.session.activeClientId == offers[0]["payload"]["clientId"]
        assert signaling.session.activeClientId in {
            senderAHello["payload"]["clientId"],
            senderBHello["payload"]["clientId"],
        }

    async def test_failed_peer_notification_still_resets_session(self) -> None:
        clientId = "sender-test"
        healthySender = FakeWebSocket()
        signaling.session.state = SessionState.ACTIVE
        signaling.session.activeClientId = clientId
        signaling.session.senders[clientId] = {
            "ws": FailingWebSocket(),
            "name": "Sender",
            "joined": True,
        }
        signaling.session.senders["sender-healthy"] = {
            "ws": healthySender,
            "name": "Healthy sender",
            "joined": True,
        }

        await signaling.cancelToIdle(
            notifySender=True,
            notifyReceiver=False,
        )

        assert signaling.session.state == SessionState.IDLE
        assert signaling.session.activeClientId is None
        stateUpdate = await self.assertMessageType(healthySender, "STATE_UPDATE")
        assert not stateUpdate["payload"]["isBusy"]

    async def test_receiver_disconnect_updates_senders_once(self) -> None:
        receiver, receiverHello, _ = await self.startReceiver()
        sender, senderHello = await self.startSender()
        senderId = senderHello["payload"]["clientId"]
        await self.joinSender(
            sender, receiver, receiverHello["payload"]["joinCode"], "Sender"
        )

        await receiver.clientSend(
            {"type": "SELECT_CLIENT", "payload": {"clientId": senderId}}
        )
        await self.assertMessageType(sender, "CAST_REQUEST")
        await self.assertMessageType(sender, "STATE_UPDATE")
        await self.assertMessageType(receiver, "STATE_UPDATE")

        await receiver.disconnect()
        assert receiver.handlerTask is not None
        await asyncio.wait_for(receiver.handlerTask, MESSAGE_TIMEOUT_SECONDS)
        await self.assertMessageType(sender, "STOP_CASTING")
        disconnectedState = await self.assertMessageType(sender, "STATE_UPDATE")
        assert disconnectedState["payload"] == {
            "isBusy": False,
            "receiverConnected": False,
        }

        duplicateMessages = sender.drainMessages()
        assert duplicateMessages == []

    async def test_receiver_reconnect_updates_senders(self) -> None:
        receiver, receiverHello, _ = await self.startReceiver()
        sender, _ = await self.startSender()
        await self.joinSender(
            sender, receiver, receiverHello["payload"]["joinCode"], "Sender"
        )

        await receiver.disconnect()
        assert receiver.handlerTask is not None
        await asyncio.wait_for(receiver.handlerTask, MESSAGE_TIMEOUT_SECONDS)
        disconnectedState = await self.assertMessageType(sender, "STATE_UPDATE")
        assert not disconnectedState["payload"]["receiverConnected"]

        _, _, _ = await self.startReceiver()
        reconnectedState = await self.assertMessageType(sender, "STATE_UPDATE")
        assert reconnectedState["payload"] == {
            "isBusy": False,
            "receiverConnected": True,
        }

    async def test_unjoined_sender_is_notified_when_receiver_connects(self) -> None:
        sender, senderHello = await self.startSender()
        assert not senderHello["payload"]["receiverConnected"]

        _, _, clientList = await self.startReceiver()
        assert clientList["payload"]["clients"] == []

        stateUpdate = await self.assertMessageType(sender, "STATE_UPDATE")
        assert stateUpdate["payload"] == {
            "isBusy": False,
            "receiverConnected": True,
        }

    async def test_unjoined_sender_is_notified_when_session_becomes_idle(self) -> None:
        receiver, receiverHello, _ = await self.startReceiver()
        activeSender, _ = await self.startSender()
        await self.joinSender(
            activeSender,
            receiver,
            receiverHello["payload"]["joinCode"],
            "Active sender",
        )
        await activeSender.clientSend(
            {"type": "OFFER", "payload": {"sdp": "active-offer"}}
        )
        await self.assertMessageType(receiver, "OFFER")
        await self.assertMessageType(activeSender, "STATE_UPDATE")
        await self.assertMessageType(receiver, "STATE_UPDATE")

        waitingSender, waitingSenderHello = await self.startSender()
        assert waitingSenderHello["payload"]["isBusy"]

        await activeSender.clientSend({"type": "STOP_CASTING", "payload": {}})
        await self.assertMessageType(receiver, "STOP_CASTING")
        await self.assertMessageType(activeSender, "STATE_UPDATE")
        stateUpdate = await self.assertMessageType(waitingSender, "STATE_UPDATE")
        assert stateUpdate["payload"] == {
            "isBusy": False,
            "receiverConnected": True,
        }
        await self.assertMessageType(receiver, "STATE_UPDATE")

        await self.joinSender(
            waitingSender,
            receiver,
            receiverHello["payload"]["joinCode"],
            "Waiting sender",
        )
        await waitingSender.clientSend(
            {"type": "OFFER", "payload": {"sdp": "waiting-offer"}}
        )
        offer = await self.assertMessageType(receiver, "OFFER")
        waitingSenderId = waitingSenderHello["payload"]["clientId"]
        assert offer["payload"]["clientId"] == waitingSenderId
        assert signaling.session.activeClientId == waitingSenderId

    async def test_sender_can_join_during_active_session(self) -> None:
        receiver, receiverHello, _ = await self.startReceiver()
        senderA, senderAHello = await self.startSender()
        await self.joinSender(
            senderA,
            receiver,
            receiverHello["payload"]["joinCode"],
            "Sender A",
        )
        await senderA.clientSend(
            {"type": "OFFER", "payload": {"sdp": "offer-from-A"}}
        )
        await self.assertMessageType(receiver, "OFFER")
        await self.assertMessageType(senderA, "STATE_UPDATE")
        await self.assertMessageType(receiver, "STATE_UPDATE")

        senderB, senderBHello = await self.startSender()
        senderBPayload = senderBHello["payload"]
        assert senderBPayload["isBusy"]

        await self.joinSender(
            senderB,
            receiver,
            receiverHello["payload"]["joinCode"],
            "Sender B",
        )
        await senderB.clientSend(
            {"type": "OFFER", "payload": {"sdp": "offer-from-B"}}
        )
        error = await self.assertMessageType(senderB, "ERROR")
        assert error["payload"]["code"] == "BUSY"
        assert signaling.session.activeClientId == senderAHello["payload"]["clientId"]

    async def test_server_hello_uses_role_specific_ids(self) -> None:
        _, receiverHello, _ = await self.startReceiver()
        _, senderHello = await self.startSender()

        assert receiverHello["payload"]["clientId"].startswith("receiver-")
        assert senderHello["payload"]["clientId"].startswith("sender-")

    async def test_sender_hello_does_not_include_join_code(self) -> None:
        _, senderHello = await self.startSender()

        assert "joinCode" not in senderHello["payload"]

    async def test_join_without_receiver_is_rejected(self) -> None:
        sender, _ = await self.startSender()
        await sender.clientSend({"type": "JOIN_REQUEST", "payload": {}})

        response = await self.assertMessageType(sender, "JOIN_RESPONSE")
        assert response["payload"] == {
            "success": False,
            "reason": "NO_RECEIVER",
        }

    async def test_invalid_client_names_are_rejected_and_valid_name_is_trimmed(
        self,
    ) -> None:
        receiver, receiverHello, _ = await self.startReceiver()
        sender, senderHello = await self.startSender()
        joinCode = receiverHello["payload"]["joinCode"]
        invalidPayloads = [
            {"joinCode": joinCode},
            {"joinCode": joinCode, "clientName": ""},
            {"joinCode": joinCode, "clientName": "   "},
            {"joinCode": joinCode, "clientName": 123},
            {"joinCode": joinCode, "clientName": "x" * 65},
        ]

        for payload in invalidPayloads:
            await sender.clientSend({"type": "JOIN_REQUEST", "payload": payload})
            response = await self.assertMessageType(sender, "JOIN_RESPONSE")
            assert response["payload"] == {
                "success": False,
                "reason": "INVALID_CLIENT_NAME",
            }

        assert receiver.drainMessages() == []

        await sender.clientSend(
            {
                "type": "JOIN_REQUEST",
                "payload": {"joinCode": joinCode, "clientName": "  PiotrP  "},
            }
        )
        response = await self.assertMessageType(sender, "JOIN_RESPONSE")
        assert response["payload"] == {"success": True}
        clientList = await self.assertMessageType(receiver, "CLIENT_LIST_UPDATE")
        assert clientList["payload"]["clients"] == [
            {
                "clientId": senderHello["payload"]["clientId"],
                "clientName": "PiotrP",
            }
        ]
