# CodeCord

A real-time collaborative learning platform for CSE students that combines community chat, voice study rooms, a multi-user collaborative IDE, and an AI-powered study assistant in a single web application.

CodeCord is organized around servers (communities). Inside each server, members get text and announcement channels with threads and pins, voice study rooms, a shared collaborative code workspace with live execution, and an AI doubt solver backed by shared study resources (PDFs, notes, slides).

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Module Implementation Details](#module-implementation-details)
5. [Real-Time Protocol](#real-time-protocol)
6. [REST API Surface](#rest-api-surface)
7. [Data Models](#data-models)
8. [Security](#security)
9. [Project Structure](#project-structure)
10. [Environment Configuration](#environment-configuration)
11. [Getting Started](#getting-started)
12. [Testing](#testing)
13. [Design System](#design-system)

---

## Feature Overview

### Community and Communication
- User registration and login with JWT access tokens and rotating refresh tokens
- Servers with roles, granular bitwise permissions, invites (expiry and max-use limits), and public server discovery
- Text and announcement channels with private channel support (role-gated visibility)
- Real-time messaging with editing, deletion, replies, reactions, pins, and typing indicators
- Threads (create from any message, archive, delete)
- Friends system (requests, blocking) and one-to-one direct messages
- Voice study rooms using WebRTC mesh with Socket.IO signalling (join, leave, mute state)
- Live presence (online, idle, do-not-disturb, offline) synchronized across all devices

### Collaborative IDE (per server)
- Multi-user real-time code editing built on Monaco Editor
- Server-authoritative operation-based synchronization with versioned documents and automatic resync on conflict
- Live remote cursors, selections, and per-user color identity
- Workspace file tree with folders (path-encoded), create, rename, delete, and version history snapshots
- Code execution through the JDoodle API for 11 languages: C, C++, Java, Python, JavaScript, TypeScript, Go, Rust, Kotlin, PHP, and C#
- Custom stdin, console output, compilation errors, runtime errors, and execution status with CPU and memory statistics
- Explicit save (Ctrl+S) with snapshot history, file download with the correct extension, connection and sync status bar, and live typing indicators

### AI Study Assistant (per server)
- Resource library: upload PDFs, text, Markdown, Word, PowerPoint, and images to Cloudinary with drag-and-drop and upload progress
- Automatic text extraction from PDFs, plain text, and Markdown so documents become AI-readable context
- In-browser PDF reading through an embedded viewer (scrolling, zooming, page navigation) without downloading
- Search, tags, download, and permission-aware deletion for resources
- AI doubt solver backed by the Groq API: private per-user conversations scoped to a server
- Attach up to three server resources as context per question (for example, "summarize this PDF")
- Markdown answers with syntax-highlighted code blocks, copy-to-clipboard, automatic conversation titles, follow-up suggestions, and full conversation history management

---

## Technology Stack

### Frontend (`client/`)

| Concern | Technology |
| --- | --- |
| UI framework | React 19 |
| Build tool | Vite 8 |
| Styling | Tailwind CSS 4 (design tokens via `@theme`, custom utilities) |
| Routing | React Router 7 |
| HTTP client | Axios (interceptor-based auth with automatic token refresh) |
| Real-time | socket.io-client 4 (single authenticated connection, ack-based emits) |
| Code editor | Monaco Editor via `@monaco-editor/react` |
| Markdown | react-markdown + remark-gfm |
| Code highlighting | react-syntax-highlighter (Prism, tree-shaken language registration) |
| Icons | lucide-react |
| Linting | ESLint 10 with `eslint-plugin-react-hooks` (React Compiler rules) |

### Backend (`server/`)

| Concern | Technology |
| --- | --- |
| Runtime | Node.js (ES modules) |
| Web framework | Express 5 |
| Database | MongoDB with Mongoose 9 |
| Real-time | Socket.IO 4 |
| Validation | Zod 4 (environment, request bodies, socket payloads) |
| Authentication | jsonwebtoken (access) + hashed rotating refresh tokens, bcryptjs |
| File storage | Cloudinary (signed uploads through multer-storage-cloudinary) |
| PDF text extraction | pdf-parse 2 |
| Code execution | JDoodle REST API (proxied server-side) |
| AI completions | Groq API (OpenAI-compatible chat completions, proxied server-side) |
| Security middleware | helmet, cors, express-rate-limit |
| Logging | pino / pino-http (pino-pretty in development) |

---

## System Architecture

### High-Level Topology

```
Browser (React SPA)
   |  HTTPS: REST  /api/v1/*                (Axios, Bearer access token)
   |  WSS:  Socket.IO                       (auth token in handshake)
   v
Express 5 + Socket.IO server (Node.js)
   |-- MongoDB Atlas          (Mongoose models, transactions where needed)
   |-- Cloudinary             (resource file storage, signed uploads)
   |-- JDoodle API            (code execution; credentials never leave the server)
   `-- Groq API               (AI completions; API key never leaves the server)
```

### Backend Layering

The backend follows a strict layered architecture. Every request passes through the same pipeline, and no layer skips the one below it:

```
routes -> middleware (auth, membership, permissions, validation, rate limits)
       -> controllers (HTTP concerns only)
       -> services (business logic, event emission)
       -> repositories (all Mongoose queries)
       -> models (schemas, indexes)
```

- Responses use a single envelope: `{ success, message, ...payload }`; errors use `{ success: false, message, errors? }` produced by a central error handler and a custom `ApiError`.
- All input is validated with Zod schemas via a shared `validate` middleware before reaching controllers.
- Socket handlers mirror the same discipline: payloads are Zod-validated and every emit with a callback is acknowledged through a shared `safe()` wrapper so client `emitAck` calls always resolve.

### Frontend Layering

```
pages -> layouts (AppLayout, HomeLayout, ServerLayout: data + outlet context)
      -> components (feature folders: chat, ide, study, server, voice, ui primitives)
      -> hooks (useChat, useWorkspace, useSocket, usePresence, useToast, ...)
      -> services (one Axios module per REST resource)
      -> lib (api client, socket singleton, permissions, utils)
```

- `lib/api.js` holds the access token in memory, attaches it to every request, and transparently replays a failed 401 request after a refresh-token rotation.
- `lib/socket.js` maintains a single authenticated Socket.IO connection with an `emitAck(event, payload)` promise helper (8-second timeout) used by all realtime features.
- Server-scoped pages receive `server`, `channels`, `members`, `myPermissions`, and helpers through React Router outlet context, so switching between Chat, IDE, and Study sections never reloads data unnecessarily.

---

## Module Implementation Details

### Collaborative Editing Engine

The IDE uses a server-authoritative, operation-relay model with optimistic local editing:

1. Each open file is an in-memory live document on the server (`documentStore`) with a monotonically increasing version (starting at 1).
2. Local Monaco edits are converted to operations `{ rangeOffset, rangeLength, text }` and sent as `code:edit { fileId, baseVersion, ops }`. Sends are chained through a promise queue so each edit uses the version confirmed by the previous acknowledgement.
3. The server applies operations (sorted by descending offset), bumps the version, acknowledges `{ version }`, and broadcasts `code:edited { fileId, ops, version, userId }` to every other participant of that file.
4. If a client's `baseVersion` is stale, the acknowledgement carries `{ resync: true, content, version }` and the client atomically replaces its buffer with the authoritative document (rebase-by-reload).
5. Remote operations are applied as a single atomic `executeEdits` batch with positions computed against the pre-edit model, guarded by a suppression flag so they are never re-emitted.
6. Cursor positions and selections travel over volatile `cursor:move` events (throttled to ~90 ms) and render as per-user colored ghost cursors, selection highlights, and name labels using Monaco decorations and content widgets.
7. Explicit saves (`file:save`) persist the live document and write a `FileSnapshot` for version history; unsaved live content still survives because the server document is authoritative.
8. On socket reconnection, the client transparently re-joins the workspace and re-opens the active file with fresh authoritative content.

### Code Execution Pipeline

`POST /servers/:serverId/workspace/execute` accepts either `{ fileId, stdin }` (runs the current server-side live document) or `{ source, language, stdin }` (runs an arbitrary buffer, used when the run language differs from the file language). The backend maps internal language ids to JDoodle language/version pairs, calls JDoodle with server-held credentials, normalizes the result to `{ status, output, cpuTime, memory }` with statuses `success | compile_error | runtime_error | limit_reached`, and returns HTTP 503 with a clear message when the integration is not configured.

### Resource and AI Pipeline

1. Uploads are streamed through Multer to Cloudinary as signed uploads; the accepted set is `.pdf .txt .md .docx .pptx .png .jpg .jpeg .webp` with a size cap enforced server-side.
2. For PDFs, text, and Markdown the backend extracts text (`pdf-parse` for PDFs) and stores it with a `textStatus` of `done` or `failed`; extracted text is what the AI consumes as context.
3. `resource:created`, `resource:updated`, and `resource:deleted` events broadcast to the server room so all members' resource lists update live.
4. AI conversations belong to a single user and may be scoped to a server. Each turn (`POST /ai/conversations/:id/messages`) persists the user message, builds a prompt that includes recent history plus the extracted text of up to three attached resources, calls Groq, persists the assistant message with token usage, and auto-titles the conversation from the first question. A failed completion leaves no dangling messages.
5. Downloads go through the backend (`GET /:id/download`), which redirects to an attachment-flagged Cloudinary URL; the client follows the redirect and saves the blob.

### Voice Rooms

Voice channels use a WebRTC mesh: Socket.IO carries the signalling (`voice:join`, `voice:signal` for SDP and ICE candidates, `voice:leave`, `voice:mute`), and audio flows peer-to-peer. Participant and mute state is tracked in server memory per channel.

---

## Real-Time Protocol

All Socket.IO traffic authenticates with the access token during the handshake. Client-to-server emits use acknowledgements (`{ success, ... }`); server broadcasts are room-scoped.

### Rooms

| Room | Purpose |
| --- | --- |
| `user:{userId}` | Auto-joined per device; friend/DM/notification events |
| `channel:{channelId}` | Channel messages, typing, reactions, pins |
| `thread:{threadId}` | Thread messages |
| `server:{serverId}` | Opt-in via `server:subscribe`; resource and file-tree broadcasts |
| `workspace:{workspaceId}` | Joined via `workspace:join`; presence and tree events |
| `wsfile:{fileId}` | Joined via `file:open`; edit, cursor, and typing traffic |

### Workspace Events (selection)

| Direction | Event | Payload / Ack |
| --- | --- | --- |
| C to S | `workspace:join { serverId }` | ack `{ workspace, files, participants }` |
| C to S | `file:open { fileId }` | ack `{ file, content, version, participants }` |
| C to S | `code:edit { fileId, baseVersion, ops }` | ack `{ version }` or `{ resync, content, version }` |
| S to C | `code:edited` | `{ fileId, ops, version, userId }` |
| C to S | `cursor:move { fileId, position, selection? }` | volatile broadcast `cursor:update` (with username, color) |
| C to S | `file:save { fileId }` | ack `{ fileId, version }`; broadcast `file:saved` |
| S to C | `workspace:user-joined / user-left` | participant presence |
| S to C | `file:created / renamed / deleted` | file-tree updates (also to the server room) |
| C to S | `workspace:typing { fileId, isTyping }` | relayed to file participants |

---

## REST API Surface

Base URL: `/api/v1`. All routes except registration, login, and refresh require a Bearer access token.

| Prefix | Responsibility |
| --- | --- |
| `/auth` | register, login, refresh (rotation), logout, current user |
| `/users` | profile updates, password change, avatar, user search |
| `/servers` | server CRUD, discovery, members, roles, invites |
| `/servers/:serverId/workspace` | workspace tree, file CRUD, save, history, download, execute |
| `/servers/:serverId/resources` | multipart upload, list with search and tags, download, update, delete |
| `/invites` | invite resolution and acceptance |
| `/channels` | channel CRUD, messages, pins, typing |
| `/threads` | thread CRUD and thread messages |
| `/messages` | edit, delete, reactions, replies |
| `/friends` | requests, accept or decline, blocking |
| `/dms` | DM channels and direct messages |
| `/ai` | conversation CRUD and chat turns (Groq-backed) |

Rate limiting is applied globally with stricter buckets for authentication, uploads, code execution, and AI turns.

---

## Data Models

MongoDB collections (Mongoose models): `User`, `RefreshToken`, `Server`, `ServerMember`, `Role`, `Invite`, `Channel`, `Message`, `Thread`, `Relationship`, `Block`, `DmChannel`, `DirectMessage`, `Workspace`, `WorkspaceFile`, `FileSnapshot`, `Resource`, `AiConversation`, `AiMessage`.

Notable design decisions:

- Permissions are a bitfield (`VIEW_CHANNELS`, `SEND_MESSAGES`, `MANAGE_MESSAGES`, `MANAGE_CHANNELS`, `MANAGE_ROLES`, `MANAGE_SERVER`, `KICK_MEMBERS`, `CREATE_INVITES`, `CONNECT_VOICE`, ...) computed from the member's roles plus the server default role; the owner implicitly holds all permissions.
- `WorkspaceFile.path` encodes folders (`src/utils/math.py`); the tree is derived client-side, which keeps rename and move operations to a single field update.
- `Resource` stores `kind` (`pdf | text | document | slides | image`), `textContent` and `textStatus` for AI readability, plus Cloudinary `publicId` for cleanup on delete.
- `RefreshToken` documents store only a hash of the token, are rotated on every refresh, and are revoked on logout and on reuse detection.

---

## Security

- Short-lived JWT access tokens (in memory on the client, never in localStorage) with rotating, hashed refresh tokens delivered as HTTP-only cookies.
- Zod validation on every REST body, query, and socket payload; centralized error translation with no stack leakage in production.
- Membership and permission middleware on every server-scoped route; socket rooms perform the same membership checks before joining (`server:subscribe`, `workspace:join`, channel joins).
- Third-party credentials (Cloudinary, JDoodle, Groq) exist only on the server; clients call proxy endpoints.
- helmet security headers, CORS restricted to the configured client origin (shared by Express and Socket.IO), and tiered rate limiting.
- Upload constraints: extension allowlist, MIME checks, and size limits enforced before storage.

---

## Project Structure

```
Web_Application/
|-- client/                        # React SPA (Vite)
|   `-- src/
|       |-- assets/                # Static assets
|       |-- components/
|       |   |-- chat/              # Chat panes, headers, threads, pins, code blocks
|       |   |-- ide/               # CodeEditor, FileExplorer, ConsolePanel, modals
|       |   |-- study/             # ResourcePanel, AiChatPanel, MarkdownContent, PDF preview
|       |   |-- layout/            # Sidebar shells, user footer
|       |   |-- modals/            # Server, channel, invite, settings dialogs
|       |   |-- server/            # Member list and server widgets
|       |   |-- ui/                # Button, Input, Modal, Menu, Avatar, Spinner, EmptyState
|       |   `-- voice/             # VoiceRoom (WebRTC)
|       |-- context/               # React context definitions and providers
|       |-- hooks/                 # useAuth, useSocket, useChat, useWorkspace, usePresence, ...
|       |-- layouts/               # AppLayout, HomeLayout, ServerLayout
|       |-- lib/                   # api (Axios), socket (Socket.IO), permissions, utils
|       |-- pages/                 # Route components (ChannelPage, IdePage, StudyPage, ...)
|       `-- services/              # REST modules (authService, workspaceService, aiService, ...)
|-- server/                        # Express + Socket.IO API
|   `-- src/
|       |-- config/                # env (Zod-validated), db, cloudinary
|       |-- constants/             # permissions bitfield, language registry, channel types
|       |-- controllers/           # HTTP handlers
|       |-- middleware/            # auth, serverAuth, validate, rateLimiter, uploads, errors
|       |-- models/                # Mongoose schemas
|       |-- repositories/          # Data access layer
|       |-- routes/                # Route definitions per resource
|       |-- services/              # Business logic + external integrations
|       |-- sockets/               # Socket.IO: index, workspace, voice, presence, stores
|       |-- utils/                 # ApiError, response envelope, logger, tokens
|       `-- validations/           # Zod schemas per resource
`-- README.md
```

---

## Environment Configuration

### Backend (`server/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | No | `development` (default), `production`, or `test` |
| `PORT` | No | HTTP port, defaults to `5000` |
| `MONGO_URI` | Yes | MongoDB connection string |
| `CLIENT_URL` | No | Allowed CORS origin, defaults to `http://localhost:5173` |
| `JWT_ACCESS_SECRET` | Yes | Access-token secret (minimum 32 characters) |
| `JWT_REFRESH_SECRET` | Yes | Refresh-token secret (minimum 32 characters) |
| `JWT_ACCESS_EXPIRES` | No | Access-token lifetime, defaults to `15m` |
| `REFRESH_TOKEN_EXPIRES_DAYS` | No | Refresh-token lifetime, defaults to `7` |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary account cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `JDOODLE_CLIENT_ID` | Optional | Enables code execution; without it the endpoint returns 503 |
| `JDOODLE_CLIENT_SECRET` | Optional | JDoodle secret |
| `GROQ_API_KEY` | Optional | Enables the AI assistant; without it AI turns return 503 |
| `GROQ_MODEL` | No | Defaults to `llama-3.3-70b-versatile` |

The environment is validated with Zod at boot; the process exits immediately with a readable report if configuration is invalid. JDoodle and Groq are deliberately optional so the platform runs without external accounts during development.

### Frontend (`client/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | No | REST base URL, defaults to `http://localhost:5000/api/v1` |
| `VITE_SOCKET_URL` | No | Socket.IO origin; derived from `VITE_API_URL` when omitted |

---

## Getting Started

### Prerequisites

- Node.js 20 or newer
- A MongoDB instance (local or Atlas)
- A Cloudinary account (required for resource uploads)
- Optional: JDoodle and Groq API credentials

### Installation

```bash
# Backend
cd server
npm install
# create server/.env (see the table above)
npm run dev          # nodemon, or: npm start

# Frontend (separate terminal)
cd client
npm install
npm run dev          # Vite dev server on http://localhost:5173
```

Open `http://localhost:5173`, register an account, create a server, and use the sidebar Workspace section to open the Collaborative IDE or the AI Study Assistant. To observe real-time collaboration, open the same file from two browser sessions.

### Production Build

```bash
cd client
npm run build        # outputs to client/dist
npm run preview      # serves the production bundle locally
```

---

## Testing

The backend ships with end-to-end integration test scripts (Node ES modules, no framework) that exercise the live API and Socket.IO against a running server:

```bash
cd server
npm start            # in one terminal
node test-phase9.mjs # in another: workspace + AI module suite
```

The suites cover REST contracts, socket acknowledgements, multi-client collaborative editing (including conflict resync), permission enforcement, and both configured and unconfigured states of the JDoodle and Groq integrations (the 503 guards are asserted when keys are absent, and live results are asserted when keys are present).

Frontend quality gates:

```bash
cd client
npm run lint         # ESLint with React Compiler rules
npm run build        # production build must pass
```

---

## Design System

- White canvas with lavender as the single accent color for primary actions, active states, and highlights; ink-toned neutral text.
- All colors are defined once as Tailwind CSS 4 `@theme` tokens (`cream-*` surfaces, `lav-*` accents, `ink-*` text, `status-*` presence), so global restyling is a token-level change.
- Reusable utilities (`card`, `input-base`, `btn-primary`, `btn-ghost`, `btn-danger`) and shared primitives (Button, Input, Select, Modal, Menu, Avatar, Spinner, EmptyState) keep the interface consistent.
- Monaco uses a custom theme aligned with the application palette; AI code blocks use a dark Prism theme for contrast.
- Layouts are responsive: desktop-first split views with tablet and mobile fallbacks (collapsible sidebars, drawer-based file explorer, pane switching on the Study page).
- Loading, empty, and error states are implemented for every data surface, with toast notifications for failures of user-initiated actions.
