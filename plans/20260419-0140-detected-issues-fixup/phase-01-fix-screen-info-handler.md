# Phase 1 — Fix `screen_info` Handler

**Priority:** HIGH
**Status:** completed
**Effort:** S

## Problem

`client/src/App.tsx:33` listens for a `screen_info` response and uses it to scale mouse click coordinates:

```ts
if (data.action === 'screen_info' && data.data) {
  setServerScreenSize(data.data);
}
```

But no code ever sends that command, and the server has no handler for it. Live probe confirmed:

```
RESPONSE: {"action":"screen_info","success":false,"error":"Unknown action: screen_info"}
```

`serverScreenSize` stays at its initial `{ width: 1920, height: 1080 }`. When the remote server runs at any other resolution (1280×720 laptop, 2560×1440 monitor, HiDPI), every `handleScreenClick` miscomputes `scaleX`/`scaleY` and the click lands at the wrong pixel.

## Files

- **Modify:** `server/src/services/system.ts` — add `getScreenInfo()` exporting `{ width, height }`
- **Modify:** `server/src/socket/handler.ts` — add `case 'screen_info'` wired to the new function
- **Modify:** `client/src/App.tsx` — request `screen_info` once on connect

## Implementation

### Step 1 — Add `getScreenInfo` service

Use the PowerShell bounds probe already familiar from `screen.ts`, or piggyback on `systeminformation.graphics()`. Prefer the latter — no new tmp files, no child_process spawn per call:

```ts
// server/src/services/system.ts — APPEND, keep existing exports
import si from 'systeminformation';

export async function getScreenInfo(): Promise<Response> {
  const g = await si.graphics();
  // Pick primary display; fall back to first display; fall back to 1920x1080
  const primary = g.displays.find(d => d.main) ?? g.displays[0];
  const width = primary?.currentResX ?? 1920;
  const height = primary?.currentResY ?? 1080;
  return { action: 'screen_info', data: { width, height }, success: true };
}
```

### Step 2 — Wire handler

```ts
// server/src/socket/handler.ts
import { shutdownPC, restartPC, lockPC, cancelShutdown, getScreenInfo } from '../services/system';
// ...
case 'screen_info':
  response = await getScreenInfo();
  break;
```

### Step 3 — Client requests on connect

`App.tsx` currently sets `serverScreenSize` only if the server volunteers it. Add an explicit request when the status flips to `connected`:

```tsx
useEffect(() => {
  if (status === 'connected') {
    sendCommand('screen_info');
  }
}, [status, sendCommand]);
```

## Verification

1. `cd server && npx tsc --noEmit` → no errors
2. Start server, run the node probe from the audit:
   ```js
   sock.emit('command', { action: 'screen_info', params: {} });
   ```
   Expect: `{ action: 'screen_info', data: { width: <actual>, height: <actual> }, success: true }`
3. End-to-end: connect client, open DevTools console, confirm `serverScreenSize` state reflects the server's real resolution (not 1920×1080) — unless the server is actually 1080p.

## Risk

Low. `systeminformation.graphics()` is already an installed dependency. On headless/VM environments the `displays` array may be empty — the fallback to 1920×1080 preserves current (broken-but-non-crashing) behavior.
