import argparse
import subprocess
import sys
import urllib.request
import json

def start_server(port):
    print(f"Uruchamianie serwera KStreamI na porcie {port}...", flush=True)
    try:
        subprocess.run(["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", str(port), "--reload"], check=True)
    except KeyboardInterrupt:
        print("\nZatrzymano serwer.")
    except Exception as e:
        print(f"Wystąpił błąd: {e}")

def check_status():
    try:
        req = urllib.request.Request("http://localhost:8000/api/health")
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"🟢 Serwer działa poprawnie! Odpowiedź: {data}")
    except Exception as e:
        print("🔴 Serwer nie odpowiada. Czy na pewno włączyłaś go komendą 'start'?")

def toggle_maintenance():
    try:
        # Puste dane (data=b'') wymuszają żądanie z ciałem, potrzebne przy metodzie POST w urllib
        req = urllib.request.Request("http://localhost:8000/api/admin/toggle-maintenance", data=b'', method="POST")
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"🔄 {data['message']}")
    except Exception as e:
        print("🔴 Nie udało się połączyć z serwerem. Czy na pewno działa?")

def main():
    parser = argparse.ArgumentParser(description="KStreamI Backend CLI")
    subparsers = parser.add_subparsers(dest="command", help="Dostępne komendy")
    
    # --- Komenda: start ---
    start_parser = subparsers.add_parser("start", help="Uruchamia serwer developerski")
    start_parser.add_argument("--port", type=int, default=8000, help="Port serwera (domyślnie 8000)")

    # --- Komenda: hello ---
    hello_parser = subparsers.add_parser("hello", help="Przykładowa komenda decyzyjna")
    hello_parser.add_argument("--name", type=str, default="Nieznajomy", help="Podaj imię do powitania")

    # --- Komenda: status ---
    subparsers.add_parser("status", help="Sprawdza, czy serwer żyje i ma się dobrze")

    # --- Komenda: toggle-maintenance ---
    subparsers.add_parser("toggle-maintenance", help="Przełącza tryb konserwacji serwera")

    args = parser.parse_args()

    # Struktura decyzyjna
    if args.command == "start":
        start_server(args.port)
    elif args.command == "hello":
        print(f"👋 Witaj, {args.name}! Twoje CLI działa znakomicie.")
    elif args.command == "status":
        check_status()
    elif args.command == "toggle-maintenance":
        toggle_maintenance()
    else:
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()