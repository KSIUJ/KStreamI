import { useCallback, useEffect, useRef, useState } from "react"
import { AppLayout, type ViewStatus } from "@/components/layout/AppLayout"
import { DisconnectedScreen } from "@/components/screens/DisconnectedScreen"
import { LobbyScreen } from "@/components/screens/LobbyScreen"
import { StreamingScreen } from "@/components/screens/StreamingScreen"
import { type ConnectionStatus, useCastingSocket } from "@/hooks/useCastingSocket"
import { type CaptureStatus, useDisplayCapture } from "@/hooks/useDisplayCapture"
import { useSenderWebRTC } from "@/hooks/useSenderWebRTC"

function getViewStatus(
  connectionStatus: ConnectionStatus,
  captureStatus: CaptureStatus,
): ViewStatus {
  if (connectionStatus !== "LOBBY") return connectionStatus
  if (captureStatus === "capturing") return "STREAMING"
  return "LOBBY"
}

export default function App() {
  const [pin, setPin] = useState("")

  const {
    stream: captureStream,
    status: captureStatus,
    error: captureError,
    startCapture,
    stopCapture,
  } = useDisplayCapture()

  const {
    status: connectionStatus,
    serverBusy,
    clientId,
    errorMessage,
    joinRoom,
    disconnect,
    sendMessage,
    rtcMessageQueue,
    castRequestTrigger,
  } = useCastingSocket(window.location.hostname, stopCapture) // <- onStopCasting = stopCapture

  const { handleIncomingRTCMessage } = useSenderWebRTC(captureStream, sendMessage)

  const prevCaptureStatus = useRef<CaptureStatus>(captureStatus)

  const handleStartCapture = useCallback(async () => {
    await startCapture()
  }, [startCapture])

  useEffect(() => {
    if (castRequestTrigger > 0) {
      handleStartCapture()
    }
  }, [castRequestTrigger, handleStartCapture])

  const processedCount = useRef(0)
  useEffect(() => {
    while (processedCount.current < rtcMessageQueue.length) {
      const msg = rtcMessageQueue[processedCount.current]
      handleIncomingRTCMessage(msg.type, msg.payload)
      processedCount.current++
    }
  }, [rtcMessageQueue, handleIncomingRTCMessage])

  // Lokalny capture skończył się (np. user kliknął "stop sharing" w przeglądarce)
  // -> poinformuj serwer. Zakończenie zainicjowane PRZEZ serwer (STOP_CASTING z WS)
  // idzie teraz bezpośrednio przez onStopCasting powyżej, więc nie ma tu pętli zwrotnej.
  useEffect(() => {
    if (prevCaptureStatus.current === "capturing" && captureStatus !== "capturing") {
      console.log("Wykryto zakończenie nagrywania przez studenta - zwalniam serwer")
      sendMessage("STOP_CASTING", {})
    }
    prevCaptureStatus.current = captureStatus
  }, [captureStatus, sendMessage])

  useEffect(() => {
    if (connectionStatus !== "LOBBY") {
      stopCapture()
    }
  }, [connectionStatus, stopCapture])

  const viewStatus = getViewStatus(connectionStatus, captureStatus)

  return (
    <AppLayout status={viewStatus} userId={clientId || "Brak ID"}>
      {viewStatus === "DISCONNECTED" && (
        <DisconnectedScreen
          pin={pin}
          setPin={setPin}
          onConnect={() => joinRoom(pin)}
          errorMessage={errorMessage}
        />
      )}

      {viewStatus === "JOINING" && (
        <div className="flex items-center justify-center h-full text-center">
          <p>Łączenie z salą...</p>
        </div>
      )}

      {viewStatus === "LOBBY" && (
        <LobbyScreen
          serverBusy={serverBusy}
          captureStatus={captureStatus}
          captureError={captureError}
          onStartCapture={handleStartCapture}
          onDisconnect={disconnect}
        />
      )}

      {viewStatus === "STREAMING" && captureStream && (
        <StreamingScreen
          stream={captureStream}
          onStopCapture={stopCapture}
        />
      )}
    </AppLayout>
  )
}