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

  // Wake Lock Sentinel
  let wakeLock = null;

  // Audio Context for Chimes
  let audioCtx = null;

  // Seed sample initial data if completely empty so user has instant context
  seedInitialSampleData();

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

  // --- Seed Initial Sample Data ---
  function seedInitialSampleData() {
    if (Object.keys(workouts).length === 0) {
      const pastDate1 = new Date();
      pastDate1.setDate(pastDate1.getDate() - 3);
      const pastKey1 = formatDateKey(pastDate1);

      workouts[pastKey1] = {
        split: "Push",
        exercises: [
          {
            name: "Barbell Bench Press",
            sets: [
              { weight: 70, reps: 10, isPR: false },
              { weight: 75, reps: 8, isPR: false },
              { weight: 75, reps: 7, isPR: false }
            ]
          },
          {
            name: "Incline Dumbbell Press",
            sets: [
              { weight: 24, reps: 10, isPR: false },
              { weight: 26, reps: 8, isPR: false }
            ]
          },
          {
            name: "Lateral Raise",
            sets: [
              { weight: 10, reps: 12, isPR: false },
              { weight: 10, reps: 12, isPR: false }
            ]
          }
        ]
      };

      bodyWeights[pastKey1] = 74.8;
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = formatDateKey(yesterday);
      bodyWeights[yKey] = 74.4;

      saveToStorage(STORAGE_WORKOUTS, workouts);
      saveToStorage(STORAGE_WEIGHTS, bodyWeights);
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
      ghostWeight: ghostWeight || 50,
      ghostReps: ghostReps || 8,
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
    const todayWorkout = workouts[selectedDate] || { split: currentSplit, exercises: [] };
    exercisesListContainer.innerHTML = '';

    // If no exercises recorded yet for today, pre-populate from the split template
    let exercisesToRender = todayWorkout.exercises;
    if ((!exercisesToRender || exercisesToRender.length === 0) && splits[currentSplit]) {
      // Build empty exercise shells from the routine template
      exercisesToRender = splits[currentSplit].map(name => ({
        name: name,
        sets: []
      }));
      todayWorkout.exercises = exercisesToRender;
      workouts[selectedDate] = todayWorkout;
      saveToStorage(STORAGE_WORKOUTS, workouts);
    }

    if (exercisesToRender.length === 0) {
      exercisesListContainer.innerHTML = `
        <div style="text-align: center; padding: 32px 16px; color: var(--text-dim);">
          <p>No exercises in this split yet.</p>
          <p style="font-size: 0.8rem; margin-top: 4px;">Tap "+ Add Exercise to Today" below.</p>
        </div>
      `;
      return;
    }

    exercisesToRender.forEach((ex, exIndex) => {
      const bench = getPreviousBestOrLast(ex.name, selectedDate);
      const card = createExerciseCardElement(ex, exIndex, bench);
      exercisesListContainer.appendChild(card);
    });
  }

  // --- Create Single Exercise Card Element ---
  function createExerciseCardElement(ex, exIndex, bench) {
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
    let defaultWeight = bench.ghostWeight;
    let defaultReps = bench.ghostReps;

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
            <span class="set-progress-pill ${isComplete ? 'complete' : ''}">${currentSetCount}/${MAX_SETS_PER_EXERCISE} Sets</span>
          </div>
          <div class="exercise-last-bench">${benchText}</div>
        </div>
        <button class="btn-card-menu" title="Remove Exercise" data-action="delete-ex">✕</button>
      </div>

      <!-- Quick 1-Tap & Stepper Matrix -->
      <div class="fast-input-matrix ${isComplete ? 'is-complete' : ''}">
        <div class="matrix-inputs-row">
          
          <!-- Weight Input & Steppers -->
          <div class="input-block">
            <span class="input-label">Weight (kg)</span>
            <div class="input-with-steppers">
              <input type="number" step="0.5" class="num-input ex-weight-input" value="${defaultWeight}" ${isComplete ? 'disabled' : ''}>
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
              <input type="number" step="1" class="num-input ex-reps-input" value="${defaultReps}" ${isComplete ? 'disabled' : ''}>
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
            All 4 Sets Completed ✓
          </button>
        ` : `
          <button class="btn-log-set" data-action="log-set">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            Log Set ${currentSetCount + 1} / ${MAX_SETS_PER_EXERCISE}
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
          showToast(`🎉 All 4 sets complete for ${ex.name}!`);
        } else if (isPR) {
          triggerHaptic('success');
          showToast(`🔥 NEW PR! ${weight}kg × ${reps} reps!`);
        } else {
          triggerHaptic('light');
          showToast(`Set ${ex.sets.length} / ${MAX_SETS_PER_EXERCISE} logged! (${weight}kg × ${reps})`);
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

  // --- Floating Rest Timer Controller ---
  function startRestTimer(exerciseName) {
    restTimeRemaining = settings.defaultRestSec || 90;
    restTotalDuration = restTimeRemaining;

    timerExerciseName.textContent = exerciseName || "Rest Interval";
    restTimerDock.classList.remove('hidden');

    clearInterval(restTimerInterval);
    updateTimerDisplay();

    restTimerInterval = setInterval(() => {
      restTimeRemaining--;
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
    timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // SVG dashoffset calculation: circumference = 2 * PI * 18 ~= 113.1
    const circumference = 113.1;
    const progress = (restTimeRemaining / restTotalDuration);
    const offset = circumference * (1 - progress);
    timerBar.style.strokeDashoffset = offset;
  }

  function onRestTimerFinished() {
    playChime();
    triggerHaptic('alarm');
    showToast("Rest Over! Time to lift 💪");
    restTimerDock.classList.add('hidden');
  }

  btnTimerPlus30.addEventListener('click', () => {
    triggerHaptic('light');
    restTimeRemaining += 30;
    restTotalDuration += 30;
    updateTimerDisplay();
  });

  btnTimerDismiss.addEventListener('click', () => {
    triggerHaptic('light');
    clearInterval(restTimerInterval);
    restTimerInterval = null;
    restTimerDock.classList.add('hidden');
  });

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
      }
    });
  });

  // --- Tab 2: Render History ---
  function renderHistoryTab() {
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
        <div style="text-align: center; padding: 40px 16px; color: var(--text-dim);">
          <p>No completed workouts found yet.</p>
          <p style="font-size: 0.8rem; margin-top: 4px;">Log a set on the Workout tab to build your streak!</p>
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

  // Modal tab switching
  const modalTabs = document.querySelectorAll('.modal-tab');
  modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      triggerHaptic('light');
      modalTabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.modal-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.modaltab).classList.add('active');
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

  // --- Initialize App ---
  btnWakeLock.addEventListener('click', toggleWakeLock);

  renderSplitPills();
  renderWorkoutView();

  // Register PWA Service Worker if supported
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(reg => {
        reg.update();
        console.log('Lift Set Go ServiceWorker registered:', reg.scope);
      }).catch(err => {
        console.log('Lift Set Go ServiceWorker registration failed:', err);
      });
    });
  }

})();
