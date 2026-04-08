# Codex Bridge Web App (Next.js Production Architecture)

## Overview
This project builds a web-based interface to control a local Codex App Server from browser/mobile.

## Goals
- Run Codex locally on Windows
- Send tasks from web/mobile
- Stream real-time responses
- Maintain session-based workflows
- Enable remote development (from phone)

## Architecture

[ Browser / Mobile ]
        ↓
 (HTTP + SSE)
        ↓
 Next.js App (Node runtime)
 ├── UI (React)
 ├── API Routes (Bridge)
 └── Codex Worker (child_process)
        ↓
 Codex App Server (stdio JSON-RPC)

## Runtime Requirements

### Required
- Node.js (>= 18)
- Codex CLI installed
- Next.js (App Router)

### Not Supported
- Vercel / Serverless
- Edge runtime

## Project Structure

codex-nextjs/
├── app/
│   ├── page.tsx
│   ├── api/
│   │   ├── task/route.ts
│   │   ├── stream/route.ts
├── lib/
│   ├── codex.ts
│   ├── rpc.ts
├── types/

## Core Components

### Codex Worker (Singleton)
Manages the Codex process using child_process.spawn.

### Send Task API
POST /api/task → sends JSON-RPC to Codex

### Streaming API (SSE)
GET /api/stream → streams Codex stdout

### Frontend
Uses EventSource to receive real-time updates.

## Data Flow

User → API → Codex → Stream → UI

## Production Considerations

- Process restart & health checks
- JSON-RPC request mapping
- Multi-user worker isolation (future)
- API security (API key, VPN)
- Streaming optimization (SSE/WebSocket)

## Deployment

### Local (Recommended)
- Run on your PC
- Access via LAN or VPN (Tailscale)

### VPS
- Use Docker or PM2

## Scaling Roadmap

### Phase 1
- Single worker
- SSE streaming

### Phase 2
- Session + DB

### Phase 3
- Worker pool + Redis

### Phase 4
- Mobile-first + background tasks

## Summary

- Codex is stateful runtime
- Use event-driven design
- Streaming is core
- Start simple, scale later
