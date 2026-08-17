import os
import subprocess
import sys

# === KOLORY ANSI (Stonowane i profesjonalne) ===
BLUE = '\033[94m'   # Elegancki niebieski dla nagłówków
GREEN = '\033[92m'  # Zielony dla akcji pozytywnych
RED = '\033[91m'    # Czerwony dla ostrzeżeń / zatrzymywania
DIM = '\033[2m'     # Wyciszony tekst dla podpowiedzi
RESET = '\033[0m'   # Reset kolorów
BOLD = '\033[1m'    # Pogrubienie

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

# ==========================================
# WARSTWA DANYCH (Zaślepki na backend)
# ==========================================
def get_server_status():
    return "WOLNY, PREZENTACJA, OCZEKIWANIE"

def get_pin_from_server():
    return "7392"

def get_students_from_server():
    return ["Macbook - Anna", "Dell - Bartek", "Lenovo - Kasia"]

# ==========================================
# WARSTWA PREZENTACJI (Widoki CLI)
# ==========================================
def server_menu():
    while True:
        clear_screen()
        print(f"{BLUE}{BOLD}")
        print("   ╭─────────────────────────────────────╮")
        print("   │          TRYB TECHNICZNY            │")
        print("   ╰─────────────────────────────────────╯")

        print(f"{RESET}")
        print(f"     {BOLD}[1]{RESET} Uruchom system (start)")
        print(f"     {BOLD}[2]{RESET} Status diagnostyczny (status)")
        print(f"     {BOLD}[3]{RESET} Przerwa techniczna (maintenance)")
        print(f"     {BOLD}[W]{RESET} Wróć do panelu głównego\n")

        wybor = input(f"  Opcja techniczna › ").strip().lower()

        if wybor in ["1", "start"]:
            start_server(8000)
            input(f"\n  {DIM}Naciśnij Enter, aby kontynuować...{RESET}")
        elif wybor in ["2", "status"]:
            print(f"\n  Stan systemu: {BOLD}{get_server_status()}{RESET}")
        elif wybor in ["3", "maintenance"]:
            print(f"\n  {BLUE}Przełączanie trybu przerwy technicznej...{RESET}")
            input(f"  {DIM}Naciśnij Enter, aby kontynuować...{RESET}")
        elif wybor in ["w", "back", "b", ""]:
            break 
        else:
            print(f"  {RED}[!] Nieznana opcja.{RESET}")
            input(f"  {DIM}Naciśnij Enter...{RESET}")

def list_students():
    while True:
        clear_screen()
        students = get_students_from_server()

        print(f"{BLUE}{BOLD}")
        print("   ╭─────────────────────────────────────╮")
        print("   │         LISTA UCZESTNIKÓW           │")
        print("   ╰─────────────────────────────────────╯")
        print(f"     Stan systemu: {BOLD}{get_server_status()}{RESET} \n")
        print(f"{RESET}")

        if not students:
            print(f"     {DIM}Brak oczekujących uczestników.{RESET}\n")
        else:
            for i, student in enumerate(students):
                print(f"     {BOLD}[{i+1}]{RESET} {student}")

        print("\n   ─────────────────────────────────────")
        print(f"     {BOLD}[1-{len(students)}]{RESET} Wybierz numer, aby przekazać ekran")
        print(f"     {BOLD}[O]{RESET}     Odśwież listę")
        print(f"     {BOLD}[W]{RESET}     Wróć do panelu głównego\n")

        inp = input(f"  Wybierz działanie › ").strip().lower()

        if inp.isdigit() and int(inp) in range(1, len(students) + 1):
            wybrany = students[int(inp)-1]
            print(f"\n  {GREEN}✓ Przekazano uprawnienia do ekranu prelegentowi:{RESET} {BOLD}{wybrany}{RESET}")
            input(f"  {DIM}Naciśnij Enter...{RESET}")
        elif inp.isdigit():
            print(f"  {RED}[!] Niepoprawny numer na liście.{RESET}")
            input(f"  {DIM}Naciśnij Enter...{RESET}")
        elif inp in ["o", "refresh", "r"]:
            continue
        elif inp in ["w", "back", "b"]:
            break
        else:
            print(f"  {RED}[!] Nieznana opcja.{RESET}")
            input(f"  {DIM}Naciśnij Enter...{RESET}")

def main():
    while True:
        clear_screen()
        print(f"{BLUE}{BOLD}")
        print("    _  __ ____  _                            ___ ")
        print("   | |/ // ___|| |_ _ __ ___  __ _ _ __ ___ |_ _|")
        print("   | ' / \\___ \\| __| '__/ _ \\/ _` | '_ ` _ \\ | | ")
        print("   | . \\  ___) | |_| | |  __/ (_| | | | | | || | ")
        print("   |_|\\_\\|____/ \\__|_|  \\___|\\__,_|_| |_| |_|___|")
        print(f"   ─────────────────────────────────────────────{RESET}")
        
        pin = get_pin_from_server()
        print(f"   ╭───────────────────────────────────────────╮")
        print(f"   │   KOD DOSTĘPU DO EKRANU SALI: {BOLD}{BLUE}{pin}{RESET}        │")
        print(f"   ╰───────────────────────────────────────────╯\n")
        print(f"   Stan systemu: {BOLD}{get_server_status()}{RESET} \n")

        print(f"     {BOLD}[Lista]{RESET} Lista uczestników / Wybór prelegenta")
        print(f"     {BOLD}[Stop]{RESET} Zakończ aktualną prezentację ekranu")
        print(f"     {BOLD}[Tech]{RESET} Tryb techniczny (Zaawansowane)")
        print(f"     {BOLD}[Exit]{RESET} Wyjście z programu")
        print(f"     {BOLD}[Refresh]{RESET} Odśwież panel\n")

        wybor = input(f"  Wybierz opcję › ").strip().lower()

        if wybor in ["t", "server"]:
            server_menu() 
        elif wybor in ["l", "list"]:
            list_students()
        elif wybor in ["z", "stop", "s"]:
            print(f"\n  {RED}✓ Zakończono transmisję. Ekran sali jest wolny.{RESET}")
            input(f"  {DIM}Naciśnij Enter...{RESET}")
        elif wybor in ["w", "exit", "quit", "q", "e"]:
            break
        elif wybor in ["r", "refresh"]:
            continue
        else:
            print(f"  {RED}[!] Nieznana komenda.{RESET}")
            input(f"  {DIM}Naciśnij Enter...{RESET}")

def start_server(port):
    try:
        subprocess.run(["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", str(port), "--reload"], check=True)
    except KeyboardInterrupt:
        print(f"\n{DIM}Zatrzymano system (KeyboardInterrupt).{RESET}")
    except Exception as e:
        print(f"\n{RED}Wystąpił błąd systemu: {e}{RESET}")

if __name__ == "__main__":
    main()