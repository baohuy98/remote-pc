# Phase 1: Server + Client Connection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working server that captures screenshots, lists processes, handles keyboard input, and executes system commands — connected end-to-end with the Electron client via Socket.IO.

**Architecture:** Express + Socket.IO server in TypeScript with modular services. Client Electron main process handles IPC from renderer and bridges to Socket.IO. Communication uses a simple `{ action, params }` / `{ action, data, success }` event protocol.

**Tech Stack:** TypeScript, Express, Socket.IO, screenshot-desktop, @nut-tree/nut-js, systeminformation

---

## File Structure

### Server (all new)

```
server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # Express + Socket.IO setup, starts server
│   ├── socket/
│   │   └── handler.ts           # Socket event router, dispatches to services
│   ├── services/
│   │   ├── screen.ts            # Screenshot capture via screenshot-desktop
│   │   ├── process.ts           # Process list via systeminformation
│   │   ├── input.ts             # Keyboard/mouse via @nut-tree/nut-js
│   │   └── system.ts            # Shutdown/restart via child_process
│   └── types.ts                 # Shared types (Command, Response)
```

### Client (modifications)

```
client/
├── electron/
│   └── main.js                  # MODIFY: add IPC handlers + Socket.IO client
```

---

### Task 1: Server Project Scaffolding

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/types.ts`

- [ ] **Step 1: Create server/package.json**

```json
{
  "name": "remote-pc-server",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "socket.io": "^4.8.1",
    "screenshot-desktop": "^1.15.0",
    "@nut-tree/nut-js": "^4.2.2",
    "systeminformation": "^5.23.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create server/src/types.ts**

```typescript
export interface Command {
  action: string;
  params: Record<string, any>;
}

export interface Response {
  action: string;
  data: any;
  success: boolean;
  error?: string;
}
```

- [ ] **Step 4: Install dependencies**

Run: `cd server && npm install`
Expected: `node_modules` created, no errors.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add server/package.json server/package-lock.json server/tsconfig.json server/src/types.ts
git commit -m "feat(server): scaffold project with dependencies and types"
```

---

### Task 2: Server Entry Point + Socket Handler

**Files:**
- Create: `server/src/index.ts`
- Create: `server/src/socket/handler.ts`

- [ ] **Step 1: Create server/src/index.ts**

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerSocketHandler } from './socket/handler';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = 3000;

app.get('/', (_req, res) => {
  res.json({ status: 'Remote PC Server running', connections: io.engine.clientsCount });
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  registerSocketHandler(io, socket);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
```

- [ ] **Step 2: Create server/src/socket/handler.ts (scaffold with screenshot only)**

```typescript
import { Socket, Server } from 'socket.io';
import { Command, Response } from '../types';
import { captureScreen } from '../services/screen';

export function registerSocketHandler(_io: Server, socket: Socket): void {
  socket.on('command', async (cmd: Command) => {
    console.log(`Received command: ${cmd.action}`, cmd.params);

    let response: Response;

    try {
      switch (cmd.action) {
        case 'screenshot':
          response = await captureScreen();
          break;
        default:
          response = { action: cmd.action, data: null, success: false, error: `Unknown action: ${cmd.action}` };
      }
    } catch (err: any) {
      response = { action: cmd.action, data: null, success: false, error: err.message };
    }

    socket.emit('response', response);
  });
}
```

- [ ] **Step 3: Verify TypeScript compiles (will fail — screen service not yet created)**

Run: `cd server && npx tsc --noEmit`
Expected: Error about missing `../services/screen` — confirms wiring is correct, service needed next.

- [ ] **Step 4: Commit**

```bash
git add server/src/index.ts server/src/socket/handler.ts
git commit -m "feat(server): add Express + Socket.IO entry point and socket handler"
```

---

### Task 3: Screenshot Service

**Files:**
- Create: `server/src/services/screen.ts`

- [ ] **Step 1: Create server/src/services/screen.ts**

```typescript
import screenshot from 'screenshot-desktop';
import { Response } from '../types';

export async function captureScreen(): Promise<Response> {
  const imgBuffer = await screenshot({ format: 'png' });
  const base64 = imgBuffer.toString('base64');

  return {
    action: 'screenshot',
    data: base64,
    success: true,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Test manually — start server and verify it runs**

Run: `cd server && npx ts-node-dev src/index.ts`
Expected: `Server listening on port 3000` printed to console. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add server/src/services/screen.ts
git commit -m "feat(server): add screenshot capture service"
```

---

### Task 4: Process Management Service

**Files:**
- Create: `server/src/services/process.ts`
- Modify: `server/src/socket/handler.ts`

- [ ] **Step 1: Create server/src/services/process.ts**

```typescript
import si from 'systeminformation';
import { Response } from '../types';

export async function listProcesses(): Promise<Response> {
  const data = await si.processes();
  const processes = data.list
    .sort((a, b) => b.mem - a.mem)
    .slice(0, 50)
    .map((p) => ({
      pid: p.pid,
      name: p.name,
      cpu: p.cpu,
      mem: p.mem,
    }));

  return {
    action: 'list_processes',
    data: processes,
    success: true,
  };
}

export async function killProcess(pid: number): Promise<Response> {
  try {
    process.kill(pid);
    return { action: 'kill_process', data: { pid }, success: true };
  } catch (err: any) {
    return { action: 'kill_process', data: null, success: false, error: err.message };
  }
}
```

- [ ] **Step 2: Add process cases to socket handler**

In `server/src/socket/handler.ts`, add import and switch cases:

```typescript
import { Socket, Server } from 'socket.io';
import { Command, Response } from '../types';
import { captureScreen } from '../services/screen';
import { listProcesses, killProcess } from '../services/process';

export function registerSocketHandler(_io: Server, socket: Socket): void {
  socket.on('command', async (cmd: Command) => {
    console.log(`Received command: ${cmd.action}`, cmd.params);

    let response: Response;

    try {
      switch (cmd.action) {
        case 'screenshot':
          response = await captureScreen();
          break;
        case 'list_processes':
          response = await listProcesses();
          break;
        case 'kill_process':
          response = await killProcess(cmd.params.pid);
          break;
        default:
          response = { action: cmd.action, data: null, success: false, error: `Unknown action: ${cmd.action}` };
      }
    } catch (err: any) {
      response = { action: cmd.action, data: null, success: false, error: err.message };
    }

    socket.emit('response', response);
  });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/services/process.ts server/src/socket/handler.ts
git commit -m "feat(server): add process list and kill services"
```

---

### Task 5: Input Control Service

**Files:**
- Create: `server/src/services/input.ts`
- Modify: `server/src/socket/handler.ts`

- [ ] **Step 1: Create server/src/services/input.ts**

```typescript
import { keyboard, mouse, Point, Key, Button } from '@nut-tree/nut-js';
import { Response } from '../types';

export async function pressKey(key: string): Promise<Response> {
  const nutKey = (Key as any)[key.toUpperCase()] ?? (Key as any)[key];
  if (!nutKey) {
    return { action: 'key_press', data: null, success: false, error: `Unknown key: ${key}` };
  }

  await keyboard.pressKey(nutKey);
  await keyboard.releaseKey(nutKey);

  return { action: 'key_press', data: { key }, success: true };
}

export async function typeText(text: string): Promise<Response> {
  await keyboard.type(text);
  return { action: 'type_text', data: { text }, success: true };
}

export async function moveMouse(x: number, y: number): Promise<Response> {
  await mouse.setPosition(new Point(x, y));
  return { action: 'mouse_move', data: { x, y }, success: true };
}

export async function clickMouse(button: 'left' | 'right' = 'left'): Promise<Response> {
  const btn = button === 'right' ? Button.RIGHT : Button.LEFT;
  await mouse.click(btn);
  return { action: 'mouse_click', data: { button }, success: true };
}
```

- [ ] **Step 2: Add input cases to socket handler**

In `server/src/socket/handler.ts`, add import and switch cases:

```typescript
import { Socket, Server } from 'socket.io';
import { Command, Response } from '../types';
import { captureScreen } from '../services/screen';
import { listProcesses, killProcess } from '../services/process';
import { pressKey, typeText, moveMouse, clickMouse } from '../services/input';

export function registerSocketHandler(_io: Server, socket: Socket): void {
  socket.on('command', async (cmd: Command) => {
    console.log(`Received command: ${cmd.action}`, cmd.params);

    let response: Response;

    try {
      switch (cmd.action) {
        case 'screenshot':
          response = await captureScreen();
          break;
        case 'list_processes':
          response = await listProcesses();
          break;
        case 'kill_process':
          response = await killProcess(cmd.params.pid);
          break;
        case 'key_press':
          response = await pressKey(cmd.params.key);
          break;
        case 'type_text':
          response = await typeText(cmd.params.text);
          break;
        case 'mouse_move':
          response = await moveMouse(cmd.params.x, cmd.params.y);
          break;
        case 'mouse_click':
          response = await clickMouse(cmd.params.button);
          break;
        default:
          response = { action: cmd.action, data: null, success: false, error: `Unknown action: ${cmd.action}` };
      }
    } catch (err: any) {
      response = { action: cmd.action, data: null, success: false, error: err.message };
    }

    socket.emit('response', response);
  });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/services/input.ts server/src/socket/handler.ts
git commit -m "feat(server): add keyboard and mouse input control service"
```

---

### Task 6: System Commands Service

**Files:**
- Create: `server/src/services/system.ts`
- Modify: `server/src/socket/handler.ts`

- [ ] **Step 1: Create server/src/services/system.ts**

```typescript
import { exec } from 'child_process';
import { Response } from '../types';

function run(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr || error.message));
      else resolve(stdout);
    });
  });
}

export async function shutdownPC(): Promise<Response> {
  await run('shutdown /s /t 5');
  return { action: 'shutdown', data: { message: 'Shutting down in 5 seconds' }, success: true };
}

export async function restartPC(): Promise<Response> {
  await run('shutdown /r /t 5');
  return { action: 'restart', data: { message: 'Restarting in 5 seconds' }, success: true };
}

export async function lockPC(): Promise<Response> {
  await run('rundll32.exe user32.dll,LockWorkStation');
  return { action: 'lock', data: { message: 'PC locked' }, success: true };
}

export async function cancelShutdown(): Promise<Response> {
  await run('shutdown /a');
  return { action: 'cancel_shutdown', data: { message: 'Shutdown cancelled' }, success: true };
}
```

- [ ] **Step 2: Add system command cases to socket handler**

Full final version of `server/src/socket/handler.ts`:

```typescript
import { Socket, Server } from 'socket.io';
import { Command, Response } from '../types';
import { captureScreen } from '../services/screen';
import { listProcesses, killProcess } from '../services/process';
import { pressKey, typeText, moveMouse, clickMouse } from '../services/input';
import { shutdownPC, restartPC, lockPC, cancelShutdown } from '../services/system';

export function registerSocketHandler(_io: Server, socket: Socket): void {
  socket.on('command', async (cmd: Command) => {
    console.log(`Received command: ${cmd.action}`, cmd.params);

    let response: Response;

    try {
      switch (cmd.action) {
        case 'screenshot':
          response = await captureScreen();
          break;
        case 'list_processes':
          response = await listProcesses();
          break;
        case 'kill_process':
          response = await killProcess(cmd.params.pid);
          break;
        case 'key_press':
          response = await pressKey(cmd.params.key);
          break;
        case 'type_text':
          response = await typeText(cmd.params.text);
          break;
        case 'mouse_move':
          response = await moveMouse(cmd.params.x, cmd.params.y);
          break;
        case 'mouse_click':
          response = await clickMouse(cmd.params.button);
          break;
        case 'shutdown':
          response = await shutdownPC();
          break;
        case 'restart':
          response = await restartPC();
          break;
        case 'lock':
          response = await lockPC();
          break;
        case 'cancel_shutdown':
          response = await cancelShutdown();
          break;
        default:
          response = { action: cmd.action, data: null, success: false, error: `Unknown action: ${cmd.action}` };
      }
    } catch (err: any) {
      response = { action: cmd.action, data: null, success: false, error: err.message };
    }

    socket.emit('response', response);
  });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/services/system.ts server/src/socket/handler.ts
git commit -m "feat(server): add system commands (shutdown, restart, lock)"
```

---

### Task 7: Fix Client Electron main.js

**Files:**
- Modify: `client/electron/main.js`

The current `main.js` creates a window but has NO IPC handlers and NO Socket.IO connection. The preload already exposes `connectServer`, `sendCommand`, `onServerStatus`, `onServerResponse` via IPC — we just need the main process to handle them.

- [ ] **Step 1: Replace client/electron/main.js with full implementation**

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { io } = require('socket.io-client');

let mainWindow;
let socket = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL('http://localhost:5173');
  mainWindow.maximize();
}

// IPC: Connect to server
ipcMain.on('connect-server', (_event, ip) => {
  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  console.log(`Connecting to server at ${ip}:3000...`);
  socket = io(`http://${ip}:3000`, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('Connected to server');
    mainWindow.webContents.send('server-status', 'connected');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    mainWindow.webContents.send('server-status', 'disconnected');
  });

  socket.on('connect_error', (err) => {
    console.log('Connection error:', err.message);
    mainWindow.webContents.send('server-status', 'error');
  });

  socket.on('response', (data) => {
    console.log('Server response:', data.action, data.success);
    mainWindow.webContents.send('server-response', data);
  });
});

// IPC: Send command to server
ipcMain.on('send-command', (_event, command) => {
  if (socket && socket.connected) {
    socket.emit('command', command);
  } else {
    mainWindow.webContents.send('server-response', {
      action: command.action,
      data: null,
      success: false,
      error: 'Not connected to server',
    });
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (socket) socket.disconnect();
  if (process.platform !== 'darwin') app.quit();
});
```

- [ ] **Step 2: Update client App.tsx to handle base64 screenshot correctly**

The current `App.tsx` tries to do `Buffer.from(data.data).toString('base64')` but the server already sends base64. Replace the screenshot handling in `client/src/App.tsx`:

Change the `onServerResponse` handler from:
```typescript
if (data.action === 'screenshot' && data.data) {
  const base64 = Buffer.from(data.data).toString('base64');
  setScreenshot(`data:image/png;base64,${base64}`);
}
```

To:
```typescript
if (data.action === 'screenshot' && data.data) {
  setScreenshot(`data:image/png;base64,${data.data}`);
}
```

- [ ] **Step 3: Verify client still starts**

Run: `cd client && npm run dev`
Expected: Vite dev server starts on port 5173 and Electron window opens. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add client/electron/main.js client/src/App.tsx
git commit -m "feat(client): add IPC handlers and Socket.IO connection in main process"
```

---

### Task 8: End-to-End Integration Test

- [ ] **Step 1: Add server/src/.gitignore to exclude dist**

Already handled by root `.gitignore` (`dist/`). No action needed.

- [ ] **Step 2: Start the server**

Run in terminal 1: `cd server && npm run dev`
Expected: `Server listening on port 3000`

- [ ] **Step 3: Start the client**

Run in terminal 2: `cd client && npm run dev`
Expected: Vite starts on 5173, Electron window opens.

- [ ] **Step 4: Test connection**

In the Electron app:
1. Enter `127.0.0.1` (or your LAN IP) in the IP field
2. Click "KET NOI SERVER"
3. Expected: Status changes to "Da ket noi Server"
4. Server terminal shows: `Client connected: <socket-id>`

- [ ] **Step 5: Test screenshot**

Click "Chup man hinh" button.
Expected: Screenshot of the server PC appears in the app.

- [ ] **Step 6: Test process list**

Click "List Processes" button.
Expected: Top 10 processes appear with name and PID.

- [ ] **Step 7: Test key press**

Click "Nhan phim A (test)" button.
Expected: Letter 'a' is typed on the server PC (visible if a text editor is open).

- [ ] **Step 8: Final commit — update .gitignore and README**

```bash
git add -A
git commit -m "feat: complete Phase 1 - server and client end-to-end connection"
```
