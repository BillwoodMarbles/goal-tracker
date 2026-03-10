# Last-Write-Wins Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace mutation-replay queue with a dirty-goals map so the flush always sends the current local state rather than replaying individual clicks.

**Architecture:** The queue becomes a `Map<string, DirtyGoal>` keyed by goalId — natural deduplication. On flush, each dirty goal's current state is read from a ref and upserted directly to the server via new `setDailyGoalStatus` / `setWeeklyGoalStatus` service methods. The group goal toggle API gains an optional `completed` body param so it too can upsert rather than flip.

**Tech Stack:** Next.js route handlers, Supabase JS client, React useRef/useCallback

---

### Task 1: Add `setDailyGoalStatus` to SupabaseGoalsService

**Files:**
- Modify: `src/app/(root)/goals/services/supabaseGoalsService.ts`

Add a new public method after `incrementGoalStep` (around line 504). It upserts the full daily status record — whatever the current local state is.

**Step 1: Add the method**

```ts
async setDailyGoalStatus(
  goalId: string,
  date: string,
  status: {
    completed: boolean;
    completedAt?: Date;
    completedSteps: number;
    stepCompletions: (Date | undefined)[];
  }
): Promise<void> {
  const user = await this.getUser();
  const stepCompletions = status.stepCompletions.map((s) =>
    s ? s.toISOString() : null
  );

  const { data: existing } = await this.supabase
    .from("daily_goal_status")
    .select("id")
    .eq("goal_id", goalId)
    .eq("date", date)
    .eq("user_id", user.id)
    .maybeSingle();

  const record = {
    user_id: user.id,
    goal_id: goalId,
    date,
    completed: status.completed,
    completed_at: status.completedAt?.toISOString() ?? null,
    completed_steps: status.completedSteps,
    step_completions: stepCompletions,
    last_updated: new Date().toISOString(),
  };

  if (existing) {
    await this.supabase
      .from("daily_goal_status")
      .update(record)
      .eq("id", existing.id);
  } else {
    await this.supabase.from("daily_goal_status").insert(record);
  }
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/app/(root)/goals/services/supabaseGoalsService.ts
git commit -m "feat: add setDailyGoalStatus upsert to SupabaseGoalsService"
```

---

### Task 2: Add `setWeeklyGoalStatus` to SupabaseGoalsService

**Files:**
- Modify: `src/app/(root)/goals/services/supabaseGoalsService.ts`

Add after `setDailyGoalStatus`. Fetches the existing record first to preserve `daily_increments` for other days, then upserts with today's flag merged in. Uses the existing private `getWeekStart(date)` method (line 632).

**Step 1: Add the method**

```ts
async setWeeklyGoalStatus(
  goalId: string,
  date: string,
  status: {
    completed: boolean;
    completedAt?: Date;
    completedSteps: number;
    stepCompletions: (Date | undefined)[];
    dailyIncremented?: boolean;
  }
): Promise<void> {
  const user = await this.getUser();
  const weekStart = this.getWeekStart(date);
  const stepCompletions = status.stepCompletions.map((s) =>
    s ? s.toISOString() : null
  );

  const { data: existing } = await this.supabase
    .from("weekly_goal_status")
    .select("id, daily_increments")
    .eq("goal_id", goalId)
    .eq("week_start", weekStart)
    .eq("user_id", user.id)
    .maybeSingle();

  // Preserve other days' increments; only update today.
  const dailyIncrements: Record<string, boolean> = {
    ...(existing?.daily_increments ?? {}),
    [date]: status.dailyIncremented ?? false,
  };

  const record = {
    user_id: user.id,
    goal_id: goalId,
    week_start: weekStart,
    completed: status.completed,
    completed_at: status.completedAt?.toISOString() ?? null,
    completed_steps: status.completedSteps,
    step_completions: stepCompletions,
    daily_increments: dailyIncrements,
    last_updated: new Date().toISOString(),
  };

  if (existing) {
    await this.supabase
      .from("weekly_goal_status")
      .update(record)
      .eq("id", existing.id);
  } else {
    await this.supabase.from("weekly_goal_status").insert(record);
  }
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/app/(root)/goals/services/supabaseGoalsService.ts
git commit -m "feat: add setWeeklyGoalStatus upsert to SupabaseGoalsService"
```

---

### Task 3: Update group goal toggle API to accept explicit `completed` state

**Files:**
- Modify: `src/app/api/group-goals/[id]/toggle/route.ts`

Currently the route reads `!existingStatus?.completed` to flip the value. Add an optional `completed` body param — if provided, use it directly; otherwise fall back to the existing toggle behavior (backwards compatible).

**Step 1: Change the body parsing and completion logic**

Find lines 45–53 (body parsing) and line 80 (`const newCompleted = !existingStatus?.completed`).

Replace the body parsing block:
```ts
const body = await request.json();
const { date } = body;

if (!date) {
  return NextResponse.json(
    { error: "Missing date parameter" },
    { status: 400 }
  );
}
```

With:
```ts
const body = await request.json();
const { date, completed } = body;

if (!date) {
  return NextResponse.json(
    { error: "Missing date parameter" },
    { status: 400 }
  );
}
```

Replace line 80:
```ts
const newCompleted = !existingStatus?.completed;
```

With:
```ts
const newCompleted =
  typeof completed === "boolean" ? completed : !existingStatus?.completed;
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/app/api/group-goals/\[id\]/toggle/route.ts
git commit -m "feat: group goal toggle accepts explicit completed state"
```

---

### Task 4: Refactor useGoals queue to dirty-goals Map

**Files:**
- Modify: `src/app/(root)/goals/hooks/useGoals.ts`

This is the core change. Replace `QueuedMutation[]` + mutation-replay with a `Map<string, DirtyGoal>` + state-upsert pattern.

**Step 1: Replace the `QueuedMutation` type with `DirtyGoal`**

Find the `type QueuedMutation = ...` block and replace entirely:

```ts
type DirtyGoal =
  | { goalId: string; type: "daily"; date: string; previousState: GoalWithStatus }
  | { goalId: string; type: "weekly"; date: string; previousState: GoalWithStatus }
  | { goalId: string; type: "group"; date: string; previousState: GroupGoalWithStatus };
```

**Step 2: Replace queue refs and add state refs**

Find the refs block (the lines with `pendingQueue`, `pendingGoalIds`, `isFlushing`, `debounceTimer`, `flushQueueRef`) and replace:

```ts
const dirtyGoals = useRef<Map<string, DirtyGoal>>(new Map());
const pendingGoalIds = useRef(new Set<string>());
const isFlushing = useRef(false);
const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
const flushQueueRef = useRef<() => Promise<void>>(() => Promise.resolve());
// Refs to always-current local state, readable inside flushQueue without stale closures.
const goalsRef = useRef<GoalWithStatus[]>([]);
const weeklyGoalsRef = useRef<GoalWithStatus[]>([]);
const groupGoalsRef = useRef<GroupGoalWithStatus[]>([]);
```

**Step 3: Add three useEffects to keep state refs current**

Add these after the existing `useEffect(() => { flushQueueRef.current = flushQueue; }, [flushQueue])` effect:

```ts
useEffect(() => { goalsRef.current = goals; }, [goals]);
useEffect(() => { weeklyGoalsRef.current = weeklyGoals; }, [weeklyGoals]);
useEffect(() => { groupGoalsRef.current = groupGoals; }, [groupGoals]);
```

**Step 4: Replace `flushQueue` with the state-upsert version**

Replace the entire `flushQueue` useCallback body:

```ts
const flushQueue = useCallback(async () => {
  if (isFlushing.current || dirtyGoals.current.size === 0) return;
  isFlushing.current = true;

  const batch = new Map(dirtyGoals.current);
  dirtyGoals.current.clear();

  const storageService = SupabaseGoalsService.getInstance();

  for (const [, dirty] of batch) {
    const execute = async () => {
      if (dirty.type === "daily") {
        const current = goalsRef.current.find((g) => g.id === dirty.goalId);
        if (!current) return;
        await storageService.setDailyGoalStatus(dirty.goalId, dirty.date, current);
      } else if (dirty.type === "weekly") {
        const current = weeklyGoalsRef.current.find((g) => g.id === dirty.goalId);
        if (!current) return;
        await storageService.setWeeklyGoalStatus(dirty.goalId, dirty.date, current);
      } else {
        const current = groupGoalsRef.current.find((g) => g.id === dirty.goalId);
        if (!current) return;
        const res = await fetch(`/api/group-goals/${dirty.goalId}/toggle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: dirty.date, completed: current.selfCompleted }),
        });
        if (!res.ok) throw new Error("Failed to sync group goal");
      }
    };

    try {
      await execute();
    } catch {
      try {
        await new Promise((r) => setTimeout(r, 1000));
        if (!mountedRef.current) {
          pendingGoalIds.current.delete(dirty.goalId);
          continue;
        }
        await execute();
      } catch {
        if (!mountedRef.current) continue;
        if (dirty.type === "group") {
          setGroupGoals((prev) =>
            prev.map((g) =>
              g.id === dirty.goalId ? (dirty.previousState as GroupGoalWithStatus) : g
            )
          );
        } else {
          (dirty.type === "weekly" ? setWeeklyGoals : setGoals)((prev) =>
            prev.map((g) =>
              g.id === dirty.goalId ? (dirty.previousState as GoalWithStatus) : g
            )
          );
        }
        const failedDirty = dirty;
        setSyncError({
          message: `Couldn't save "${dirty.previousState.title}"`,
          retry: () => {
            pendingGoalIds.current.add(failedDirty.goalId);
            dirtyGoals.current.set(failedDirty.goalId, failedDirty);
            scheduleFlush();
            setSyncError(null);
          },
        });
      }
    } finally {
      pendingGoalIds.current.delete(dirty.goalId);
    }
  }

  isFlushing.current = false;

  if (!mountedRef.current) return;

  if (dirtyGoals.current.size > 0) {
    scheduleFlush();
  } else {
    await loadGoals({ showLoader: false });
  }
}, [loadGoals, scheduleFlush]);
```

**Step 5: Update all four mutation functions to use the dirty map**

For `toggleGoal`, `toggleGoalStep`, and `incrementGoalStep` — find the block at the bottom of each that currently reads:
```ts
pendingGoalIds.current.add(goalId);
pendingQueue.current.push({ goalId, type: "...", ... });
scheduleFlush();
```

Replace each with (adapting `isWeekly` per function):
```ts
pendingGoalIds.current.add(goalId);
if (!dirtyGoals.current.has(goalId)) {
  dirtyGoals.current.set(goalId, {
    goalId,
    type: isWeekly ? "weekly" : "daily",
    date: currentDate,
    previousState: goal,
  });
}
scheduleFlush();
```

For `toggleGroupGoal` — find the block:
```ts
pendingGoalIds.current.add(groupGoalId);
pendingQueue.current.push({ goalId: groupGoalId, type: "toggleGroupGoal", ... });
scheduleFlush();
```

Replace with:
```ts
pendingGoalIds.current.add(groupGoalId);
if (!dirtyGoals.current.has(groupGoalId)) {
  dirtyGoals.current.set(groupGoalId, {
    goalId: groupGoalId,
    type: "group",
    date: currentDate,
    previousState: goal,
  });
}
scheduleFlush();
```

**Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Fix any errors — the most likely ones are:
- `dirty.previousState.title` — both `GoalWithStatus` (via `Goal`) and `GroupGoalWithStatus` have `title`, so this should be fine after the type union narrows correctly. If TypeScript still complains, use `(dirty.previousState as { title: string }).title`.
- Any remaining references to `pendingQueue` or `QueuedMutation` that weren't replaced.

**Step 7: Commit**

```bash
git add src/app/(root)/goals/hooks/useGoals.ts
git commit -m "feat: replace mutation queue with dirty-goals map for last-write-wins sync"
```
