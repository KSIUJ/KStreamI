import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface DisconnectedScreenProps {
  pin: string
  setPin: (value: string) => void
  onConnect: () => void
  errorMessage?: string | null
  pinLength?: number
}

export function DisconnectedScreen({ 
  pin, 
  setPin, 
  onConnect,
  errorMessage = null,
  pinLength = 4 
}: DisconnectedScreenProps) {

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "").slice(0, pinLength)

    if (pinLength === 6 && rawDigits.length > 3) {
      setPin(`${rawDigits.slice(0, 3)}-${rawDigits.slice(3)}`)
    } else {
      setPin(rawDigits)
    }
  }

  const cleanPin = pin.replace(/\D/g, "")
  const isPinComplete = cleanPin.length === pinLength

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isPinComplete) {
      onConnect()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-center">
      <div>
        <h2 className="text-xl font-semibold">Połącz z projektorem</h2>
        <p className="text-sm text-slate-400 mt-1">
          Wpisz kod PIN wyświetlany na ekranie w sali
        </p>
      </div>

      <div className="my-1 flex flex-col gap-2">
        <Input
          type="text"
          placeholder={pinLength === 4 ? "0000" : "000-000"}
          maxLength={pinLength === 6 ? 7 : pinLength}
          value={pin}
          onChange={handlePinChange}
          className={`text-center text-2xl tracking-widest font-mono bg-slate-950 border text-emerald-400 h-14 uppercase transition-colors ${
            errorMessage ? "border-red-500/80 focus:border-red-500" : "border-slate-700"
          }`}
        />

        {errorMessage && (
          <p className="text-xs text-red-400 font-medium">
            {errorMessage}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={!isPinComplete}
        className="w-full h-12 text-base font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
      >
        Połącz
      </Button>
    </form>
  )
}