import { useState } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { DisconnectedScreen } from "@/components/screens/DisconnectedScreen"
import { LobbyScreen } from "@/components/screens/LobbyScreen"
import { StreamingScreen } from "@/components/screens/StreamingScreen"
import { useCastingSocket } from "@/hooks/useCastingSocket"

export default function App() {
  const [pin, setPin] = useState("")

  const {
    status,
    setStatus,
    serverBusy,
    clientId,
    errorMessage,
    joinRoom,
    disconnect,
    stopStreaming,
    emitMockEvent,
  } = useCastingSocket("localhost")

  return (
    <AppLayout status={status} userId={clientId || "Brak ID"}>
      {status === "DISCONNECTED" && (
        <DisconnectedScreen
          pin={pin}
          setPin={setPin}
          onConnect={() => joinRoom(pin)}
          errorMessage={errorMessage}
        />
      )}

      {status === "LOBBY" && (
        <LobbyScreen
          serverBusy={serverBusy}
          emitMockEvent={emitMockEvent}
          onStartStreaming={() => setStatus("STREAMING")}
          onDisconnect={disconnect}
        />
      )}

      {status === "STREAMING" && (
        <StreamingScreen onStopStreaming={stopStreaming} />
      )}
    </AppLayout>
  )
}