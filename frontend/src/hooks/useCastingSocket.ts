import { useState, useEffect, useRef, useCallback } from "react"

export type ConnectionStatus = "DISCONNECTED" | "JOINING" | "LOBBY"

export function useCastingSocket(serverIp: string = "localhost") {
  const [status, setStatus] = useState<ConnectionStatus>("DISCONNECTED")
  const [serverBusy, setServerBusy] = useState<boolean>(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
            if (payload.reason === "INVALID_CODE") {
              setErrorMessage("Niepoprawny kod PIN. Spróbuj ponownie.")
            } else {
              setErrorMessage(payload.message || "Błąd połączenia z serwerem.")
            }
          }
          break

        case "STATE_UPDATE":
          if (typeof payload.isBusy === "boolean") {
            setServerBusy(payload.isBusy)
          }
          break

        case "ERROR":
          setErrorMessage(payload.message || "Wystąpił błąd serwera.")
          break

        default:
          console.warn("Unknown event type:", type)
      }
    } catch (err) {
      console.error("Failed to parse incoming WebSocket message:", err)
    }
  }, [])

  useEffect(() => {
    const wsUrl = `ws://${serverIp}:8080/v1`
    let ws: WebSocket | null = null

    try {
      ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onmessage = (event) => handleIncomingMessage(event.data)
      ws.onerror = () => {
        console.log("Running in Mock/Offline mode (No live WebSocket backend)")
      }
    } catch {
      console.log("WebSocket connection skipped (Dev mode)")
    }

    return () => {
      ws?.close()
    }
  }, [serverIp, handleIncomingMessage])

  // METODA DLA DEV TOOLS: Symulowanie zdarzeń wejściowych z serwera (JSON)
  const emitMockEvent = useCallback((eventObject: object) => {
    handleIncomingMessage(JSON.stringify(eventObject))
  }, [handleIncomingMessage])

  const joinRoom = useCallback((pin: string) => {
    setErrorMessage(null)
    setStatus("JOINING")

    const cleanPin = pin.replace(/\D/g, "")
    const outboundMessage = {
      type: "JOIN_REQUEST",
      payload: {
        joinCode: cleanPin,
        clientName: "Przeglądarka Użytkownika",
      },
    }

    console.log("SENDING WS EVENT:", outboundMessage)
    wsRef.current?.send(JSON.stringify(outboundMessage))

  //   /* --- MOCK SIMULATION (Gdy brak podpiętego serwera) --- */
  //   setTimeout(() => {
  //     if (cleanPin === "1234") {
  //       emitMockEvent({
  //         type: "JOIN_RESPONSE",
  //         payload: { success: false, reason: "INVALID_CODE" },
  //       })
  //     } else {
  //       emitMockEvent({
  //         type: "JOIN_RESPONSE",
  //         payload: { success: true, message: "Connected successfully." },
  //       })
  //     }
  //   }, 400)
  //   /* ---------------------------------------------------- */
  }, [emitMockEvent])

  const disconnect = useCallback(() => {
    setStatus("DISCONNECTED")
    setErrorMessage(null)
  }, [])

  return {
    status,
    serverBusy,
    clientId,
    errorMessage,
    joinRoom,
    disconnect,
    emitMockEvent,
  }
}
