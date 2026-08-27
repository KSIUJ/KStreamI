import asyncio
import secrets
from enum import Enum
from fastapi import WebSocket

PENDING_TIMEOUT_SECONDS = 45


def genJoinCode() -> str:
    return f"{secrets.randbelow(10000):04d}"


class SessionState(Enum):
    IDLE = "IDLE"
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"


class Session:
    def __init__(self):
        self.joinCode: str | None = None
        self.wsRec: WebSocket | None = None
        self.senders: dict[str, dict] = {}  # clientId  {"ws", "name", "joined"}
        self.nextSenderNum = 1
        self.nextReceiverNum = 1
        self.earlyIceCandidates: dict[str, list[dict]] = {}

        self.state = SessionState.IDLE
        self.activeClientId: str | None = None
        self.pendingTimeoutTask: asyncio.Task | None = None

    def nextSenderId(self) -> str:
        cid = f"sender-{self.nextSenderNum:06d}"
        self.nextSenderNum += 1
        return cid

    def nextReceiverId(self) -> str:
        cid = f"receiver-{self.nextReceiverNum:06d}"
        self.nextReceiverNum += 1
        return cid

    def ensureJoinCode(self) -> str:
        if self.joinCode is None:
            self.joinCode = genJoinCode()
        return self.joinCode

    def clearJoinCodeIfEmpty(self):
        noReceiver = self.wsRec is None
        noJoinedSenders = not any(s["joined"] for s in self.senders.values())
        if noReceiver and noJoinedSenders:
            self.joinCode = None

    def receiverConnected(self) -> bool:
        return self.wsRec is not None

    def isBusy(self) -> bool:
        return self.state != SessionState.IDLE

    def cancelPendingTimeout(self):
        if self.pendingTimeoutTask and not self.pendingTimeoutTask.done():
            self.pendingTimeoutTask.cancel()
        self.pendingTimeoutTask = None

    def resetIdle(self):
        self.cancelPendingTimeout()
        self.state = SessionState.IDLE
        self.activeClientId = None
