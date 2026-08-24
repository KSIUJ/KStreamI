# KStreamI

Wireless screen-casting to classroom projectors over the faculty network.
Cast your screen to the projector without leaving your seat - no cables, no
adapter roulette. Think Chromecast, but built to work on the faculty network.

> Status: 🚧 In development - KSInternships project, [2026]. Pre-MVP.

## The problem

Presenting from your laptop in class usually means a scramble for the right
adapter or the one cable that works. Off-the-shelf casting (Chromecast, etc.)
doesn't play nicely with the faculty network. KStreamI solves this: a client on
student laptops, a server on the room computer, and a simple way to manage who's sharing.

## How it works
_TBD_
<!-- TODO -->

## MVP scope
_TBD_
<!-- TODO: -->

## Tech stack
_TBD_
<!-- TODO: -->

## Getting started

### Prerequisites

- Docker
- Docker Compose plugin


### Run

From the project root, run:

```bash
docker compose up --build
```

Then open:

- Frontend: <http://localhost:5173>
- API: <http://localhost:8000>
- API documentation: <http://localhost:8000/docs>

> Screen capture requires HTTPS or localhost

To stop the application, press `Ctrl+C`.

To stop and remove the containers, run:

```bash
docker compose down
```

##  Testing

This project uses **Vitest** and **React Testing Library**.
To run tests in /frontend:
1. `npm install`
2. `npm run test`

## Project structure
_TBD_
<!-- TODO: fill in as the repo takes shape -->

## Team

👩🏼‍💻[Maria Bagińska](https://github.com/MarBi361)<br>
👩🏼‍💻[Zofia Bolesławska](https://github.com/Szopx)<br>
👨🏻‍💻[Dmytro Dychenko](https://github.com/BuffePOK)<br>
👨🏻‍💻[Jakub Karczyński](https://github.com/Kuba-kr)<br>
👩🏼‍💻[Urszula Pilśniak](https://github.com/UlaPil)<br>

**Mentor**<br>
👩🏼‍💻[Kinga Żmuda](https://github.com/kingazm)
<!-- TODO -->

## License

<!-- TODO: decide a license -->
