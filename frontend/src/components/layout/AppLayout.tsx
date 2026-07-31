import { ReactNode } from "react"
import { Tv, Sun, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"

type StreamStatus = "DISCONNECTED" | "LOBBY" | "STREAMING"

interface AppLayoutProps {
  children: ReactNode
  status: StreamStatus
  userId: string
}

export function AppLayout({ children, status, userId }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex bg-slate-950">
      <div className="hidden lg:flex w-4/12 border-r border-slate-800 overflow-hidden relative">
        <img 
          src="/logo.png" 
          alt="Moja grafika" 
          className="absolute w-[100%] max-w-none h-auto left-10 -top-5"
        />
      </div>

  {/* 2. PRAWA KOLUMNA todo be*/}
  <div className="flex-1 flex flex-col">
    {/* <div className="absolute top-180 left-150 w-250 h-96 bg-blue-600/30 rounded-full blur-[220px] pointer-events-none" /> */}
        {/* NAGŁÓWEK */}
        <header className="p-6 lg:px-12 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Tv className="w-6 h-6 text-emerald-500 shrink-0" />
            <span className="font-bold text-lg tracking-wide leading-none translate-y-[3px]">
                KStreamI
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Przycisk zmiany języka */}
            <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-slate-400 hover:bg-slate-400 hover:text-slate-900 transition-colors"
            title="Zmień język / Change language"
            >
            <Globe className="w-4 h-4" />
            </Button>

            {/* Przycisk zmiany motywu */}
            <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-slate-400 hover:bg-slate-400 hover:text-slate-900 transition-colors"
            title="Przełącz motyw"
            >
            <Sun className="w-4 h-4" />
            </Button>

            {/* Dynamiczny wskaźnik statusu */}
            <div className="flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 ml-1">
              {status === "DISCONNECTED" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span className="text-slate-400">Brak połączenia</span>
                </>
              )}
              {status === "LOBBY" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-400">Połączono</span>
                </>
              )}
              {status === "STREAMING" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-red-400 font-semibold">Na żywo</span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* EKRANY (ZMIENNA ZAWARTOŚĆ) */}
        <main className="p-6 flex-1 flex flex-col justify-center gap-6 items-center">
          <div className="w-full max-w-md">
            {children}
          </div>
        </main>

        {/* STOPKA (WSPÓLNA) */}
        <footer className="p-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-500 flex justify-between items-center">
          <span>
            {status === "DISCONNECTED" && "Oczekiwanie na akcję użytkownika"}
            {status === "LOBBY" && `Tymczasowe ID: ${userId}`}
            {status === "STREAMING" && `Tymczasowe ID: ${userId} | 60 FPS`}
          </span>
        </footer>

      </div>
    </div>
  )
}