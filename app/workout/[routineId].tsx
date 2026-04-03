import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Vibration,
  Modal,
  StyleSheet,
  FlatList,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store/useStore';
import {
  WorkoutSet,
  WorkoutSession,
  Exercise,
  PRRecord,
} from '@/store/types';
import { generateUUID } from '@/utils/uuid';
import { getTodayString } from '@/utils/dateUtils';
import { Colors, FontSizes, Spacing, BorderRadius, MuscleGroupColors } from '@/constants/theme';
import RestTimer from '@/components/RestTimer';
import PRBanner from '@/components/PRBanner';
import WorkoutSetRow from '@/components/WorkoutSetRow';
import BodyAnatomy from '@/components/BodyAnatomy';

export default function WorkoutScreen() {
  const params = useLocalSearchParams<{ routineId: string; exercises?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const exercises = useStore((s) => s.exercises);
  const routines = useStore((s) => s.routines);
  const unlockedExercises = useStore((s) => s.unlockedExercises);
  const availableEquipment = useStore((s) => s.availableEquipment);
  const profile = useStore((s) => s.profile);
  const saveSession = useStore((s) => s.saveSession);
  const getLastSessionPerformance = useStore((s) => s.getLastSessionPerformance);
  const getPersonalBest = useStore((s) => s.getPersonalBest);

  // Local state for UI
  const [showPlaylist, setShowPlaylist] = useState(false);

  // Determine exercise list
  const isChaos = params.routineId === 'chaos';
  const routine = !isChaos
    ? routines.find((r) => r.id === params.routineId)
    : null;

  const exerciseIds = useMemo(() => {
    if (isChaos && params.exercises) {
      return params.exercises.split(',');
    }
    return routine?.exerciseIds || [];
  }, [params, routine]);

  const supersetPairs = routine?.supersetPairs || [];

  // Filter out unavailable exercises
  const validExerciseIds = useMemo(() => {
    return exerciseIds.filter((id) => exercises[id]);
  }, [exerciseIds, exercises]);

  const unavailableCount = exerciseIds.length - validExerciseIds.length;

  // Local state
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [setsLoggedThisExercise, setSetsLoggedThisExercise] = useState<WorkoutSet[]>([]);
  const [allSetsThisSession, setAllSetsThisSession] = useState<WorkoutSet[]>([]);
  const [timerActive, setTimerActive] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerDuration, setTimerDuration] = useState(profile.restTimerDuration || 90);
  const [sessionStartTime] = useState(Date.now());
  const [reps, setReps] = useState(8);
  const [weightAdded, setWeightAdded] = useState(0);
  const [prsThisSession, setPrsThisSession] = useState<PRRecord[]>([]);
  const [unlocksThisSession, setUnlocksThisSession] = useState<string[]>([]);
  const [showPRBanner, setShowPRBanner] = useState<PRRecord | null>(null);
  const [showSwapSheet, setShowSwapSheet] = useState(false);
  const [showFormCues, setShowFormCues] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [sessionExerciseIds, setSessionExerciseIds] = useState<string[]>(validExerciseIds);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentExercise = exercises[sessionExerciseIds[currentExerciseIndex]];
  const nextExercise =
    currentExerciseIndex < sessionExerciseIds.length - 1
      ? exercises[sessionExerciseIds[currentExerciseIndex + 1]]
      : null;

  // Check if current exercise is part of a superset
  const supersetPartner = useMemo(() => {
    if (!currentExercise) return null;
    const pair = supersetPairs.find(
      (p) => p[0] === currentExercise.id || p[1] === currentExercise.id
    );
    if (!pair) return null;
    const partnerId =
      pair[0] === currentExercise.id ? pair[1] : pair[0];
    return exercises[partnerId] || null;
  }, [currentExercise, supersetPairs, exercises]);

  const isSuperset = !!supersetPartner;

  // Ghost text
  const lastPerformance = currentExercise
    ? getLastSessionPerformance(currentExercise.id)
    : null;

  const ghostText = useMemo(() => {
    if (!lastPerformance || lastPerformance.length === 0) return 'No previous data';
    const repsList = lastPerformance.map((s) => s.reps);
    return `Last time: ${lastPerformance.length} × ${repsList.join(', ')}`;
  }, [lastPerformance]);

  // Timer logic
  useEffect(() => {
    if (timerActive && timerRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimerRemaining((prev) => {
          if (prev <= 1) {
            // Timer done
            clearInterval(timerRef.current!);
            setTimerActive(false);
            Vibration.vibrate([500, 500, 500, 500, 500]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, timerRemaining]);

  const startTimer = (duration: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerDuration(duration);
    setTimerRemaining(duration);
    setTimerActive(true);
  };

  const handleAdd30 = () => {
    setTimerRemaining((prev) => prev + 30);
    setTimerDuration((prev) => prev + 30);
  };

  const handleSkipTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false);
    setTimerRemaining(0);
  };

  // Rep controls
  const handleRepChange = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReps((prev) => Math.max(0, prev + delta));
  };

  const handleWeightChange = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWeightAdded((prev) => Math.max(0, prev + delta));
  };

  // Log set
  const handleLogSet = () => {
    if (!currentExercise) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const newSet: WorkoutSet = {
      id: generateUUID(),
      exerciseId: currentExercise.id,
      reps,
      weightAdded,
      timestamp: Date.now(),
      isSuperset: isSuperset,
    };

    setSetsLoggedThisExercise((prev) => [...prev, newSet]);
    setAllSetsThisSession((prev) => [...prev, newSet]);

    // Check PR
    const currentBest = getPersonalBest(currentExercise.id);
    if (currentBest === null || reps > currentBest) {
      const pr: PRRecord = {
        exerciseId: currentExercise.id,
        newBest: reps,
        oldBest: currentBest,
      };
      setShowPRBanner(pr);
      setPrsThisSession((prev) => [...prev, pr]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Start timer
    if (isSuperset) {
      // Auto-advance to superset partner
      const partnerIndex = sessionExerciseIds.indexOf(supersetPartner!.id);
      if (partnerIndex !== -1 && partnerIndex !== currentExerciseIndex) {
        navigateToExercise(partnerIndex);
      }
      startTimer(profile.supersetRestTimerDuration || 45);
    } else {
      startTimer(profile.restTimerDuration || 90);
    }
  };

  // Navigate to exercise
  const navigateToExercise = (index: number) => {
    setCurrentExerciseIndex(index);
    // Load existing sets for this exercise
    const exId = sessionExerciseIds[index];
    setSetsLoggedThisExercise(
      allSetsThisSession.filter((s) => s.exerciseId === exId)
    );
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < sessionExerciseIds.length - 1) {
      if (setsLoggedThisExercise.length === 0) {
        Alert.alert(
          'No sets logged',
          'You haven\'t logged any sets for this exercise. Skip anyway?',
          [
            { text: 'Stay', style: 'cancel' },
            {
              text: 'Skip',
              onPress: () => navigateToExercise(currentExerciseIndex + 1),
            },
          ]
        );
      } else {
        navigateToExercise(currentExerciseIndex + 1);
      }
    }
  };

  // Finish workout
  const handleFinish = () => {
    if (allSetsThisSession.length === 0) {
      Alert.alert('No sets logged', 'Finish anyway?', [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Finish',
          onPress: () => completeWorkout(),
        },
      ]);
    } else {
      completeWorkout();
    }
  };

  const completeWorkout = () => {
    const durationSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
    const sessionId = generateUUID();

    const session: WorkoutSession = {
      id: sessionId,
      routineId: isChaos ? 'chaos' : params.routineId,
      date: getTodayString(),
      sets: allSetsThisSession,
      durationSeconds,
      qualifiedExercises: [],
    };

    const result = saveSession(session);
    setUnlocksThisSession(result.unlocks);

    // Navigate to summary with PR and unlock data
    router.replace(
      `/summary/${sessionId}?prs=${encodeURIComponent(
        JSON.stringify([...prsThisSession, ...result.prs])
      )}&unlocks=${encodeURIComponent(JSON.stringify(result.unlocks))}`
    );
  };

  // Swap exercise
  const handleSwap = (newExerciseId: string) => {
    const newIds = [...sessionExerciseIds];
    newIds[currentExerciseIndex] = newExerciseId;
    setSessionExerciseIds(newIds);
    setSetsLoggedThisExercise([]);
    setShowSwapSheet(false);
  };

  const swapCandidates = useMemo(() => {
    if (!currentExercise) return [];
    return unlockedExercises
      .map((id) => exercises[id])
      .filter(
        (ex): ex is Exercise =>
          !!ex &&
          ex.group === currentExercise.group &&
          ex.id !== currentExercise.id &&
          ex.equipment.some((eq) => availableEquipment.includes(eq))
      );
  }, [currentExercise, unlockedExercises, exercises, availableEquipment]);

  if (!currentExercise) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>No exercises available.</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* PR Banner */}
      {showPRBanner && (
        <PRBanner
          exerciseName={exercises[showPRBanner.exerciseId]?.name || ''}
          newBest={showPRBanner.newBest}
          onDismiss={() => setShowPRBanner(null)}
        />
      )}

      {/* Unavailable exercises banner */}
      {unavailableCount > 0 && (
        <View style={styles.unavailableBanner}>
          <Text style={styles.unavailableText}>
            {unavailableCount} exercise{unavailableCount > 1 ? 's' : ''} unavailable
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
        >
          <Feather name="x" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isChaos ? 'Chaos Mode 🎲' : routine?.name || 'Workout'}
        </Text>
        <TouchableOpacity
          onPress={() => setShowPlaylist(true)}
          style={styles.headerBtn}
        >
          <Feather name="list" size={24} color={Colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Menu dropdown */}
      {showMenu && (
        <View style={styles.menuDropdown}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              setShowSwapSheet(true);
            }}
          >
            <Feather name="refresh-cw" size={16} color={Colors.textPrimary} />
            <Text style={styles.menuItemText}>Swap Exercise</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              setShowFormCues(true);
            }}
          >
            <Feather name="info" size={16} color={Colors.textPrimary} />
            <Text style={styles.menuItemText}>View Form Cues</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {/* Timer Zone */}
        <RestTimer
          duration={timerDuration}
          remaining={timerRemaining}
          exerciseName={currentExercise.name}
          setContext={`Set ${setsLoggedThisExercise.length + 1}`}
          onAdd30={handleAdd30}
          onSkip={handleSkipTimer}
          isActive={timerActive}
        />

        {/* Logger Zone */}
        <View style={styles.loggerZone}>
          {/* Exercise Header + Anatomy */}
          <View style={styles.exerciseHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.exerciseCounter}>
                Exercise {currentExerciseIndex + 1} of {sessionExerciseIds.length}
              </Text>
              <Text style={styles.exerciseName}>{currentExercise.name}</Text>
              {isSuperset && (
                <View style={styles.supersetBadge}>
                  <Feather name="repeat" size={14} color={Colors.accent} />
                  <Text style={styles.supersetText}>Superset</Text>
                </View>
              )}
            </View>
            <View style={styles.anatomyContainer}>
              <BodyAnatomy highlightedGroup={currentExercise.group} size={80} />
            </View>
          </View>

          {/* Ghost text */}
          <Text style={styles.ghostText}>{ghostText}</Text>

          {/* Rep Counter */}
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => handleRepChange(-1)}
            >
              <Feather name="minus" size={28} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.counterValue}>
              <Text style={styles.counterNumber}>{reps}</Text>
              <Text style={styles.counterLabel}>reps</Text>
            </View>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => handleRepChange(1)}
            >
              <Feather name="plus" size={28} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Weight row */}
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterButtonSmall}
              onPress={() => handleWeightChange(-2.5)}
            >
              <Feather name="minus" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.counterValue}>
              <Text style={styles.weightNumber}>+{weightAdded} kg</Text>
            </View>
            <TouchableOpacity
              style={styles.counterButtonSmall}
              onPress={() => handleWeightChange(2.5)}
            >
              <Feather name="plus" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* LOG SET button */}
          <TouchableOpacity
            style={styles.logSetButton}
            onPress={handleLogSet}
            activeOpacity={0.8}
          >
            <Text style={styles.logSetText}>LOG SET</Text>
          </TouchableOpacity>

          {/* Set history for current exercise */}
          {setsLoggedThisExercise.length > 0 && (
            <View style={styles.setHistory}>
              {setsLoggedThisExercise.map((set, i) => (
                <WorkoutSetRow key={set.id} set={set} index={i} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        {/* Next Exercise */}
        {nextExercise && (
          <TouchableOpacity
            style={styles.nextExerciseBar}
            onPress={handleNextExercise}
          >
            <Text style={styles.nextLabel}>Next:</Text>
            <Text style={styles.nextName} numberOfLines={1}>
              {nextExercise.name}
            </Text>
            <Feather name="chevron-right" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Finish Workout */}
        <TouchableOpacity
          style={styles.finishButton}
          onPress={handleFinish}
          activeOpacity={0.7}
        >
          <Text style={styles.finishText}>Finish Workout</Text>
        </TouchableOpacity>
      </View>

      {/* Swap Exercise Sheet */}
      <Modal
        visible={showSwapSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSwapSheet(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Swap Exercise</Text>
            <Text style={styles.sheetSubtitle}>
              Same muscle group: {currentExercise.group}
            </Text>
            <ScrollView style={styles.sheetScroll}>
              {swapCandidates.length === 0 ? (
                <Text style={styles.emptyText}>No alternatives available.</Text>
              ) : (
                swapCandidates.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={styles.swapRow}
                    onPress={() => handleSwap(ex.id)}
                  >
                    <View style={styles.swapInfo}>
                      <Text style={styles.swapName}>{ex.name}</Text>
                      <Text style={styles.swapLevel}>Lv.{ex.level}</Text>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={18}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowSwapSheet(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Form Cues Sheet */}
      <Modal
        visible={showFormCues}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFormCues(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowFormCues(false)}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Form Cues</Text>
            <Text style={styles.sheetSubtitle}>{currentExercise.name}</Text>
            {currentExercise.formCues.map((cue, i) => (
              <View key={i} style={styles.cueRow}>
                <Text style={styles.cueBullet}>•</Text>
                <Text style={styles.cueText}>{cue}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Session Playlist Modal */}
      <Modal
        visible={showPlaylist}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPlaylist(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Session Roadmap</Text>
            <ScrollView style={styles.sheetScroll}>
              {sessionExerciseIds.map((exId, index) => {
                const ex = exercises[exId];
                if (!ex) return null;
                const isActive = index === currentExerciseIndex;
                const setsDone = allSetsThisSession.filter(s => s.exerciseId === exId).length;

                return (
                  <TouchableOpacity
                    key={`${exId}-${index}`}
                    style={[styles.playlistRow, isActive && styles.activePlaylistRow]}
                    onPress={() => {
                      navigateToExercise(index);
                      setShowPlaylist(false);
                    }}
                  >
                    <View style={styles.playlistIndex}>
                      <Text style={[styles.playlistIndexText, isActive && styles.activeText]}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.playlistName, isActive && styles.activeText]}>{ex.name}</Text>
                      <Text style={styles.playlistMeta}>{setsDone} sets logged</Text>
                    </View>
                    {isActive ? (
                      <Feather name="play" size={16} color={Colors.accent} />
                    ) : setsDone > 0 ? (
                      <Feather name="check" size={16} color={Colors.success} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowPlaylist(false)}
            >
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorText: {
    color: Colors.textMuted,
    fontSize: FontSizes.lg,
    textAlign: 'center',
    paddingTop: 100,
  },
  backButton: {
    alignSelf: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
  },
  backButtonText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  headerBtn: {
    padding: Spacing.sm,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.lg,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  menuDropdown: {
    position: 'absolute',
    top: 100,
    right: Spacing.lg,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    zIndex: 50,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
  },
  menuItemText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  unavailableBanner: {
    backgroundColor: Colors.deloadBg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  unavailableText: {
    color: Colors.warning,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  loggerZone: {
    padding: Spacing.lg,
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  anatomyContainer: {
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: 4,
  },
  activePlaylistRow: {
    backgroundColor: Colors.accentMuted,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  playlistIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistIndexText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  activeText: {
    color: Colors.accent,
    fontWeight: '800',
  },
  playlistName: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  playlistMeta: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  exerciseCounter: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  exerciseName: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xxl,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  supersetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
    marginTop: 4,
  },
  supersetText: {
    color: Colors.accent,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  ghostText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.xxl,
    fontStyle: 'italic',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  counterButton: {
    width: 64,
    height: 64,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  counterButtonSmall: {
    width: 48,
    height: 48,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  counterValue: {
    alignItems: 'center',
    minWidth: 100,
  },
  counterNumber: {
    color: Colors.textPrimary,
    fontSize: FontSizes.display,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  counterLabel: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginTop: -4,
  },
  weightNumber: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xl,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  logSetButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  logSetText: {
    color: Colors.background,
    fontSize: FontSizes.xl,
    fontWeight: '900',
    letterSpacing: 3,
  },
  setHistory: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  nextExerciseBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  nextLabel: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  nextName: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '600',
    flex: 1,
  },
  finishButton: {
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginTop: Spacing.sm,
    minHeight: 56,
    justifyContent: 'center',
  },
  finishText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  // Sheet styles
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  sheetTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xl,
    fontWeight: '800',
    marginBottom: Spacing.xs,
  },
  sheetSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    marginBottom: Spacing.lg,
  },
  sheetScroll: {
    maxHeight: 400,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    textAlign: 'center',
    paddingVertical: Spacing.xxl,
  },
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    minHeight: 56,
  },
  swapInfo: {
    flex: 1,
  },
  swapName: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  swapLevel: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  cancelBtn: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
    minHeight: 48,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  cueRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cueBullet: {
    color: Colors.accent,
    fontSize: FontSizes.lg,
  },
  cueText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    flex: 1,
    lineHeight: 22,
  },
});
