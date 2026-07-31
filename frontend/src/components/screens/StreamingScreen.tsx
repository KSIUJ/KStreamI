import { Button } from "@/components/ui/button"
import { MonitorPlay, StopCircle } from "lucide-react"

interface StreamingScreenProps {
  onStopStreaming: () => void
}

export function StreamingScreen({ onStopStreaming }: StreamingScreenProps) {
  return (
    <div className="flex flex-col gap-6 text-center py-2">
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 animate-pulse">
          <MonitorPlay className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-red-400">
            Twój ekran jest widoczny
          </h2>
        </div>
      </div>

      <Button
        onClick={onStopStreaming}
        className="w-full h-14 text-lg font-bold bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-red-950/50"
      >
        <StopCircle className="w-6 h-6" />
        Zakończ udostępnianie
      </Button>
    </div>
  )
}