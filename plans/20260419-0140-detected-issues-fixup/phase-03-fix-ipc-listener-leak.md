# Phase 3 — Fix IPC Listener Leak

**Priority:** MEDIUM
**Status:** completed
**Effort:** S

## Problem

`client/electron/preload.js:14-15`:

```js
onServerStatus: (callback) => ipcRenderer.on('server-status', (_, status) => callback(status)),
onServerResponse: (callback) => ipcRenderer.on('server-response', (_, data) => callback(data)),
```

`ipcRenderer.on` appends a listener and never removes it. `App.tsx:21` calls these inside a `useEffect` with an empty dep array — fine in production, **double-fires in React StrictMode dev** (effects run twice). Also: every component remount (HMR, tab switch if routed, future refactors) adds another listener. Symptom observed in similar apps: screenshots update twice, process lists concatenate, etc.

## Files

- **Modify:** `client/electron/preload.js` — return an unsubscribe function
- **Modify:** `client/src/electron.d.ts` — update signature
- **Modify:** `client/src/App.tsx` — call the returned unsubscribe in effect cleanup

## Implementation

### Step 1 — Preload returns cleanup

```js
// client/electron/preload.js
onServerStatus: (callback) => {
  const handler = (_, status) => callback(status);
  ipcRenderer.on('server-status', handler);
  return () => ipcRenderer.removeListener('server-status', handler);
},
onServerResponse: (callback) => {
  const handler = (_, data) => callback(data);
  ipcRenderer.on('server-response', handler);
  return () => ipcRenderer.removeListener('server-response', handler);
},
```

### Step 2 — Types

```ts
// client/src/electron.d.ts
onServerStatus: (callback: (status: string) => void) => () => void;
onServerResponse: (callback: (data: any) => void) => () => void;
```

### Step 3 — App.tsx cleanup

```tsx
useEffect(() => {
  const offStatus = window.electron.onServerStatus((s) => setStatus(s === 'connected' ? 'connected' : 'disconnected'));
  const offResponse = window.electron.onServerResponse((data) => {
    // ... existing branches
  });
  return () => {
    offStatus();
    offResponse();
  };
}, []);
```

## Verification

1. Run client, open DevTools, observe `serverResponse` only fires once per server emit (place `console.log` in the handler and send one screenshot — expect one log line).
2. Remount the component (React Fast Refresh on a trivial edit) and confirm handler count stays at 1.

## Risk

Low. Pure cleanup hygiene; no behavior change in happy path.
