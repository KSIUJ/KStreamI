import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Signal } from "lucide-react"
import { DevMockControls } from "@/components/dev/DevMockControls"
import type { CaptureStatus } from "@/hooks/useDisplayCapture"

interface LobbyScreenProps {
  serverBusy: boolean
  emitMockEvent: (eventObject: object) => void
  captureStatus: CaptureStatus
  captureError: string | null
  onStartCapture: () => Promise<void>
  onRetryCapture: () => Promise<void>
  onDisconnect: () => void
}

export function LobbyScreen({
  serverBusy,
  emitMockEvent,
  captureStatus,
  captureError,
  onStartCapture,
  onRetryCapture,
  onDisconnect,
}: LobbyScreenProps) {
  const isRequestingCapture = captureStatus === "requesting"
  const [hasRetriedCapture, setHasRetriedCapture] = useState(false)
  const hasRetriedCaptureRef = useRef(false)

  const startNewCapture = useCallback(() => {
    hasRetriedCaptureRef.current = false
    setHasRetriedCapture(false)
    return onStartCapture()
  }, [onStartCapture])

  const retryCapture = useCallback(() => {
    if (hasRetriedCaptureRef.current) return

    hasRetriedCaptureRef.current = true
    setHasRetriedCapture(true)
    void onRetryCapture()
  }, [onRetryCapture])

  const renderCaptureHint = () => {
    if (!isRequestingCapture) {
      return (
        <p className="text-xs text-slate-400">
          Po kliknięciu pojawi się systemowe okno wyboru
        </p>
      )
    }

    if (hasRetriedCapture) {
      return (
        <p className="text-xs text-slate-400" role="status">
          Jeśli wybór nadal nie działa, rozłącz się i dołącz ponownie
        </p>
      )
    }

    return (
      <Button
        type="button"
        variant="link"
        onClick={retryCapture}
        className="h-auto p-0 text-xs text-slate-400 hover:text-slate-200"
      >
        Okno wyboru zniknęło? Spróbuj ponownie
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-5 text-center">
      <div>
        <h2 className="text-xl font-semibold">Sala 102</h2>
        <p className="text-sm text-slate-400 mt-1">
          {isRequestingCapture
            ? "Wybierz ekran lub okno, które chcesz udostępnić"
            : "Gotowy do udostępniania"}
        </p>
      </div>

      <div
        className={`p-4 rounded-xl border flex items-center gap-3 text-left transition-colors ${
          serverBusy
            ? "bg-red-950/30 border-red-800/50 text-red-200"
            : "bg-emerald-950/30 border-emerald-800/50 text-emerald-200"
        }`}
      >
        <Signal
          className={`w-5 h-5 shrink-0 ${
            serverBusy ? "text-red-400" : "text-emerald-400"
          }`}
        />
        <div className="text-sm">
          <p className="font-medium">
            {serverBusy ? "Serwer zajęty" : "Serwer gotowy"}
          </p>
          <p className="text-xs opacity-80">
            {serverBusy
              ? "Inny użytkownik właśnie udostępnia ekran"
              : "Możesz rozpocząć transmisję"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          disabled={serverBusy || isRequestingCapture}
          onClick={() => void startNewCapture()}
          className="w-full h-12 text-base font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-all"
        >
          {isRequestingCapture
            ? "Wybór w toku…"
            : "Rozpocznij udostępnianie"}
        </Button>

        {renderCaptureHint()}

        {captureError && (
          <p className="text-sm text-red-400" role="alert">
            {captureError}
          </p>
        )}

        <Button
          type="button"
          variant="ghost"
          onClick={onDisconnect}
          className="w-full bg-slate-800 text-slate-300 font-normal border border-slate-700/50 hover:bg-slate-700 hover:text-slate-100 transition-all cursor-pointer"
        >
          Rozłącz
        </Button>
      </div>

      {/* --- MOCK CONTROLS --- */}
      <DevMockControls
        serverBusy={serverBusy}
        emitMockEvent={emitMockEvent}
      />
    </div>
  )
}
