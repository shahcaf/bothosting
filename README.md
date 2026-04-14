# Discord Bot Hosting Platform (Simplified Pterodactyl)

A modern, full-stack platform to host and manage Discord bots in isolated Docker containers with real-time logs and a sleek dashboard.

## Tech Stack
-   **Frontend**: React (Tailwind CSS, Framer Motion, Lucide)
-   **Backend**: Node.js (Express, Socket.io, Dockerode)
-   **Database**: CockroachDB (PostgreSQL compatible)
-   **Runtime**: Docker Containers

## Features
-   **Discord OAuth2**: Secure login via Discord.
-   **Bot Dashboard**: Create, Start, Stop, Restart, and Delete bots.
-   **Isolated Runtimes**: Every bot runs in a secure, sandboxed Docker container.
-   **Live Logs**: Real-time console output powered by Socket.io.
-   **File Management**: Upload bot files via .zip archives.
-   **Resource Limiting**: Customizable RAM and CPU limits per bot.
-   **Premium UI**: Dark mode, glassmorphism, and smooth animations.

---

## Setup Instructions

### 1. Prerequisites
-   [Node.js](https://nodejs.org/) (v16+)
-   [Docker](https://www.docker.com/) (Must be running)
-   [CockroachDB](https://www.cockroachlabs.com/) (Local or Cloud instance)

### 2. Backend Setup
1.  Navigate to `/server`
2.  Install dependencies: `npm install`
3.  Create a `.env` file based on `.env.example`:
    ```env
    PORT=5000
    DISCORD_CLIENT_ID=your_id
    DISCORD_CLIENT_SECRET=your_secret
    DISCORD_REDIRECT_URI=http://localhost:5000/auth/discord/callback
    DATABASE_URL=your_cockroachdb_url
    JWT_SECRET=your_secret
    BOT_STORAGE_PATH=/path/to/your/bots/folder
    ```
4.  Initialize the database using `../database/init.sql`.
5.  Start the server: `npm run dev`

### 3. Frontend Setup
1.  Navigate to `/client`
2.  Install dependencies: `npm install`
3.  Start the dev server: `npm run dev`

### 4. Docker Image
Ensure you have the base Docker image for bots:
```bash
docker pull node:18-alpine
```

---

## Folder Structure
-   `/client`: React + Tailwind frontend.
-   `/server`: Express API + Docker management.
-   `/docker`: Bot container templates.
-   `/database`: SQL schema and initialization scripts.
-   `/bots`: Directory where bot source files are stored on the host.
-   `/uploads`: Temporary folder for zip uploads.

## Security
-   Bots are isolated within Docker containers.
-   Resource limits (RAM/CPU) prevent abuse on the host machine.
-   JWT authentication protects all API endpoints.
-   No root access for bot runtimes in Docker.
