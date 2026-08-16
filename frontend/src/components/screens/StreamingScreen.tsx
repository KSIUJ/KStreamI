import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useCaptureStats } from "@/hooks/useCaptureStats"
import { MonitorPlay, StopCircle } from "lucide-react"

interface StreamingScreenProps {
  stream: MediaStream
  onStopCapture: () => void
}

export function StreamingScreen({
  stream,
  onStopCapture,
}: StreamingScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    videoElement.srcObject = stream

    return () => {
      if (videoElement.srcObject === stream) {
        videoElement.srcObject = null
      }
    }
  }, [stream])

  const captureStats = useCaptureStats(videoRef, stream)
  const resolution =
    captureStats.width !== null && captureStats.height !== null
      ? `${captureStats.width} × ${captureStats.height}`
      : "-"
  const framesPerSecond =
    captureStats.framesPerSecond !== null
      ? captureStats.framesPerSecond.toFixed(0)
      : "-"

  return (
    <div className="flex flex-col gap-6 text-center py-2">
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 animate-pulse">
          <MonitorPlay className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-red-400">
            Ekran jest przechwytywany lokalnie
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Obraz nie jest jeszcze wysyłany do serwera.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="aspect-video overflow-hidden rounded-xl border border-slate-700 bg-black shadow-lg">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            aria-label="Lokalny podgląd przechwytywanego ekranu"
            className="h-full w-full object-contain"
          />
        </div>
        <p className="text-right font-mono text-xs text-slate-500">
          {resolution} · {framesPerSecond} FPS
        </p>
      </div>

      <Button
        type="button"
        onClick={onStopCapture}
        className="w-full h-14 text-lg font-bold bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-red-950/50 cursor-pointer transition-all"
      >
        <StopCircle className="w-6 h-6" />
        Zatrzymaj przechwytywanie
      </Button>
    </div>
  )
}
