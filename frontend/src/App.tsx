import { useState } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { DisconnectedScreen } from "@/components/screens/DisconnectedScreen"
import { LobbyScreen } from "@/components/screens/LobbyScreen"
import { StreamingScreen } from "@/components/screens/StreamingScreen"

type StreamStatus = "DISCONNECTED" | "LOBBY" | "STREAMING"

export default function App() {
  const [status, setStatus] = useState<StreamStatus>("DISCONNECTED")
  const [pin, setPin] = useState("")
  const [serverBusy, setServerBusy] = useState(false)

  const userId = "#676767"

  return (
    <AppLayout status={status} userId={userId}>
      {status === "DISCONNECTED" && (
        <DisconnectedScreen
          pin={pin}
          setPin={setPin}
          onConnect={() => setStatus("LOBBY")}
        />
      )}

      {status === "LOBBY" && (
        <LobbyScreen
          serverBusy={serverBusy}
          setServerBusy={setServerBusy}
          onStartStreaming={() => setStatus("STREAMING")}
          onDisconnect={() => setStatus("DISCONNECTED")}
        />
      )}

      {status === "STREAMING" && (
        <StreamingScreen onStopStreaming={() => setStatus("LOBBY")} />
      )}
    </AppLayout>
  )
}