import { useState, useEffect, useRef, useCallback } from "react"

export type ConnectionStatus = "DISCONNECTED" | "JOINING" | "LOBBY"

export function useCastingSocket(
  serverIp: string = "localhost",
  onStopCasting?: () => void,
) {  const [status, setStatus] = useState<ConnectionStatus>("DISCONNECTED")
  const [serverBusy, setServerBusy] = useState<boolean>(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryTrigger, setRetryTrigger] = useState(0)
  const [incomingRTCMessage, setIncomingRTCMessage] = useState<{type: string, payload: any} | null>(null)
  const [castRequestTrigger, setCastRequestTrigger] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)

  const handleIncomingMessage = useCallback((data: string) => {
    try {
      const message = JSON.parse(data)
      const { type, payload } = message

      console.log("RECEIVED WS EVENT:", type, payload)

      switch (type) {
        case "SERVER_HELLO":
          if (payload.clientId) setClientId(payload.clientId)
          if (typeof payload.isBusy === "boolean") setServerBusy(payload.isBusy)
          break
        case "JOIN_RESPONSE":
          if (payload.success) {
            setStatus("LOBBY")
            setErrorMessage(null)
          } else {
            setStatus("DISCONNECTED")
            setErrorMessage(payload.reason === "INVALID_CODE" 
              ? "Niepoprawny kod PIN. Spróbuj ponownie." 
              : (payload.message || "Błąd połączenia z serwerem."))
          }
          break
        case "STATE_UPDATE":
          if (typeof payload.isBusy === "boolean") setServerBusy(payload.isBusy)
          break
        case "ERROR":
          setErrorMessage(payload.message || "Wystąpił błąd serwera.")
          break

        case "CAST_REQUEST":
          setCastRequestTrigger(prev => prev + 1) // Wykładowca wywołał studenta
          break
        case "ANSWER":
        case "ICE_CANDIDATE":
          setIncomingRTCMessage({ type, payload }) // Odpowiedź WebRTC od rzutnika
          break
        case "STOP_CASTING":
          setStatus("LOBBY")
          setErrorMessage(null)
          onStopCasting?.()
          break
        default:
          console.warn("Unknown event type:", type)
      }
    } catch (err) {
      console.error("Failed to parse incoming WebSocket message:", err)
    }
  }, [onStopCasting])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${serverIp}:8080/v1`
    let ws: WebSocket | null = null
    try {
      ws = new WebSocket(wsUrl)
      wsRef.current = ws
      ws.onmessage = (event) => handleIncomingMessage(event.data)
      ws.onerror = () => console.log("Running in offline mode")
    } catch {
      console.log("WebSocket connection skipped")
    }
    return () => { ws?.close() }
  }, [serverIp, handleIncomingMessage, retryTrigger])

  const joinRoom = useCallback((pin: string) => {
    setErrorMessage(null)
    setStatus("JOINING")
    const cleanPin = pin.replace(/\D/g, "")

    const shortId = clientId ? clientId.slice(-6).toUpperCase() : "X"
    
    const outboundMessage = {
      type: "JOIN_REQUEST",
      payload: { joinCode: cleanPin, clientName: `Student (${shortId})` },
    }
    wsRef.current?.send(JSON.stringify(outboundMessage))
  }, [clientId]) 

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "STOP_CASTING", payload: {} })) // Grzeczne poinformowanie serwera
      wsRef.current.close()
      wsRef.current = null
    }
    setStatus("DISCONNECTED")
    setErrorMessage(null)
    setClientId(null)
    setRetryTrigger(prev => prev + 1)
  }, [])

  const sendMessage = useCallback((type: string, payload: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }))
    }
  }, [])

  return {
    status,
    serverBusy,
    clientId,
    errorMessage,
    joinRoom,
    disconnect,
    sendMessage,
    incomingRTCMessage,
    castRequestTrigger
  }
}
