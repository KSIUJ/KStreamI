import { useCallback, useEffect, useState, useRef } from "react"
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
    incomingRTCMessage,
    castRequestTrigger
  } = useCastingSocket("localhost")

  const { handleIncomingRTCMessage } = useSenderWebRTC(captureStream, sendMessage)

  const prevCaptureStatus = useRef<CaptureStatus>(captureStatus)
  const prevServerBusy = useRef<boolean>(serverBusy) 

  const handleStartCapture = useCallback(async () => {
    await startCapture()
  }, [startCapture])

  useEffect(() => {
    if (castRequestTrigger > 0) {
      handleStartCapture()
    }
  }, [castRequestTrigger, handleStartCapture])

  useEffect(() => {
    if (incomingRTCMessage) {
      handleIncomingRTCMessage(incomingRTCMessage.type, incomingRTCMessage.payload)
    }
  }, [incomingRTCMessage, handleIncomingRTCMessage])

  useEffect(() => {
    if (prevServerBusy.current === true && serverBusy === false && captureStatus === "capturing") {
      console.log("Serwer zakończył transmisję - wyłączam przechwytywanie")
      stopCapture()
    }
    
    prevServerBusy.current = serverBusy
  }, [serverBusy, captureStatus, stopCapture])

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