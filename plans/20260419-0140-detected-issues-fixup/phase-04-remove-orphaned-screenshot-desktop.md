# Phase 4 — Remove Orphaned `screenshot-desktop`

**Priority:** MEDIUM
**Status:** completed
**Effort:** XS

## Problem

`server/src/services/screen.ts` was rewritten to use a PowerShell-based capture but the abandoned `screenshot-desktop` pieces remain:

- `server/package.json:12` — `"screenshot-desktop": "^1.15.0"` still listed
- `server/src/declarations.d.ts:1` — `declare module 'screenshot-desktop';` type shim for a module nothing imports
- `server/package-lock.json:2623` — corresponding lockfile entry

Dead code, dead dependency. No one uses it, but `npm install` still pulls it (which pulls `ffi-napi` on some platforms and fails on others).

## Files

- **Modify:** `server/package.json` — drop the dependency line
- **Modify:** `server/src/declarations.d.ts` — either delete the file or replace with a placeholder if the build needs it for anything else (spoiler: it doesn't; nothing else in the tree uses it)
- **Regenerate:** `server/package-lock.json` — via `npm install` after the package.json edit

## Implementation

1. Remove the `"screenshot-desktop": "^1.15.0",` line from `server/package.json`.
2. Delete `server/src/declarations.d.ts` entirely. Verify nothing else imports anything it declared. Grep confirms it only contained the one orphan shim.
3. `cd server && rm -rf node_modules && npm install`.
4. `cd server && npx tsc --noEmit` — must pass.
5. `cd server && npm run dev` — must start, server must respond to `screenshot` command (probe it).

## Verification

```bash
grep -r 'screenshot-desktop' server/src  # should return nothing
```

Run the end-to-end screenshot probe from the audit (`sock.emit('command', { action: 'screenshot' })`) — expect success with non-empty base64 data.

## Risk

None. Pure removal of dead code.
