# Umineko Minesweeper

A real-time multiplayer Minesweeper game themed around characters from *Umineko When They Cry*. Two players compete simultaneously on the same board — reveal all safe cells before your opponent does and doesn't hit a mine.

## Features

- **Multiplayer**: Two players play on the same board in real time via WebSockets
- **Room System**: Create or join games with 6-character room codes
- **Character Selection**: Choose from Bernkastel, Erika Furudo, or Lambdadelta, each with unique visual themes
- **Three Difficulty Levels**: Easy (9×9, 10 mines), Medium (16×16, 40 mines), Hard (30×16, 99 mines)
- **Reconnection Support**: Automatic token-based reconnection with a 10-second grace period
- **Animations**: Mine explosions, particle effects, and sparkle animations

## Tech Stack

- **Backend:** Go with Gorilla WebSocket
- **Frontend:** React 19, TypeScript, Vite
- **Deployment:** Docker & Docker Compose

## Getting Started

### Prerequisites

- Go 1.26+
- Node.js (LTS)
- Docker (optional)

### Local Development

```bash
# Build the frontend
cd frontend
npm ci
npm run build

# Run the server
cd ..
go run main.go
```

The app will be available at `http://localhost:2000`.

For hot-reload during frontend development, run the Vite dev server alongside the backend:

```bash
# Terminal 1
cd frontend
npm run dev

# Terminal 2
go run main.go
```

### Docker

```bash
docker-compose up
```

Access at `http://localhost:4324`.
