import { useCallback, useEffect, useState } from "react"
import { AppLayout, type StreamStatus } from "@/components/layout/AppLayout"
import { DisconnectedScreen } from "@/components/screens/DisconnectedScreen"
import { LobbyScreen } from "@/components/screens/LobbyScreen"
import { StreamingScreen } from "@/components/screens/StreamingScreen"
import {
  type ConnectionStatus,
  useCastingSocket,
} from "@/hooks/useCastingSocket"
import {
  type CaptureStatus,
  useDisplayCapture,
} from "@/hooks/useDisplayCapture"

function getViewStatus(
  connectionStatus: ConnectionStatus,
  captureStatus: CaptureStatus,
): StreamStatus {
  if (connectionStatus !== "LOBBY") {
    return connectionStatus
  }

  if (captureStatus === "capturing") {
    return "STREAMING"
  }

  return "LOBBY"
}

export default function App() {
  const [pin, setPin] = useState("")

  const {
    status: connectionStatus,
    serverBusy,
    clientId,
    errorMessage,
    joinRoom,
    disconnect,
    emitMockEvent,
  } = useCastingSocket("localhost")

  const {
    stream: captureStream,
    status: captureStatus,
    error: captureError,
    startCapture,
    stopCapture,
  } = useDisplayCapture()

  const handleStartCapture = useCallback(async () => {
    await startCapture()
  }, [startCapture])

  const handleRetryCapture = useCallback(async () => {
    stopCapture()
    await handleStartCapture()
  }, [handleStartCapture, stopCapture])

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
          emitMockEvent={emitMockEvent}
          captureStatus={captureStatus}
          captureError={captureError}
          onStartCapture={handleStartCapture}
          onRetryCapture={handleRetryCapture}
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
