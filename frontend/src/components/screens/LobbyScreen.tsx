import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Signal } from "lucide-react"

interface LobbyScreenProps {
  serverBusy: boolean
  setServerBusy: (value: boolean) => void
  onStartStreaming: () => void
  onDisconnect: () => void
}

export function LobbyScreen({
  serverBusy,
  setServerBusy,
  onStartStreaming,
  onDisconnect,
}: LobbyScreenProps) {

  // Globalny listener na klawisz Enter dla całego ekranu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !serverBusy) {
        e.preventDefault()
        onStartStreaming()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [serverBusy, onStartStreaming])

  return (
    <div className="flex flex-col gap-5 text-center">
      <div>
        <h2 className="text-xl font-semibold">Sala 102</h2>
        <p className="text-sm text-slate-400 mt-1">Gotowy do udostępniania</p>
      </div>

      {/* Status serwera */}
      <div
        className={`p-4 rounded-xl border flex items-center gap-3 text-left ${
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
          disabled={serverBusy}
          onClick={onStartStreaming}
          className="w-full h-12 text-base font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-all"
        >
          Rozpocznij udostępnianie
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onDisconnect}
          className="w-full bg-slate-800 text-slate-300 font-normal border border-slate-700/50 hover:bg-slate-700 hover:text-slate-100 transition-all cursor-pointer"
        >
          Rozłącz
        </Button>
      </div>

      {/* Dev Tool */}
      <button
        type="button"
        onClick={() => setServerBusy(!serverBusy)}
        className="text-xs text-slate-500 underline mt-2 hover:text-slate-400 cursor-pointer"
      >
        [Dev Tool]: Przełącz status serwera (Zajęty/Wolny)
      </button>
    </div>
  )
}