# Background-Safe Goal Sync

**Date:** 2026-03-09
**Status:** Approved

## Problem

Goal toggles already apply optimistic updates instantly. However, after each server mutation succeeds, the hook calls `loadGoals({ showLoader: false })` — a full state replacement. Under rapid clicking, an earlier `loadGoals` response can arrive before a later mutation is saved, overwriting the newer optimistic state and causing visible flicker.

## Solution

Two complementary mechanisms, both confined to `useGoals.ts`:

### 1. Mutation Queue with Debounced Flush

- Every toggle/increment pushes a `{ goalId, type, args }` entry onto a `pendingQueue` ref instead of immediately calling the service
- A 300ms debounce timer resets on each push; when it fires, `flushQueue` runs the queued server calls sequentially
- An `isFlushing` ref prevents concurrent flushes; clicks during a flush append to the queue and start a fresh debounce that fires after the flush completes
- After a successful flush, one `loadGoals` call reconciles server truth

### 2. Pending-Mutations Guard in `loadGoals`

- A `pendingGoalIds: Set<string>` ref tracks goals with queued or in-flight mutations
- Goals are added to the set when queued, removed in the `finally` block of their server call
- When `loadGoals` is called as a background sync, it merges rather than replaces: goals in `pendingGoalIds` keep their local optimistic state; all others update from server data
- `completionStats` always updates from the server regardless

### 3. Error Handling

- On server failure: retry once after 1 second
- If retry fails: revert the goal to its pre-optimistic state and show a brief snackbar ("Couldn't save — tap to retry") with a retry action that re-queues the mutation
- No error state is set on the hook; errors are local to each failed mutation

## Scope

- All changes confined to `src/app/(root)/goals/hooks/useGoals.ts`
- `toggleGroupGoal` also gets an optimistic update + queue (currently has none)
- Hook's public API is unchanged — no changes to components, services, or API routes

## Data Flow

```
User click
  → optimistic state update (instant)
  → mutation pushed to pendingQueue
  → goalId added to pendingGoalIds
  → debounce timer reset (300ms)

Timer fires (or resets if new click arrives)
  → isFlushing = true
  → for each queued mutation:
      → call server
      → on fail: retry once, then revert + snackbar
      → goalId removed from pendingGoalIds (finally)
  → isFlushing = false
  → loadGoals (background, merge mode)
      → server goals not in pendingGoalIds → update
      → server goals in pendingGoalIds → keep local state
      → completionStats → always update

New click during flush
  → optimistic update (instant)
  → appended to queue
  → new debounce starts (fires after flush)
```
