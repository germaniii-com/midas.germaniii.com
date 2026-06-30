
╔══════════════════════════════════════════╗
║                                          ║
║          ╔╗ ╔╗ ╔═╗ ╔╦╗ ╔═╗ ╔═╗           ║
║          ║╚╦╝║  ║  ║║║ ╠═╣ ╚═╗           ║
║          ╩ ╩ ╩ ╚═╝ ═╩╝ ╩ ╩ ╚═╝           ║
║                                          ║
║                ▄▄██████▄▄                ║
║              ▄████▀▀▀▀████▄              ║
║             ████ █▀▄▄▀█ ████             ║
║             ████ █    █ ████             ║
║              ▀████▄▄▄▄████▀              ║
║                ▀▀██████▀▀                ║
║                                          ║
║   Self-hosted personal finance tracker   ║
║                                          ║
╚══════════════════════════════════════════╝

## Overview

Midas is a self-hosted, multi-tenant personal finance application. Create password-protected budget "binders" to track accounts, transactions, recurring bills, investments, and more — with full control over your data.

- **Stack**: TypeScript monorepo (Fastify + SQLite backend, React + Vite + Tailwind CSS frontend)
- **Storage**: SQLite via Drizzle ORM, local filesystem or MinIO/S3 for attachments
- **Sync**: Bidirectional data sync between self-hosted instances

---

## Docker Setup (Recommended)

**Prerequisites:** Docker and Docker Compose

```bash
git clone <repo-url>
cd midas

# Copy environment files (edit to your preferences)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start all services
docker compose up -d

# Run database migrations
docker compose exec api npx drizzle-kit migrate

# Optionally seed sample data
docker compose exec api npx tsx scripts/seed.ts
```

Once running, the app is available at `http://localhost:5173`.

| Service | Port | Description |
|---|---|---|
| Frontend | `5173` | React web client |
| API | `5001` | Fastify backend server |
| MinIO Console | `9001` | S3-compatible storage UI |

---

## Local Setup

**Prerequisites:** Node.js 20.19

### 1. Clone and install

```bash
git clone <repo-url>
cd midas
npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` and set `STORAGE_MODE=local` and `DATABASE_DIR=.` to store file attachments and the SQLite database in the backend directory (no Docker required).

### 3. Run database migrations

```bash
npm run db:migrate --workspace=backend
```

Optionally seed sample data:

```bash
npm run db:seed --workspace=backend
```

### 5. Start development servers

In separate terminals:

```bash
npm run dev:backend   # API on http://localhost:5001
npm run dev:frontend  # UI on http://localhost:5173
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_DIR` | `./sqlite_data` | SQLite database directory |
| `PORT` | `3000` | API server port |
| `STORAGE_MODE` | `s3` | `s3` or `local` |
| `MINIO_ENDPOINT` | `localhost` | MinIO hostname |
| `MINIO_PORT` | `9000` | MinIO port |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `MINIO_BUCKET` | `midas-attachments` | S3 bucket name |
| `SERVER_PASSWORD` | _(empty)_ | Sync auth password |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5001` | Backend API URL |

---

## Project Structure

```
├── backend/          # Fastify API server
│   ├── src/
│   │   ├── db/       # Schema & database init
│   │   ├── routes/   # API route handlers
│   │   ├── services/ # Business logic
│   │   └── storage/  # File storage providers
│   └── Dockerfile
├── frontend/         # React web client
│   ├── src/
│   │   ├── api/      # Backend API calls
│   │   ├── hooks/    # React hooks (theme, preferences, sync)
│   │   ├── pages/    # Page components
│   │   └── components/ # Shared UI components
│   └── Dockerfile
└── docker-compose.yml
```
