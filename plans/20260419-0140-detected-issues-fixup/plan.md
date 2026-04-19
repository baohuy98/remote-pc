---
name: Detected Issues Fixup
created: 2026-04-19
status: completed
blockedBy: []
blocks: []
---

# Detected Issues Fixup

**Goal:** Fix the concrete bugs discovered during a live codebase audit + runtime probe of the Phase 1 server/client build.

**Scope constraint (YAGNI/KISS):** Only fix what's *actually broken* or *actively degrades correctness*. No feature expansion. No aesthetic refactors.

## Investigation Summary

Ran both server and client through typecheck (clean on both), then started the server and probed the Socket.IO protocol end-to-end with a bespoke client. Confirmed: HTTP health endpoint OK, `screenshot` returns a 303KB PNG base64, `list_processes` returns 50 items sorted by memory, unknown actions return a clean error. From there, compared the wire protocol exercised by the client (`App.tsx` / `electron/main.js`) against the handler switch in `server/src/socket/handler.ts`, then read each service.

## Detected Issues (by severity)

| # | Severity | Issue | Evidence |
|---|----------|-------|----------|
| 1 | **HIGH** | Client requests `screen_info` to scale mouse coordinates, but server has no handler → default 1920×1080 assumed → mouse clicks land in wrong spot on any non-1080p display | `client/src/App.tsx:33` listens for it; live socket probe returned `Unknown action: screen_info` |
| 2 | **HIGH** | Zero authentication; `cors: origin: '*'`; anyone on the LAN can take over the PC | `server/src/index.ts:9-12` |
| 3 | **MEDIUM** | Duplicate IPC listeners on reconnect/StrictMode remount → responses fire 2×, 3×, ... after multiple connects | `client/electron/preload.js:14-15` uses `ipcRenderer.on` with no `removeListener` path |
| 4 | **MEDIUM** | Orphaned `screenshot-desktop` dependency + `declare module` shim; real impl uses PowerShell | `server/package.json:12`, `server/src/declarations.d.ts:1`, `server/src/services/screen.ts` no longer imports it |
| 5 | **LOW** | Screenshot service writes 2 temp files per capture (PNG + PS1) with `unlink().catch(()=>{})`; at 2 FPS streaming = 240 files/min; silent on cleanup failure | `server/src/services/screen.ts:8-9,39-40` |
| 6 | **LOW** | System tab main content area is an empty placeholder despite server having `systeminformation` dependency | `client/src/App.tsx:336-342` |

## Out-of-Scope (explicitly NOT fixed here)

- Command ordering across async services
- Screenshot compression (PNG→JPEG) for bandwidth
- Modifier-key combos (Ctrl+C / Alt+Tab)
- Request/response correlation IDs
- Cross-platform (macOS/Linux) shutdown commands

These are enhancements, not bugs. Capture separately if wanted.

## Phases

| Phase | File | Priority | Effort |
|-------|------|----------|--------|
| 1 | [phase-01-fix-screen-info-handler.md](phase-01-fix-screen-info-handler.md) | HIGH | S |
| 2 | [phase-02-add-shared-secret-auth.md](phase-02-add-shared-secret-auth.md) | HIGH | M |
| 3 | [phase-03-fix-ipc-listener-leak.md](phase-03-fix-ipc-listener-leak.md) | MEDIUM | S |
| 4 | [phase-04-remove-orphaned-screenshot-desktop.md](phase-04-remove-orphaned-screenshot-desktop.md) | MEDIUM | XS |
| 5 | [phase-05-harden-screenshot-tmpfile-cleanup.md](phase-05-harden-screenshot-tmpfile-cleanup.md) | LOW | S |

Phase 1 and Phase 4 are independent and can run in parallel. Phase 2 touches both server (`index.ts`, `socket/handler.ts`) and client (`electron/main.js`, `App.tsx`) and should land alone. Phases 3 and 5 are scoped to single files.

## Verification

After all phases: run server, run client, connect from 127.0.0.1, take a screenshot, click the remote screen at a known fixed point (e.g., center), confirm the server-side cursor lands at the correct absolute coordinate for the server's real screen resolution (not 1920×1080 unless that's actually the resolution). Confirm no stale temp files accumulate under `%TEMP%\screenshot_*.png` after 60s of streaming.

## Live Runtime Verification (2026-04-19)

Ran server with `RPC_SECRET=testpass`, probed via Socket.IO client:

- Auth gate: empty/wrong token → `connect_error: unauthorized`; correct token → connects. ✓
- `screen_info` → `{ width: 2560, height: 1440 }` (real resolution, not the 1920×1080 fallback). ✓
- `screenshot` → 591556-char base64. ✓
- `list_processes` → 50 entries. ✓
- Unknown action → clean error response. ✓
- 20-screenshot burst (12 fps) → 0 temp files leaked. ✓

**Additional issue found + fixed under load:** `captureScreen` used `Date.now()` for tmp filenames, which collided under concurrent bursts — two PowerShell processes wrote to the same path, triggering `EBUSY` on unlink and potentially swapping clients' screenshots. Switched to `crypto.randomUUID()` in `server/src/services/screen.ts`. Re-ran the 20-burst; warnings gone, delta still 0.

**Second issue found during interactive client test:** Screenshots silently returned `success: false` with an empty stderr. Root cause: `powershell -File` runs in MTA apartment by default; `System.Windows.Forms.Graphics.CopyFromScreen` silently no-ops in MTA and never saves the PNG. Added `-STA` flag to the `powershell` invocation in `server/src/services/screen.ts`. Verified: screenshots return full base64 PNG again.
