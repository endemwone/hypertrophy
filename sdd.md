# HyperTrophy — Software Design Document (SDD)
### For Claude Code / Coding Agent — Read Every Section Before Writing Code

---

## 0. Agent Philosophy

You are building a **local-first, offline-only** React Native (Expo) application for a user with ADHD.

Rules of engagement:
- **No backend. No auth. No cloud sync.** Ever. Data lives in MMKV on-device.
- **Maximum frictionlessness.** Every interaction must be 1–2 taps. No confirmation dialogs unless data destruction is irreversible.
- **Speed is a feature.** MMKV is mandatory. Do NOT use SQLite, AsyncStorage, or any async local storage.
- **High contrast, large tap targets.** Minimum 48dp touch area on all interactive elements.
- **Vibration and haptics are part of the UX.** Use them. They are not optional polish.
- **Build in the exact order of the Implementation Phases section.** Do not skip ahead.

---

## 1. Tech Stack (Mandatory)

| Concern | Library | Notes |
|---|---|---|
| Framework | Expo (React Native) + TypeScript | Latest stable SDK |
| Routing | Expo Router (file-based) | |
| State + Persistence | Zustand + `react-native-mmkv` | MMKV persistence middleware required |
| Styling | NativeWind (TailwindCSS for RN) | |
| Icons | `@expo/vector-icons` | Prefer Feather or Lucide sets |
| Haptics | `expo-haptics` | Use throughout, not just on timer end |
| Vibration | React Native `Vibration` API | Timer end: `[500,500,500,500,500]` |
| Animations | `react-native-reanimated` | For timer takeover, unlock banner, PR banner |

---

## 2. Data Schema (TypeScript — Canonical)

```typescript
type MuscleGroup = 'Push' | 'Pull' | 'Core' | 'Legs';
type Equipment = 'None' | 'Pullup Bar' | 'Rings' | 'Parallettes' | 'Wall';
type MoodTag = '💪' | '🔥' | '😐' | '😴' | '🤒';

interface Exercise {
  id: string;                        // e.g. 'ring_dip', 'tuck_planche'
  name: string;
  group: MuscleGroup;
  equipment: Equipment[];
  level: number;                     // 1–16 difficulty scale (Overcoming Gravity scale)
  targetRepsToUnlock: number;        // reps per set required to count as a qualifying session
  targetSetsToUnlock: number;        // number of sets required in that session
  nextProgressionId?: string | null; // chains the skill tree
  prevProgressionId?: string | null; // needed to render the chain backwards
  formCues: string[];                // 2–4 short coaching cues, e.g. ["Keep elbows tucked", "Full ROM"]
  isCustom?: boolean;
}

interface WorkoutSet {
  id: string;
  exerciseId: string;
  reps: number;
  weightAdded: number;   // 0 for pure bodyweight
  timestamp: number;     // Unix ms
  isSuperset?: boolean;  // true if this set is part of a tagged superset pair
}

interface WorkoutSession {
  id: string;            // UUID
  routineId: string;
  date: string;          // 'YYYY-MM-DD'
  sets: WorkoutSet[];
  durationSeconds: number;
  moodTag?: MoodTag;
  qualifiedExercises: string[]; // exerciseIds where unlock threshold was met this session
}

interface Routine {
  id: string;
  name: string;
  exerciseIds: string[];         // ordered
  supersetPairs: [string, string][]; // pairs of exerciseIds tagged as supersets
}

interface UserProfile {
  name: string;                  // used in dynamic header copy
  bodyWeightKg: number;
  unlockThreshold: number;       // 1 | 2 | 3 — qualifying sessions needed to unlock
}

interface AppState {
  // Data
  exercises: Record<string, Exercise>;
  sessions: WorkoutSession[];          // full history, ordered oldest-first
  routines: Routine[];

  // User config
  profile: UserProfile;
  availableEquipment: Equipment[];
  unlockedExercises: string[];         // exerciseIds user can see/use

  // Derived (computed, not stored separately — see store section)
  // PRs and qualifying session counts are derived from `sessions` at read time
}
```

---

## 3. Zustand Store Design

File: `/store/useStore.ts`

Use `create` with the MMKV persistence middleware. The entire `AppState` is serialized to a single MMKV key `'hypertrophy_state'`.

### Store Actions (implement all of these)

```typescript
// Equipment
toggleEquipment(equipment: Equipment): void

// Exercises
addCustomExercise(exercise: Omit<Exercise, 'id' | 'isCustom'>): void
importExercises(json: Exercise[]): void   // merges, does not overwrite existing

// Routines
createRoutine(name: string, exerciseIds: string[]): void
updateRoutine(id: string, patch: Partial<Routine>): void
deleteRoutine(id: string): void
addSupersetPair(routineId: string, pair: [string, string]): void
removeSupersetPair(routineId: string, pair: [string, string]): void

// Workout sessions
saveSession(session: WorkoutSession): void

// Profile
updateProfile(patch: Partial<UserProfile>): void

// Unlock logic (called inside saveSession)
evaluateAndUnlock(session: WorkoutSession): string[]
// Returns array of newly unlocked exerciseIds. Logic described in section 5.

// Data portability
exportStateAsBase64(): string
importStateFromBase64(encoded: string): void
resetAllData(): void   // requires explicit confirmation UI (only case where confirm is okay)
```

### Derived Selectors (not stored, computed on demand)

```typescript
// Returns the user's all-time best rep count for a given exerciseId in a single set
getPersonalBest(exerciseId: string): number | null

// Returns how many qualifying sessions the user has for a given exerciseId
getQualifyingSessions(exerciseId: string): number

// Returns WorkoutSets for a given exerciseId from the most recent session it appeared in
getLastSessionPerformance(exerciseId: string): WorkoutSet[] | null

// Returns total volume (reps × (bodyweight + weightAdded)) per MuscleGroup for a date range
getVolumeByMuscleGroup(startDate: string, endDate: string): Record<MuscleGroup, number>

// Returns workout streak in days (consecutive calendar days with at least 1 session)
getCurrentStreak(): number
```

---

## 4. Business Logic

### 4.1 Unlock Logic

An exercise is **unlocked by default** if it is in `unlockedExercises` in the initial seed data, or has been unlocked via progression.

**Qualifying session definition:**  
A session qualifies for exercise `X` if, within that single session, the user logged at least `exercise.targetSetsToUnlock` sets where each set had `reps >= exercise.targetRepsToUnlock`.

**Unlock trigger:**  
After `saveSession` is called, run `evaluateAndUnlock`:
1. For each exercise in `unlockedExercises` that has a `nextProgressionId`:
   a. Count how many historical sessions (including current) are qualifying sessions for that exercise.
   b. If count >= `profile.unlockThreshold` AND `nextProgressionId` is not already in `unlockedExercises`:
      - Add `nextProgressionId` to `unlockedExercises`.
      - Return the newly unlocked IDs so the UI can display the unlock banner.

**Edge case:** If `nextProgressionId` points to an exercise not in the `exercises` dictionary (e.g., user deleted it), skip silently.

### 4.2 PR Detection

After saving a session, for each exercise that appeared in the session:
- Query `getPersonalBest(exerciseId)` against the history *excluding* the current session.
- If any set in the current session has `reps > personalBest`, it is a PR for that exercise.
- Return a `PRs: { exerciseId: string, newBest: number, oldBest: number | null }[]` array alongside the unlock list.
- The workout summary screen and in-session PR banner both consume this.

**Note:** PR is per-exercise, per-rep-count in a single set. Weight is not factored into PR detection (keeps it simple for bodyweight).

### 4.3 Streak Calculation

```
streak = 0
today = current date 'YYYY-MM-DD'
check date = today
while (a session exists on check date OR check date === today):
  if session exists on check date: streak++
  check date = check date - 1 day
return streak
```

A streak of 0 is shown as "Start your streak today." Never show a negative or null streak.

### 4.4 Deload Prompt

On app launch (Dashboard mount):
- Find the date of the most recent session.
- If it was 7+ calendar days ago, display a non-blocking banner on the Dashboard:  
  `"You've been away for X days. Maybe ease back in? 👀"`
- This is purely informational. No automatic modification of targets.

### 4.5 Chaos Mode

Algorithm:
1. Filter `unlockedExercises` to those whose `equipment` array intersects with `availableEquipment`.
2. Group filtered exercises by `MuscleGroup`.
3. Pick: 2 Push, 2 Pull, 1 Core (or closest available if a group is underpopulated).
4. Create a temporary in-memory routine (NOT saved to store) and navigate to the workout engine with it.
5. Label it "Chaos Mode 🎲" in the workout header.

---

## 5. App Architecture & File Structure

```
/app
  /(tabs)
    /_layout.tsx          # Tab bar layout — 4 tabs: Home, Skills, History, Settings
    /index.tsx            # Dashboard
    /skills.tsx           # Skill Tree
    /history.tsx          # History & Stats
    /settings.tsx         # Settings & Data Portability
  /workout
    /[routineId].tsx      # Active Workout Engine
  /summary
    /[sessionId].tsx      # Post-Workout Summary Screen
  /_layout.tsx            # Root layout

/store
  /useStore.ts            # Zustand + MMKV store

/constants
  /baseExercises.ts       # Seed exercise data (JSON)
  /theme.ts               # Color constants (for NativeWind extend config)

/components
  /RestTimer.tsx           # The countdown timer component
  /UnlockBanner.tsx        # Animated progression unlock banner
  /PRBanner.tsx            # Animated PR banner (separate from unlock)
  /SkillCard.tsx           # Single exercise card for skill tree
  /ProgressionRail.tsx     # Horizontal scroll rail for a progression chain
  /EquipmentToggle.tsx     # Pill-button row for equipment filter
  /RoutineCard.tsx         # Dashboard routine card
  /AddExerciseModal.tsx    # Modal: create custom exercise
  /CreateRoutineModal.tsx  # Modal: create/edit routine
  /WorkoutSetRow.tsx       # A logged set row in the active workout
  /MoodPicker.tsx          # Emoji mood tag picker for post-workout summary
  /VolumeChart.tsx         # Bar chart for history screen

/utils
  /dateUtils.ts            # Date string helpers
  /base64Utils.ts          # Export/import encoding
  /uuid.ts                 # Simple UUID generator
```

---

## 6. Screen Specifications

---

### Screen 1: Dashboard (`/app/(tabs)/index.tsx`)

**Purpose:** Entry point. Get the user into a workout in ≤2 taps.

**Layout (top to bottom):**

1. **Header**  
   Dynamic greeting using `profile.name`. Rotate between:
   - `"Ready to suffer, {name}?"`
   - `"Time to earn it, {name}."`
   - `"No excuses, {name}. Let's go."`  
   Pick randomly on each mount.

2. **Streak Counter**  
   Full-width pill: `"🔥 {n} day streak"` or `"Start your streak today."`  
   Tapping it does nothing — it's a stat, not a button.

3. **Deload Banner** *(conditional)*  
   Yellow/amber background banner: `"You've been away for {n} days. Ease back in? 👀"`  
   Only shown if last session was 7+ days ago. Dismissible (X button, dismissed state stored in ephemeral component state only — reappears on next cold launch).

4. **Equipment Toggle** (`EquipmentToggle` component)  
   Horizontal scrollable row of pill-buttons: `None | Pullup Bar | Rings | Parallettes | Wall`  
   Active = filled/highlighted. Tapping toggles. Persisted in store.

5. **Chaos Mode Button**  
   Full-width secondary button: `"🎲 Chaos Mode — Surprise Me"`  
   Triggers Chaos Mode algorithm and navigates to workout engine.

6. **Saved Routines** (`RoutineCard` components)  
   Section header: `"YOUR ROUTINES"`  
   Vertical list of `RoutineCard` components. Each card shows:
   - Routine name
   - Number of exercises
   - Estimated duration: `(exerciseCount × avgSetsPerExercise × (restTimerSeconds + 30))` — use 3 sets average, format as `~{n} min`
   - Equipment icons required  
   Tapping → navigates to `/workout/[routineId]`  
   Long-pressing → shows action sheet: "Edit" | "Delete"

7. **FAB (bottom-right)**  
   `+` icon. Opens `CreateRoutineModal`.

---

### Screen 2: Active Workout Engine (`/app/workout/[routineId].tsx`)

This is the most important screen. Build it last and build it well.

**State (local to this screen, not persisted mid-session):**

```typescript
interface WorkoutScreenState {
  currentExerciseIndex: number;
  setsLoggedThisExercise: WorkoutSet[];
  allSetsThisSession: WorkoutSet[];
  timerActive: boolean;
  timerSecondsRemaining: number;
  timerDuration: number; // default 90, 45 for supersets
  sessionStartTime: number; // unix ms
  isSuperset: boolean; // whether current exercise is in a superset pair
  supersetPartnerIndex: number | null; // index in exerciseIds of the partner
  PRsThisSession: { exerciseId: string; newBest: number; oldBest: number | null }[];
  unlocksThisSession: string[]; // exerciseIds unlocked mid-session (for summary)
}
```

**Layout:**

The screen has two zones. The timer zone and the logger zone. When no timer is active, the timer zone is minimal. When a set is logged, the timer zone expands to dominate the screen.

**Timer Zone (top half when active):**

- Massive countdown number (font size ~120sp)
- Exercise name (smaller, above the number)
- Set count context: `"Set 2 of 3"`
- Progress ring/arc around the number (Reanimated)
- `+30s` button — adds 30 seconds to the current timer, haptic feedback
- `Skip` text button — dismisses timer immediately, haptic feedback
- When timer hits zero:
  - `Vibration.vibrate([500, 500, 500, 500, 500])`
  - `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)`
  - Timer zone shrinks back to minimal state

**Logger Zone (bottom half, always visible):**

- Current exercise name (large, prominent)
- Three-dot menu top-right → action sheet: "Swap Exercise" | "Add Superset Partner" | "View Form Cues"
- **Ghost text** (previous performance): `"Last time: 3 × 8"` or `"No previous data"` — greyed out, below exercise name
- Rep counter row: Large `−` button | rep count (large number) | `+` button
  - Min reps: 0. No upper limit.
  - `−` and `+` haptic feedback: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`
- Weight row (optional, shown if exercise isn't pure bodyweight): `+0 kg` with `−` and `+` in 2.5kg increments
- **LOG SET button** — full width, high contrast, large. Logging a set:
  1. Creates a `WorkoutSet` and appends to `setsLoggedThisExercise` and `allSetsThisSession`
  2. Haptic: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)`
  3. Checks if this set is a new PR → if yes, flash `PRBanner` component for 2.5s
  4. If current exercise is in a superset: auto-advance to superset partner and start 45s timer
  5. If not superset: start 90s timer (or user's configured duration)
- **Set history for current exercise** (below LOG SET): small, scrollable list of sets logged so far this exercise, format `Set 1: 8 reps`
- **Next Exercise** navigation: bottom bar showing the name of the next exercise in the routine. Tapping it skips to it immediately (after confirm if current exercise has 0 sets logged).
- **Finish Workout** button (sticky bottom, secondary style): available at all times. Navigates to summary screen. Does NOT require all exercises to be completed.

**Swap Exercise Flow:**
- Opens bottom sheet (full-height modal)
- Shows exercises filtered by: same `MuscleGroup` as current, equipment matches `availableEquipment`, is in `unlockedExercises`
- Selecting one replaces the current exercise for this session only (does NOT modify the Routine in the store)

**View Form Cues Flow:**
- Opens a simple bottom sheet showing `exercise.formCues` as a bulleted list

**PR Banner (`PRBanner` component):**
- Appears as an animated overlay at the top of the screen
- Content: `"NEW PR 🔥 {exerciseId} — {newBest} reps"`
- Auto-dismisses after 2.5 seconds
- Does not block interaction
- High contrast yellow/gold color

**Unlock Banner (`UnlockBanner` component):**
- Only shown at the post-workout summary (NOT mid-session — don't interrupt the flow)
- If multiple unlocks occurred, show them one after another in the summary

---

### Screen 3: Post-Workout Summary (`/app/summary/[sessionId].tsx`)

Navigated to from the workout engine when "Finish Workout" is tapped. Session is saved to the store before navigation.

**Layout (scrollable):**

1. **Header:** `"Session Complete 💪"` with total duration `"{n} minutes"`

2. **Stats Row:** Three stats side by side:
   - Total sets logged
   - Total reps logged
   - Volume (total reps × bodyweight — simplified)

3. **Mood Picker (`MoodPicker` component):**
   `"How did it feel?"`  
   5 emoji buttons: 💪 🔥 😐 😴 🤒  
   Tapping one saves `moodTag` to the session in the store. Optional — can skip.

4. **PRs Section** *(conditional, only if PRs occurred)*:
   `"Personal Records 🏆"`  
   List each PR: `"{Exercise Name} — {newBest} reps (was {oldBest})"`

5. **Unlocks Section** *(conditional)*:
   `"Skills Unlocked 🔓"`  
   List each newly unlocked exercise with its name and level number. Animate each card appearing with a staggered reveal (Reanimated).

6. **Exercise Breakdown:**
   Per-exercise summary: name + sets logged in format `3 × 8, 3 × 7, 3 × 6`

7. **Back to Dashboard** button — full width, primary style

**Note:** If no PRs and no unlocks, the summary still shows. It's just stats + mood. That's fine.

---

### Screen 4: Skill Tree (`/app/(tabs)/skills.tsx`)

**Layout:**

1. **MuscleGroup Tab Switcher:** Horizontal tab row — `Push | Pull | Core | Legs`

2. **Progression Rails (per selected tab):**
   Each distinct progression chain within the muscle group gets its own `ProgressionRail` component — a horizontally scrollable row.
   
   Rail header: name of the progression chain (derive from the root exercise's name — the one with no `prevProgressionId`).
   
   Each `SkillCard` shows:
   - Exercise name
   - Level number badge (1–16)
   - If locked: grey overlay + lock icon + `"{n}/{threshold} sessions to unlock"` text
   - If unlocked: full color + level badge
   
   Cards are connected by a horizontal arrow `→` between them.
   
   Tapping an unlocked card → opens a bottom sheet with:
   - Full exercise name + level
   - Equipment required (icons)
   - Target to unlock next: `"Hit {reps} reps × {sets} sets for {threshold} sessions to unlock next skill"`
   - `formCues` list
   - `"Add to Routine"` button (opens routine picker sheet)
   
   Tapping a locked card → opens same bottom sheet but read-only, showing unlock requirements.

3. **FAB (bottom-right):** Opens `AddExerciseModal`

**`AddExerciseModal` fields:**
- Name (text input)
- Muscle Group (picker)
- Equipment required (multi-select toggle)
- Target reps to unlock (numeric input, default 8)
- Target sets to unlock (numeric input, default 3)
- Form cues (up to 4, optional text inputs)
- Save → writes to `exercises` dict in store, adds to `unlockedExercises`

---

### Screen 5: History (`/app/(tabs)/history.tsx`)

**Layout (top to bottom):**

1. **Streak display:** Same streak pill as dashboard

2. **Volume Chart (`VolumeChart` component):**
   Bar chart showing last 8 weeks of total volume (reps) grouped by MuscleGroup (color-coded bars per group). Use a simple pure-RN bar chart — no external charting library needed. If the agent prefers a library, use `victory-native` or `react-native-gifted-charts`.

3. **Muscle Group Balance** (last 30 days):
   Four pills showing Push / Pull / Core / Legs as a percentage of total volume. Highlight if Push is >50% without matching Pull (imbalance warning).

4. **Session History List:**
   Sectioned by Month. Each section header: `"MARCH 2025"`  
   Each row: date + routine name + total sets + mood tag emoji (if set)  
   Tapping a row → expands inline to show per-exercise set breakdown for that session

---

### Screen 6: Settings (`/app/(tabs)/settings.tsx`)

**Sections:**

**Profile**
- Name (text input) — used in dashboard header
- Body weight in kg (numeric input)

**Workout Preferences**
- Rest timer duration (slider or stepper: 60s / 90s / 120s / 180s)
- Superset rest timer duration (slider: 30s / 45s / 60s)
- Unlock threshold (segmented control: 1 session / 2 sessions / 3 sessions)

**Equipment** (same toggle as dashboard, mirrored)

**Data Portability**
- `"Export Data"` button:
  1. Stringifies entire Zustand AppState to JSON
  2. Base64 encodes it
  3. Copies to clipboard
  4. Shows toast: `"Copied to clipboard. Paste it somewhere safe."`
  
- `"Import Data"` section:
  Multi-line text input + `"Restore"` button
  1. Base64 decodes the pasted string
  2. Parses JSON
  3. Validates shape (check for `exercises`, `sessions`, `routines` keys at minimum)
  4. If valid: show confirm dialog `"This will replace all current data. Are you sure?"` (one of the few allowed confirms)
  5. On confirm: overwrites store

- `"Import Exercises from JSON"` button:
  Opens file picker (or paste input) accepting a JSON array of `Exercise[]`
  Calls `importExercises()` action — merges, does not overwrite existing exercises

- `"Reset All Data"` button (destructive red):
  Confirm dialog required. Clears all store data and reseeds from `baseExercises.ts`.

---

## 7. `baseExercises.ts` — Seed Data Requirements

The agent must implement a representative dataset covering at minimum:

**Push chain (Floor):**
`knee_pushup` → `pushup` → `diamond_pushup` → `archer_pushup` → `pseudo_planche_pushup` → `tuck_planche_pushup`

**Push chain (Rings/Parallettes):**
`ring_pushup` → `ring_dip` → `advanced_ring_dip` → `ring_muscle_up`

**Push chain (Handstand):**
`wall_pike_pushup` → `elevated_pike_pushup` → `wall_hspu` → `freestanding_hspu`

**Pull chain (Bar):**
`dead_hang` → `scapula_pull` → `negative_pullup` → `pullup` → `archer_pullup` → `chest_to_bar_pullup` → `muscle_up`

**Pull chain (Rings):**
`ring_row` → `ring_pullup` → `ring_muscle_up`

**Core chain:**
`dead_bug` → `hollow_body` → `l_sit_tuck` → `l_sit` → `v_sit`

**Legs chain:**
`squat` → `Bulgarian_split_squat` → `pistol_squat_assist` → `pistol_squat`

Each exercise must have:
- Realistic `targetRepsToUnlock` and `targetSetsToUnlock` values (reference Overcoming Gravity progressions)
- 2–4 `formCues` that are genuinely useful
- Correct `equipment` array
- Correct `level` on the 1–16 OG scale

**Initial `unlockedExercises` seed:** The first exercise in every chain (the root node with no `prevProgressionId`). Users start with access to beginner movements in all muscle groups.

---

## 8. Haptic Feedback Map

| Action | Haptic |
|---|---|
| Toggle equipment pill | `Light` impact |
| Tap `+` / `−` rep counter | `Light` impact |
| Tap `LOG SET` | `Heavy` impact |
| PR detected | `Success` notification |
| Timer hits zero | `Warning` notification + `Vibration.vibrate([500,500,500,500,500])` |
| Unlock achieved | `Success` notification (on summary screen) |
| Tap `+30s` on timer | `Medium` impact |
| Skip timer | `Light` impact |
| Routine card tap | `Light` impact |

---

## 9. Edge Cases & Guard Rails

| Scenario | Behavior |
|---|---|
| LOG SET tapped while timer is running | Timer silently resets to full duration and restarts. No dialog. |
| Finish Workout with 0 sets logged | Show confirm: `"No sets logged. Finish anyway?"` Save session with empty sets if confirmed. |
| Chaos Mode with <5 unlocked+equipment-compatible exercises | Use all available. Don't crash. |
| nextProgressionId points to non-existent exercise | Skip unlock silently. Log warning to console. |
| Import data with malformed JSON | Show error toast: `"Invalid data. Nothing was changed."` Do not modify store. |
| User has 0 routines | Dashboard shows empty state with a large `"Create your first routine"` CTA button. |
| User has 0 sessions | History shows empty state: `"No workouts yet. Get after it."` |
| Exercise in a routine gets deleted from exercises dict | Workout engine skips it and shows a `"1 exercise unavailable"` banner. |
| Rest timer + superset partner is tapped before timer ends | Logging the next superset set resets the timer. Same as regular set logging. |
| `bodyWeightKg` is 0 (not set) | Volume calculations use 0. Show a subtle prompt in Settings: `"Set your body weight for accurate volume tracking."` |

---

## 10. `CreateRoutineModal` Specification

Fields:
1. **Routine Name** — text input
2. **Exercise Picker** — scrollable list of unlocked exercises filtered by `availableEquipment`. Multi-select. Show muscle group badge on each row.
3. **Reorder** — after selection, show selected exercises in a draggable list (`react-native-draggable-flatlist` or similar). User can reorder.
4. **Superset Tagging** — below the exercise list, a section: `"Tag Supersets"`. Show pairs of adjacent exercises as potential superset candidates. Toggle button to mark a pair as a superset.

Save → calls `createRoutine()` or `updateRoutine()` as appropriate.

---

## 11. Implementation Phases (Strict Order)

### Phase 1 — Bootstrapping
- Init Expo Router project with TypeScript
- Install and configure: NativeWind, Zustand, react-native-mmkv, expo-haptics, react-native-reanimated
- Set up MMKV persistence middleware in Zustand
- Create stub files for all routes and components listed in file structure
- Verify hot reload and MMKV hydration work

### Phase 2 — Data Layer
- Implement full `AppState` interface and Zustand store with all actions
- Write `baseExercises.ts` with full seed data
- Seed store with initial data (exercises + initial unlocked exercises)
- Implement all derived selectors
- Implement `evaluateAndUnlock` logic
- Implement PR detection logic
- Write a simple test harness (console.log based) to verify unlock and PR logic correctness before any UI

### Phase 3 — Tab Navigation Shell
- Build all 4 tab screens with placeholder UI
- Verify routing works between tabs and to `/workout/[routineId]` and `/summary/[sessionId]`
- Build `EquipmentToggle` component and wire to store

### Phase 4 — Skill Tree Screen
- Build `SkillCard` and `ProgressionRail` components
- Build the MuscleGroup tab switcher
- Build and wire `AddExerciseModal`
- Wire lock/unlock display states to `unlockedExercises`

### Phase 5 — Dashboard Screen
- Build `RoutineCard` with estimated duration
- Build streak display
- Build deload banner (conditional)
- Build `CreateRoutineModal` with exercise picker, reorder, superset tagging
- Wire Chaos Mode algorithm
- Wire all navigation

### Phase 6 — Active Workout Engine (core feature — allocate most effort here)
- Build `RestTimer` component with Reanimated progress arc
- Build logger zone with all interactions
- Implement `+30s` and `Skip` timer controls
- Implement superset logic (auto-advance + 45s timer)
- Implement ghost text (last session performance)
- Build `PRBanner` component
- Build exercise swap flow
- Build form cues bottom sheet
- Wire `Vibration` and `Haptics` per the haptic map
- Wire "Finish Workout" → save session → navigate to summary

### Phase 7 — Post-Workout Summary
- Build full summary screen
- Build `MoodPicker` component
- Wire unlock banners with staggered reveal animation
- Wire PR display
- Wire stats calculation

### Phase 8 — History & Settings
- Build `VolumeChart` component
- Build session history flatlist with expand/collapse
- Build muscle group balance pills
- Implement full Settings screen
- Implement export/import logic with Base64 encoding
- Implement exercise JSON import

### Phase 9 — Polish
- Audit all haptic feedback points
- Audit all edge cases from Section 9
- Add empty states to all screens
- Final NativeWind styling pass for consistency and contrast
- Performance audit: verify no unnecessary re-renders in workout engine

---

## 12. Visual Design Guidelines

- **Color palette:** Dark background (near black `#0A0A0A`). High contrast whites and one loud accent color (recommended: electric lime `#C8FF00` or hot orange `#FF5C00`). Pick one and use it consistently for all CTAs, active states, and highlights.
- **Typography:** Use a condensed/extended display font for headers and the timer number. System font or a clean sans for body text. The timer number especially should feel massive and weighted.
- **No rounded corners on primary action buttons.** Sharp edges communicate urgency. Reserve rounded corners for tags and pills only.
- **Locked exercise cards:** 40% opacity + desaturated + lock icon overlay. Still fully legible — the user should *want* to unlock them.
- **The LOG SET button:** Should be the most visually dominant element on the workout screen. Large, full-width, accent color background, high contrast label. It should be impossible to miss.
- **Unlock banner:** Bold, full-screen-width, loud. Make it feel like an achievement. Animate it in from the top, hold for 3 seconds, slide out.

---

*End of SDD. Build in phase order. Ask no clarifying questions — all ambiguities are resolved in this document.*