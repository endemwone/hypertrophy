import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateUUID } from '@/utils/uuid';
import { getTodayString, subtractDays } from '@/utils/dateUtils';
import { encodeBase64, decodeBase64 } from '@/utils/base64Utils';
import { baseExercises, initialUnlockedExercises } from '@/constants/baseExercises';
import {
  MuscleGroup,
  Equipment,
  MoodTag,
  Exercise,
  WorkoutSet,
  WorkoutSession,
  Routine,
  UserProfile,
  PRRecord,
} from './types';

// ═══════════════════════════════════════════════════════
// Store Types and Interfaces
// ═══════════════════════════════════════════════════════

interface AppState {
  exercises: Record<string, Exercise>;
  sessions: WorkoutSession[];
  routines: Routine[];
  profile: UserProfile;
  availableEquipment: Equipment[];
  unlockedExercises: string[];
}

interface AppActions {
  // Equipment
  toggleEquipment: (equipment: Equipment) => void;

  // Exercises
  addCustomExercise: (exercise: Omit<Exercise, 'id' | 'isCustom'>) => void;
  importExercises: (exercises: Exercise[]) => void;

  // Routines
  createRoutine: (name: string, exerciseIds: string[]) => void;
  updateRoutine: (id: string, patch: Partial<Routine>) => void;
  deleteRoutine: (id: string) => void;
  addSupersetPair: (routineId: string, pair: [string, string]) => void;
  removeSupersetPair: (routineId: string, pair: [string, string]) => void;

  // Sessions
  saveSession: (session: WorkoutSession) => { prs: PRRecord[]; unlocks: string[] };
  updateSessionMood: (sessionId: string, mood: MoodTag) => void;

  // Profile
  updateProfile: (patch: Partial<UserProfile>) => void;

  // Unlock logic
  evaluateAndUnlock: (session: WorkoutSession) => string[];

  // Derived selectors
  getPersonalBest: (exerciseId: string) => number | null;
  getPersonalBestExcluding: (exerciseId: string, excludeSessionId: string) => number | null;
  getQualifyingSessions: (exerciseId: string) => number;
  getLastSessionPerformance: (exerciseId: string) => WorkoutSet[] | null;
  getVolumeByMuscleGroup: (startDate: string, endDate: string) => Record<MuscleGroup, number>;
  getCurrentStreak: () => number;

  // Data portability
  exportStateAsBase64: () => string;
  importStateFromBase64: (encoded: string) => boolean;
  resetAllData: () => void;
}

// ═══════════════════════════════════════════════════════
// AsyncStorage Storage Setup
// ═══════════════════════════════════════════════════════

const asyncStorage: StateStorage = {
  getItem: async (name: string) => {
    const value = await AsyncStorage.getItem(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string) => {
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string) => {
    await AsyncStorage.removeItem(name);
  },
};

// ═══════════════════════════════════════════════════════
// Initial State
// ═══════════════════════════════════════════════════════

const initialRoutines: Routine[] = [
  {
    id: 'routine_full_body',
    name: 'Full Body Fundamentals',
    exerciseIds: [
      'pullup', 'bulgarian_split_squat', 
      'ring_dip', 'nordic_curl', 
      'ring_row', 'pseudo_planche_pushup', 
      'hollow_body', 'dead_bug'
    ],
    supersetPairs: [
      ['pullup', 'bulgarian_split_squat'],
      ['ring_dip', 'nordic_curl'],
      ['ring_row', 'pseudo_planche_pushup']
    ]
  },
  {
    id: 'routine_upper',
    name: 'Upper Body Power',
    exerciseIds: [
      'pullup', 'wall_pike_pushup', 'ring_row', 'diamond_pushup', 'scapula_pull'
    ],
    supersetPairs: []
  },
  {
    id: 'routine_lower',
    name: 'Explosive Lower & Core',
    exerciseIds: [
      'pistol_squat_assist', 'jump_squat', 'single_leg_glute_bridge', 'l_sit_tuck', 'v_sit'
    ],
    supersetPairs: []
  },
  {
    id: 'routine_warmup',
    name: 'Quick Calisthenics Warmup',
    exerciseIds: [
      'wrist_stretches', 'band_dislocates', 'scapular_pushups', 'deep_squat_sit'
    ],
    supersetPairs: []
  },
  {
    id: 'routine_cooldown',
    name: 'Post-Workout Cooldown',
    exerciseIds: [
      'passive_dead_hang', 'doorway_pec_stretch', 'seated_pike_stretch'
    ],
    supersetPairs: []
  },
  {
    id: 'routine_warmup_vr',
    name: 'Pre-Flail VR Warmup',
    exerciseIds: [
      'neck_rolls', 'helicopter_arms', 'wrist_figure_eights', 'matrix_duck'
    ],
    supersetPairs: []
  },
  {
    id: 'routine_warmdown_vr',
    name: 'Reality Re-Entry Warmdown',
    exerciseIds: [
      'horizon_stare', 'chin_tucks', 'doorway_pec_stretch', 'forearm_massage'
    ],
    supersetPairs: []
  }
];

const initialState: AppState = {
  exercises: { ...baseExercises },
  sessions: [],
  routines: initialRoutines,
  profile: {
    name: 'Athlete',
    bodyWeightKg: 75,
    unlockThreshold: 2,
    restTimerDuration: 90,
    supersetRestTimerDuration: 45,
  },
  availableEquipment: ['None'],
  unlockedExercises: [...initialUnlockedExercises],
};

// ═══════════════════════════════════════════════════════
// Store
// ═══════════════════════════════════════════════════════

export const useStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ─── Equipment ──────────────────────────────
      toggleEquipment: (equipment: Equipment) => {
        set((state) => {
          const exists = state.availableEquipment.includes(equipment);
          return {
            availableEquipment: exists
              ? state.availableEquipment.filter((e) => e !== equipment)
              : [...state.availableEquipment, equipment],
          };
        });
      },

      // ─── Exercises ──────────────────────────────
      addCustomExercise: (exercise) => {
        const id = exercise.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
        const newExercise: Exercise = { ...exercise, id, isCustom: true };
        set((state) => ({
          exercises: { ...state.exercises, [id]: newExercise },
          unlockedExercises: [...state.unlockedExercises, id],
        }));
      },

      importExercises: (exercises: Exercise[]) => {
        set((state) => {
          const merged = { ...state.exercises };
          for (const ex of exercises) {
            if (!merged[ex.id]) {
              merged[ex.id] = ex;
            }
          }
          return { exercises: merged };
        });
      },

      // ─── Routines ──────────────────────────────
      createRoutine: (name: string, exerciseIds: string[]) => {
        const routine: Routine = {
          id: generateUUID(),
          name,
          exerciseIds,
          supersetPairs: [],
        };
        set((state) => ({ routines: [...state.routines, routine] }));
      },

      updateRoutine: (id: string, patch: Partial<Routine>) => {
        set((state) => ({
          routines: state.routines.map((r) =>
            r.id === id ? { ...r, ...patch } : r
          ),
        }));
      },

      deleteRoutine: (id: string) => {
        set((state) => ({
          routines: state.routines.filter((r) => r.id !== id),
        }));
      },

      addSupersetPair: (routineId: string, pair: [string, string]) => {
        set((state) => ({
          routines: state.routines.map((r) =>
            r.id === routineId
              ? { ...r, supersetPairs: [...r.supersetPairs, pair] }
              : r
          ),
        }));
      },

      removeSupersetPair: (routineId: string, pair: [string, string]) => {
        set((state) => ({
          routines: state.routines.map((r) =>
            r.id === routineId
              ? {
                  ...r,
                  supersetPairs: r.supersetPairs.filter(
                    (p) => !(p[0] === pair[0] && p[1] === pair[1])
                  ),
                }
              : r
          ),
        }));
      },

      // ─── Sessions ──────────────────────────────
      saveSession: (session: WorkoutSession) => {
        // Detect PRs before saving
        const prs: PRRecord[] = [];
        const exerciseIdsInSession = [
          ...new Set(session.sets.map((s) => s.exerciseId)),
        ];

        for (const exId of exerciseIdsInSession) {
          const oldBest = get().getPersonalBest(exId);
          const setsForExercise = session.sets.filter(
            (s) => s.exerciseId === exId
          );
          const maxRepsThisSession = Math.max(
            ...setsForExercise.map((s) => s.reps)
          );

          if (oldBest === null || maxRepsThisSession > oldBest) {
            prs.push({
              exerciseId: exId,
              newBest: maxRepsThisSession,
              oldBest,
            });
          }
        }

        // Determine qualified exercises for this session
        const qualifiedExercises: string[] = [];
        for (const exId of exerciseIdsInSession) {
          const exercise = get().exercises[exId];
          if (!exercise) continue;
          const qualifyingSets = session.sets.filter(
            (s) =>
              s.exerciseId === exId && s.reps >= exercise.targetRepsToUnlock
          );
          if (qualifyingSets.length >= exercise.targetSetsToUnlock) {
            qualifiedExercises.push(exId);
          }
        }

        const sessionWithQualified = {
          ...session,
          qualifiedExercises,
        };

        set((state) => ({
          sessions: [...state.sessions, sessionWithQualified],
        }));

        // Evaluate unlocks after saving
        const unlocks = get().evaluateAndUnlock(sessionWithQualified);

        return { prs, unlocks };
      },

      updateSessionMood: (sessionId: string, mood: MoodTag) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, moodTag: mood } : s
          ),
        }));
      },

      // ─── Profile ──────────────────────────────
      updateProfile: (patch: Partial<UserProfile>) => {
        set((state) => ({
          profile: { ...state.profile, ...patch },
        }));
      },

      // ─── Unlock Logic ─────────────────────────
      evaluateAndUnlock: (session: WorkoutSession) => {
        const state = get();
        const newUnlocks: string[] = [];

        for (const exId of state.unlockedExercises) {
          const exercise = state.exercises[exId];
          if (!exercise || !exercise.nextProgressionId) continue;

          const nextId = exercise.nextProgressionId;
          if (!state.exercises[nextId]) {
            console.warn(
              `nextProgressionId "${nextId}" for "${exId}" not found in exercises dict. Skipping.`
            );
            continue;
          }
          if (state.unlockedExercises.includes(nextId)) continue;

          // Count qualifying sessions
          const count = state.sessions.filter((s) =>
            s.qualifiedExercises.includes(exId)
          ).length;

          if (count >= state.profile.unlockThreshold) {
            newUnlocks.push(nextId);
          }
        }

        if (newUnlocks.length > 0) {
          set((state) => ({
            unlockedExercises: [
              ...state.unlockedExercises,
              ...newUnlocks.filter(
                (id) => !state.unlockedExercises.includes(id)
              ),
            ],
          }));
        }

        return newUnlocks;
      },

      // ─── Derived Selectors ────────────────────
      getPersonalBest: (exerciseId: string) => {
        const sessions = get().sessions;
        let best: number | null = null;
        for (const session of sessions) {
          for (const s of session.sets) {
            if (s.exerciseId === exerciseId) {
              if (best === null || s.reps > best) {
                best = s.reps;
              }
            }
          }
        }
        return best;
      },

      getPersonalBestExcluding: (
        exerciseId: string,
        excludeSessionId: string
      ) => {
        const sessions = get().sessions.filter(
          (s) => s.id !== excludeSessionId
        );
        let best: number | null = null;
        for (const session of sessions) {
          for (const s of session.sets) {
            if (s.exerciseId === exerciseId) {
              if (best === null || s.reps > best) {
                best = s.reps;
              }
            }
          }
        }
        return best;
      },

      getQualifyingSessions: (exerciseId: string) => {
        return get().sessions.filter((s) =>
          s.qualifiedExercises.includes(exerciseId)
        ).length;
      },

      getLastSessionPerformance: (exerciseId: string) => {
        const sessions = [...get().sessions].reverse();
        for (const session of sessions) {
          const sets = session.sets.filter(
            (s) => s.exerciseId === exerciseId
          );
          if (sets.length > 0) return sets;
        }
        return null;
      },

      getVolumeByMuscleGroup: (startDate: string, endDate: string) => {
        const state = get();
        const result: Record<MuscleGroup, number> = {
          Push: 0,
          Pull: 0,
          Core: 0,
          Legs: 0,
        };

        const filteredSessions = state.sessions.filter(
          (s) => s.date >= startDate && s.date <= endDate
        );

        for (const session of filteredSessions) {
          for (const s of session.sets) {
            const exercise = state.exercises[s.exerciseId];
            if (exercise) {
              const volume =
                s.reps * (state.profile.bodyWeightKg + s.weightAdded);
              result[exercise.group] += volume;
            }
          }
        }

        return result;
      },

      getCurrentStreak: () => {
        const sessions = get().sessions;
        if (sessions.length === 0) return 0;

        const sessionDates = new Set(sessions.map((s) => s.date));
        let streak = 0;
        let checkDate = getTodayString();

        // Allow today to not have a session yet (streak continues from yesterday)
        if (!sessionDates.has(checkDate)) {
          checkDate = subtractDays(checkDate, 1);
        }

        while (sessionDates.has(checkDate)) {
          streak++;
          checkDate = subtractDays(checkDate, 1);
        }

        return streak;
      },

      // ─── Data Portability ─────────────────────
      exportStateAsBase64: () => {
        const state = get();
        const data: AppState = {
          exercises: state.exercises,
          sessions: state.sessions,
          routines: state.routines,
          profile: state.profile,
          availableEquipment: state.availableEquipment,
          unlockedExercises: state.unlockedExercises,
        };
        const json = JSON.stringify(data);
        return encodeBase64(json);
      },

      importStateFromBase64: (encoded: string) => {
        try {
          const json = decodeBase64(encoded);
          const data = JSON.parse(json);

          if (!data.exercises || !data.sessions || !data.routines) {
            return false;
          }

          set({
            exercises: data.exercises,
            sessions: data.sessions,
            routines: data.routines,
            profile: data.profile || initialState.profile,
            availableEquipment:
              data.availableEquipment || initialState.availableEquipment,
            unlockedExercises:
              data.unlockedExercises || initialState.unlockedExercises,
          });

          return true;
        } catch (e) {
          console.error('Import failed:', e);
          return false;
        }
      },

      resetAllData: () => {
        set({ ...initialState });
      },
    }),
    {
      name: 'hypertrophy_state',
      storage: createJSONStorage(() => asyncStorage),
    }
  )
);
