export type MuscleGroup = 'Push' | 'Pull' | 'Core' | 'Legs';
export type Equipment = 'None' | 'Pullup Bar' | 'Rings' | 'Parallettes' | 'Wall';
export type MoodTag = '💪' | '🔥' | '😐' | '😴' | '🤒';

export interface Exercise {
  id: string;
  name: string;
  group: MuscleGroup;
  equipment: Equipment[];
  level: number;
  targetRepsToUnlock: number;
  targetSetsToUnlock: number;
  nextProgressionId?: string | null;
  prevProgressionId?: string | null;
  formCues: string[];
  isCustom?: boolean;
}

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  reps: number;
  weightAdded: number;
  timestamp: number;
  isSuperset?: boolean;
}

export interface WorkoutSession {
  id: string;
  routineId: string;
  date: string;
  sets: WorkoutSet[];
  durationSeconds: number;
  moodTag?: MoodTag;
  qualifiedExercises: string[];
}

export interface Routine {
  id: string;
  name: string;
  exerciseIds: string[];
  supersetPairs: [string, string][];
}

export interface UserProfile {
  name: string;
  bodyWeightKg: number;
  unlockThreshold: number;
  restTimerDuration: number;
  supersetRestTimerDuration: number;
}

export interface PRRecord {
  exerciseId: string;
  newBest: number;
  oldBest: number | null;
}
