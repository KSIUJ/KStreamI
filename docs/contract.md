# OpenAPI & AsyncAPI Specification

This specification documents the data schemas, connection endpoints, and event structures for our classroom casting system.

---

## 1. Connection Endpoint

### WebSocket Signaling Gateway
* **URL:** `ws://{server_ip}:8080`
* **Protocol:** WebSocket (`ws`) over local LAN
* **Data Format:** JSON

---

## 2. Global Message Envelope

All messages sent over the WebSocket connection (both Client $\rightarrow$ Server and Server $\rightarrow$ Client) **MUST** strictly adhere to this envelope schema:

```json
{
  "type": "STRING_EVENT_TYPE",
  "payload": { ... }
}
```
## 3. WebSocket Event Schemas
### Handshake and Authentication
1. ```SERVER_HELLO```

  - Direction: Server $\rightarrow$ Client
  - Trigger: Dispatched immediately upon opening a new WebSocket connection.
```json
{
  "type": "SERVER_HELLO",
  "payload": {
    "clientId": "client-a1b2c3",
    "isBusy": false,
    "joinCode": "7392"
  }
}
```
2. ```JOIN_REQUEST```
  - Direction: Client $\rightarrow$ Server
  -  Trigger: Sent by client after the user enters the PIN code displayed on the projector screen.
```json
{
  "type": "JOIN_REQUEST",
  "payload": {
    "joinCode": "7392",
    "clientName": "Anna's Laptop"
  }
}
```
3. ```JOIN_RESPONSE```
  - Direction: Server $\rightarrow$ Client
  -  Trigger: Server's response to a JOIN_REQUEST.
```json
{
  "type": "JOIN_RESPONSE",
  "payload": {
    "success": true,
    "message": "Connected successfully."
  }
}
```

```json
{
  "type": "JOIN_RESPONSE",
  "payload": {
    "success": false,
    "reason": "INVALID_CODE"
  }
}
```

### WebRTC Signaling

4. ```OFFER```
 - Direction: Client $\rightarrow$ Server
 -  Trigger: Client initiates WebRTC P2P stream negotiation after user clicks "Start Casting".
```json
{
  "type": "OFFER",
  "payload": {
    "sdp": "v=0\r\no=- 46112345 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0..."
  }
}
```

5. ```ANSWER```
- Direction: Server $\rightarrow$ Client
-  Trigger: Server response to an OFFER payload containing aiortc local SDP session details.

```json
{
  "type": "ANSWER",
  "payload": {
    "sdp": "v=0\r\no=- 89123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0..."
  }
}
```
6. ```ICE_CANDIDATE```
 - Direction: Bidirectional (Client $\leftrightarrow$ Server)
 - Trigger: Exchange of ICE candidates for establishing direct LAN P2P UDP traversal.
```json
{
  "type": "ICE_CANDIDATE",
  "payload": {
    "candidate": "candidate:8421 1 udp 2122260223 192.168.1.50 54321 typ host...",
    "sdpMid": "0",
    "sdpMLineIndex": 0
  }
}
```

### State Control and Synchronization

7. ```STOP_CASTING```
- Direction: Client $\rightarrow$ Server
-  Trigger: Sent when the active client clicks "Stop Casting" or closes the browser tab.

```json
{
  "type": "STOP_CASTING",
  "payload": {}
}
```

8. ```STATE_UPDATE```
- Direction: Server $\rightarrow$ All Connected Clients (Broadcast)
-  Trigger: Sent whenever the server transitions between IDLE and BUSY states.

```json
{
  "type": "STATE_UPDATE",
  "payload": {
    "isBusy": true,
    "activeClientId": "client-a1b2c3"
  }
}
```
## Media Stream Specification
* **Video Codec:** H.264 / VP8
* **Audio Codec:** Opus (optional)
* **Target Resolution & Frame Rate:** 1080p @ 30 FPS