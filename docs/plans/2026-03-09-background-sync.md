# Background-Safe Goal Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix goal toggle UX so clicks feel instant and background syncs never interfere with optimistic state.

**Architecture:** All mutation functions push to a shared queue instead of calling the server directly. A 300ms debounce flushes the queue sequentially. A `pendingGoalIds` set guards `loadGoals` from overwriting in-flight goals. Failed mutations retry once silently, then revert and surface a snackbar error.

**Tech Stack:** React hooks (useRef, useCallback), Jest + @testing-library/react, MUI Snackbar (already in page.tsx)

---

### Task 1: Set up Jest for React hook testing

**Files:**
- Create: `jest.config.js`
- Create: `jest.setup.ts`
- Modify: `package.json` (add test deps)

**Step 1: Install test dependencies**

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

Expected: packages installed, no peer dep errors.

**Step 2: Create jest config**

Create `jest.config.js`:
```js
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })
module.exports = createJestConfig({
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
})
```

**Step 3: Create jest setup file**

Create `jest.setup.ts`:
```ts
import '@testing-library/jest-dom'
```

**Step 4: Verify jest runs**

```bash
npm test -- --passWithNoTests
```

Expected: `Test Suites: 0 passed, 0 total`

**Step 5: Commit**

```bash
git add jest.config.js jest.setup.ts package.json package-lock.json
git commit -m "chore: add jest + testing-library for hook tests"
```

---

### Task 2: Add queue types and refs to useGoals

**Files:**
- Modify: `src/app/(root)/goals/hooks/useGoals.ts`

This task only adds the data structures — no behavior changes yet.

**Step 1: Add the `QueuedMutation` discriminated union type** after the existing `DailyResponseDTO` type (around line 73):

```ts
type QueuedMutation =
  | { goalId: string; type: "toggleGoal"; isWeekly: boolean; date: string; previousState: GoalWithStatus }
  | { goalId: string; type: "toggleGoalStep"; isWeekly: boolean; date: string; stepIndex: number; previousState: GoalWithStatus }
  | { goalId: string; type: "incrementGoalStep"; isWeekly: boolean; date: string; previousState: GoalWithStatus }
  | { goalId: string; type: "toggleGroupGoal"; date: string; previousState: GroupGoalWithStatus };
```

**Step 2: Add refs inside the `useGoals` function body** directly after the existing `mutationSeqRef` declaration (around line 133):

```ts
const pendingQueue = useRef<QueuedMutation[]>([]);
const pendingGoalIds = useRef(new Set<string>());
const isFlushing = useRef(false);
const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
// Always holds the latest flushQueue so the debounce timeout doesn't go stale.
const flushQueueRef = useRef<() => Promise<void>>(() => Promise.resolve());
```

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/app/(root)/goals/hooks/useGoals.ts
git commit -m "feat: add mutation queue types and refs to useGoals"
```

---

### Task 3: Write tests for queue batching behavior

**Files:**
- Create: `src/app/(root)/goals/hooks/__tests__/useGoals.queue.test.ts`

These tests verify that rapid clicks result in batched server calls, not one-per-click. We mock `fetch` globally and `SupabaseGoalsService`.

**Step 1: Create the test file**

```ts
// src/app/(root)/goals/hooks/__tests__/useGoals.queue.test.ts
import { renderHook, act, waitFor } from "@testing-library/react";
import { useGoals } from "../useGoals";

// Mock the auth context
jest.mock("@/app/contexts/SupabaseAuthContext", () => ({
  useSupabaseAuth: () => ({ user: { id: "user-1" } }),
}));

// Mock SupabaseGoalsService
const mockToggleGoalCompletion = jest.fn().mockResolvedValue(undefined);
jest.mock("../services/supabaseGoalsService", () => ({
  getTodayString: () => "2026-03-09",
  SupabaseGoalsService: {
    getInstance: () => ({
      toggleGoalCompletion: mockToggleGoalCompletion,
      toggleWeeklyGoal: jest.fn().mockResolvedValue(undefined),
      toggleWeeklyGoalStep: jest.fn().mockResolvedValue(undefined),
      toggleGoalStep: jest.fn().mockResolvedValue(undefined),
      incrementGoalStep: jest.fn().mockResolvedValue(undefined),
      incrementWeeklyGoalStep: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Minimal daily response with two daily goals
const makeDailyResponse = () => ({
  date: "2026-03-09",
  goals: [
    {
      id: "goal-a",
      title: "Goal A",
      createdAt: new Date().toISOString(),
      isActive: true,
      goalType: "daily",
      daysOfWeek: ["monday"],
      isMultiStep: false,
      totalSteps: 1,
      completed: false,
      completedSteps: 0,
      stepCompletions: [],
    },
    {
      id: "goal-b",
      title: "Goal B",
      createdAt: new Date().toISOString(),
      isActive: true,
      goalType: "daily",
      daysOfWeek: ["monday"],
      isMultiStep: false,
      totalSteps: 1,
      completed: false,
      completedSteps: 0,
      stepCompletions: [],
    },
  ],
  weeklyGoals: [],
  inactiveGoals: [],
  groupGoals: [],
  historicalGroupGoals: [],
  completionStats: { total: 2, completed: 0, percentage: 0 },
});

describe("useGoals queue batching", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockToggleGoalCompletion.mockClear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeDailyResponse()),
    } as Response);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("batches two rapid toggles into one flush cycle, not two server calls", async () => {
    const { result } = renderHook(() => useGoals("2026-03-09"));

    // Wait for initial load
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Click goal-a then goal-b rapidly (no timer advance yet)
    act(() => {
      result.current.toggleGoal("goal-a");
      result.current.toggleGoal("goal-b");
    });

    // Server calls should NOT have fired yet (debounce pending)
    expect(mockToggleGoalCompletion).not.toHaveBeenCalled();

    // Advance past debounce
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() => expect(mockToggleGoalCompletion).toHaveBeenCalledTimes(2));

    // Both goals should be optimistically marked complete immediately
    expect(result.current.goals.find((g) => g.id === "goal-a")?.completed).toBe(true);
    expect(result.current.goals.find((g) => g.id === "goal-b")?.completed).toBe(true);
  });
});
```

**Step 2: Run test — expect it to FAIL** (flushQueue not implemented yet)

```bash
npm test -- useGoals.queue --no-coverage
```

Expected: FAIL — `mockToggleGoalCompletion` not called after timer advance.

**Step 3: Commit the failing test**

```bash
git add src/app/(root)/goals/hooks/__tests__/useGoals.queue.test.ts
git commit -m "test: add failing queue batching test for useGoals"
```

---

### Task 4: Implement `flushQueue` and `scheduleFlush`

**Files:**
- Modify: `src/app/(root)/goals/hooks/useGoals.ts`

Add `flushQueue` (via `useCallback`) and `scheduleFlush` after the `loadGoals` definition. Then sync `flushQueueRef` in a `useEffect`.

**Step 1: Add `flushQueue` after the `loadGoals` `useCallback`, before `useEffect`**

```ts
const flushQueue = useCallback(async () => {
  if (isFlushing.current || pendingQueue.current.length === 0) return;
  isFlushing.current = true;

  // Snapshot and clear queue so new clicks accumulate in a fresh queue.
  const batch = [...pendingQueue.current];
  pendingQueue.current = [];

  const storageService = SupabaseGoalsService.getInstance();

  for (const mutation of batch) {
    const execute = async () => {
      switch (mutation.type) {
        case "toggleGoal":
          if (mutation.isWeekly) {
            await storageService.toggleWeeklyGoal(mutation.goalId, mutation.date);
          } else {
            await storageService.toggleGoalCompletion(mutation.goalId, mutation.date);
          }
          break;
        case "toggleGoalStep":
          if (mutation.isWeekly) {
            await storageService.toggleWeeklyGoalStep(mutation.goalId, mutation.stepIndex, mutation.date);
          } else {
            await storageService.toggleGoalStep(mutation.goalId, mutation.stepIndex, mutation.date);
          }
          break;
        case "incrementGoalStep":
          if (mutation.isWeekly) {
            await storageService.incrementWeeklyGoalStep(mutation.goalId, mutation.date);
          } else {
            await storageService.incrementGoalStep(mutation.goalId, mutation.date);
          }
          break;
        case "toggleGroupGoal": {
          const res = await fetch(`/api/group-goals/${mutation.goalId}/toggle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: mutation.date }),
          });
          if (!res.ok) throw new Error("Failed to toggle group goal");
          break;
        }
      }
    };

    try {
      await execute();
    } catch {
      // Retry once after 1 second.
      try {
        await new Promise((r) => setTimeout(r, 1000));
        await execute();
      } catch {
        // Revert the optimistic update and surface the error.
        if (!mountedRef.current) continue;
        if (mutation.type === "toggleGroupGoal") {
          setGroupGoals((prev) =>
            prev.map((g) => (g.id === mutation.goalId ? mutation.previousState : g))
          );
        } else {
          (mutation.isWeekly ? setWeeklyGoals : setGoals)((prev) =>
            prev.map((g) => (g.id === mutation.goalId ? mutation.previousState : g))
          );
        }
        setSyncError(`Couldn't save "${mutation.previousState.title}" — tap to retry`);
      }
    } finally {
      pendingGoalIds.current.delete(mutation.goalId);
    }
  }

  isFlushing.current = false;

  if (!mountedRef.current) return;

  // If new items arrived during flush, schedule another flush; otherwise sync.
  if (pendingQueue.current.length > 0) {
    scheduleFlush();
  } else {
    await loadGoals({ showLoader: false });
  }
}, [loadGoals]); // eslint-disable-line react-hooks/exhaustive-deps
```

**Step 2: Add `scheduleFlush` immediately after `flushQueue`**

```ts
const scheduleFlush = useCallback(() => {
  if (debounceTimer.current) clearTimeout(debounceTimer.current);
  debounceTimer.current = setTimeout(() => {
    void flushQueueRef.current();
  }, 300);
}, []);
```

**Step 3: Sync `flushQueueRef` in a `useEffect` after the existing mount effect**

```ts
useEffect(() => {
  flushQueueRef.current = flushQueue;
}, [flushQueue]);
```

**Step 4: Add `syncError` state** near the top of the hook alongside other state declarations:

```ts
const [syncError, setSyncError] = useState<string | null>(null);
const clearSyncError = useCallback(() => setSyncError(null), []);
```

**Step 5: Run the queue batching test — expect PASS**

```bash
npm test -- useGoals.queue --no-coverage
```

Expected: PASS.

**Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 7: Commit**

```bash
git add src/app/(root)/goals/hooks/useGoals.ts
git commit -m "feat: implement flushQueue with debounce and retry logic"
```

---

### Task 5: Migrate `toggleGoal`, `toggleGoalStep`, `incrementGoalStep` to use queue

**Files:**
- Modify: `src/app/(root)/goals/hooks/useGoals.ts`

Replace the `void (async () => { ... })()` server-call blocks in each mutation function with a queue push + `scheduleFlush`. The optimistic update code at the top of each function stays exactly as-is.

**Step 1: Replace the async IIFE in `toggleGoal`** (lines ~309–330)

Remove:
```ts
const seq = (mutationSeqRef.current.get(goalId) ?? 0) + 1;
mutationSeqRef.current.set(goalId, seq);

void (async () => {
  try {
    const storageService = SupabaseGoalsService.getInstance();
    if (isWeekly) {
      await storageService.toggleWeeklyGoal(goalId, currentDate);
    } else {
      await storageService.toggleGoalCompletion(goalId, currentDate);
    }
    await loadGoals({ showLoader: false });
  } catch (err) {
    if (mutationSeqRef.current.get(goalId) !== seq) return;
    (isWeekly ? setWeeklyGoals : setGoals)((prev) =>
      prev.map((g) => (g.id === goalId ? goal : g))
    );
    setError("Failed to toggle goal completion");
    console.error("Error toggling goal:", err);
  }
})();
```

Replace with:
```ts
pendingGoalIds.current.add(goalId);
pendingQueue.current.push({
  goalId,
  type: "toggleGoal",
  isWeekly,
  date: currentDate,
  previousState: goal,
});
scheduleFlush();
```

**Step 2: Replace the async IIFE in `toggleGoalStep`** (lines ~373–394)

Remove the `seqKey`/`seq` block and the entire `void (async () => { ... })()`.

Replace with:
```ts
pendingGoalIds.current.add(goalId);
pendingQueue.current.push({
  goalId,
  type: "toggleGoalStep",
  isWeekly,
  date: currentDate,
  stepIndex,
  previousState: goal,
});
scheduleFlush();
```

**Step 3: Replace the async IIFE in `incrementGoalStep`** (lines ~474–495)

Same pattern — remove the `seqKey`/`seq` block and IIFE.

Replace with:
```ts
pendingGoalIds.current.add(goalId);
pendingQueue.current.push({
  goalId,
  type: "incrementGoalStep",
  isWeekly,
  date: currentDate,
  previousState: goal,
});
scheduleFlush();
```

**Step 4: Run the queue batching test**

```bash
npm test -- useGoals.queue --no-coverage
```

Expected: PASS.

**Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/app/(root)/goals/hooks/useGoals.ts
git commit -m "feat: migrate toggleGoal/Step/increment to mutation queue"
```

---

### Task 6: Implement pending-mutations guard in `loadGoals`

**Files:**
- Modify: `src/app/(root)/goals/hooks/useGoals.ts`

**Step 1: Write the failing test for the pending guard**

Add to `src/app/(root)/goals/hooks/__tests__/useGoals.queue.test.ts`:

```ts
it("pending guard: loadGoals does not overwrite a goal with an in-flight mutation", async () => {
  let resolveToggle!: () => void;
  mockToggleGoalCompletion.mockImplementationOnce(
    () => new Promise<void>((res) => { resolveToggle = res; })
  );

  const { result } = renderHook(() => useGoals("2026-03-09"));
  await waitFor(() => expect(result.current.loading).toBe(false));

  // Click goal-a (optimistic: completed = true), flush starts
  act(() => { result.current.toggleGoal("goal-a"); });
  await act(async () => { jest.advanceTimersByTime(300); await Promise.resolve(); });

  // Simulate loadGoals firing mid-mutation (server hasn't saved goal-a yet)
  // by resetting fetch to return goal-a as NOT completed
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(makeDailyResponse()), // goal-a completed=false
  } as Response);

  // Advance timers — loadGoals would fire here but goal-a should be protected
  await act(async () => { await Promise.resolve(); });

  // goal-a must still be optimistically completed
  expect(result.current.goals.find((g) => g.id === "goal-a")?.completed).toBe(true);

  // Now let the toggle complete
  act(() => { resolveToggle(); });
  await waitFor(() => expect(mockToggleGoalCompletion).toHaveBeenCalledTimes(1));
});
```

**Step 2: Run test — expect FAIL**

```bash
npm test -- useGoals.queue --no-coverage
```

Expected: FAIL — guard not implemented yet.

**Step 3: Modify `loadGoals` to merge when `pendingGoalIds` is non-empty**

In `loadGoals`, replace the three `set*` calls (lines ~200–207) with merge-aware setters:

```ts
// Goals that have pending mutations keep their local state.
const mergeGoals = (
  prev: GoalWithStatus[],
  next: GoalWithStatus[]
): GoalWithStatus[] => {
  if (pendingGoalIds.current.size === 0) return next;
  const serverMap = new Map(next.map((g) => [g.id, g]));
  const prevIds = new Set(prev.map((g) => g.id));
  const merged = prev.map((g) =>
    pendingGoalIds.current.has(g.id) ? g : (serverMap.get(g.id) ?? g)
  );
  const added = next.filter(
    (g) => !prevIds.has(g.id) && !pendingGoalIds.current.has(g.id)
  );
  return [...merged, ...added];
};

setGoals((prev) => mergeGoals(prev, nextGoals));
setWeeklyGoals((prev) => mergeGoals(prev, nextWeeklyGoals));
setInactiveGoals(nextInactiveGoals); // inactive goals are never mutated
setGroupGoals((prev) => {
  if (pendingGoalIds.current.size === 0) return nextGroupGoals;
  const serverMap = new Map(nextGroupGoals.map((g) => [g.id, g]));
  return prev.map((g) =>
    pendingGoalIds.current.has(g.id) ? g : (serverMap.get(g.id) ?? g)
  );
});
```

Leave `setHistoricalGroupGoals` and `setCompletionStats` unchanged — they always take the server value.

**Step 4: Run tests — expect PASS**

```bash
npm test -- useGoals.queue --no-coverage
```

**Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/app/(root)/goals/hooks/useGoals.ts src/app/(root)/goals/hooks/__tests__/useGoals.queue.test.ts
git commit -m "feat: add pending-mutations guard to loadGoals merge"
```

---

### Task 7: Add optimistic update to `toggleGroupGoal` and migrate to queue

**Files:**
- Modify: `src/app/(root)/goals/hooks/useGoals.ts`

`toggleGroupGoal` currently has no optimistic update. Add one, then push to queue.

**Step 1: Replace the entire `toggleGroupGoal` implementation**

```ts
const toggleGroupGoal = useCallback(
  async (groupGoalId: string): Promise<void> => {
    const goal = groupGoals.find((g) => g.id === groupGoalId);
    if (!goal) return;

    // Optimistic update
    const nextGoal: GroupGoalWithStatus = {
      ...goal,
      selfCompleted: !goal.selfCompleted,
      membersCompleted: goal.selfCompleted
        ? goal.membersCompleted - 1
        : goal.membersCompleted + 1,
    };
    setGroupGoals((prev) =>
      prev.map((g) => (g.id === groupGoalId ? nextGoal : g))
    );

    pendingGoalIds.current.add(groupGoalId);
    pendingQueue.current.push({
      goalId: groupGoalId,
      type: "toggleGroupGoal",
      date: currentDate,
      previousState: goal,
    });
    scheduleFlush();
  },
  [currentDate, groupGoals, scheduleFlush]
);
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/app/(root)/goals/hooks/useGoals.ts
git commit -m "feat: add optimistic update and queue to toggleGroupGoal"
```

---

### Task 8: Expose `syncError` from hook and wire up snackbar in page.tsx

**Files:**
- Modify: `src/app/(root)/goals/hooks/useGoals.ts` (return value)
- Modify: `src/app/(root)/page.tsx`

**Step 1: Add `syncError` and `clearSyncError` to the hook's return object**

In the `return` statement at the bottom of `useGoals`, add:
```ts
syncError,
clearSyncError,
```

**Step 2: Destructure in `page.tsx`**

Add to the `useGoals` destructure in `page.tsx`:
```ts
syncError,
clearSyncError,
```

**Step 3: Add a second Snackbar for sync errors in `page.tsx`**

After the existing `</Snackbar>` (around line 603), add:
```tsx
<Snackbar
  open={Boolean(syncError)}
  autoHideDuration={5000}
  onClose={clearSyncError}
>
  <Alert severity="error" onClose={clearSyncError}>
    {syncError}
  </Alert>
</Snackbar>
```

**Step 4: Verify TypeScript compiles and dev server starts**

```bash
npx tsc --noEmit
npm run dev
```

Manually test: toggle a goal and verify it responds instantly. Simulate a network failure (DevTools → offline) and verify state reverts.

**Step 5: Run all tests**

```bash
npm test --no-coverage
```

Expected: all pass.

**Step 6: Final commit**

```bash
git add src/app/(root)/goals/hooks/useGoals.ts src/app/(root)/page.tsx
git commit -m "feat: expose syncError from useGoals and wire snackbar in page"
```

---

## Cleanup

Remove `mutationSeqRef` from `useGoals.ts` — it is no longer used after the queue migration (sequence tracking is now handled by the queue's snapshot-and-clear pattern). Run `npx tsc --noEmit` after removal to confirm.

```bash
git add src/app/(root)/goals/hooks/useGoals.ts
git commit -m "chore: remove unused mutationSeqRef from useGoals"
```
