from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..core import messages as msg
from ..core.session import PENDING_TIMEOUT_SECONDS, Session, SessionState
import asyncio
import json
import logging

router = APIRouter()
session = Session()
logger = logging.getLogger(__name__)
CLIENT_NAME_MAX_LENGTH = 64

KNOWN_TYPES = {
    "JOIN_REQUEST",
    "SELECT_CLIENT",
    "OFFER",
    "ANSWER",
    "ICE_CANDIDATE",
    "PEER_CONNECTION_FAILED",
    "STOP_CASTING",
}


def normalizeClientName(value: object) -> str | None:
    if not isinstance(value, str):
        return None

    normalized = value.strip()
    if not normalized or len(normalized) > CLIENT_NAME_MAX_LENGTH:
        return None

    return normalized


async def sendJsonBestEffort(
    websocket: WebSocket, message: dict, recipient: str
) -> None:
    try:
        await websocket.send_json(message)
    except Exception:
        logger.warning(
            "Failed to send %s to %s",
            message.get("type", "message"),
            recipient,
            exc_info=True,
        )


async def broadcastSenderState():
    message = msg.stateUpdateSender(session.isBusy(), session.receiverConnected())
    for clientId, s in list(session.senders.items()):
        await sendJsonBestEffort(s["ws"], message, clientId)


async def broadcastReceiverState():
    if session.wsRec:
        await sendJsonBestEffort(
            session.wsRec,
            msg.stateUpdateReceiver(session.state.value, session.activeClientId),
            "receiver",
        )


async def cancelToIdle(notifySender: bool, notifyReceiver: bool):
    activeClientId = session.activeClientId
    previousState = session.state

    try:
        if notifySender and activeClientId in session.senders:
            await sendJsonBestEffort(
                session.senders[activeClientId]["ws"],
                msg.stopCasting(),
                activeClientId,
            )
        if notifyReceiver and previousState == SessionState.ACTIVE and session.wsRec:
            await sendJsonBestEffort(session.wsRec, msg.stopCasting(), "receiver")
    finally:
        session.resetIdle()

    await broadcastSenderState()
    await broadcastReceiverState()


async def pendingTimeoutWatchdog(clientId: str):
    try:
        await asyncio.sleep(PENDING_TIMEOUT_SECONDS)
        if session.state == SessionState.PENDING and session.activeClientId == clientId:
            await cancelToIdle(notifySender=True, notifyReceiver=False)
    except asyncio.CancelledError:
        pass


async def receiveEnvelope(websocket: WebSocket) -> dict | None:
    raw = await websocket.receive_text()
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        await websocket.send_json(msg.error("MALFORMED_ENVELOPE", "Invalid JSON."))
        return None

    if not isinstance(data, dict) or "type" not in data or "payload" not in data:
        await websocket.send_json(msg.error("MALFORMED_ENVELOPE", "Missing type/payload."))
        return None

    if not isinstance(data["type"], str) or not isinstance(data["payload"], dict):
        await websocket.send_json(
            msg.error(
                "MALFORMED_ENVELOPE",
                "Type must be a string and payload must be an object.",
            )
        )
        return None

    if data["type"] not in KNOWN_TYPES:
        await websocket.send_json(msg.error("UNSUPPORTED_TYPE", f"Unknown type {data['type']!r}."))
        return None

    return data


@router.websocket("/v1/receiver")
async def ws_rec(websocket: WebSocket):
    await websocket.accept()
    clientId = session.nextReceiverId()
    session.wsRec = websocket
    joinCode = session.ensureJoinCode()

    await websocket.send_json(msg.serverHelloReceiver(clientId, joinCode))
    await websocket.send_json(msg.clientListUpdate(session.senders))
    await broadcastSenderState()

    try:
        while True:
            data = await receiveEnvelope(websocket)
            if data is None:
                continue
            payload = data.get("payload", {})
            msgType = data["type"]

            if msgType == "SELECT_CLIENT":
                cid = payload.get("clientId")
                if cid not in session.senders or not session.senders[cid]["joined"]:
                    await websocket.send_json(msg.error("INVALID_STATE", "Unknown client."))
                elif session.state != SessionState.IDLE:
                    await websocket.send_json(msg.error("BUSY", "Session already busy."))
                else:
                    session.state = SessionState.PENDING
                    session.activeClientId = cid
                    await session.senders[cid]["ws"].send_json(msg.castRequest())
                    session.pendingTimeoutTask = asyncio.create_task(
                        pendingTimeoutWatchdog(cid)
                    )
                    await broadcastSenderState()
                    await broadcastReceiverState()

            elif msgType == "ANSWER":
                if session.state == SessionState.ACTIVE and session.activeClientId in session.senders:
                    await session.senders[session.activeClientId]["ws"].send_json(
                        msg.answerRelay(payload.get("sdp"))
                    )
                else:
                    await websocket.send_json(msg.error("INVALID_STATE", "No active negotiation."))

            elif msgType == "ICE_CANDIDATE":
                if session.state == SessionState.ACTIVE and session.activeClientId in session.senders:
                    await session.senders[session.activeClientId]["ws"].send_json(
                        msg.iceCandidateRelay(
                            payload.get("candidate"),
                            payload.get("sdpMid"),
                            payload.get("sdpMLineIndex"),
                        )
                    )
                else:
                    await websocket.send_json(msg.error("INVALID_STATE", "No active negotiation."))

            elif msgType == "PEER_CONNECTION_FAILED":
                if session.state == SessionState.ACTIVE:
                    await cancelToIdle(notifySender=True, notifyReceiver=False)
                else:
                    await websocket.send_json(msg.error("INVALID_STATE", "Nothing to fail."))

            elif msgType == "STOP_CASTING":
                if session.state == SessionState.IDLE:
                    await websocket.send_json(msg.error("INVALID_STATE", "Nothing to stop."))
                else:
                    await cancelToIdle(notifySender=True, notifyReceiver=False)

            else:
                await websocket.send_json(msg.error("INVALID_STATE", "Not valid on this connection."))

    except WebSocketDisconnect:
        session.wsRec = None
        if session.state != SessionState.IDLE:
            await cancelToIdle(notifySender=True, notifyReceiver=False)
        else:
            await broadcastSenderState()  # receiverConnected: false
        session.clearJoinCodeIfEmpty()


@router.websocket("/v1")
async def ws_sender(websocket: WebSocket):
    await websocket.accept()
    clientId = session.nextSenderId()
    session.senders[clientId] = {"ws": websocket, "name": None, "joined": False}

    await websocket.send_json(
        msg.serverHelloSender(
            clientId,
            session.isBusy(),
            session.receiverConnected(),
        )
    )

    try:
        while True:
            data = await receiveEnvelope(websocket)
            if data is None:
                continue
            payload = data.get("payload", {})
            msgType = data["type"]

            if msgType == "JOIN_REQUEST":
                alreadyJoined = session.senders[clientId]["joined"]
                codeValid = payload.get("joinCode") == session.joinCode
                clientName = normalizeClientName(payload.get("clientName"))

                if alreadyJoined:
                    await websocket.send_json(msg.error("INVALID_STATE", "Already joined."))
                elif not session.receiverConnected():
                    await websocket.send_json(msg.joinResponse(False, "NO_RECEIVER"))
                elif not codeValid:
                    await websocket.send_json(msg.joinResponse(False, "INVALID_CODE"))
                elif clientName is None:
                    await websocket.send_json(msg.joinResponse(False, "INVALID_CLIENT_NAME"))
                else:
                    session.senders[clientId]["joined"] = True
                    session.senders[clientId]["name"] = clientName
                    await websocket.send_json(msg.joinResponse(True))
                    if session.wsRec:
                        await session.wsRec.send_json(msg.clientListUpdate(session.senders))

            elif msgType == "OFFER":
                if not session.senders[clientId]["joined"]:
                    await websocket.send_json(msg.error("INVALID_STATE", "Not joined."))

                elif session.state == SessionState.IDLE:
                    if not session.receiverConnected():
                        await websocket.send_json(msg.error("NO_RECEIVER", "No receiver connected."))
                    else:
                        session.cancelPendingTimeout()
                        session.state = SessionState.ACTIVE
                        session.activeClientId = clientId
                        await session.wsRec.send_json(msg.offerRelay(payload.get("sdp"), clientId))
                        await broadcastSenderState()
                        await broadcastReceiverState()

                elif session.state == SessionState.PENDING and session.activeClientId == clientId:
                    session.cancelPendingTimeout()
                    session.state = SessionState.ACTIVE
                    await session.wsRec.send_json(msg.offerRelay(payload.get("sdp"), clientId))
                    await broadcastReceiverState()

                else:
                    await websocket.send_json(msg.error("BUSY", "Another sender is active."))

            elif msgType == "ICE_CANDIDATE":
                if (
                    session.state == SessionState.ACTIVE
                    and clientId == session.activeClientId
                    and session.wsRec
                ):
                    await session.wsRec.send_json(
                        msg.iceCandidateRelay(
                            payload.get("candidate"),
                            payload.get("sdpMid"),
                            payload.get("sdpMLineIndex"),
                        )
                    )
                else:
                    await websocket.send_json(msg.error("INVALID_STATE", "No active negotiation."))

            elif msgType == "PEER_CONNECTION_FAILED":
                if session.state == SessionState.ACTIVE and clientId == session.activeClientId:
                    await cancelToIdle(notifySender=False, notifyReceiver=True)
                else:
                    await websocket.send_json(msg.error("INVALID_STATE", "Nothing to fail."))

            elif msgType == "STOP_CASTING":
                if clientId == session.activeClientId and session.state != SessionState.IDLE:
                    await cancelToIdle(notifySender=False, notifyReceiver=True)
                else:
                    await websocket.send_json(msg.error("INVALID_STATE", "Not casting."))

            else:
                await websocket.send_json(msg.error("INVALID_STATE", "Not valid on this connection."))

    except WebSocketDisconnect:
        wasJoined = session.senders[clientId]["joined"]
        wasActive = session.activeClientId == clientId and session.state != SessionState.IDLE
        del session.senders[clientId]

        if wasActive:
            await cancelToIdle(notifySender=False, notifyReceiver=True)
        if wasJoined and session.wsRec:
            await sendJsonBestEffort(
                session.wsRec,
                msg.clientListUpdate(session.senders),
                "receiver",
            )
        session.clearJoinCodeIfEmpty()
