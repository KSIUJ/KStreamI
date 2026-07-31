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
          disabled={serverBusy}
          onClick={onStartStreaming}
          className="w-full h-12 text-base font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
        >
          Rozpocznij udostępnianie
        </Button>

        <Button
        variant="ghost"
        onClick={onDisconnect}
        className="w-full bg-slate-800 text-slate-400 font-normal hover:bg-slate-800/80 hover:text-slate-400 transition-all"
        >
        Rozłącz
        </Button>
      </div>

      {/* Dev Tool */}
      <button
        onClick={() => setServerBusy(!serverBusy)}
        className="text-xs text-slate-500 underline mt-2 hover:text-slate-400"
      >
        [Dev Tool]: Przełącz status serwera (Zajęty/Wolny)
      </button>
    </div>
  )
}