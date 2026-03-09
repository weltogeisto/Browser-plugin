# Legacy API flow (inactive)

This folder contains the previous API-key based comparison implementation.

Status:
- Archived for reference.
- Not used by the active sidepanel entry (`src/sidepanel/App.tsx`).
- Active MVP path uses tab automation via `src/background/serviceWorker.ts` and `src/providers/tabAdapters.ts`.

If API flow is reactivated later, rewire imports from this folder intentionally and reconcile provider IDs/messages with the active architecture.
