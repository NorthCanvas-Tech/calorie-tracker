/**
 * CalorieTrack — Pure Vanilla JavaScript
 * Zero external libraries, persistent localStorage, full date navigation,
 * custom nutrition targets, and macro breakdown.
 */

(function () {
  'use strict';

  // --- Constants & Defaults ---
  const STORAGE_KEY = 'calorietrack_store_v2';
  const RING_CIRCUMFERENCE = 2 * Math.PI * 74; // ~464.955px for r=74

  const DEFAULT_GOALS = {
    calories: 2000,
    protein: 140,
    carbs: 220,
    fat: 65,
  };

  // Seed data for first-time visitors
  const INITIAL_SEED_ITEMS = [
    {
      id: 'seed-1',
      name: 'Oatmeal with Blueberries & Honey',
      meal: 'breakfast',
      calories: 340,
      protein: 11,
      carbs: 62,
      fat: 5.5,
      timestamp: Date.now() - 1000 * 60 * 180,
    },
    {
      id: 'seed-2',
      name: 'Black Coffee with Splash of Oat Milk',
      meal: 'breakfast',
      calories: 35,
      protein: 0.5,
      carbs: 4,
      fat: 1.5,
      timestamp: Date.now() - 1000 * 60 * 170,
    },
    {
      id: 'seed-3',
      name: 'Grilled Chicken Salad with Olive Oil',
      meal: 'lunch',
      calories: 460,
      protein: 42,
      carbs: 14,
      fat: 26,
      timestamp: Date.now() - 1000 * 60 * 60,
    },
  ];

  // --- State ---
  let state = {
    currentDate: getTodayString(),
    goals: { ...DEFAULT_GOALS },
    logs: {}, // Format: { "YYYY-MM-DD": [ { id, name, meal, calories, protein, carbs, fat, timestamp } ] }
  };

  // --- DOM Elements ---
  const activeDateInput = document.getElementById('active-date-input');
  const dateLabel = document.getElementById('date-label');
  const prevDateBtn = document.getElementById('prev-date-btn');
  const nextDateBtn = document.getElementById('next-date-btn');
  const todayBtn = document.getElementById('today-btn');

  // Summary elements
  const calorieProgressBar = document.getElementById('calorie-progress-bar');
  const caloriesRemainingVal = document.getElementById('calories-remaining-val');
  const caloriesRemainingLabel = document.getElementById('calories-remaining-label');
  const calorieStatusPill = document.getElementById('calorie-status-pill');
  const goalCaloriesDisplay = document.getElementById('goal-calories-display');
  const consumedCaloriesDisplay = document.getElementById('consumed-calories-display');
  const netRemainingDisplay = document.getElementById('net-remaining-display');

  // Macros
  const consumedProtein = document.getElementById('consumed-protein');
  const goalProtein = document.getElementById('goal-protein');
  const barProtein = document.getElementById('bar-protein');

  const consumedCarbs = document.getElementById('consumed-carbs');
  const goalCarbs = document.getElementById('goal-carbs');
  const barCarbs = document.getElementById('bar-carbs');

  const consumedFat = document.getElementById('consumed-fat');
  const goalFat = document.getElementById('goal-fat');
  const barFat = document.getElementById('bar-fat');

  // Food Form
  const foodForm = document.getElementById('food-form');
  const foodNameInput = document.getElementById('food-name-input');
  const foodMealSelect = document.getElementById('food-meal-select');
  const foodCaloriesInput = document.getElementById('food-calories-input');
  const foodProteinInput = document.getElementById('food-protein-input');
  const foodCarbsInput = document.getElementById('food-carbs-input');
  const foodFatInput = document.getElementById('food-fat-input');
  const presetChipsContainer = document.querySelector('.preset-chips');

  // Meals lists & counters
  const clearDayBtn = document.getElementById('clear-day-btn');
  const mealSections = {
    breakfast: {
      list: document.getElementById('list-breakfast'),
      count: document.getElementById('count-breakfast'),
      cals: document.getElementById('cals-breakfast'),
    },
    lunch: {
      list: document.getElementById('list-lunch'),
      count: document.getElementById('count-lunch'),
      cals: document.getElementById('cals-lunch'),
    },
    dinner: {
      list: document.getElementById('list-dinner'),
      count: document.getElementById('count-dinner'),
      cals: document.getElementById('cals-dinner'),
    },
    snacks: {
      list: document.getElementById('list-snacks'),
      count: document.getElementById('count-snacks'),
      cals: document.getElementById('cals-snacks'),
    },
  };

  // Goals Modal elements
  const goalsModal = document.getElementById('goals-modal');
  const openGoalsBtn = document.getElementById('open-goals-btn');
  const closeGoalsModalBtn = document.getElementById('close-goals-modal-btn');
  const cancelGoalsBtn = document.getElementById('cancel-goals-btn');
  const goalsForm = document.getElementById('goals-form');
  const goalCalInput = document.getElementById('goal-cal-input');
  const goalPInput = document.getElementById('goal-p-input');
  const goalCInput = document.getElementById('goal-c-input');
  const goalFInput = document.getElementById('goal-f-input');
  const macroCaloriesCalc = document.getElementById('macro-calories-calc');
  const resetDefaultsBtn = document.getElementById('reset-defaults-btn');
  const factoryResetBtn = document.getElementById('factory-reset-btn');

  // Toast
  const toastEl = document.getElementById('toast');
  let toastTimeout = null;

  // --- Helper Functions ---

  function getTodayString() {
    const today = new Date();
    return formatDateString(today);
  }

  function formatDateString(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDateString(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatRelativeDate(dateStr) {
    const todayStr = getTodayString();
    if (dateStr === todayStr) return 'Today';

    const targetDate = parseDateString(dateStr);
    const todayDate = parseDateString(todayStr);
    const diffDays = Math.round((targetDate - todayDate) / (1000 * 60 * 60 * 24));

    if (diffDays === -1) return 'Yesterday';
    if (diffDays === 1) return 'Tomorrow';

    return targetDate.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  // --- Storage ---

  function loadState() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (serialized) {
        const parsed = JSON.parse(serialized);
        if (parsed && typeof parsed === 'object') {
          state.goals = { ...DEFAULT_GOALS, ...(parsed.goals || {}) };
          state.logs = parsed.logs || {};
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to parse saved state from localStorage:', err);
    }

    // First time initializing
    state.goals = { ...DEFAULT_GOALS };
    const todayStr = getTodayString();
    state.logs = {
      [todayStr]: [...INITIAL_SEED_ITEMS],
    };
    saveState();
  }

  function saveState() {
    try {
      const payload = {
        goals: state.goals,
        logs: state.logs,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.error('Failed to save state to localStorage:', err);
      showToast('⚠️ Storage error: Could not save data locally');
    }
  }

  // --- UI Toast ---

  function showToast(message) {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    toastTimeout = setTimeout(() => {
      toastEl.classList.add('hidden');
    }, 2800);
  }

  // --- Calculations & Rendering ---

  function render() {
    // 1. Update Date Navigator
    activeDateInput.value = state.currentDate;
    dateLabel.textContent = formatRelativeDate(state.currentDate);

    // 2. Fetch foods for active date
    const dayEntries = state.logs[state.currentDate] || [];

    // 3. Totals
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    const mealBuckets = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: [],
    };

    dayEntries.forEach((item) => {
      totalCalories += Number(item.calories) || 0;
      totalProtein += Number(item.protein) || 0;
      totalCarbs += Number(item.carbs) || 0;
      totalFat += Number(item.fat) || 0;

      const category = item.meal in mealBuckets ? item.meal : 'snacks';
      mealBuckets[category].push(item);
    });

    // 4. Update Summary Gauge
    const calorieGoal = Number(state.goals.calories) || 2000;
    const remainingCals = calorieGoal - totalCalories;

    goalCaloriesDisplay.textContent = `${calorieGoal.toLocaleString()} kcal`;
    consumedCaloriesDisplay.textContent = `${totalCalories.toLocaleString()} kcal`;

    if (remainingCals >= 0) {
      caloriesRemainingVal.textContent = remainingCals.toLocaleString();
      caloriesRemainingVal.style.color = '#0f172a';
      caloriesRemainingLabel.textContent = 'kcal remaining';
      netRemainingDisplay.textContent = `${remainingCals.toLocaleString()} kcal`;
      netRemainingDisplay.style.color = '#059669';

      calorieStatusPill.className = 'pill pill-safe';
      calorieStatusPill.textContent = 'On Track';

      // SVG Ring Stroke Calculation
      const fraction = Math.min(1, Math.max(0, totalCalories / calorieGoal));
      const offset = RING_CIRCUMFERENCE * (1 - fraction);
      calorieProgressBar.style.strokeDashoffset = offset;
      calorieProgressBar.style.stroke = '#10b981';
    } else {
      const overCals = Math.abs(remainingCals);
      caloriesRemainingVal.textContent = `+${overCals.toLocaleString()}`;
      caloriesRemainingVal.style.color = '#dc2626';
      caloriesRemainingLabel.textContent = 'kcal over goal';
      netRemainingDisplay.textContent = `-${overCals.toLocaleString()} kcal`;
      netRemainingDisplay.style.color = '#dc2626';

      calorieStatusPill.className = 'pill pill-danger';
      calorieStatusPill.textContent = 'Over Target';

      calorieProgressBar.style.strokeDashoffset = 0;
      calorieProgressBar.style.stroke = '#ef4444';
    }

    // 5. Update Macro Bars
    const pGoal = Number(state.goals.protein) || 140;
    const cGoal = Number(state.goals.carbs) || 220;
    const fGoal = Number(state.goals.fat) || 65;

    consumedProtein.textContent = Math.round(totalProtein * 10) / 10;
    goalProtein.textContent = pGoal;
    const pPct = Math.min(100, (totalProtein / pGoal) * 100);
    barProtein.style.width = `${pPct}%`;

    consumedCarbs.textContent = Math.round(totalCarbs * 10) / 10;
    goalCarbs.textContent = cGoal;
    const cPct = Math.min(100, (totalCarbs / cGoal) * 100);
    barCarbs.style.width = `${cPct}%`;

    consumedFat.textContent = Math.round(totalFat * 10) / 10;
    goalFat.textContent = fGoal;
    const fPct = Math.min(100, (totalFat / fGoal) * 100);
    barFat.style.width = `${fPct}%`;

    // 6. Render Meal Buckets
    ['breakfast', 'lunch', 'dinner', 'snacks'].forEach((mealKey) => {
      const bucket = mealBuckets[mealKey];
      const targetDom = mealSections[mealKey];

      const mealCals = bucket.reduce((acc, curr) => acc + (Number(curr.calories) || 0), 0);
      targetDom.cals.textContent = mealCals.toLocaleString();
      targetDom.count.textContent = `${bucket.length} ${bucket.length === 1 ? 'item' : 'items'}`;

      if (bucket.length === 0) {
        targetDom.list.innerHTML = `<li class="empty-placeholder">No ${mealKey} logged yet</li>`;
      } else {
        targetDom.list.innerHTML = '';
        bucket.forEach((food) => {
          const li = document.createElement('li');
          li.className = 'food-item';

          const hasMacros = (food.protein > 0 || food.carbs > 0 || food.fat > 0);
          const macroHTML = hasMacros
            ? `<div class="food-item-macros">
                 ${food.protein ? `<span class="macro-tag-p">P: ${food.protein}g</span>` : ''}
                 ${food.carbs ? `<span class="macro-tag-c">C: ${food.carbs}g</span>` : ''}
                 ${food.fat ? `<span class="macro-tag-f">F: ${food.fat}g</span>` : ''}
               </div>`
            : '';

          li.innerHTML = `
            <div class="food-item-info">
              <span class="food-item-name" title="${escapeHtml(food.name)}">${escapeHtml(food.name)}</span>
              ${macroHTML}
            </div>
            <div class="food-item-actions">
              <span class="food-item-cals">${Number(food.calories).toLocaleString()} kcal</span>
              <button type="button" class="delete-food-btn" data-id="${food.id}" title="Remove entry">✕</button>
            </div>
          `;
          targetDom.list.appendChild(li);
        });
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Food Operations ---

  function addFoodItem({ name, meal, calories, protein, carbs, fat }) {
    if (!state.logs[state.currentDate]) {
      state.logs[state.currentDate] = [];
    }

    const newItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      meal: meal || 'lunch',
      calories: Math.round(Math.max(0, Number(calories) || 0)),
      protein: Math.round(Math.max(0, Number(protein) || 0) * 10) / 10,
      carbs: Math.round(Math.max(0, Number(carbs) || 0) * 10) / 10,
      fat: Math.round(Math.max(0, Number(fat) || 0) * 10) / 10,
      timestamp: Date.now(),
    };

    state.logs[state.currentDate].push(newItem);
    saveState();
    render();
    showToast(`Added "${newItem.name}" (${newItem.calories} kcal)`);
  }

  function deleteFoodItem(id) {
    const list = state.logs[state.currentDate];
    if (!list) return;

    const itemIndex = list.findIndex((x) => x.id === id);
    if (itemIndex > -1) {
      const removed = list.splice(itemIndex, 1)[0];
      saveState();
      render();
      showToast(`Removed "${removed.name}"`);
    }
  }

  function clearCurrentDay() {
    const list = state.logs[state.currentDate];
    if (!list || list.length === 0) {
      showToast('No entries to clear for this date.');
      return;
    }

    const confirmed = window.confirm(`Clear all ${list.length} item(s) logged for ${dateLabel.textContent}?`);
    if (confirmed) {
      state.logs[state.currentDate] = [];
      saveState();
      render();
      showToast('Cleared all foods for this day');
    }
  }

  // --- Date Navigation ---

  function shiftDate(deltaDays) {
    const current = parseDateString(state.currentDate);
    current.setDate(current.getDate() + deltaDays);
    state.currentDate = formatDateString(current);
    render();
  }

  function goToToday() {
    state.currentDate = getTodayString();
    render();
  }

  // --- Modal Logic ---

  function openGoalsModal() {
    goalCalInput.value = state.goals.calories || 2000;
    goalPInput.value = state.goals.protein || 140;
    goalCInput.value = state.goals.carbs || 220;
    goalFInput.value = state.goals.fat || 65;
    updateModalMacroEstimate();
    goalsModal.classList.remove('hidden');
  }

  function closeGoalsModal() {
    goalsModal.classList.add('hidden');
  }

  function updateModalMacroEstimate() {
    const p = Number(goalPInput.value) || 0;
    const c = Number(goalCInput.value) || 0;
    const f = Number(goalFInput.value) || 0;
    const est = (p * 4) + (c * 4) + (f * 9);
    macroCaloriesCalc.textContent = est.toLocaleString();
  }

  function handleSaveGoals(e) {
    e.preventDefault();
    const newCal = parseInt(goalCalInput.value, 10);
    const newP = parseFloat(goalPInput.value);
    const newC = parseFloat(goalCInput.value);
    const newF = parseFloat(goalFInput.value);

    if (isNaN(newCal) || newCal < 500) {
      showToast('Calorie target must be at least 500 kcal');
      return;
    }

    state.goals = {
      calories: newCal,
      protein: Math.max(0, isNaN(newP) ? 0 : newP),
      carbs: Math.max(0, isNaN(newC) ? 0 : newC),
      fat: Math.max(0, isNaN(newF) ? 0 : newF),
    };

    saveState();
    closeGoalsModal();
    render();
    showToast('Nutrition targets updated!');
  }

  function handleFactoryReset() {
    const confirmed = window.confirm(
      '⚠️ Are you sure you want to completely erase all logged meals and reset targets? This cannot be undone.'
    );
    if (confirmed) {
      localStorage.removeItem(STORAGE_KEY);
      state.goals = { ...DEFAULT_GOALS };
      state.logs = {};
      state.currentDate = getTodayString();
      closeGoalsModal();
      render();
      showToast('App has been reset to defaults.');
    }
  }

  // --- Event Listeners ---

  function setupEventListeners() {
    // Date Nav
    prevDateBtn.addEventListener('click', () => shiftDate(-1));
    nextDateBtn.addEventListener('click', () => shiftDate(1));
    todayBtn.addEventListener('click', goToToday);
    activeDateInput.addEventListener('change', (e) => {
      if (e.target.value) {
        state.currentDate = e.target.value;
        render();
      }
    });

    // Food Form Submit
    foodForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = foodNameInput.value;
      const meal = foodMealSelect.value;
      const calories = foodCaloriesInput.value;
      const protein = foodProteinInput.value;
      const carbs = foodCarbsInput.value;
      const fat = foodFatInput.value;

      if (!name.trim()) return;

      addFoodItem({ name, meal, calories, protein, carbs, fat });

      // Clean inputs while keeping current meal category
      foodNameInput.value = '';
      foodCaloriesInput.value = '';
      foodProteinInput.value = '';
      foodCarbsInput.value = '';
      foodFatInput.value = '';
      foodNameInput.focus();
    });

    // Preset Chips
    if (presetChipsContainer) {
      presetChipsContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.preset-chip');
        if (!chip) return;

        const name = chip.getAttribute('data-name');
        const cal = chip.getAttribute('data-cal');
        const p = chip.getAttribute('data-p');
        const c = chip.getAttribute('data-c');
        const f = chip.getAttribute('data-f');
        const meal = chip.getAttribute('data-meal');

        addFoodItem({
          name,
          meal,
          calories: cal,
          protein: p,
          carbs: c,
          fat: f,
        });
      });
    }

    // Delete item delegation on all meal lists
    document.querySelector('.meals-section').addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.delete-food-btn');
      if (deleteBtn) {
        const id = deleteBtn.getAttribute('data-id');
        if (id) {
          deleteFoodItem(id);
        }
      }
    });

    // Clear Day button
    clearDayBtn.addEventListener('click', clearCurrentDay);

    // Modal Triggers
    openGoalsBtn.addEventListener('click', openGoalsModal);
    closeGoalsModalBtn.addEventListener('click', closeGoalsModal);
    cancelGoalsBtn.addEventListener('click', closeGoalsModal);
    goalsForm.addEventListener('submit', handleSaveGoals);

    // Modal background click to close
    goalsModal.addEventListener('click', (e) => {
      if (e.target === goalsModal) {
        closeGoalsModal();
      }
    });

    // Modal inputs live calculation
    [goalPInput, goalCInput, goalFInput].forEach((input) => {
      input.addEventListener('input', updateModalMacroEstimate);
    });

    resetDefaultsBtn.addEventListener('click', () => {
      goalCalInput.value = DEFAULT_GOALS.calories;
      goalPInput.value = DEFAULT_GOALS.protein;
      goalCInput.value = DEFAULT_GOALS.carbs;
      goalFInput.value = DEFAULT_GOALS.fat;
      updateModalMacroEstimate();
    });

    factoryResetBtn.addEventListener('click', handleFactoryReset);

    // Keyboard Shortcuts: Escape to close modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !goalsModal.classList.contains('hidden')) {
        closeGoalsModal();
      }
    });
  }

  // --- Initialize App ---
  function init() {
    loadState();
    setupEventListeners();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
