import argparse
import subprocess
import sys
import urllib.request
import json

#funkcje pomocnicze
def server_menu():
    while True: # Pętla podmenu - trzyma nas tu, dopóki nie wpiszemy "back"
        print("\n                           K S T R E A M I")
        print("                        — Server Management —\n")
        print("              › start          Uruchamia serwer w tle")
        print("              › status         Sprawdza stan serwera")
        print("              › maintenance    Blokada dostępu (toggle)")
        print("              › back           < Powrót\n")

        # Ten input tworzy ten fajny efekt zachęty: KStreamI [server] ›
        wybor = input("  KStreamI [server] › ").strip().lower()

        if wybor == "start":
            start_server(8000)
        elif wybor == "status":
            check_status()
        elif wybor == "maintenance":
            toggle_maintenance()
        elif wybor == "back":
            break # Przerywa pętlę i wraca do głównego menu
        else:
            print("  [!] Nieznana akcja. Spróbuj ponownie.")

def interactive_mode():
    while True: # Pętla główna
        print("\n                           K S T R E A M I")
        print("                            — Tryb Interaktywny —\n")
        print("              › server         Zarządzanie serwerem")
        print("              › lobby          Zarządzanie salą")
        print("              › stream         Sterowanie rzutnikiem")
        print("              › exit           Wyjście z programu\n")

        wybor = input("  KStreamI › ").strip().lower()

        if wybor == "server":
            server_menu() # Wchodzimy do podmenu
        elif wybor == "lobby":
            print("  [!] Menu lobby w przygotowaniu...")
        elif wybor == "stream":
            print("  [!] Menu stream w przygotowaniu...")
        elif wybor == "exit":
            print("  Do widzenia! 👋")
            break
        else:
            print("  [!] Nieznana kategoria.")
    
def start_server(port):
    print("funkcja działa")
    '''try:
        subprocess.run(["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", str(port), "--reload"], check=True)
    except KeyboardInterrupt:
        print("\nZatrzymano serwer.")
    except Exception as e:
        print(f"Wystąpił błąd: {e}")'''

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
    # 1. GŁÓWNE MENU

    # Gdzieś na początku definicji parserów:
    

    parser = argparse.ArgumentParser(description="KStreamI Backend CLI - Panel Sterowania")
    subparsers = parser.add_subparsers(title="Główne kategorie", dest="category")

    go_parser = subparsers.add_parser(
            "go", 
            help="Wchodzi w tryb interaktywny",
            usage=argparse.SUPPRESS
        )

    server_parser = subparsers.add_parser(
        "server", 
        usage=argparse.SUPPRESS,
        add_help=False,
        formatter_class=argparse.RawTextHelpFormatter,
        description="""            
———————————— Opcje servera —————————————— 
› start          Uruchamia server w tle
› status         Sprawdza stan servera
› maintenance    Blokada dostępu (toggle)
—————————————————————————————————————————
        """
    )
    server_actions = server_parser.add_subparsers(dest="action")

    server_parser._action_groups = []

    start_cmd = server_actions.add_parser("start", help=argparse.SUPPRESS)
    start_cmd.add_argument("--port", type=int, default=8000)
    
    server_actions.add_parser("status", help=argparse.SUPPRESS)
    server_actions.add_parser("maintenance", help=argparse.SUPPRESS)

    # ==========================================
    # KATEGORIA 2: LOBBY (Zarządzanie salą)
    # ==========================================
    lobby_parser = subparsers.add_parser("lobby", help="👥 Zarządzanie użytkownikami i kodem PIN")
    lobby_actions = lobby_parser.add_subparsers(dest="action", help="Dostępne akcje dla lobby")
    
    # Komendy dla kategorii 'lobby':
    lobby_actions.add_parser("pin", help="Wyświetla aktualny kod PIN do sali")
    lobby_actions.add_parser("list", help="Wyświetla listę podłączonych studentów")

    # ==========================================
    # KATEGORIA 3: STREAM (Sterowanie rzutnikiem)
    # ==========================================
    stream_parser = subparsers.add_parser("stream", help="📺 Kontrola nad udostępnianiem ekranu")
    stream_actions = stream_parser.add_subparsers(dest="action", help="Dostępne akcje strumieniowania")
    
    # Komendy dla kategorii 'stream':
    force_start_cmd = stream_actions.add_parser("force-start", help="Wymusza start strumieniowania u studenta")
    force_start_cmd.add_argument("client_id", type=str, help="ID studenta, który ma zacząć udostępniać")
    
    stream_actions.add_parser("force-stop", help="Zatrzymuje aktualny strumień na rzutniku")

    # ==========================================
    # LOGIKA DECYZYJNA
    # ==========================================
    args = parser.parse_args()

    # Jeśli ktoś nie podał kategorii (wpisał samo "python cli.py")
    if not args.category:
        parser.print_help()
        sys.exit(1)
    if args.category == "go":
        interactive_mode()
        sys.exit(0)

    # Obsługa menu SERVER
    elif args.category == "server":
        if args.action == "start":
            start_server(args.port)
        elif args.action == "status":
            check_status()
        elif args.action == "maintenance":
            toggle_maintenance()
        else:
            server_parser.print_help() # Ktoś wpisał "server", ale bez akcji

    # Obsługa menu LOBBY
    elif args.category == "lobby":
        if args.action == "pin":
            print("Wkrótce: Wyświetlanie kodu PIN...")
        elif args.action == "list":
            print("Wkrótce: Pobieranie listy studentów...")
        else:
            lobby_parser.print_help()

    # Obsługa menu STREAM
    elif args.category == "stream":
        if args.action == "force-start":
            print(f"Wkrótce: Wymuszanie startu u klienta {args.client_id}...")
        elif args.action == "force-stop":
            print("Wkrótce: Zatrzymywanie rzutnika...")
        else:
            stream_parser.print_help()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()