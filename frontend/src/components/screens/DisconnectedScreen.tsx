import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface DisconnectedScreenProps {
  pin: string
  setPin: (value: string) => void
  onConnect: () => void
}

export function DisconnectedScreen({ pin, setPin, onConnect }: DisconnectedScreenProps) {
  
  // Formatowanie na wzór "123-456"
  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Wyciągamy same cyfry (max 6)
    const rawDigits = e.target.value.replace(/\D/g, "").slice(0, 6)

    // 2. Jeśli wpisano więcej niż 3 cyfry, dodajemy myślnik bez spacji
    if (rawDigits.length > 3) {
      setPin(`${rawDigits.slice(0, 3)}-${rawDigits.slice(3)}`)
    } else {
      setPin(rawDigits)
    }
  }

  // Weryfikacja obecności pełnych 6 cyfr
  const isPinComplete = pin.replace(/\D/g, "").length === 6

  // Obsługa zatwierdzania Enterem
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

      <div className="my-2">
        <Input
          type="text"
          placeholder="000-000"
          maxLength={7} // 6 cyfr + myślnik = 7 znaków
          value={pin}
          onChange={handlePinChange}
          className="text-center text-2xl tracking-widest font-mono bg-slate-950 border-slate-700 text-emerald-400 h-14 uppercase"
        />
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