import { Button } from "@/components/ui/button"

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Setup UI</h1>
      <Button variant="default">Przycisk z shadcn</Button>
    </div>
  );
}

export default App