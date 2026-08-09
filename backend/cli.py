#I know że to folder backendu ale chat krzyczy że CLI servera ma być tu

import argparse
import subprocess
import sys

def start_server():
    print("🚀 Uruchamianie serwera KStreamI...", flush=True)

    try:
        subprocess.run(["uvicorn", "app.main:app", "--host", "0.0.0.0", "--reload"], check=True)
    except KeyboardInterrupt:
        print("\nZatrzymano serwer.")
    except Exception as e:
        print(f"Wystąpił błąd: {e}")

def main():
    parser = argparse.ArgumentParser(description="KStreamI Backend CLI")
    
    subparsers = parser.add_subparsers(dest="command", help="Dostępne komendy")

    start_parser = subparsers.add_parser("start", help="Uruchamia serwer developerski")


    args = parser.parse_args()

    if args.command == "start":
        start_server()
    else:
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()