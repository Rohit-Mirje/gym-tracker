/**
 * Lift Set Go - Zero-Friction Gym Tracker
 * Architecture: Local-First, Mobile Ergonomic PWA
 */

(function () {
  'use strict';

  // --- Constants & Keys ---
  const MAX_SETS_PER_EXERCISE = 4;
  const STORAGE_WORKOUTS = 'liftsetgo_workouts_v1';
  const STORAGE_WEIGHTS = 'liftsetgo_bodyweights_v1';
  const STORAGE_SPLITS = 'liftsetgo_splits_v1';
  const STORAGE_SETTINGS = 'liftsetgo_settings_v1';

  // Default Split Routines
  const DEFAULT_SPLITS = {
    "Push": [
      "Barbell Bench Press",
      "Incline Dumbbell Press",
      "Overhead Shoulder Press",
      "Lateral Raise",
      "Tricep Pushdown"
    ],
    "Pull": [
      "Lat Pulldown",
      "Barbell Row",
      "Seated Cable Row",
      "Face Pulls",
      "Dumbbell Bicep Curl"
    ],
    "Legs": [
      "Barbell Squat",
      "Romanian Deadlift",
      "Leg Press",
      "Leg Extension",
      "Calf Raise"
    ],
    "Upper": [
      "Incline Bench Press",
      "Chest Supported Row",
      "Dumbbell Shoulder Press",
      "Lat Pulldown",
      "Tricep Dip",
      "Hammer Curl"
    ],
    "Lower": [
      "Barbell Squat",
      "Hamstring Curl",
      "Bulgarian Split Squat",
      "Standing Calf Raise"
    ]
  };

  const EXERCISE_LIBRARY = [
    { name: "Barbell Bench Press", cat: "Chest" },
    { name: "Incline Dumbbell Press", cat: "Chest" },
    { name: "Dumbbell Chest Fly", cat: "Chest" },
    { name: "Dips", cat: "Chest / Triceps" },
    { name: "Push-ups", cat: "Chest" },
    { name: "Overhead Shoulder Press", cat: "Shoulders" },
    { name: "Lateral Raise", cat: "Shoulders" },
    { name: "Rear Delt Fly", cat: "Shoulders" },
    { name: "Tricep Pushdown", cat: "Triceps" },
    { name: "Skull Crushers", cat: "Triceps" },
    { name: "Barbell Deadlift", cat: "Back" },
    { name: "Lat Pulldown", cat: "Back" },
    { name: "Barbell Row", cat: "Back" },
    { name: "Seated Cable Row", cat: "Back" },
    { name: "Pull-ups", cat: "Back" },
    { name: "Face Pulls", cat: "Back / Shoulders" },
    { name: "Barbell Bicep Curl", cat: "Biceps" },
    { name: "Dumbbell Bicep Curl", cat: "Biceps" },
    { name: "Hammer Curl", cat: "Biceps" },
    { name: "Preacher Curl", cat: "Biceps" },
    { name: "Barbell Squat", cat: "Legs" },
    { name: "Romanian Deadlift", cat: "Hamstrings" },
    { name: "Leg Press", cat: "Quads" },
    { name: "Leg Extension", cat: "Quads" },
    { name: "Hamstring Curl", cat: "Hamstrings" },
    { name: "Bulgarian Split Squat", cat: "Quads / Glutes" },
    { name: "Standing Calf Raise", cat: "Calves" },
    { name: "Hanging Leg Raise", cat: "Abs" },
    { name: "Cable Crunch", cat: "Abs" }
  ];

  // --- Initial State ---
  let selectedDate = getTodayDateString();
  let currentSplit = "Push";
  let workouts = loadFromStorage(STORAGE_WORKOUTS, {});
  let bodyWeights = loadFromStorage(STORAGE_WEIGHTS, {});
  let splits = loadFromStorage(STORAGE_SPLITS, DEFAULT_SPLITS);
  let settings = loadFromStorage(STORAGE_SETTINGS, { defaultRestSec: 90 });

  // Floating Rest Timer State
  let restTimerInterval = null;
  let restTimeRemaining = 0;
  let restTotalDuration = 90;
  let restEndTime = 0;
  let currentTimerExercise = "";
  let pipCanvas = null;
  let pipCtx = null;
  let pipVideo = null;
  let pipActive = false;

  // Wake Lock Sentinel
  let wakeLock = null;

  // Audio Context for Chimes
  let audioCtx = null;

  // Auto-purge any legacy mock seed data if present
  autoPurgeMockSeedData();

  // --- DOM Elements ---
  const elAppName = document.querySelector('.app-name');
  if (elAppName) elAppName.textContent = 'Lift Set Go';

  const elDateRelative = document.getElementById('date-label-relative');
  const elDateFull = document.getElementById('date-label-full');
  const btnPrevDay = document.getElementById('btn-prev-day');
  const btnNextDay = document.getElementById('btn-next-day');

  const inputBodyWeight = document.getElementById('input-body-weight');
  const weightHistoryHint = document.getElementById('weight-history-hint');

  const splitPillsContainer = document.getElementById('split-pills');
  const exercisesListContainer = document.getElementById('exercises-list');

  const restTimerDock = document.getElementById('rest-timer-dock');
  const timerDisplay = document.getElementById('timer-display');
  const timerBar = document.getElementById('timer-bar');
  const timerExerciseName = document.getElementById('timer-exercise-name');
  const btnTimerPlus30 = document.getElementById('btn-timer-plus30');
  const btnTimerDismiss = document.getElementById('btn-timer-dismiss');

  const btnWakeLock = document.getElementById('btn-wakelock');
  const btnNotepadModal = document.getElementById('btn-notepad-modal');
  const modalNotepad = document.getElementById('modal-notepad');
  const btnCloseNotepad = document.getElementById('btn-close-notepad');

  const modalExercise = document.getElementById('modal-exercise');
  const btnOpenAddExercise = document.getElementById('btn-open-add-exercise');
  const btnCloseExerciseModal = document.getElementById('btn-close-exercise-modal');
  const exerciseSearchInput = document.getElementById('exercise-search-input');
  const exerciseQuickList = document.getElementById('exercise-quick-list');
  const btnCreateCustomExercise = document.getElementById('btn-create-custom-exercise');
  const newExerciseNamePreview = document.getElementById('new-exercise-name-preview');

  // Rearrange / Reorder Workouts DOM Elements
  const modalReorder = document.getElementById('modal-reorder');
  const btnOpenReorder = document.getElementById('btn-open-reorder');
  const btnReorderSplits = document.getElementById('btn-reorder-splits');
  const btnCloseReorderModal = document.getElementById('btn-close-reorder-modal');
  const btnDoneReorder = document.getElementById('btn-done-reorder');
  const reorderTodayList = document.getElementById('reorder-today-list');
  const reorderSplitsList = document.getElementById('reorder-splits-list');
  const reorderSplitNameEl = document.getElementById('reorder-split-name');
  const chkSaveSplitOrder = document.getElementById('chk-save-split-order');
  const reorderModalTabs = document.querySelectorAll('#reorder-modal-tabs .modal-tab');
  const exercisesCountTitle = document.getElementById('exercises-count-title');

  const toastEl = document.getElementById('toast');

  // --- Date Helper Functions ---
  function getTodayDateString() {
    const d = new Date();
    return formatDateKey(d);
  }

  function formatDateKey(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseDateKey(keyStr) {
    const [y, m, d] = keyStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatDisplayDate(dateKey) {
    const target = parseDateKey(dateKey);
    const today = new Date();
    today.setHours(0,0,0,0);
    target.setHours(0,0,0,0);

    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
    let relative = "";
    if (diffDays === 0) relative = "Today";
    else if (diffDays === -1) relative = "Yesterday";
    else if (diffDays === 1) relative = "Tomorrow";
    else if (diffDays < 0) relative = `${Math.abs(diffDays)}d ago`;
    else relative = `in ${diffDays}d`;

    const fullStr = target.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    return { relative, full: fullStr };
  }

  // --- Storage Helpers ---
  function loadFromStorage(key, fallback) {
    try {
      let data = localStorage.getItem(key);
      if (!data) {
        // Fallback to legacy key if migrating from earlier test
        const legacyKey = key.replace('liftsetgo_', 'lifttap_');
        data = localStorage.getItem(legacyKey);
      }
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveToStorage(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }
  }

  // --- Auto-Purge Legacy Mock Seed Data ---
  function autoPurgeMockSeedData() {
    const isMockCleaned = localStorage.getItem('liftsetgo_mock_purged_v2');
    if (!isMockCleaned) {
      localStorage.setItem('liftsetgo_mock_purged_v2', 'true');
      const dates = Object.keys(workouts);
      // If the workouts only contain the single legacy mock workout, clear it
      if (dates.length <= 1) {
        const d = dates[0];
        const w = d ? workouts[d] : null;
        if (w && w.exercises && w.exercises.some(e => e.name === "Barbell Bench Press" && e.sets && e.sets.some(s => s.weight === 70))) {
          workouts = {};
          bodyWeights = {};
          saveToStorage(STORAGE_WORKOUTS, workouts);
          saveToStorage(STORAGE_WEIGHTS, bodyWeights);
        }
      }
    }
  }

  // --- Haptic Feedback & Audio Chimes ---
  function triggerHaptic(type = 'light') {
    if (!navigator.vibrate) return;
    try {
      if (type === 'light') navigator.vibrate(25);
      else if (type === 'success') navigator.vibrate([40, 30, 80]);
      else if (type === 'alarm') navigator.vibrate([120, 60, 120, 60, 150]);
    } catch (e) {}
  }

  function playChime() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn("Audio play failed:", e);
    }
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => {
      toastEl.classList.add('hidden');
    }, 2800);
  }

  // --- Screen Wake Lock (Keep Screen On During Gym Session) ---
  async function toggleWakeLock() {
    if (!('wakeLock' in navigator)) {
      showToast("Wake Lock not supported on this browser");
      return;
    }
    try {
      if (wakeLock) {
        await wakeLock.release();
        wakeLock = null;
        btnWakeLock.classList.remove('active');
        showToast("Screen Lock disabled");
      } else {
        wakeLock = await navigator.wakeLock.request('screen');
        btnWakeLock.classList.add('active');
        showToast("Screen kept awake during workout ⚡");
        wakeLock.addEventListener('release', () => {
          wakeLock = null;
          btnWakeLock.classList.remove('active');
        });
      }
    } catch (err) {
      console.warn("Wake lock error", err);
    }
  }

  // --- History & Benchmark Search (Ghost Sets Engine) ---
  function getPreviousBestOrLast(exerciseName, beforeDate) {
    // Search backwards from the date to find last recorded session for this exercise
    const allDates = Object.keys(workouts).sort().reverse();
    let lastSessionSets = null;
    let lastDate = null;
    let allTimeMaxWeight = 0;
    let allTimeMaxReps = 0;

    for (const d of allDates) {
      const w = workouts[d];
      if (!w || !w.exercises) continue;
      const match = w.exercises.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());
      if (match && match.sets && match.sets.length > 0) {
        // Track all-time max
        match.sets.forEach(s => {
          if (s.weight > allTimeMaxWeight || (s.weight === allTimeMaxWeight && s.reps > allTimeMaxReps)) {
            allTimeMaxWeight = s.weight;
            allTimeMaxReps = s.reps;
          }
        });

        // If before current date, record as the immediate prior session
        if (!lastSessionSets && d < beforeDate) {
          lastSessionSets = match.sets;
          lastDate = d;
        }
      }
    }

    let ghostWeight = 0;
    let ghostReps = 0;

    if (lastSessionSets && lastSessionSets.length > 0) {
      // Find the heaviest or peak set in that session
      const peak = lastSessionSets.reduce((prev, curr) => (curr.weight > prev.weight ? curr : prev), lastSessionSets[0]);
      ghostWeight = peak.weight;
      ghostReps = peak.reps;
    }

    return {
      ghostWeight: ghostWeight,
      ghostReps: ghostReps,
      lastDate: lastDate,
      allTimeMaxWeight,
      allTimeMaxReps,
      hasHistory: !!lastSessionSets
    };
  }

  // --- Render Split Tabs ---
  function renderSplitPills() {
    splitPillsContainer.innerHTML = '';
    const availableSplits = Object.keys(splits);

    // If current workout already has a saved split, select it
    if (workouts[selectedDate] && workouts[selectedDate].split) {
      currentSplit = workouts[selectedDate].split;
    }

    availableSplits.forEach(splitName => {
      const btn = document.createElement('button');
      btn.className = `split-pill ${splitName === currentSplit ? 'active' : ''}`;
      btn.textContent = splitName;
      btn.addEventListener('click', () => {
        currentSplit = splitName;
        triggerHaptic('light');
        if (!workouts[selectedDate]) {
          workouts[selectedDate] = { split: currentSplit, exercises: [] };
        } else {
          workouts[selectedDate].split = currentSplit;
        }
        saveToStorage(STORAGE_WORKOUTS, workouts);
        renderSplitPills();
        renderWorkoutView();
      });
      splitPillsContainer.appendChild(btn);
    });
  }

  // --- Render Main Workout View ---
  function renderWorkoutView() {
    const dateFormatted = formatDisplayDate(selectedDate);
    elDateRelative.textContent = dateFormatted.relative;
    elDateFull.textContent = dateFormatted.full;

    // Body weight sync
    const bw = bodyWeights[selectedDate];
    inputBodyWeight.value = bw !== undefined ? bw : '';
    
    // Find previous body weight for comparison hint
    const sortedDates = Object.keys(bodyWeights).sort().reverse();
    const prevDate = sortedDates.find(d => d < selectedDate && bodyWeights[d]);
    if (prevDate) {
      const prevBw = bodyWeights[prevDate];
      const diff = bw ? (bw - prevBw).toFixed(1) : null;
      if (diff !== null) {
        const sign = Number(diff) >= 0 ? `+${diff}` : `${diff}`;
        weightHistoryHint.textContent = `Prev: ${prevBw}kg (${sign}kg)`;
      } else {
        weightHistoryHint.textContent = `Last logged: ${prevBw}kg`;
      }
    } else {
      weightHistoryHint.textContent = "Tap steppers to adjust";
    }

    // Workout Data
    let todayWorkout = workouts[selectedDate];
    exercisesListContainer.innerHTML = '';

    if (!todayWorkout) {
      todayWorkout = { split: currentSplit, exercises: [] };
      workouts[selectedDate] = todayWorkout;
      saveToStorage(STORAGE_WORKOUTS, workouts);
    }

    const exercisesToRender = todayWorkout.exercises || [];

    if (exercisesCountTitle) {
      exercisesCountTitle.textContent = `TODAY'S WORKOUTS (${exercisesToRender.length})`;
    }
    if (btnOpenReorder) {
      btnOpenReorder.style.display = exercisesToRender.length > 1 ? 'inline-flex' : 'none';
    }

    if (exercisesToRender.length === 0) {
      const templateExercises = splits[currentSplit] || [];
      exercisesListContainer.innerHTML = `
        <div class="empty-workout-card">
          <div class="empty-icon">📋</div>
          <p class="empty-title">No exercises for today</p>
          <p class="empty-sub">Add custom exercises below, or load your default ${escapeHTML(currentSplit)} routine.</p>
          ${templateExercises.length > 0 ? `
            <button id="btn-load-template" class="btn-load-template">
              ⚡ Load ${escapeHTML(currentSplit)} Routine (${templateExercises.length} exercises)
            </button>
          ` : ''}
        </div>
      `;

      const btnLoadTemplate = document.getElementById('btn-load-template');
      if (btnLoadTemplate) {
        btnLoadTemplate.addEventListener('click', () => {
          triggerHaptic('light');
          todayWorkout.exercises = templateExercises.map(name => ({
            name: name,
            sets: []
          }));
          workouts[selectedDate] = todayWorkout;
          saveToStorage(STORAGE_WORKOUTS, workouts);
          renderWorkoutView();
          showToast(`Loaded ${currentSplit} routine!`);
        });
      }
      return;
    }

    exercisesToRender.forEach((ex, exIndex) => {
      const bench = getPreviousBestOrLast(ex.name, selectedDate);
      const card = createExerciseCardElement(ex, exIndex, bench, exercisesToRender.length);
      exercisesListContainer.appendChild(card);
    });
  }

  // --- Create Single Exercise Card Element ---
  function createExerciseCardElement(ex, exIndex, bench, totalExercises) {
    const card = document.createElement('article');
    card.className = `exercise-card ${ex.sets && ex.sets.length > 0 ? 'has-sets' : ''}`;

    // Benchmark subtitle
    let benchText = "";
    if (bench.hasHistory) {
      benchText = `<span>⚡ Last: <strong>${bench.ghostWeight} kg × ${bench.ghostReps}</strong></span>`;
    } else {
      benchText = `<span>🆕 First time logging this</span>`;
    }

    // Default input values: either the last set from today, or the ghost values
    let defaultWeight = bench.hasHistory ? bench.ghostWeight : "";
    let defaultReps = bench.hasHistory ? bench.ghostReps : "";

    if (ex.sets && ex.sets.length > 0) {
      const lastLoggedSet = ex.sets[ex.sets.length - 1];
      defaultWeight = lastLoggedSet.weight;
      defaultReps = lastLoggedSet.reps;
    }

    const currentSetCount = ex.sets ? ex.sets.length : 0;
    const isComplete = currentSetCount >= MAX_SETS_PER_EXERCISE;

    card.innerHTML = `
      <div class="exercise-header">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <h3 class="exercise-name">${escapeHTML(ex.name)}</h3>
            <span class="set-progress-pill ${isComplete ? 'complete' : ''}">${currentSetCount === 0 ? '0 Sets' : (isComplete ? 'Set 4 (Done ✓)' : `Set ${currentSetCount}`)}</span>
          </div>
          <div class="exercise-last-bench">${benchText}</div>
        </div>
        <div class="exercise-header-actions">
          <button class="btn-card-reorder" data-action="move-up" title="Move Up" ${exIndex === 0 ? 'disabled' : ''} aria-label="Move Up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <button class="btn-card-reorder" data-action="move-down" title="Move Down" ${exIndex === totalExercises - 1 ? 'disabled' : ''} aria-label="Move Down">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button class="btn-card-menu" title="Remove Exercise" data-action="delete-ex">✕</button>
        </div>
      </div>

      <!-- Quick 1-Tap & Stepper Matrix -->
      <div class="fast-input-matrix ${isComplete ? 'is-complete' : ''}">
        <div class="matrix-inputs-row">
          
          <!-- Weight Input & Steppers -->
          <div class="input-block">
            <span class="input-label">Weight (kg)</span>
            <div class="input-with-steppers">
              <input type="number" step="0.5" class="num-input ex-weight-input" value="${defaultWeight}" placeholder="kg" ${isComplete ? 'disabled' : ''}>
            </div>
            <div class="quick-steppers-bar">
              <button class="btn-chip-step" data-w="-2.5" ${isComplete ? 'disabled' : ''}>-2.5</button>
              <button class="btn-chip-step" data-w="+2.5" ${isComplete ? 'disabled' : ''}>+2.5</button>
              <button class="btn-chip-step" data-w="+5" ${isComplete ? 'disabled' : ''}>+5</button>
            </div>
          </div>

          <!-- Reps Input & Steppers -->
          <div class="input-block">
            <span class="input-label">Reps (Max)</span>
            <div class="input-with-steppers">
              <input type="number" step="1" class="num-input ex-reps-input" value="${defaultReps}" placeholder="reps" ${isComplete ? 'disabled' : ''}>
            </div>
            <div class="quick-steppers-bar">
              <button class="btn-chip-step" data-r="-1" ${isComplete ? 'disabled' : ''}>-1</button>
              <button class="btn-chip-step" data-r="+1" ${isComplete ? 'disabled' : ''}>+1</button>
              <button class="btn-chip-step" data-r="+2" ${isComplete ? 'disabled' : ''}>+2</button>
            </div>
          </div>

        </div>

        <!-- Big 1-Tap Log Button or Completed state -->
        ${isComplete ? `
          <button class="btn-log-set completed" disabled>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Set 4 Completed ✓
          </button>
        ` : `
          <button class="btn-log-set" data-action="log-set">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            Log Set ${currentSetCount + 1}
          </button>
        `}
      </div>

      <!-- Logged Sets List for Today -->
      <div class="logged-sets-list">
        ${renderSetsHtml(ex.sets || [])}
      </div>
    `;

    // --- Wire card events ---
    const weightInput = card.querySelector('.ex-weight-input');
    const repsInput = card.querySelector('.ex-reps-input');
    const btnLogSet = card.querySelector('[data-action="log-set"]');
    const btnDeleteEx = card.querySelector('[data-action="delete-ex"]');
    const btnMoveUp = card.querySelector('[data-action="move-up"]');
    const btnMoveDown = card.querySelector('[data-action="move-down"]');

    // Move Exercise Up / Down in Today's workout
    if (btnMoveUp) {
      btnMoveUp.addEventListener('click', (e) => {
        e.stopPropagation();
        if (exIndex > 0) {
          triggerHaptic('light');
          const list = workouts[selectedDate].exercises;
          const temp = list[exIndex];
          list[exIndex] = list[exIndex - 1];
          list[exIndex - 1] = temp;
          saveToStorage(STORAGE_WORKOUTS, workouts);
          renderWorkoutView();
          showToast(`Moved "${ex.name}" up`);
        }
      });
    }

    if (btnMoveDown) {
      btnMoveDown.addEventListener('click', (e) => {
        e.stopPropagation();
        const list = workouts[selectedDate].exercises;
        if (exIndex < list.length - 1) {
          triggerHaptic('light');
          const temp = list[exIndex];
          list[exIndex] = list[exIndex + 1];
          list[exIndex + 1] = temp;
          saveToStorage(STORAGE_WORKOUTS, workouts);
          renderWorkoutView();
          showToast(`Moved "${ex.name}" down`);
        }
      });
    }

    // Steppers click handling
    card.querySelectorAll('.btn-chip-step').forEach(btn => {
      btn.addEventListener('click', () => {
        triggerHaptic('light');
        if (btn.dataset.w) {
          const delta = parseFloat(btn.dataset.w);
          const curr = parseFloat(weightInput.value) || 0;
          weightInput.value = Math.max(0, curr + delta);
        } else if (btn.dataset.r) {
          const delta = parseInt(btn.dataset.r, 10);
          const curr = parseInt(repsInput.value, 10) || 0;
          repsInput.value = Math.max(1, curr + delta);
        }
      });
    });

    // Delete exercise from today
    btnDeleteEx.addEventListener('click', () => {
      if (confirm(`Remove "${ex.name}" from today?`)) {
        triggerHaptic('light');
        workouts[selectedDate].exercises.splice(exIndex, 1);
        saveToStorage(STORAGE_WORKOUTS, workouts);
        renderWorkoutView();
      }
    });

    // Big Log Set Click
    if (btnLogSet) {
      btnLogSet.addEventListener('click', () => {
        if (ex.sets && ex.sets.length >= MAX_SETS_PER_EXERCISE) {
          showToast(`Limit reached: 4 sets maximum per exercise`);
          return;
        }

        const weight = parseFloat(weightInput.value) || 0;
        const reps = parseInt(repsInput.value, 10) || 0;

        if (reps <= 0) {
          showToast("Please enter at least 1 rep");
          return;
        }

        // Check for PR (Progressive Overload)
        let isPR = false;
        if (bench.hasHistory) {
          if (weight > bench.allTimeMaxWeight || (weight === bench.allTimeMaxWeight && reps > bench.allTimeMaxReps)) {
            isPR = true;
          }
        }

        const newSet = { weight, reps, isPR };
        if (!ex.sets) ex.sets = [];
        ex.sets.push(newSet);

        workouts[selectedDate].exercises[exIndex] = ex;
        saveToStorage(STORAGE_WORKOUTS, workouts);

        if (ex.sets.length >= MAX_SETS_PER_EXERCISE) {
          triggerHaptic('success');
          showToast(`🎉 Set 4 completed for ${ex.name}!`);
        } else if (isPR) {
          triggerHaptic('success');
          showToast(`🔥 NEW PR! ${weight}kg × ${reps} reps!`);
        } else {
          triggerHaptic('light');
          showToast(`Set ${ex.sets.length} logged! (${weight}kg × ${reps})`);
        }

        // Start Rest Timer
        startRestTimer(ex.name);

        // Re-render
        renderWorkoutView();
      });
    }

    // Delete single set click
    card.querySelectorAll('.btn-delete-set').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const setIndex = parseInt(btn.dataset.setIndex, 10);
        triggerHaptic('light');
        ex.sets.splice(setIndex, 1);
        workouts[selectedDate].exercises[exIndex] = ex;
        saveToStorage(STORAGE_WORKOUTS, workouts);
        renderWorkoutView();
      });
    });

    return card;
  }

  function renderSetsHtml(sets) {
    if (!sets || sets.length === 0) return '';
    return sets.map((s, idx) => `
      <div class="set-row">
        <span class="set-num">Set ${idx + 1}</span>
        <div class="set-val">
          <span>${s.weight} kg × ${s.reps}</span>
          ${s.isPR ? '<span class="set-pr-tag">🔥 PR</span>' : ''}
        </div>
        <button class="btn-delete-set" data-set-index="${idx}" title="Delete set">✕</button>
      </div>
    `).join('');
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // --- Floating Rest Timer Controller & Picture-in-Picture Engine ---
  const btnTimerPip = document.getElementById('btn-timer-pip');

  function initPiP() {
    if (pipCanvas && pipVideo) return;
    pipCanvas = document.getElementById('pip-canvas');
    if (!pipCanvas) {
      pipCanvas = document.createElement('canvas');
      pipCanvas.id = 'pip-canvas';
      pipCanvas.width = 360;
      pipCanvas.height = 200;
      pipCanvas.style.display = 'none';
      document.body.appendChild(pipCanvas);
    }
    pipCtx = pipCanvas.getContext('2d');

    pipVideo = document.getElementById('pip-video');
    if (!pipVideo) {
      pipVideo = document.createElement('video');
      pipVideo.id = 'pip-video';
      pipVideo.muted = true;
      pipVideo.playsInline = true;
      pipVideo.style.display = 'none';
      document.body.appendChild(pipVideo);
    }

    try {
      if (pipCanvas.captureStream) {
        pipVideo.srcObject = pipCanvas.captureStream(12);
        pipVideo.play().catch(() => {});
      }
    } catch (e) {
      console.warn("captureStream error:", e);
    }

    pipVideo.addEventListener('enterpictureinpicture', () => {
      pipActive = true;
      if (btnTimerPip) {
        btnTimerPip.classList.add('active');
        btnTimerPip.textContent = '⧉ Floating';
      }
    });

    pipVideo.addEventListener('leavepictureinpicture', () => {
      pipActive = false;
      if (btnTimerPip) {
        btnTimerPip.classList.remove('active');
        btnTimerPip.textContent = '⧉ Float';
      }
    });
  }

  function drawPiPFrame(timeStr, exerciseName, progress, isDone = false) {
    initPiP();
    if (!pipCtx) return;
    const w = 360;
    const h = 200;

    if (isDone) {
      // Completed state (green celebration)
      pipCtx.fillStyle = '#064e3b';
      pipCtx.fillRect(0, 0, w, h);

      pipCtx.fillStyle = '#10b981';
      pipCtx.fillRect(0, 0, w, 6);

      pipCtx.fillStyle = '#a7f3d0';
      pipCtx.font = 'bold 15px sans-serif';
      pipCtx.textAlign = 'center';
      pipCtx.fillText('REST INTERVAL COMPLETE', w / 2, 50);

      pipCtx.fillStyle = '#ffffff';
      pipCtx.font = 'bold 32px sans-serif';
      pipCtx.fillText('TIME TO LIFT! 💪', w / 2, 110);

      pipCtx.fillStyle = '#6ee7b7';
      pipCtx.font = '14px sans-serif';
      pipCtx.fillText((exerciseName || 'Next Set').toUpperCase(), w / 2, 150);
    } else {
      // Resting countdown state
      pipCtx.fillStyle = '#090b10';
      pipCtx.fillRect(0, 0, w, h);

      // Accent amber top line
      pipCtx.fillStyle = '#f59e0b';
      pipCtx.fillRect(0, 0, w, 5);

      // Exercise label
      pipCtx.fillStyle = '#94a3b8';
      pipCtx.font = 'bold 14px sans-serif';
      pipCtx.textAlign = 'center';
      const cleanEx = (exerciseName || 'REST TIMER').toUpperCase();
      pipCtx.fillText(cleanEx.length > 22 ? cleanEx.slice(0, 20) + '...' : cleanEx, w / 2, 42);

      // Big countdown time
      pipCtx.fillStyle = '#ffffff';
      pipCtx.font = 'bold 64px monospace';
      pipCtx.fillText(timeStr, w / 2, 112);

      // Progress bar track
      const barW = 280;
      const barH = 10;
      const barX = (w - barW) / 2;
      const barY = 138;

      pipCtx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      pipCtx.beginPath();
      pipCtx.roundRect(barX, barY, barW, barH, 5);
      pipCtx.fill();

      // Progress bar fill
      pipCtx.fillStyle = '#f59e0b';
      pipCtx.beginPath();
      pipCtx.roundRect(barX, barY, Math.max(10, barW * progress), barH, 5);
      pipCtx.fill();

      // Subtitle
      pipCtx.fillStyle = '#64748b';
      pipCtx.font = '11px sans-serif';
      pipCtx.fillText('LIFT SET GO • REST TIMER', w / 2, 178);
    }
  }

  async function togglePictureInPicture() {
    initPiP();
    if (!('pictureInPictureEnabled' in document) || !pipVideo) {
      showToast("Picture-in-Picture not supported on this browser");
      return;
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await pipVideo.play();
        await pipVideo.requestPictureInPicture();
        showToast("Timer floating over screen! ⧉");
      }
    } catch (err) {
      console.warn("PiP error:", err);
      showToast("Tap 'Float' again to allow overlay window");
    }
  }

  async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      updateNotificationButtonState();
      return true;
    }
    try {
      const perm = await Notification.requestPermission();
      updateNotificationButtonState();
      return perm === 'granted';
    } catch (e) {
      return false;
    }
  }

  const btnNotificationToggle = document.getElementById('btn-notification-toggle');

  function updateNotificationButtonState() {
    if (!btnNotificationToggle) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      btnNotificationToggle.classList.add('notify-active');
      btnNotificationToggle.title = "Screen Notifications: Active 🔔";
    } else {
      btnNotificationToggle.classList.remove('notify-active');
      btnNotificationToggle.title = "Tap to Enable Screen Pop-up Notifications 🔔";
    }
  }

  if (btnNotificationToggle) {
    btnNotificationToggle.addEventListener('click', async () => {
      triggerHaptic('light');
      if (!('Notification' in window)) {
        showToast("Notifications not supported in this browser");
        return;
      }
      if (Notification.permission === 'granted') {
        showToast("Screen notifications are active! 🔔 (Sending test pop-up...)");
        sendTimerNotification("Notification Test");
      } else {
        const granted = await requestNotificationPermission();
        if (granted) {
          showToast("Screen notifications enabled! 🔔");
          sendTimerNotification("Enabled");
        } else if (Notification.permission === 'denied') {
          showToast("Notifications blocked. Allow in site settings.");
        }
      }
    });
  }

  // Update button state on initial load
  updateNotificationButtonState();

  async function sendTimerNotification(exerciseName) {
    const title = "Rest Over! Time to Lift 💪";
    const body = exerciseName ? `Your rest for ${exerciseName} has finished!` : "Rest interval complete. Time for your next set!";
    const options = {
      body: body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: 'liftsetgo-rest-done',
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [300, 150, 300, 150, 400],
      data: { url: './index.html' }
    };

    // Priority 1: ServiceWorkerRegistration.showNotification (Required for Android & Mobile PWA Heads-Up Banner)
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, options);
          return;
        }
      } catch (e) {
        console.warn("SW notification error:", e);
      }
    }

    // Priority 2: Standard Desktop Notification fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, options);
      } catch (e) {
        console.warn("Desktop notification error:", e);
      }
    }
  }

  function startRestTimer(exerciseName, customDuration) {
    currentTimerExercise = exerciseName || "Rest Interval";
    restTimeRemaining = customDuration || settings.defaultRestSec || 90;
    restTotalDuration = restTimeRemaining;
    restEndTime = Date.now() + (restTimeRemaining * 1000);

    timerExerciseName.textContent = currentTimerExercise;
    restTimerDock.classList.remove('hidden');

    // Request notification permission if first time
    requestNotificationPermission();

    clearInterval(restTimerInterval);
    updateTimerDisplay();

    // High precision timestamp delta interval
    restTimerInterval = setInterval(() => {
      const now = Date.now();
      restTimeRemaining = Math.max(0, Math.ceil((restEndTime - now) / 1000));
      if (restTimeRemaining <= 0) {
        clearInterval(restTimerInterval);
        restTimerInterval = null;
        onRestTimerFinished();
      } else {
        updateTimerDisplay();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const mins = Math.floor(restTimeRemaining / 60);
    const secs = restTimeRemaining % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    timerDisplay.textContent = timeStr;

    // SVG dashoffset calculation: circumference = 2 * PI * 18 ~= 113.1
    const circumference = 113.1;
    const progress = (restTimeRemaining / restTotalDuration);
    const offset = circumference * (1 - progress);
    timerBar.style.strokeDashoffset = offset;

    // Update browser title so it's visible in browser tabs
    document.title = `⏱️ ${timeStr} - Rest | Lift Set Go`;

    // Render into Picture-in-Picture floating frame
    drawPiPFrame(timeStr, currentTimerExercise, progress, false);
  }

  function onRestTimerFinished() {
    playChime();
    triggerHaptic('alarm');
    showToast("Rest Over! Time to lift 💪");
    document.title = "⚡ Time to Lift! | Lift Set Go";

    // Update Picture-in-Picture frame to celebrate
    drawPiPFrame("00:00", currentTimerExercise, 0, true);

    // Send native system notification (for when user is outside the app or phone locked)
    sendTimerNotification(currentTimerExercise);

    // Auto-hide the in-app dock after 4 seconds
    setTimeout(() => {
      if (!restTimerInterval) {
        restTimerDock.classList.add('hidden');
        document.title = "Lift Set Go - Zero-Friction Gym Tracker";
      }
    }, 4500);
  }

  // Float button click
  if (btnTimerPip) {
    btnTimerPip.addEventListener('click', () => {
      triggerHaptic('light');
      togglePictureInPicture();
    });
  }

  btnTimerPlus30.addEventListener('click', () => {
    triggerHaptic('light');
    restTotalDuration += 30;
    restEndTime += 30 * 1000;
    const now = Date.now();
    restTimeRemaining = Math.max(0, Math.ceil((restEndTime - now) / 1000));
    updateTimerDisplay();
  });

  btnTimerDismiss.addEventListener('click', () => {
    triggerHaptic('light');
    clearInterval(restTimerInterval);
    restTimerInterval = null;
    restTimerDock.classList.add('hidden');
    document.title = "Lift Set Go - Zero-Friction Gym Tracker";
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
  });

  // Re-sync timestamp timer whenever user switches back to this app
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && restTimerInterval && restEndTime > 0) {
      const now = Date.now();
      restTimeRemaining = Math.max(0, Math.ceil((restEndTime - now) / 1000));
      if (restTimeRemaining <= 0) {
        clearInterval(restTimerInterval);
        restTimerInterval = null;
        onRestTimerFinished();
      } else {
        updateTimerDisplay();
      }
    }
  });

  // --- Dedicated Quick Rest Bar (Unrecorded Sets / Warm-ups) ---
  let quickRestDuration = 90;
  const btnStartQuickRest = document.getElementById('btn-start-quick-rest');

  document.querySelectorAll('.btn-rest-preset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerHaptic('light');
      document.querySelectorAll('.btn-rest-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      quickRestDuration = parseInt(btn.dataset.sec, 10) || 90;
    });
  });

  if (btnStartQuickRest) {
    btnStartQuickRest.addEventListener('click', async () => {
      triggerHaptic('light');
      await requestNotificationPermission();
      startRestTimer("Quick Rest", quickRestDuration);
      showToast(`Started ${quickRestDuration}s Rest ⏱️`);
    });
  }

  // --- Body Weight Quick Steppers ---
  function adjustBodyWeight(delta) {
    triggerHaptic('light');
    let current = parseFloat(inputBodyWeight.value);
    if (isNaN(current)) {
      // Find latest logged weight or default to 75
      const sorted = Object.keys(bodyWeights).sort().reverse();
      current = sorted.length > 0 ? bodyWeights[sorted[0]] : 75.0;
    }
    const updated = Math.round((current + delta) * 10) / 10;
    inputBodyWeight.value = updated.toFixed(1);
    bodyWeights[selectedDate] = updated;
    saveToStorage(STORAGE_WEIGHTS, bodyWeights);
    renderWorkoutView();
    showToast(`Body weight: ${updated} kg`);
  }

  document.getElementById('btn-bw-minus-pt5').addEventListener('click', () => adjustBodyWeight(-0.5));
  document.getElementById('btn-bw-minus-pt1').addEventListener('click', () => adjustBodyWeight(-0.1));
  document.getElementById('btn-bw-plus-pt1').addEventListener('click', () => adjustBodyWeight(+0.1));
  document.getElementById('btn-bw-plus-pt5').addEventListener('click', () => adjustBodyWeight(+0.5));

  inputBodyWeight.addEventListener('change', () => {
    const val = parseFloat(inputBodyWeight.value);
    if (!isNaN(val) && val > 0) {
      bodyWeights[selectedDate] = Math.round(val * 10) / 10;
      saveToStorage(STORAGE_WEIGHTS, bodyWeights);
      renderWorkoutView();
      showToast(`Logged ${val} kg`);
    }
  });

  // --- Date Steppers ---
  btnPrevDay.addEventListener('click', () => {
    triggerHaptic('light');
    const curr = parseDateKey(selectedDate);
    curr.setDate(curr.getDate() - 1);
    selectedDate = formatDateKey(curr);
    renderSplitPills();
    renderWorkoutView();
  });

  btnNextDay.addEventListener('click', () => {
    triggerHaptic('light');
    const curr = parseDateKey(selectedDate);
    curr.setDate(curr.getDate() + 1);
    selectedDate = formatDateKey(curr);
    renderSplitPills();
    renderWorkoutView();
  });

  // --- Main Tab Navigation (Workout / History / Body Weight) ---
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      triggerHaptic('light');
      const targetId = tab.dataset.tab;

      navTabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(targetId).classList.add('active');

      if (targetId === 'tab-history') {
        renderHistoryTab();
      } else if (targetId === 'tab-bodyweight') {
        renderBodyWeightTab();
      } else if (targetId === 'tab-workout') {
        renderWorkoutView();
      }
    });
  });

  // --- Tracking Calendar State & Logic ---
  let calCurrentYear = new Date().getFullYear();
  let calCurrentMonth = new Date().getMonth();

  function renderTrackingCalendar() {
    const monthYearEl = document.getElementById('calendar-month-year');
    const monthStatsEl = document.getElementById('calendar-month-stats');
    const gridEl = document.getElementById('calendar-days-grid');
    if (!gridEl || !monthYearEl) return;

    gridEl.innerHTML = '';

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    monthYearEl.textContent = `${monthNames[calCurrentMonth]} ${calCurrentYear}`;

    // Compute first day of month (Monday as first column)
    const firstDay = new Date(calCurrentYear, calCurrentMonth, 1);
    let startDayOfWeek = firstDay.getDay(); // 0 is Sun, 1 is Mon...
    startDayOfWeek = (startDayOfWeek === 0) ? 6 : startDayOfWeek - 1; // 0=Mon ... 6=Sun

    const daysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
    const todayKey = getTodayDateString();

    let workoutsThisMonth = 0;

    // Fill leading empty cells
    for (let i = 0; i < startDayOfWeek; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'cal-day empty';
      gridEl.appendChild(emptyCell);
    }

    // Fill days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const monthStr = String(calCurrentMonth + 1).padStart(2, '0');
      const dateKey = `${calCurrentYear}-${monthStr}-${dayStr}`;

      const cell = document.createElement('div');
      cell.className = 'cal-day';
      cell.textContent = d;

      // Check if workout record is added on that day (turns green!)
      const w = workouts[dateKey];
      const hasWorkout = !!(w && w.exercises && w.exercises.some(e => e.sets && e.sets.length > 0));

      if (hasWorkout) {
        cell.classList.add('has-workout');
        workoutsThisMonth++;
      }

      if (dateKey === todayKey) {
        cell.classList.add('is-today');
      }

      if (dateKey === selectedDate) {
        cell.classList.add('is-selected');
      }

      cell.title = hasWorkout ? `Workout recorded on ${dateKey}` : dateKey;

      cell.addEventListener('click', () => {
        triggerHaptic('light');
        selectedDate = dateKey;
        // Jump directly to Workout view for that date
        document.querySelector('.nav-tab[data-tab="tab-workout"]').click();
      });

      gridEl.appendChild(cell);
    }

    // Update month stats badge
    if (monthStatsEl) {
      if (workoutsThisMonth === 0) {
        monthStatsEl.textContent = "0 workouts logged this month";
        monthStatsEl.style.color = "var(--text-dim)";
      } else {
        monthStatsEl.textContent = `🔥 ${workoutsThisMonth} workout${workoutsThisMonth > 1 ? 's' : ''} logged this month!`;
        monthStatsEl.style.color = "var(--primary)";
      }
    }
  }

  // Calendar prev/next buttons
  const btnCalPrev = document.getElementById('btn-cal-prev');
  const btnCalNext = document.getElementById('btn-cal-next');

  if (btnCalPrev) {
    btnCalPrev.addEventListener('click', () => {
      triggerHaptic('light');
      calCurrentMonth--;
      if (calCurrentMonth < 0) {
        calCurrentMonth = 11;
        calCurrentYear--;
      }
      renderTrackingCalendar();
    });
  }

  if (btnCalNext) {
    btnCalNext.addEventListener('click', () => {
      triggerHaptic('light');
      calCurrentMonth++;
      if (calCurrentMonth > 11) {
        calCurrentMonth = 0;
        calCurrentYear++;
      }
      renderTrackingCalendar();
    });
  }

  // --- Tab 2: Render History ---
  function renderHistoryTab() {
    // Render the tracking calendar first so it's always up to date
    renderTrackingCalendar();

    const historyContainer = document.getElementById('history-items-container');
    const historyCount = document.getElementById('history-total-count');

    const allDates = Object.keys(workouts).sort().reverse();
    // Filter to only dates that have logged sets
    const recordedDates = allDates.filter(d => {
      const w = workouts[d];
      return w && w.exercises && w.exercises.some(e => e.sets && e.sets.length > 0);
    });

    historyCount.textContent = `${recordedDates.length} logged workouts`;
    historyContainer.innerHTML = '';

    if (recordedDates.length === 0) {
      historyContainer.innerHTML = `
        <div style="text-align: center; padding: 32px 16px; color: var(--text-dim);">
          <p>No completed workouts found yet.</p>
          <p style="font-size: 0.8rem; margin-top: 4px;">Log a set on the Workout tab to light up your calendar!</p>
        </div>
      `;
      return;
    }

    recordedDates.forEach(d => {
      const w = workouts[d];
      const dFormatted = formatDisplayDate(d);
      const card = document.createElement('div');
      card.className = 'history-card';

      const bwText = bodyWeights[d] ? ` • ⚖️ ${bodyWeights[d]}kg` : '';

      const exercisesHtml = w.exercises
        .filter(e => e.sets && e.sets.length > 0)
        .map(e => {
          const maxSet = e.sets.reduce((prev, curr) => (curr.weight > prev.weight ? curr : prev), e.sets[0]);
          return `
            <div class="history-exercise-row">
              <span class="history-ex-name">${escapeHTML(e.name)}</span>
              <span class="history-ex-stat">${maxSet.weight}kg × ${maxSet.reps} <small style="color:var(--text-dim);">(${e.sets.length} sets)</small></span>
            </div>
          `;
        }).join('');

      card.innerHTML = `
        <div class="history-card-top">
          <div>
            <div class="history-date">${dFormatted.full}${bwText}</div>
          </div>
          <span class="history-split-badge">${escapeHTML(w.split || 'Workout')}</span>
        </div>
        <div class="history-exercises-summary">
          ${exercisesHtml}
        </div>
      `;

      card.addEventListener('click', () => {
        selectedDate = d;
        document.querySelector('.nav-tab[data-tab="tab-workout"]').click();
      });

      historyContainer.appendChild(card);
    });
  }

  // --- Tab 3: Render Body Weight Trend & Canvas Chart ---
  function renderBodyWeightTab() {
    const bwCurrentDisplay = document.getElementById('bw-current-display');
    const bw7dAvgDisplay = document.getElementById('bw-7d-avg-display');
    const bwChangeDisplay = document.getElementById('bw-change-display');
    const logsList = document.getElementById('bw-logs-list');

    const allDates = Object.keys(bodyWeights).sort().reverse();
    if (allDates.length === 0) {
      bwCurrentDisplay.textContent = '-- kg';
      bw7dAvgDisplay.textContent = '-- kg';
      bwChangeDisplay.textContent = '-- kg';
      logsList.innerHTML = `<p style="color:var(--text-dim); text-align:center; padding:16px;">No weight entries yet.</p>`;
      return;
    }

    const latestDate = allDates[0];
    const latestVal = bodyWeights[latestDate];
    bwCurrentDisplay.textContent = `${latestVal} kg`;

    // 7-day average calculation
    const last7 = allDates.slice(0, 7).map(d => bodyWeights[d]);
    const avg7 = (last7.reduce((a, b) => a + b, 0) / last7.length).toFixed(1);
    bw7dAvgDisplay.textContent = `${avg7} kg`;

    // 30-day change calculation
    const oldestDate = allDates[allDates.length - 1];
    const diff = (latestVal - bodyWeights[oldestDate]).toFixed(1);
    const sign = Number(diff) >= 0 ? `+${diff}` : `${diff}`;
    bwChangeDisplay.textContent = `${sign} kg`;

    // Render list
    logsList.innerHTML = allDates.slice(0, 10).map(d => {
      const f = formatDisplayDate(d);
      return `
        <div class="bw-log-item">
          <span>${f.full}</span>
          <span style="font-family:var(--font-mono); font-weight:700;">${bodyWeights[d]} kg</span>
        </div>
      `;
    }).join('');

    // Draw Chart
    drawWeightChart();
  }

  function drawWeightChart() {
    const canvas = document.getElementById('weightCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Get sorted chronological weights
    const sortedDates = Object.keys(bodyWeights).sort();
    if (sortedDates.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Log weight for 2+ days to see trend line', width / 2, height / 2);
      return;
    }

    const values = sortedDates.map(d => bodyWeights[d]);
    const minVal = Math.min(...values) - 0.5;
    const maxVal = Math.max(...values) + 0.5;
    const range = (maxVal - minVal) || 1;

    const paddingX = 24;
    const paddingY = 24;
    const chartW = width - (paddingX * 2);
    const chartH = height - (paddingY * 2);

    // Draw horizontal grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = paddingY + (chartH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(paddingX, y);
      ctx.lineTo(width - paddingX, y);
      ctx.stroke();
    }

    // Points calculation
    const points = values.map((val, idx) => {
      const x = paddingX + (idx / (values.length - 1)) * chartW;
      const y = paddingY + chartH - ((val - minVal) / range) * chartH;
      return { x, y, val };
    });

    // Draw smooth gradient fill under line
    const grad = ctx.createLinearGradient(0, paddingY, 0, height);
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, height - paddingY);
    points.forEach((pt, i) => {
      if (i === 0) ctx.lineTo(pt.x, pt.y);
      else {
        const prev = points[i - 1];
        const cx = (prev.x + pt.x) / 2;
        ctx.bezierCurveTo(cx, prev.y, cx, pt.y, pt.x, pt.y);
      }
    });
    ctx.lineTo(points[points.length - 1].x, height - paddingY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    points.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else {
        const prev = points[i - 1];
        const cx = (prev.x + pt.x) / 2;
        ctx.bezierCurveTo(cx, prev.y, cx, pt.y, pt.x, pt.y);
      }
    });
    ctx.stroke();

    // Draw point circles
    points.forEach(pt => {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // --- MODAL 1: Smart Notepad Parser & Exporter ---
  btnNotepadModal.addEventListener('click', () => {
    triggerHaptic('light');
    openNotepadModal();
  });

  btnCloseNotepad.addEventListener('click', () => {
    modalNotepad.classList.add('hidden');
  });

  // Modal tab switching for Notepad modal
  const notepadModalTabs = document.querySelectorAll('#modal-notepad .modal-tab');
  notepadModalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      triggerHaptic('light');
      notepadModalTabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('#modal-notepad .modal-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const targetPanel = document.getElementById(tab.dataset.modaltab);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  function openNotepadModal() {
    modalNotepad.classList.remove('hidden');
    generateExportText();
  }

  // Export current workout to Notepad format
  function generateExportText() {
    const exportTextarea = document.getElementById('notepad-export-text');
    const f = formatDisplayDate(selectedDate);
    const bw = bodyWeights[selectedDate];
    const w = workouts[selectedDate];

    let lines = [];
    lines.push(`📅 ${f.full} (${selectedDate})`);
    if (bw) lines.push(`⚖️ Body Weight: ${bw} kg`);
    if (w && w.split) lines.push(`🔥 Split: ${w.split}`);
    lines.push('-------------------------');

    if (w && w.exercises) {
      w.exercises.forEach(e => {
        if (e.sets && e.sets.length > 0) {
          const setStrings = e.sets.map(s => `${s.weight}kg x ${s.reps}`).join(', ');
          lines.push(`• ${e.name}: ${setStrings}`);
        }
      });
    }

    exportTextarea.value = lines.join('\n');
  }

  document.getElementById('btn-copy-export').addEventListener('click', async () => {
    const exportText = document.getElementById('notepad-export-text').value;
    try {
      await navigator.clipboard.writeText(exportText);
      triggerHaptic('success');
      showToast("Copied to clipboard!");
    } catch (e) {
      showToast("Select text and copy manually");
    }
  });

  // Smart Parser for Raw Notepad Notes
  document.getElementById('btn-parse-notepad').addEventListener('click', () => {
    triggerHaptic('light');
    const raw = document.getElementById('notepad-import-text').value.trim();
    if (!raw) {
      showToast("Please paste some text first");
      return;
    }

    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    let parsedWeight = null;
    let parsedSplit = null;
    let parsedExercises = [];

    lines.forEach(line => {
      // 1. Check for weight: e.g. "Weight: 75kg", "BW 74.2", "75.5 kg"
      const bwMatch = line.match(/(?:weight|bw)?\s*[:=-]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:kg|lbs|kilos)?/i);
      if (line.toLowerCase().includes('weight') || line.toLowerCase().includes('bw')) {
        if (bwMatch && bwMatch[1]) parsedWeight = parseFloat(bwMatch[1]);
        return;
      }

      // 2. Check for Split header: e.g. "Push Day", "Pull:", "Legs Split"
      const splitMatches = ['push', 'pull', 'legs', 'upper', 'lower'];
      for (const sm of splitMatches) {
        if (line.toLowerCase().startsWith(sm)) {
          parsedSplit = sm.charAt(0).toUpperCase() + sm.slice(1);
          return;
        }
      }

      // 3. Check for Exercise + weight + reps
      // Patterns:
      // "Bench Press: 75kg 8 reps"
      // "Incline DB 26kg x 10"
      // "Lateral Raise 10 12"
      // "Squat: 100kg 5r"
      const exMatch = line.match(/^([a-zA-Z\s/-]+?)[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:kg|kilos)?\s*(?:x|for|reps|r)?\s*(\d+)/i);
      if (exMatch) {
        const name = exMatch[1].trim();
        const weight = parseFloat(exMatch[2]);
        const reps = parseInt(exMatch[3], 10);
        if (name && weight > 0 && reps > 0) {
          parsedExercises.push({
            name,
            sets: [{ weight, reps, isPR: false }]
          });
        }
      }
    });

    if (parsedExercises.length === 0 && !parsedWeight) {
      showToast("Could not recognize exercise formats. Check example.");
      return;
    }

    // Apply parsed values to selectedDate
    if (parsedWeight) {
      bodyWeights[selectedDate] = parsedWeight;
      saveToStorage(STORAGE_WEIGHTS, bodyWeights);
    }

    if (!workouts[selectedDate]) {
      workouts[selectedDate] = { split: parsedSplit || currentSplit, exercises: [] };
    }
    if (parsedSplit) {
      workouts[selectedDate].split = parsedSplit;
    }

    // Merge or add parsed exercises (capped at MAX_SETS_PER_EXERCISE)
    parsedExercises.forEach(pe => {
      const existing = workouts[selectedDate].exercises.find(e => e.name.toLowerCase() === pe.name.toLowerCase());
      if (existing) {
        if (!existing.sets) existing.sets = [];
        const slotsLeft = Math.max(0, MAX_SETS_PER_EXERCISE - existing.sets.length);
        if (slotsLeft > 0) {
          existing.sets.push(...pe.sets.slice(0, slotsLeft));
        }
      } else {
        pe.sets = (pe.sets || []).slice(0, MAX_SETS_PER_EXERCISE);
        workouts[selectedDate].exercises.push(pe);
      }
    });

    saveToStorage(STORAGE_WORKOUTS, workouts);

    triggerHaptic('success');
    showToast(`Imported ${parsedExercises.length} exercises!`);
    modalNotepad.classList.add('hidden');
    renderSplitPills();
    renderWorkoutView();
  });

  // --- MODAL 2: Add Exercise to Today ---
  btnOpenAddExercise.addEventListener('click', () => {
    triggerHaptic('light');
    openAddExerciseModal();
  });

  btnCloseExerciseModal.addEventListener('click', () => {
    modalExercise.classList.add('hidden');
  });

  function openAddExerciseModal() {
    modalExercise.classList.remove('hidden');
    exerciseSearchInput.value = '';
    renderExercisePickerList('');
    exerciseSearchInput.focus();
  }

  function renderExercisePickerList(query) {
    const q = query.toLowerCase().trim();
    const filtered = EXERCISE_LIBRARY.filter(e => e.name.toLowerCase().includes(q) || e.cat.toLowerCase().includes(q));

    exerciseQuickList.innerHTML = '';
    filtered.slice(0, 8).forEach(item => {
      const div = document.createElement('div');
      div.className = 'exercise-pick-item';
      div.innerHTML = `
        <span class="exercise-pick-name">${escapeHTML(item.name)}</span>
        <span class="exercise-pick-cat">${escapeHTML(item.cat)}</span>
      `;
      div.addEventListener('click', () => {
        addExerciseToToday(item.name);
      });
      exerciseQuickList.appendChild(div);
    });

    // Update custom button preview
    newExerciseNamePreview.textContent = query || 'Exercise';
  }

  exerciseSearchInput.addEventListener('input', () => {
    renderExercisePickerList(exerciseSearchInput.value);
  });

  btnCreateCustomExercise.addEventListener('click', () => {
    const val = exerciseSearchInput.value.trim();
    if (val) addExerciseToToday(val);
  });

  function addExerciseToToday(name) {
    if (!workouts[selectedDate]) {
      workouts[selectedDate] = { split: currentSplit, exercises: [] };
    }
    const alreadyExists = workouts[selectedDate].exercises.some(e => e.name.toLowerCase() === name.toLowerCase());
    if (alreadyExists) {
      showToast(`"${name}" is already in today's workout`);
    } else {
      workouts[selectedDate].exercises.push({ name, sets: [] });
      saveToStorage(STORAGE_WORKOUTS, workouts);
      triggerHaptic('light');
      showToast(`Added "${name}"`);
    }
    modalExercise.classList.add('hidden');
    renderWorkoutView();
  }

  // --- Rearrange Workouts & Splits Logic ---
  function openReorderModal(defaultTab = 'reorder-today') {
    if (!modalReorder) return;
    modalReorder.classList.remove('hidden');

    if (reorderModalTabs) {
      reorderModalTabs.forEach(t => {
        if (t.dataset.reordertab === defaultTab) {
          t.classList.add('active');
        } else {
          t.classList.remove('active');
        }
      });
    }
    const pToday = document.getElementById('panel-reorder-today');
    const pSplits = document.getElementById('panel-reorder-splits');

    if (defaultTab === 'reorder-today') {
      if (pToday) pToday.classList.add('active');
      if (pSplits) pSplits.classList.remove('active');
      renderReorderTodayList();
    } else {
      if (pToday) pToday.classList.remove('active');
      if (pSplits) pSplits.classList.add('active');
      renderReorderSplitsList();
    }
  }

  if (btnOpenReorder) {
    btnOpenReorder.addEventListener('click', () => {
      triggerHaptic('light');
      openReorderModal('reorder-today');
    });
  }

  if (btnReorderSplits) {
    btnReorderSplits.addEventListener('click', () => {
      triggerHaptic('light');
      openReorderModal('reorder-splits');
    });
  }

  if (btnCloseReorderModal) {
    btnCloseReorderModal.addEventListener('click', () => {
      triggerHaptic('light');
      modalReorder.classList.add('hidden');
    });
  }

  if (btnDoneReorder) {
    btnDoneReorder.addEventListener('click', () => {
      triggerHaptic('success');
      if (chkSaveSplitOrder && chkSaveSplitOrder.checked) {
        const todayWorkout = workouts[selectedDate];
        if (todayWorkout && todayWorkout.exercises && todayWorkout.exercises.length > 0) {
          const splitKey = todayWorkout.split || currentSplit;
          splits[splitKey] = todayWorkout.exercises.map(e => e.name);
          saveToStorage(STORAGE_SPLITS, splits);
        }
      }
      modalReorder.classList.add('hidden');
      renderWorkoutView();
      renderSplitPills();
      showToast("Workouts order saved! ✓");
    });
  }

  if (reorderModalTabs) {
    reorderModalTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerHaptic('light');
        reorderModalTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const targetTab = tab.dataset.reordertab;
        const pToday = document.getElementById('panel-reorder-today');
        const pSplits = document.getElementById('panel-reorder-splits');

        if (targetTab === 'reorder-today') {
          if (pToday) pToday.classList.add('active');
          if (pSplits) pSplits.classList.remove('active');
          renderReorderTodayList();
        } else {
          if (pToday) pToday.classList.remove('active');
          if (pSplits) pSplits.classList.add('active');
          renderReorderSplitsList();
        }
      });
    });
  }

  // Render list of exercises for today
  function renderReorderTodayList() {
    if (!reorderTodayList) return;
    reorderTodayList.innerHTML = '';
    const todayWorkout = workouts[selectedDate];
    const list = (todayWorkout && todayWorkout.exercises) ? todayWorkout.exercises : [];

    if (reorderSplitNameEl) {
      reorderSplitNameEl.textContent = (todayWorkout && todayWorkout.split) ? todayWorkout.split : currentSplit;
    }

    if (list.length === 0) {
      reorderTodayList.innerHTML = `<p style="text-align:center; color:var(--text-dim); padding:16px;">No exercises in today's workout yet.<br><span style="font-size:0.75rem;">Add exercises to today or switch to the "Split Workouts" tab to reorder splits.</span></p>`;
      return;
    }

    list.forEach((ex, idx) => {
      const item = document.createElement('div');
      item.className = 'reorder-item';
      item.dataset.index = idx;
      item.draggable = true;

      const setsCount = (ex.sets && ex.sets.length) ? ex.sets.length : 0;
      item.innerHTML = `
        <div class="reorder-item-left">
          <span class="reorder-drag-handle" title="Drag to reorder">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
          </span>
          <span class="reorder-pos-badge">${idx + 1}</span>
          <div class="reorder-item-info">
            <div class="reorder-item-name">${escapeHTML(ex.name)}</div>
            <div class="reorder-item-sub">${setsCount > 0 ? `${setsCount} set${setsCount > 1 ? 's' : ''} logged` : 'No sets yet'}</div>
          </div>
        </div>
        <div class="reorder-item-steppers">
          <button class="btn-reorder-step" data-action="modal-move-up" data-index="${idx}" ${idx === 0 ? 'disabled' : ''} aria-label="Move Up">▲</button>
          <button class="btn-reorder-step" data-action="modal-move-down" data-index="${idx}" ${idx === list.length - 1 ? 'disabled' : ''} aria-label="Move Down">▼</button>
        </div>
      `;

      const btnUp = item.querySelector('[data-action="modal-move-up"]');
      const btnDown = item.querySelector('[data-action="modal-move-down"]');

      if (btnUp) {
        btnUp.addEventListener('click', (e) => {
          e.stopPropagation();
          if (idx > 0) {
            triggerHaptic('light');
            swapTodayExercises(idx, idx - 1);
          }
        });
      }

      if (btnDown) {
        btnDown.addEventListener('click', (e) => {
          e.stopPropagation();
          if (idx < list.length - 1) {
            triggerHaptic('light');
            swapTodayExercises(idx, idx + 1);
          }
        });
      }

      reorderTodayList.appendChild(item);
    });

    setupReorderDragAndDrop(reorderTodayList, (fromIdx, toIdx) => {
      moveTodayExercise(fromIdx, toIdx);
    });
  }

  function swapTodayExercises(i, j) {
    const list = workouts[selectedDate].exercises;
    const temp = list[i];
    list[i] = list[j];
    list[j] = temp;
    saveToStorage(STORAGE_WORKOUTS, workouts);
    renderReorderTodayList();
    renderWorkoutView();
  }

  function moveTodayExercise(fromIdx, toIdx) {
    const list = workouts[selectedDate].exercises;
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= list.length || toIdx >= list.length) return;
    triggerHaptic('light');
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    saveToStorage(STORAGE_WORKOUTS, workouts);
    renderReorderTodayList();
    renderWorkoutView();
  }

  // Render list of Split routines (Push, Pull, Legs, etc.)
  function renderReorderSplitsList() {
    if (!reorderSplitsList) return;
    reorderSplitsList.innerHTML = '';
    const availableSplits = Object.keys(splits);

    availableSplits.forEach((splitName, idx) => {
      const item = document.createElement('div');
      item.className = 'reorder-item';
      item.dataset.index = idx;
      item.draggable = true;

      const count = splits[splitName] ? splits[splitName].length : 0;
      item.innerHTML = `
        <div class="reorder-item-left">
          <span class="reorder-drag-handle" title="Drag to reorder">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
          </span>
          <span class="reorder-pos-badge">${idx + 1}</span>
          <div class="reorder-item-info">
            <div class="reorder-item-name">${escapeHTML(splitName)}</div>
            <div class="reorder-item-sub">${count} default exercise${count > 1 ? 's' : ''}</div>
          </div>
        </div>
        <div class="reorder-item-steppers">
          <button class="btn-reorder-step" data-action="split-move-up" data-index="${idx}" ${idx === 0 ? 'disabled' : ''} aria-label="Move Up">▲</button>
          <button class="btn-reorder-step" data-action="split-move-down" data-index="${idx}" ${idx === availableSplits.length - 1 ? 'disabled' : ''} aria-label="Move Down">▼</button>
        </div>
      `;

      const btnUp = item.querySelector('[data-action="split-move-up"]');
      const btnDown = item.querySelector('[data-action="split-move-down"]');

      if (btnUp) {
        btnUp.addEventListener('click', (e) => {
          e.stopPropagation();
          if (idx > 0) {
            triggerHaptic('light');
            reorderSplits(idx, idx - 1);
          }
        });
      }

      if (btnDown) {
        btnDown.addEventListener('click', (e) => {
          e.stopPropagation();
          if (idx < availableSplits.length - 1) {
            triggerHaptic('light');
            reorderSplits(idx, idx + 1);
          }
        });
      }

      reorderSplitsList.appendChild(item);
    });

    setupReorderDragAndDrop(reorderSplitsList, (fromIdx, toIdx) => {
      reorderSplits(fromIdx, toIdx);
    });
  }

  function reorderSplits(fromIdx, toIdx) {
    const keys = Object.keys(splits);
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= keys.length || toIdx >= keys.length || fromIdx === toIdx) return;
    triggerHaptic('light');
    const [movedKey] = keys.splice(fromIdx, 1);
    keys.splice(toIdx, 0, movedKey);

    const newSplits = {};
    keys.forEach(k => {
      newSplits[k] = splits[k];
    });
    splits = newSplits;
    saveToStorage(STORAGE_SPLITS, splits);
    renderSplitPills();
    renderReorderSplitsList();
  }

  // Unified drag-and-drop supporting both Mouse/Desktop and Mobile Touch
  function setupReorderDragAndDrop(container, onReorder) {
    let draggedItem = null;
    let fromIndex = -1;

    const items = Array.from(container.querySelectorAll('.reorder-item'));

    items.forEach(item => {
      // --- Desktop / Pointer Drag ---
      item.addEventListener('dragstart', (e) => {
        draggedItem = item;
        fromIndex = parseInt(item.dataset.index, 10);
        item.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', fromIndex);
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const target = e.currentTarget;
        if (target && target !== draggedItem) {
          items.forEach(el => el.classList.remove('drop-target-above', 'drop-target-below'));
          const rect = target.getBoundingClientRect();
          if (e.clientY < rect.top + rect.height / 2) {
            target.classList.add('drop-target-above');
          } else {
            target.classList.add('drop-target-below');
          }
        }
      });

      item.addEventListener('dragleave', (e) => {
        e.currentTarget.classList.remove('drop-target-above', 'drop-target-below');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const target = e.currentTarget;
        target.classList.remove('drop-target-above', 'drop-target-below');
        if (draggedItem && target && draggedItem !== target) {
          const toIndex = parseInt(target.dataset.index, 10);
          onReorder(fromIndex, toIndex);
        }
      });

      item.addEventListener('dragend', () => {
        if (draggedItem) draggedItem.classList.remove('is-dragging');
        items.forEach(el => el.classList.remove('drop-target-above', 'drop-target-below'));
        draggedItem = null;
      });

      // --- Mobile Touch Drag on the Handle ---
      const handle = item.querySelector('.reorder-drag-handle');
      if (handle) {
        handle.addEventListener('touchstart', (e) => {
          if (e.touches.length !== 1) return;
          draggedItem = item;
          fromIndex = parseInt(item.dataset.index, 10);
          item.classList.add('is-dragging');
        }, { passive: false });

        handle.addEventListener('touchmove', (e) => {
          if (!draggedItem) return;
          if (e.cancelable) e.preventDefault(); // Prevents page scrolling while dragging!

          const touchY = e.touches[0].clientY;
          const currentItems = Array.from(container.querySelectorAll('.reorder-item'));

          currentItems.forEach(el => el.classList.remove('drop-target-above', 'drop-target-below'));

          for (let it of currentItems) {
            if (it === draggedItem) continue;
            const rect = it.getBoundingClientRect();
            if (touchY >= rect.top && touchY <= rect.bottom) {
              if (touchY < rect.top + rect.height / 2) {
                it.classList.add('drop-target-above');
              } else {
                it.classList.add('drop-target-below');
              }
              break;
            }
          }
        }, { passive: false });

        handle.addEventListener('touchend', (e) => {
          if (!draggedItem) return;
          draggedItem.classList.remove('is-dragging');

          const touchY = (e.changedTouches && e.changedTouches.length) ? e.changedTouches[0].clientY : 0;
          const currentItems = Array.from(container.querySelectorAll('.reorder-item'));

          let targetIndex = fromIndex;

          for (let it of currentItems) {
            const rect = it.getBoundingClientRect();
            if (touchY >= rect.top && touchY <= rect.bottom) {
              targetIndex = parseInt(it.dataset.index, 10);
              break;
            }
          }

          if (currentItems.length > 0) {
            const firstRect = currentItems[0].getBoundingClientRect();
            const lastRect = currentItems[currentItems.length - 1].getBoundingClientRect();
            if (touchY < firstRect.top) targetIndex = 0;
            if (touchY > lastRect.bottom) targetIndex = currentItems.length - 1;
          }

          currentItems.forEach(el => el.classList.remove('drop-target-above', 'drop-target-below'));
          draggedItem = null;

          if (targetIndex !== fromIndex && targetIndex >= 0) {
            onReorder(fromIndex, targetIndex);
          }
        });

        handle.addEventListener('touchcancel', () => {
          if (draggedItem) {
            draggedItem.classList.remove('is-dragging');
            draggedItem = null;
          }
          container.querySelectorAll('.reorder-item').forEach(el => el.classList.remove('drop-target-above', 'drop-target-below'));
        });
      }
    });
  }

  // --- Initialize App ---
  const btnResetAllData = document.getElementById('btn-reset-all-data');
  if (btnResetAllData) {
    btnResetAllData.addEventListener('click', () => {
      if (confirm("Reset all workouts, body weight logs, and history on this device? This will give you a completely clean, fresh app.")) {
        triggerHaptic('alarm');
        workouts = {};
        bodyWeights = {};
        saveToStorage(STORAGE_WORKOUTS, workouts);
        saveToStorage(STORAGE_WEIGHTS, bodyWeights);
        localStorage.setItem('liftsetgo_seeded_v1', 'true');
        localStorage.setItem('liftsetgo_mock_purged_v2', 'true');
        modalNotepad.classList.add('hidden');
        renderSplitPills();
        renderWorkoutView();
        showToast("App reset successfully to clean state! 🧼");
      }
    });
  }

  const btnClearToday = document.getElementById('btn-clear-today');
  if (btnClearToday) {
    btnClearToday.addEventListener('click', () => {
      const todayWorkout = workouts[selectedDate];
      if (!todayWorkout || !todayWorkout.exercises || todayWorkout.exercises.length === 0) {
        showToast("Today's workout is already empty");
        return;
      }
      if (confirm("Clear all exercises for today?")) {
        triggerHaptic('light');
        todayWorkout.exercises = [];
        workouts[selectedDate] = todayWorkout;
        saveToStorage(STORAGE_WORKOUTS, workouts);
        renderWorkoutView();
        showToast("Cleared exercises for today");
      }
    });
  }

  btnWakeLock.addEventListener('click', toggleWakeLock);

  renderSplitPills();
  renderWorkoutView();

  // --- PWA Installation Handler ---
  let deferredInstallPrompt = null;
  const btnInstallPwa = document.getElementById('btn-install-pwa');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  if (!isStandalone && btnInstallPwa) {
    btnInstallPwa.classList.remove('hidden');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      btnInstallPwa.classList.remove('hidden');
    });

    btnInstallPwa.addEventListener('click', async () => {
      triggerHaptic('light');
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast("Installing Lift Set Go... 🚀");
          btnInstallPwa.classList.add('hidden');
        }
        deferredInstallPrompt = null;
      } else {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
          alert("To install on iPhone:\n1. Open in Safari\n2. Tap Share (⎋ at bottom)\n3. Tap 'Add to Home Screen'");
        } else {
          showToast("Tap browser menu (⋮) -> 'Install App' or 'Add to Home Screen'");
        }
      }
    });

    window.addEventListener('appinstalled', () => {
      showToast("Lift Set Go installed successfully! 🎉");
      btnInstallPwa.classList.add('hidden');
      deferredInstallPrompt = null;
    });
  }

  // Register PWA Service Worker if supported
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).then(reg => {
        reg.update();
        console.log('Lift Set Go ServiceWorker registered:', reg.scope);
      }).catch(err => {
        console.log('Lift Set Go ServiceWorker registration failed:', err);
      });
    });
  }

})();
