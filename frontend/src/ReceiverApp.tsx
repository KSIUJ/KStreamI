import { useState, useRef } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { Button } from "@/components/ui/button"
import { useReceiverSocket } from "@/hooks/useReceiverSocket"

export function ReceiverApp() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // 1. Używamy naszego nowego hooka połączonego z Pythonem!
  const { 
    pin, 
    connectedStudents, 
    serverState, 
    activeClientId, 
    requestStreamFromClient, 
    stopCasting 
  } = useReceiverSocket("localhost")

  // Zamiast własnego stanu, opieramy się na tym, co mówi serwer.
  // Jeśli serwer jest "ACTIVE" (lub "PENDING" w trakcie łączenia), traktujemy to jako streaming.
  const isStreaming = serverState !== "IDLE"

  // Szukamy imienia aktualnie udostępniającego studenta (żeby wyświetlić w interfejsie)
  const activeStudentObj = connectedStudents.find(s => s.clientId === activeClientId)
  const activeStudentName = activeStudentObj ? activeStudentObj.clientName : "Nieznany"

  // --- STANY DO PRZESUWANIA PASKA ---
  const [barPos, setBarPos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true)
    dragStart.current = { x: e.clientX - barPos.x, y: e.clientY - barPos.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setBarPos({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }
  // ------------------------------------

  const handleSelectStudent = (clientId: string) => {
    // Wysyłamy prośbę do serwera
    requestStreamFromClient(clientId)
  }

  const handleStopSharing = () => {
    // Zatrzymujemy udostępnianie na serwerze
    stopCasting()
    setIsFullscreen(false)
    setBarPos({ x: 0, y: 0 })
  }

  const customLeftPanel = (
    <div className="w-full h-full flex flex-col p-8 lg:p-12 mt-10">
      <div className="mb-8 text-center">
        <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">
          Kod dostępu sali
        </p>
        <h2 className="text-6xl font-bold text-emerald-400 tracking-widest drop-shadow-lg">
          {pin || "..."}
        </h2>
      </div>

      <div className="flex-1 flex flex-col bg-transparent rounded-2xl p-5 overflow-hidden">
        <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4">
          Uczestnicy ({connectedStudents.length})
        </h3>
        
        <ul className="space-y-3 overflow-y-auto flex-1 pr-2">
          {connectedStudents.map(student => (
            <li key={student.clientId} className="flex justify-between items-center p-3 bg-slate-800/80 rounded-xl border border-slate-700/50 transition-colors">
              <span className="font-medium text-slate-300">{student.clientName}</span>
              <Button 
                size="sm"
                onClick={() => handleSelectStudent(student.clientId)}
                disabled={isStreaming}
                className="bg-slate-700 hover:bg-emerald-600 text-white cursor-pointer disabled:cursor-not-allowed"
              >
                Wybierz
              </Button>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="mt-6">
        <Button 
          variant="destructive" 
          className="w-full py-6 text-lg font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-red-950/60 disabled:text-white/20"
          disabled={!isStreaming}
          onClick={handleStopSharing}
        >
          Zatrzymaj udostępnianie
        </Button>
      </div>
    </div>
  )

  if (isFullscreen && isStreaming) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
        <div className="text-slate-500 text-xl border-2 border-dashed border-slate-800 p-20 rounded-3xl">
          [MOCK] Ekran udostępniany przez: <span className="text-white">{activeStudentName}</span>
        </div>
        
        <div 
          className="absolute bottom-8 bg-slate-900/90 backdrop-blur-md p-2 pr-3 rounded-2xl border border-slate-700 flex items-center gap-3 shadow-2xl"
          style={{ transform: `translate(${barPos.x}px, ${barPos.y}px)` }}
        >
           <div 
             className={`p-2 text-slate-500 hover:text-slate-300 touch-none flex items-center justify-center rounded-xl transition-colors hover:bg-slate-800 ${isDragging ? 'cursor-grabbing bg-slate-800' : 'cursor-grab'}`}
             onPointerDown={handlePointerDown}
             onPointerMove={handlePointerMove}
             onPointerUp={handlePointerUp}
             onPointerCancel={handlePointerUp}
             title="Chwyć, aby przesunąć"
           >
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
               <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/>
               <circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
             </svg>
           </div>

           <div className="w-px h-8 bg-slate-700 mx-1"></div>

           <Button 
              variant="outline" 
              className="border-slate-600 text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer" 
              onClick={() => setIsFullscreen(false)}
           >
              Zwiń ekran
           </Button>
           <Button variant="destructive" className="cursor-pointer" onClick={handleStopSharing}>
              Rozłącz studenta
           </Button>
        </div>
      </div>
    )
  }

  return (
    <AppLayout status={isStreaming ? "STREAMING" : "LOBBY"} userId="SALA_102" leftPanel={customLeftPanel}>
      <div className="w-full aspect-video bg-black/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center relative overflow-hidden">
        {isStreaming ? (
           <>
             <div className="text-emerald-500/50 text-2xl font-mono">
                [STRUMIEŃ WIDEO: {activeStudentName}]
             </div>
             <Button 
                className="absolute bottom-6 right-6 cursor-pointer" 
                onClick={() => setIsFullscreen(true)}
             >
               Powiększ (Pełny ekran)
             </Button>
           </>
        ) : (
           <div className="text-center">
             <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4 border border-slate-700">
               <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
             </div>
             <span className="text-slate-400 font-medium tracking-wide">
               Wybierz studenta z listy, aby wyświetlić jego ekran
             </span>
           </div>
        )}
      </div>
    </AppLayout>
  )
}