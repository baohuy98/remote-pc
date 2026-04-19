# Phase 2 — Shared-Secret Auth on Socket Handshake

**Priority:** HIGH
**Status:** completed
**Effort:** M

## Problem

`server/src/index.ts` accepts any connection from anywhere on the network:

```ts
const io = new Server(httpServer, { cors: { origin: '*', methods: ['GET', 'POST'] } });
```

Anyone on the LAN who can reach port 3000 can take screenshots, move the mouse, type, kill processes, and shut the machine down. `@nut-tree-fork/nut-js` has full HID control. This is a remote-access tool with no access control.

## Scope (KISS)

A single shared secret, read from an env var on the server, sent by the client as a Socket.IO auth payload. Not SSL, not OAuth, not per-user. Just enough to prevent drive-by LAN takeover. Easy to add, easy to deploy: one env var and one input field.

## Files

- **Modify:** `server/src/index.ts` — read `RPC_SECRET`, reject handshakes without matching `auth.token`
- **Modify:** `client/electron/main.js` — accept a `token` argument to `connect-server`, pass in `io(..., { auth: { token } })`
- **Modify:** `client/electron/preload.js` — expose `token` in `connectServer`
- **Modify:** `client/src/electron.d.ts` — update `connectServer` signature
- **Modify:** `client/src/App.tsx` — add password input next to IP field

## Implementation

### Step 1 — Server

```ts
// server/src/index.ts
const SECRET = process.env.RPC_SECRET;
if (!SECRET) {
  console.error('RPC_SECRET env var is required. Refusing to start.');
  process.exit(1);
}

io.use((socket, next) => {
  const token = (socket.handshake.auth as any)?.token;
  if (token === SECRET) return next();
  next(new Error('unauthorized'));
});
```

Keep `cors.origin: '*'` — the Electron client has no web origin, so CORS doesn't gate it anyway. Auth is the real gate.

### Step 2 — Electron main

```js
// client/electron/main.js
ipcMain.on('connect-server', (_event, { ip, token }) => {
  if (socket) { socket.disconnect(); socket = null; }
  socket = io(`http://${ip}:3000`, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    auth: { token },
  });
  // ... existing on(connect/disconnect/error/response)
});
```

### Step 3 — Preload + types

```js
// client/electron/preload.js
connectServer: (payload) => ipcRenderer.send('connect-server', payload),
```

```ts
// client/src/electron.d.ts
connectServer: (payload: { ip: string; token: string }) => void;
```

### Step 4 — Client UI

Add a password-type input bound to a new `secret` state; pass `{ ip: serverIp, token: secret }` in `connectToServer`. `__disconnect__` sentinel becomes `{ ip: '__disconnect__', token: '' }`.

## Verification

1. Start server without `RPC_SECRET` — expect process exit with message.
2. Start server with `RPC_SECRET=testpass`, attempt connect with wrong token via node probe — `connect_error` fires.
3. Connect with correct token — works as before.
4. Probe still works after re-connect with fresh token.

## Risk

Medium. Breaking change to the IPC contract. Must update all call sites (`connectServer`, disconnect path) in one commit. Document `RPC_SECRET` in `README.md`.
