def serverHelloSender(clientId: str, receiverConnected: bool) -> dict:
    return {
        "type": "SERVER_HELLO",
        "payload": {
            "clientId": clientId,
            "isBusy": False,
            "receiverConnected": receiverConnected,
            "joinCode": None,
        }
    }

def serverHelloReceiver(clientId: str, joinCode: str) -> dict:
    return {
        "type": "SERVER_HELLO",
        "payload": {
            "clientId": clientId, 
            "isBusy": False, 
            "joinCode": joinCode
        }
    }

def joinResponse(success: bool, reason: str | None = None) -> dict:
    return {
        "type": "JOIN_RESPONSE", 
        "payload": {"success": True} if success else {"success": False, "reason": reason }
    }

def clientListUpdate(senders: dict[str, dict]) -> dict:
    joined_clients = [
        {"clientId": cid, "clientName": s["name"]}
        for cid, s in senders.items()
        if s["joined"]
    ]
    return {
        "type": "CLIENT_LIST_UPDATE",
        "payload": {"clients": joined_clients}
    }

def error(code: str, message: str) -> dict:
    return {
        "type": "ERROR", 
        "payload": {
            "code": code, 
            "message": message
        }
    }

def stateUpdateSender(isBusy: bool, receiverConnected: bool) -> dict:
    return {
        "type": "STATE_UPDATE",
        "payload": {
            "isBusy": isBusy, 
            "receiverConnected": receiverConnected
        }
    }

def stateUpdateReceiver(state: str, activeClientId: str | None) -> dict:
    return {
        "type": "STATE_UPDATE",
        "payload": {
            "state": state, 
            "activeClientId": activeClientId
        }
    }

def offerRelay(sdp: str, clientId: str) -> dict:
    return {
        "type": "OFFER", 
        "payload": { 
            "sdp": sdp, 
            "clientId": clientId
        }
    }

def answerRelay(sdp: str) -> dict:
    return {
        "type": "ANSWER", 
        "payload": {
            "sdp": sdp
        }
    }

def iceCandidateRelay(candidate: str, sdpMid: str, sdpMlineIndex: int) -> dict:
    return {
        "type": "ICE_CANDIDATE",
            "payload": {
                "candidate": candidate, 
                "sdpMid": sdpMid, 
                "sdpMLineIndex": sdpMlineIndex
        }
    }

def stopCasting() -> dict:
    return {"type": "STOP_CASTING", "payload": {}}

def castRequest() -> dict: 
    return {"type": "CAST_REQUEST", "payload": {}}