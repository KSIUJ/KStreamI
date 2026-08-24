import { ReactNode } from "react"
import { Tv, Sun, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"

export type ViewStatus = "DISCONNECTED" | "JOINING" | "LOBBY" | "STREAMING"

interface AppLayoutProps {
  children: ReactNode
  status: ViewStatus
  userId: string
  leftPanel?: ReactNode
}

export function AppLayout({ children, status, userId, leftPanel }: AppLayoutProps) {  
  // Punkty skosu (topX = góra 40%, bottomX = dół 35%)
  const topX = 40;
  const bottomX = 35;

  const clipLeft = `polygon(0 0, ${topX}% 0, ${bottomX}% 100%, 0 100%)`

  const headerPadding = `${topX + 3}%`
  const footerPadding = `${bottomX + 3}%`
  const mainPadding = `${(topX + bottomX) / 2 + 3}%`

  return (
    <div className="min-h-screen text-slate-100 flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 relative overflow-hidden">
      
      {/* 1. LEWY PANEL */}
      <div 
        className="hidden lg:block absolute inset-0 z-30 bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950/90 backdrop-blur-md pointer-events-none"
        style={{ clipPath: clipLeft }}
      >
        <div className="w-[37.5%] h-full flex items-center justify-center pl-[3vw] pr-[1vw]">
          {leftPanel ? (
            <div className="w-full h-full pointer-events-auto">
              {leftPanel}
            </div>
          ) : (
            <Logo className="h-[105vh] w-auto scale-110 transform translate-x-[3vw] object-contain" />
          )}
        </div>
      </div>

      {/* 2. LINIA PODZIAŁU (Tylko na dużych ekranach lg:) */}
      <svg 
        className="hidden lg:block absolute inset-0 w-full h-full z-30 pointer-events-none drop-shadow-[-4px_0_8px_rgba(0,0,0,0.7)]"
      >
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="45%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#065f46" />
          </linearGradient>
        </defs>
        <line 
          x1={`${topX}%`} 
          y1="0" 
          x2={`${bottomX}%`} 
          y2="100%" 
          stroke="url(#lineGradient)" 
          strokeWidth="3"
        />
      </svg>

      {/* 3. PRAWA STRONA Z ZAWARTOŚCIĄ */}
      <div className="flex-1 flex flex-col relative z-10 w-full min-h-screen">
        
        {/* NAGŁÓWEK */}
        <header 
          className="p-4 sm:p-6 lg:pr-12 flex items-center justify-between bg-slate-900/60 backdrop-blur-md border-b border-slate-800/50 w-full lg:[padding-left:var(--pl)]"
          style={{ "--pl": headerPadding } as React.CSSProperties}
        >
          <div className="flex items-center gap-2">
            <Tv className="w-6 h-6 text-emerald-500 shrink-0" />
            <span className="font-bold text-lg tracking-wide leading-none translate-y-[3px]">
              KStreamI
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Jeśli zdecydujemy się na możliwość zmiany języka 
            
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer"
              title="Zmień język / Change language"
            >
              <Globe className="w-4 h-4" />
            </Button> */}

            <div className="flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700/60 ml-1">
              {status === "DISCONNECTED" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span className="text-slate-400">Brak połączenia</span>
                </>
              )}
              {status === "JOINING" && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-amber-400">Łączenie...</span>
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
                  <span className="text-red-400 font-semibold">
                    Podgląd lokalny
                  </span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* EKRANY (ZMIENNA ZAWARTOŚĆ) */}
        <main 
          className="p-6 flex-1 flex flex-col justify-center items-center w-full lg:[padding-left:var(--pl)]"
          style={{ "--pl": mainPadding } as React.CSSProperties}
        >
          <div
            className={`w-full ${
              status === "STREAMING" ? "max-w-4xl" : "max-w-md"
            }`}
          >
            {children}
          </div>
        </main>

        {/* STOPKA */}
        <footer 
          className="p-3 sm:px-6 lg:pr-6 bg-slate-950/80 backdrop-blur-md border-t border-slate-800/50 text-xs text-slate-500 flex justify-between items-center w-full lg:[padding-left:var(--pl)]"
          style={{ "--pl": footerPadding } as React.CSSProperties}
        >
          <span>
            {status === "DISCONNECTED" && "Oczekiwanie na akcję użytkownika"}
            {status === "LOBBY" && `Tymczasowe ID: ${userId}`}
            {status === "STREAMING" &&
              `Tymczasowe ID: ${userId} | Przechwytywanie lokalne`}
          </span>
        </footer>

      </div>
    </div>
  )
}
