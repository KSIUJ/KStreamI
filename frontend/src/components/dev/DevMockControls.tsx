/* ============================================================================
   DEV ONLY: Emituje ramki zdarzeń JSON zgodne ze specyfikacją WebSocket.
   ============================================================================ */

interface DevMockControlsProps {
  serverBusy?: boolean
  emitMockEvent?: (eventObject: object) => void
  showPinErrorHintOnly?: boolean 
}

export function DevMockControls({
  serverBusy,
  emitMockEvent,
  showPinErrorHintOnly = false,
}: DevMockControlsProps) {

  if (showPinErrorHintOnly) {
    return (
      <div className="mt-6 p-2.5 rounded-lg border border-dashed border-amber-500/40 bg-amber-950/20 text-xs text-amber-300 flex items-center justify-center gap-2">
        <span className="font-mono font-semibold text-[12px] uppercase tracking-wider text-amber-400 shrink-0"> DEV TOOLS: </span>
        <span className="text-[12px] text-amber-300/90 flex items-center gap-1.5"> Wpisz kod <strong>1234</strong>, aby przetestować odrzucenie PIN-u.</span>
      </div>
    )
  }

  const toggleServerStateViaWS = () => {
    emitMockEvent?.({
      type: "STATE_UPDATE",
      payload: { isBusy: !serverBusy },
    })
  }

  return (
    <div className="mt-6 p-2.5 rounded-lg border border-dashed border-amber-500/40 bg-amber-950/20 text-xs text-amber-300 flex items-center justify-center gap-3">
        <span className="font-mono font-semibold text-[12px] uppercase tracking-wider text-amber-400 shrink-0">
            DEV TOOLS:
        </span>

        <button
            type="button"
            onClick={toggleServerStateViaWS}
            className="px-2.5 py-1 rounded bg-amber-900/40 hover:bg-amber-800/60 border border-amber-600/40 transition-colors cursor-pointer"
        >
            STAN SERWERA: {serverBusy ? "🔴 ZAJĘTY" : "🟢 WOLNY"}
        </button>
    </div>
  )
}