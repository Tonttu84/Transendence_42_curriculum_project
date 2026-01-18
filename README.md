# Transcenders

*This project has been created as part of the 42 curriculum by Aarne, Xi, Jack, Johannes, Paula.*

---

## Description

**Transcenders** is a full-stack web application that brings the classic Pong game into the modern era with real-time multiplayer tournaments, spectating and user management.

### Key Features

- **Real-time Multiplayer Gameplay**: Play Pong against opponents remotely with synchronized game states via HTTP polling
- **Tournament System**: Organize and participate in bracket-style tournaments with automated matchmaking
- **Comprehensive User Management**: Secure authentication with email/password and Google OAuth, complete with 2FA support
- **Public API**: Secured API key authentication, rate limiting, API documentation
- **Microservices Architecture**: Scalable backend design with separation of concerns

### Project Goal

The goal of this project is to create a robust, production-ready web application that demonstrates mastery of modern web development technologies, including real-time communication, authentication systems, microservices architecture, and DevOps practices.

---

## Team Information

### Team Roles

| Login | Role | Responsibilities |
|-------|------|------------------|
| **Paula** | Product Owner (PO) | Defines product vision, prioritizes features, validates completed work, communicates with stakeholders |
| **Johannes** | Project Manager (PM) | Organizes team meetings, tracks progress and deadlines, manages risks and blockers, ensures team communication |
| **Xi** | Technical Lead | Defines technical architecture, makes technology stack decisions, ensures code quality and best practices, reviews critical code changes |
| **Aarne** | Developer | Implements features and modules, participates in code reviews, tests implementations, documents work |
| **Xi** | Developer | Implements features and modules, participates in code reviews, tests implementations, documents work |
| **Jack** | Developer | Implements features and modules, participates in code reviews, tests implementations, documents work |
| **Johannes** | Developer | Implements features and modules, participates in code reviews, tests implementations, documents work |
| **Paula** | Developer | Implements features and modules, participates in code reviews, tests implementations, documents work |

---

## Project Management

### Organization Approach

Our team followed an Agile-inspired approach with the following practices:

- **Task Distribution**: Used GitHub Issues to track features and assign work
- **Code Reviews**: All major changes reviewed by at least one other team member via Pull Requests
- **Clear Communication**: Discord server for quick team communication and coordination
- **Reguar F2F**: Agle principle 6 - Face to Face communication

### Tools Used

- **Version Control**: Git with GitHub
- **Task Management**: GitHub Issues and Pull Requests
- **Communication**: Discord for team chat
- **Documentation**: Markdown files in repository
- **CI/CD**: GitHub Actions for automated testing

### Work Distribution

Work was divided based on team members' strengths and interests:
- **Backend Services**: Distributed among all developers
- **Frontend Development**: Primary focus by Paula with support from all
- **DevOps & Infrastructure**: Microservices architecture by Xi
- **Authentication**: OAuth and 2FA implementation by Xi
- **Game Logic**: Real-time multiplayer and tournament systems by Aarne, Johannes and Jack
- **Testing & QA**: Testing and compliance verification by all

All team members contributed to both frontend and backend work to ensure everyone understood the full stack.

---

## Technical Stack

### Frontend Technologies

- **Framework**: React with TypeScript
  - **Why React**: Component-based architecture allows for reusable UI components, excellent ecosystem with extensive libraries, strong TypeScript support for type safety, virtual DOM for efficient updates
  - **Why TypeScript**: Type safety reduces bugs, better IDE support with autocomplete, easier refactoring, clearer code documentation
  
- **Styling**: Styled Components
  - **Why Styled Components**: Component-scoped styling prevents CSS conflicts, dynamic styling based on props, better TypeScript integration, CSS-in-JS keeps styles close to components, no need for separate CSS files

- **Code Formatting**: Prettier
  - **Why Prettier**: Consistent code style across team, automatic formatting, integrated into CI/CD pipeline
  
- **Real-time Communication**: HTTP Polling
   - **Why**: Simpler architecture without WebSocket complexity, reliable connection handling, high-frequency game state polling provides smooth gameplay, regular status polling for UI updates, easier to debug and maintain than WebSockets

### Backend Technologies

- **Framework**: Fastify
  - **Why Fastify**: High performance, built-in TypeScript support, schema validation, low overhead, modern async/await patterns
  
- **Database**: SQLite
  - **Why SQLite**: Lightweight, serverless, perfect for development and moderate production loads, zero configuration
  - **Auth Service**: Uses Drizzle ORM for type-safe database access, excellent TypeScript integration, automatic migrations, clear schema definition
  - **Game Service**: Uses todo better-sqlite3 with raw SQL prepared statements for simple game results storage
  
- **Authentication**:
  - OAuth support
  - JWT for session management
  - bcrypt for password hashing
  - otplib for 2FA TOTP generation
  
- **Real-time Communication**: HTTP Polling
  - **Why**: Lightweight and straightforward architecture, high-frequency game state polling delivers responsive gameplay, regular status polling for UI updates, eliminates WebSocket connection overhead and complexity, easier integration with existing HTTP infrastructure

### Microservices Architecture

Our application is split into independent services:

1. **Auth Service** (Port 3003)
   - User authentication (email/password, OAuth)
   - User management (CRUD)
   - Session management (JWT tokens)
   - 2FA verification
   - User profiles and settings
   - Friend management
   - Avatar uploads

2. **Game Service** (Port 3001)
   - Game logic and state management
   - Real-time HTTP polling endpoints
   - Match creation and management
   - Tournament creation and brackets
   - Matchmaking
   - Tournament progression logic

3. **Frontend** (served via Nginx on Port 5173)
   - React-based web application
   - Built during Docker image creation
   - Served as static files by Nginx
   - Communicates with backend services via REST APIs

**Why Microservices**: Separation of concerns, independent scaling, fault isolation, easier testing, team members can work on different services independently

### DevOps & Monitoring

- **Containerization**: Docker and Docker Compose
  - **Why**: Consistent environment across development and production, easy deployment, service isolation
   
- **Reverse Proxy**: Nginx
  - **Why**: SSL termination, static file serving, routing to microservices
  - **Routes**:
    - `/api/users/*` → Auth Service (Port 3003)
    - `/api/game/*` → Game Service (Port 3001)
    - `/api/tournament/*` → Game Service (Port 3001)
    - `/` → Frontend static files

### Additional Technologies

- **Validation**: Zod for runtime type validation
- **Testing**: Vitest for unit and integration tests
- **API Documentation**: Swagger/OpenAPI for game service
- **Environment Variables**: dotenv for configuration management
- **Database Drivers**: better-sqlite3 for game service database access

---

## Database Schema & Data Storage

Our application uses SQLite databases with different approaches for each service.

### Auth Service Database (SQLite + Drizzle ORM)

**Location**: `./auth-service/db/auth.sqlite` (persistent via Docker volume)
**Technology**: Drizzle ORM for type-safe database access

#### Tables

**users**
- `id` (integer, primary key, autoincrement)
- `username` (text, unique, not null)
- `email` (text, unique, not null)
- `passwordHash` (text, nullable - null for OAuth users)
- `avatar` (text, nullable)
- `googleOauthId` (text, nullable)
- `twoFaToken` (text, default empty string)
- `createdAt` (integer timestamp, not null)

**friends**
- `userId` (integer, foreign key → users.id)
- `friendId` (integer, foreign key → users.id)
- **Composite Primary Key**: (userId, friendId)
- Implements many-to-many self-referential relationship for friend connections

**tokens**
- `id` (integer, primary key, autoincrement)
- `userId` (integer, foreign key → users.id)
- `token` (text, unique, not null)
- `createdAt` (integer timestamp)
- **Index**: tokens_ts_idx on createdAt

**heartbeat**
- `id` (integer, primary key, autoincrement)
- `userId` (integer, not a foreign key for simplicity)
- `createdAt` (integer timestamp)
- **Index**: heartbeat_ts_idx on createdAt
- Used to track user online status

### Game Service Database (SQLite + better-sqlite3)

**Location**: `./game-service/data/game_results.db` (persistent via Docker volume)
**Technology**: better-sqlite3 with raw SQL (NOT Drizzle ORM)

#### Tables

**games**
- `id` (integer, primary key, autoincrement)
- `winner_id` (integer, not null)
- `loser_id` (integer, not null)
- `played_at` (timestamp, default CURRENT_TIMESTAMP)

Stores completed 1v1 game results. User IDs reference users in the auth service database. Used for match history display (last 20 games per user).

### In-Memory Data (Transient - Lost on Restart)

The following data structures exist only in application memory and are not persisted:

**Active Game State** (game_service.ts):
- Matchmaking queue (waiting players)
- Active running matches (game state: ball position, paddle positions, scores)
- Player-to-match mappings
- Recently finished matches (kept for 15 seconds for polling)

**Tournament State** (tournament_service.ts):
- Active tournament data (4-player single elimination)
- Tournament status: waiting, semifinal_1, semifinal_2, final, completed
- Player roster (player1, player2, player3, player4)
- Match winners (semifinal1Winner, semifinal2Winner, finalWinner)
- Previous tournament winner name

**Note**: Tournament results are NOT saved to the database. Only individual game results from tournament matches could theoretically be saved to the `games` table, but currently tournament context is not preserved.

### Key Relationships

```
Auth Service (Persistent):
User
  ├── Friends (many-to-many self-relation)
  └── Tokens (one-to-many)

Game Service (Persistent):
games
  ├── winner_id → references User in auth service
  └── loser_id → references User in auth service

Game Service (In-Memory Only):
Match (active games)
Tournament (bracket state)
```

### Data Integrity Notes

- Auth service uses Drizzle ORM with proper foreign keys and type safety
- Game service uses raw SQL prepared statements to prevent SQL injection
- Indexes on frequently queried fields (email, username, createdAt timestamps)
- Docker volume mounts ensure database persistence across container restarts
- Tournament and active game state are intentionally transient for simplicity

---

## Features List

### Core Features

1. **User Authentication & Management** (Xi)
   - Email/password registration and login with passwords
   - Google OAuth 2.0 integration
   - Two-Factor Authentication (2FA) with TOTP
   - User profile pages with customizable information
   - Avatar upload and management
   - Friend system (add, view friends list)
   - Online status indicators for friends

3. **Game System** (Aarne, Jack, Paula, Johannes)
   - Real-time server side multiplayer Pong game
   - Win/loss detection and scoring
   - Graceful handling of disconnections
   - Reconnection support

4. **Tournament System** (Aarne, Jack, Paula, Johannes)
   - Tournament creation and registration
   - Automated bracket generation
   - Clear matchup visualization
   - Winner advancement logic

5. **Public API** (Paula, Johannes, Xi)
   - public API to interact with the database
   - API key security
   - rate limited

6. **Microservices Architecture** (Xi, support from others)
   - Separate services for Auth, Game.
   - Inter-service REST API communication
   - Nginx reverse proxy for routing

---

## Modules

Our project implements **19 points** worth of modules (minimum required: 14 points).

### Major Modules (2 points each)

1. ✅ **Use a framework for both frontend and backend** (2 points)
   - **Frontend**: React with TypeScript
   - **Backend**: Fastify
   - **Implemented by**: All team members
   - **Implementation**: Complete component-based frontend with Fastify REST APIs and HTTP polling endpoints in backend services

2. ✅ **Standard user management and authentication** (2 points)
   - **Features**: Email/password signup/login, profile updates, avatar uploads, friend system, online status
   - **Security**: Hashed passwords with bcrypt, JWT tokens, secure session management
   - **Implemented by**: Aarne, Jack, Xi, Paula, Johannes
   - **Implementation**: Fully functional user system with all required features

3. ✅ **Complete web-based game** (2 points)
   - **Game**: Real-time multiplayer Pong
   - **Features**: Live gameplay, clear win/loss conditions, synchronized state
   - **Implemented by**: All team members contributed to game logic and rendering
   - **Implementation**: Fully playable Pong game in browser

4. ✅ **Remote players** (2 points)
   - **Technology**: HTTP Polling
   - **Features**: Real-time synchronization, network latency handling, reconnection logic
   - **Implemented by**: Xi (polling architecture), all members (testing)
   - **Implementation**: Two players on different computers can play together seamlessly

5. ✅ **Public API** (2 points)
   - **Features**: Secured API key authentication, rate limiting, API documentation
   - **Endpoints**: Minimum 5 endpoints covering GET, POST, PUT, DELETE operations
   - **Implemented by**: Paula, Johannes, Xi
   - **Implementation**: RESTful public API with secured access, rate limiting, and comprehensive documentation

6. ✅ **Backend as microservices** (2 points)
   - **Services**: Auth Service (authentication + user management), Game Service (game logic + tournaments), Frontend (React SPA served via Nginx)
   - **Architecture**: Each service has single responsibility, communicates via REST APIs, routed through Nginx reverse proxy
   - **Implemented by**: All team members (each worked on different services)
   - **Implementation**: Complete microservices architecture with clear separation of concerns, containerized with Docker

### Minor Modules (1 point each)

7. ✅ **Use an ORM for database** (1 point)
   - **ORM**: Drizzle
   - **Benefits**: Type-safe queries, automatic migrations, no raw SQL
   - **Implemented by**: All team members use Drizzle for database access
   - **Implementation**: Complete Drizzle schema with all models and relations

8. ✅ **Additional browser support** (1 point)
   - **Browsers**: Google Chrome (required), Firefox, Safari/Edge
   - **Testing**: Verified functionality across all three browsers
   - **Implemented by**: Jack (testing and verification)
   - **Implementation**: Application works without errors in Chrome, Firefox, and Safari

9.  ✅ **OAuth 2.0 authentication** (1 point)
    - **Provider**: Google OAuth 2.0
    - **Features**: Login with Google, automatic user creation, secure token handling
    - **Implemented by**: Aarne, Jack, Xi, Paula, Johannes
    - **Implementation**: Fully functional Google OAuth login flow

10. ✅ **Two-Factor Authentication (2FA)** (1 point)
    - **Technology**: TOTP with speakeasy library
    - **Features**: 6-digit code verification, enable/disable 2FA
    - **Implemented by**: Xi, Paula
    - **Implementation**: Complete 2FA system with QR code scanning

11. ✅ **Tournament system** (1 point)
    - **Features**: Tournament creation, player registration, bracket generation, winner advancement
    - **Implemented by**: Aarne, Jack, Paula
    - **Implementation**: Fully functional tournament system with clear bracket visualization

12. ✅ **Support for multiple languages** (1 point)
    - **Technology**: react-intl (v7.1.14)
    - **Languages**: English, Finnish, German, Russian, Chinese (5 languages)
    - **Features**: Language switcher in UI, all user-facing text translatable
    - **Implemented by**: Paula, Aarne, Xi
    - **Implementation**: Custom LanguageProvider wrapping IntlProvider, translations in frontend/src/config/locales/, useLanguage hook for switching

13. ✅ **Spectator mode for games** (1 point)
    - **Features**: Watch ongoing games, real-time updates for spectators
    - **Implementation**: Paula, Aarne

### Module Point Calculation

| Module Type | Count | Points Each | Total Points |
|-------------|-------|-------------|--------------|
| Major Modules | 6 | 2 | 12 |
| Minor Modules | 7 | 1 | 7 |
| **TOTAL** | **13** | | **19 points** ✅ |

**Required minimum**: 14 points  
**Our total**: 19 points  
**Buffer**: 5 points

---

## Individual Contributions

### Aarne
**Role**: Developer  
**Primary Contributions**:
- Setup the Fastify-based game-service, including folder structure, environment/config wiring, and modular route registration.
- Built core REST API for the game lifecycle: queue/join, match creation, game state/status polling, paddle input, and match completion/results.
- Integrated endpoints with existing tournament and game logic, ensuring correct state transitions and consistent server-side behavior.
- Implemented matchmaking/queue flow and match lifecycle management.
- Added database-backed match history, including query logic to fetch and return historical results.
- Added Swagger/OpenAPI documentation and Fastify JSON schemas for request/response validation to enforce API contracts.
- Implemented inter-service authentication by validating bearer tokens via the Auth service, with short-lived in-memory caching (20s TTL) to reduce Auth traffic and improve latency.
- Participated in code reviews and testing

**Challenges Overcome**: 
- Stabilized gamestate/gamestatus polling performance by caching validated bearer tokens, reducing repeated Auth validation calls


---

### Xi
**Role**: Technical Lead, Developer  
**Primary Contributions**:
- Made critical technical decisions on tech stack
- Built user management and auth services as well as designed the microservices architechture
- Technology support for other developers 

**Challenges Overcome**: Creating complete services alone and integrating them with the services created by the team. 

---

### Jack
**Role**: Developer (QA & Compliance Focus)  
**Primary Contributions**:
- Quality assurance and compliance verification
- Created testing frameworks (npm test, GitHub Actions) and manual verification checklists
- Conducted browser compatibility testing (Chrome, Firefox, Safari)
- Verified README completeness and documentation
- Tested user flows and edge cases
- Created the internal logic for tournament 
- Created tests for the tournament and game


**Challenges Overcome**: Keeping up with evolving project in documentation.

---

### Johannes
**Role**: Project Manager, Developer  
**Primary Contributions**:
- Organized team meetings and tracked project progress
- Managed GitHub Issues and project board
- Coordinated work distribution among team members
- Ensured deadlines were met
- Created the main game logic
- Contributed to the architechture and control flow of the system

**Challenges Overcome**: Balancing PM responsibilities with development work, coordinating asynchronous team work across different schedules

---

### Paula
**Role**: Product Owner, Developer  
**Primary Contributions**:
- Built most of the frontend
- Responsible for frontend technology choices
- Coordinated closely with backend developers
- Ensured best practices for Git and PR, automated and manual testing, etc.
- Communicated with team about feature scope and requirements
- Ensured project met 42 School evaluation criteria

**Challenges Overcome**: Balancing feature scope with time constraints, prioritizing must-have vs nice-to-have features

---

## Instructions

### Prerequisites

Before running the application, ensure you have the following installed:

- **Docker** and **Docker Compose**


### Environment Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url> chosen_folder
   cd chosen_folder
   ```


### Makefile



2. **Make**


# If you are running the server

OAuth must be run from c2r5p11 because of config with cloud. Everything except OAuth will work from any machine.

Use ```make eval``` from c2r5p11 to allow OAuth.

Use ```make up``` from any machine.

This will start all services:
- Frontend: https://localhost:5173/
- Auth Service: http://localhost:3003 (internal)
- Game Service: http://localhost:3001 (internal)

Wait for all services to be healthy, then visit https://localhost:5173/

### Running Locally (Development)

If you want to run services individually for development:

#### 1. Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend will start on https://localhost:5173/

#### 2. Auth Service

```bash
cd auth-service
pnpm install
pnpm dev
```

Auth service will start on http://localhost:3003

#### 3. Game Service

```bash
cd game-service
pnpm install
pnpm dev
```

Game service will start on http://localhost:3001


### Database Setup

The database is automatically initialized when you start the auth service.


### Stopping the Application

make down


### Removing everything

make fclean

## Makefile Commands

Make file can be used instead of npm or docker in many cases.

### Main Commands

| Command | Description |
|---------|-------------|
| `make` or `make all` | Default command - runs `make up` |
| `make up` | Starts all services (creates .env if needed, ensures DB directories exist, runs docker compose up --build -d) |
| `make down` | Stops all running services |
| `make restart` | Stops and restarts all services (down → up) |

### Development & Monitoring

| Command | Description |
|---------|-------------|
| `make logs` | Shows live logs from all services |
| `make auth` | Shows live logs from auth-service only |
| `make game` | Shows live logs from game-service only |
| `make nginx` | Shows live logs from nginx only |
| `make build` | Builds all Docker images without starting them |

### Setup Commands

| Command | Description |
|---------|-------------|
| `make env` | Creates auth-service/.env with default development config (auto-detects your local IP) |
| `make db-dirs` | Creates database directories (auth-service/db, game-service/data) with proper permissions |
| `make eval` | **For evaluation machine only** - copies secrets from ~/transendence-secrets/.env and starts services at https://c2r5p11.hive.fi:5173/ |

### Cleanup Commands

| Command | Description |
|---------|-------------|
| `make clean` | Stops services, removes Docker images, volumes, and orphaned containers |
| `make fclean` | **Full cleanup** - runs clean, then deletes .env file, all database files (*.sqlite, *.db), and prunes Docker build cache |

### Important Notes

1. **`make up`** is the standard command - it automatically:
   - Creates `.env` file if missing (with your local IP)
   - Creates database directories
   - Builds and starts all containers

2. **`make eval`** is special - it's configured for the evaluation machine (c2r5p11.hive.fi) with real OAuth credentials from `~/transendence-secrets/.env`

3. **`make fclean`** is the "nuclear option" - completely resets everything including databases and Docker cache

4. **Default credentials** in auto-generated .env (for development):
   - JWT_SECRET: `not-dev-secret`
   - Google OAuth: Fake credentials (won't work for real OAuth)
   - Frontend URL: Auto-detected based on your machine's IP


## Resources

### Documentation & Tutorials

- **React Documentation**: https://react.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Fastify Documentation**: https://fastify.dev/
- **drizzle-orm Documentation**: https://orm.drizzle.team
- **better-sqlite3 Documentation**: https://github.com/WiseLibs/better-sqlite3
- **Docker Documentation**: https://docs.docker.com/
- **Prettier**: https://prettier.io/docs/en/

### Learning Resources

- **OAuth 2.0 Explained**: https://www.oauth.com/
- **Microservices Architecture**: https://microservices.io/
- **JWT Best Practices**: https://auth0.com/docs/secure/tokens/json-web-tokens

### Tools & Libraries

- **Passport.js**: Authentication middleware - http://www.passportjs.org/
- **bcrypt**: Password hashing - https://www.npmjs.com/package/bcrypt
- **otplib**: 2FA TOTP generation - https://www.npmjs.com/package/otplib
- **Zod**: Runtime validation - https://zod.dev/
- **Vitest**: Testing framework - https://vitest.dev/

### AI Usage

We used AI assistance (Claude, Gemini, ChatGPT) for the following tasks:

1. **Code Generation Support**:
   - Boilerplate code for REST API endpoints
   - TypeScript type definitions and interfaces
   - React component structure templates

2. **Documentation**:
   - README template structure
   - API documentation formatting
   - Code comments and JSDoc
   - Testing documentation

3. **Debugging Assistance**:
   - TypeScript type errors
   - Docker configuration problems
   - Database schema and migration issues

4. **Learning & Research**:
   - Best practices for microservices communication
   - OAuth 2.0 implementation patterns
   - 2FA security considerations
   - Searching documents
   - Checking differences in material
   - Getting overview of new concepts

5. **Testing & QA**:
   - Test case generation
   - Manual testing checklists
   - Edge case identification
   - Compliance verification procedures
   - Checking how a feature was implemented

**Important**: All AI-generated code was reviewed, understood, and modified by team members. We did not blindly copy-paste AI suggestions. Each team member can explain and justify the code they committed.

---

## Additional Information

### Tournament logic

4-player single-elimination bracket.

Players are matched in join order: Player 1 vs Player 2, Player 3 vs Player 4.

Semi-final winners advance to the final match.

The final winner takes the tournament.


### Browser Compatibility

Tested and verified on:
- ✅ Google Chrome (latest stable) - Primary development browser
- ✅ Mozilla Firefox (latest stable)
- ✅ Safari / Microsoft Edge (latest stable)

No console errors or warnings in any supported browser.

### Security Considerations

- Passwords hashed with bcrypt (cost factor 10)
- JWT tokens for session management with expiration
- HTTPS enforced in production
- Environment variables for all secrets
- Input validation on both client and server
- CORS properly configured
- SQL injection prevented by Drizzle ORM
- XSS protection with React's built-in escaping
  - React automatically escapes all dynamic content before rendering
  - If a user tries to inject a malicious `<script>` tag, React converts the special characters into harmless text before it ever hits the browser

### Known Limitations

- SQLite database suitable for moderate load (consider PostgreSQL for high traffic)
- Tournament is for fixed player amount only
- Avatar uploads limited in size
- Limited to Pong game (no additional games implemented)



### License

This project is created for educational purposes as part of the 42 School curriculum.

### Contact

For questions or issues, please contact any team member:
- Aarne
- Xi
- Jack
- Johannes
- Paula

---

**Thank you for checking out our project!** 🚀
