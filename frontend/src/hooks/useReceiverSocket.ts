import { useState, useEffect, useRef, useCallback } from "react"

export interface ConnectedStudent {
  clientId: string
  clientName: string
}

export function useReceiverSocket(serverIp: string = "localhost") {
  const [pin, setPin] = useState<string | null>(null)
  const [connectedStudents, setConnectedStudents] = useState<ConnectedStudent[]>([])
  const [serverState, setServerState] = useState<"IDLE" | "PENDING" | "ACTIVE">("IDLE")
  const [activeClientId, setActiveClientId] = useState<string | null>(null)

  const [incomingRTCMessage, setIncomingRTCMessage] = useState<{type: string, payload: any} | null>(null)

  const wsRef = useRef<WebSocket | null>(null)

  const handleIncomingMessage = useCallback((data: string) => {
    try {
      const message = JSON.parse(data)
      const { type, payload } = message
      console.log("[Receiver WS] Otrzymano:", type, payload)

      switch (type) {
        case "SERVER_HELLO":
          setPin(payload.joinCode)
          break
        case "CLIENT_LIST_UPDATE":
          setConnectedStudents(payload.clients || [])
          break
        case "STATE_UPDATE":
          setServerState(payload.state)
          setActiveClientId(payload.activeClientId)
          break
        case "ERROR":
          console.error("[Receiver WS] Błąd serwera:", payload.message)
          break
        case "OFFER":
        case "ICE_CANDIDATE":
          setIncomingRTCMessage({ type, payload })
          break
      }
    } catch (err) {
      console.error("Błąd parsowania wiadomości WS:", err)
    }
  }, [])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${serverIp}:8080/v1/receiver`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (event) => handleIncomingMessage(event.data)
    ws.onerror = (e) => console.error("[Receiver WS] Błąd połączenia", e)

    return () => {
      ws.close()
    }
  }, [serverIp, handleIncomingMessage])

  const requestStreamFromClient = useCallback((clientId: string) => {
    wsRef.current?.send(JSON.stringify({
      type: "SELECT_CLIENT",
      payload: { clientId }
    }))
  }, [])

  const stopCasting = useCallback(() => {
    wsRef.current?.send(JSON.stringify({
      type: "STOP_CASTING",
      payload: {}
    }))
  }, [])

  const sendMessage = useCallback((type: string, payload: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }))
    }
  }, [])

  return { 
    pin, 
    connectedStudents, 
    serverState, 
    activeClientId, 
    requestStreamFromClient, 
    stopCasting,
    sendMessage,
    incomingRTCMessage
  }
}