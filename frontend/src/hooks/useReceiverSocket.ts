import { useState, useEffect, useRef, useCallback } from "react"

export interface ConnectedStudent {
  clientId: string
  clientName: string
}

export function useReceiverSocket(serverIp: string = "localhost") {
  const [pin, setPin] = useState<string | null>(null)
  const [connectedStudents, setConnectedStudents] = useState<ConnectedStudent[]>([])
  
  // Zgodnie z backendem, stan może być IDLE, PENDING lub ACTIVE
  const [serverState, setServerState] = useState<"IDLE" | "PENDING" | "ACTIVE">("IDLE")
  const [activeClientId, setActiveClientId] = useState<string | null>(null)

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
      }
    } catch (err) {
      console.error("Błąd parsowania wiadomości WS:", err)
    }
  }, [])

  useEffect(() => {
    const wsUrl = `ws://${serverIp}:8080/v1/receiver`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (event) => handleIncomingMessage(event.data)
    ws.onerror = (e) => console.error("[Receiver WS] Błąd połączenia", e)

    return () => {
      ws.close()
    }
  }, [serverIp, handleIncomingMessage])

  // Akcje do wysłania na serwer
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

  return { 
    pin, 
    connectedStudents, 
    serverState, 
    activeClientId, 
    requestStreamFromClient, 
    stopCasting 
  }
}