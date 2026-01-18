# Game Service

A TypeScript-based multiplayer Pong game service with matchmaking and tournament support. Built with Fastify and SQLite.

## Features

- **Matchmaking System**: Queue-based 1v1 game matching
- **Tournament Mode**: 4-player single-elimination brackets (semifinals → final)
- **Real-time Gameplay**: 60fps game loop with collision detection
- **Game History**: SQLite database for match results
- **JWT Authentication**: Token-based user authentication

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Web Framework**: Fastify
- **Database**: SQLite (better-sqlite3)
- **Testing**: Vitest
- **Development**: ts-node-dev for hot reloading

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Server runs at `http://localhost:3001`

### Building

```bash
npm run build
npm start
```

### Testing

```bash
# Run tests
npm test

# Run tests with UI
npm test:ui

# Watch mode
npm test -- --watch
```

## Project Structure

```
src/
├── core/                   # Domain models & orchestration
│   ├── game.ts            # Matchmaking orchestrator
│   ├── tournament.ts      # Tournament bracket logic
│   └── __tests__/
├── game-logic/            # Game mechanics
│   ├── game.ts           # Pong physics (Ball, Paddle, Game)
│   └── gameDatabase.ts   # SQLite persistence
├── services/              # Business logic layer
│   ├── tournamentService.ts
│   └── __tests__/
├── routes/                # HTTP API endpoints
│   ├── game.ts           # Matchmaking routes
│   └── tournament.ts     # Tournament routes
├── utils/
│   └── auth.ts           # JWT validation
└── server.ts             # Application entry point
```

## API Endpoints

### Game Routes (`/game`)

#### `POST /game/join`

Join the matchmaking queue.

**Headers**: `Authorization: Bearer <token>`

**Response**:

```json
{
  "status": "queued",
  "queueSize": 1
}
```

#### `GET /game/ready`

Poll for match status.

**Response** (waiting):

```json
{
  "status": "waiting",
  "playersInQueue": 1
}
```

**Response** (match starting):

```json
{
  "status": "starting",
  "leftPlayer": "alice",
  "rightPlayer": "bob"
}
```

#### `POST /game/move`

Send paddle input during a match.

**Headers**: `Authorization: Bearer <token>`

**Body**:

```json
{
  "direction": "UP" | "DOWN" | "NEUTRAL"
}
```

#### `GET /game/state`

Get current game state.

**Response**:

```json
{
  "status": "running",
  "ball": { "x": 50, "y": 50 },
  "paddles": {
    "left": { "y": 45 },
    "right": { "y": 55 }
  },
  "score": {
    "left": 2,
    "right": 1
  }
}
```

### Tournament Routes (`/tournament`)

#### `POST /tournament/create`

Create a new tournament (first player auto-joins).

**Headers**: `Authorization: Bearer <token>`

**Response**:

```json
{
  "tournament": {
    "status": "waiting",
    "previousWinner": "Chuck Norris",
    "semifinal1": {
      "player1": "1",
      "player2": null,
      "winner": null
    },
    ...
  }
}
```

#### `POST /tournament/join`

Join an existing tournament.

**Headers**: `Authorization: Bearer <token>`

**Response**:

```json
{
  "message": "alice joined tournament",
  "tournament": { ... }
}
```

**Note**: When 4th player joins, the first match automatically starts.

#### `GET /tournament/status`

Get current tournament state.

**Headers**: `Authorization: Bearer <token>`

**Response**:

```json
{
  "status": "semifinal_1",
  "previousWinner": "Chuck Norris",
  "semifinal1": {
    "player1": "1",
    "player2": "2",
    "winner": null
  },
  "semifinal2": {
    "player1": "3",
    "player2": "4",
    "winner": null
  },
  "final": {
    "player1": null,
    "player2": null,
    "winner": null
  },
  "currentMatch": {
    "status": "playing",
    "ball": { "x": 50, "y": 50 },
    "scores": { "left": 0, "right": 0 }
  }
}
```

## Architecture

### Matchmaking Flow

```
User → POST /game/join → joinQueue() → waitingPlayers[]
                                      ↓
                         When 2+ players → tryStartMatch()
                                      ↓
                              Game loop (60fps)
                                      ↓
                          Match complete → Save to DB
```

### Tournament Flow

```
User → POST /tournament/create → Tournament("player1")
                                      ↓
      POST /tournament/join × 3 → 4th player joins
                                      ↓
                         Status: semifinal_1 → Start match
                                      ↓
                    Match complete → recordWinner()
                                      ↓
                         Status: semifinal_2 → Start match
                                      ↓
                    Match complete → recordWinner()
                                      ↓
                         Status: final → Start match
                                      ↓
                    Match complete → Status: completed
```

## Game Rules

- **Objective**: First player to score 3 points wins
- **Scoring**: Ball passes opponent's paddle
- **Controls**: UP, DOWN, or NEUTRAL paddle movement
- **Physics**: 100×100 unit game field with wall bounces

## Database Schema

### `games` Table

```sql
CREATE TABLE games (
  winner_id INTEGER NOT NULL,
  loser_id INTEGER NOT NULL,
  winner_alias TEXT NOT NULL,
  loser_alias TEXT NOT NULL,
  played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```
