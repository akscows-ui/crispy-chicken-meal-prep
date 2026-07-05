/* ===================================================
   CRISPY CHICKEN MEAL PREP PWA — APP LOGIC
   =================================================== */

'use strict';

const STORAGE_KEY = 'chickenPrep_v2';

let state = {
  steps: {},
  ingredients: {},
  timer: { remaining: 0, running: false }
};

let timerInterval = null;

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch(e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state.steps       = saved.steps       || {};
      state.ingredients = saved.ingredients || {};
      state.timer = { remaining: 0, running: false };
    }
  } catch(e) {}
}

function initTabs() {
  const tabs   = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected','true');
      document.getElementById('tab-' + target).classList.add('active');
    });
  });
}

function initIngredients() {
  document.querySelectorAll('.ingredient-list li').forEach(li => {
    const cb  = li.querySelector('input[type="checkbox"]');
    const key = li.dataset.ing;
    if (!key) return;
    if (state.ingredients[key]) { cb.checked = true; li.classList.add('checked'); }
    cb.addEventListener('change', () => {
      state.ingredients[key] = cb.checked;
      li.classList.toggle('checked', cb.checked);
      saveState();
    });
  });
}

function initSteps() {
  document.querySelectorAll('.step-item').forEach(li => {
    const btn = li.querySelector('.step-check');
    const key = li.dataset.step;
    if (!key) return;
    if (state.steps[key]) { li.classList.add('done'); btn.textContent = '✓'; }
    btn.addEventListener('click', () => {
      const isDone = li.classList.toggle('done');
      state.steps[key] = isDone;
      btn.textContent = '✓';
      saveState();
      updateProgress();
      updateSectionBadges();
      checkCompletion();
    });
  });
  updateProgress();
  updateSectionBadges();
}

const STEP_GROUPS = {
  prep:     [...document.querySelectorAll('#steps-prep     .step-item')].map(el => el.dataset.step),
  cook:     [...document.querySelectorAll('#steps-cook     .step-item')].map(el => el.dataset.step),
  assemble: [...document.querySelectorAll('#steps-assemble .step-item')].map(el => el.dataset.step),
};

function updateProgress() {
  const allSteps = Object.values(STEP_GROUPS).flat();
  const total    = allSteps.length;
  const done     = allSteps.filter(id => state.steps[id]).length;
  const pct      = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('globalProgress').style.width = pct + '%';
  document.getElementById('progressLabel').textContent  = done + ' / ' + total + ' steps complete';
}

function updateSectionBadges() {
  const sections = { prep: 'prep-badge', cook: 'cook-badge', assemble: 'assemble-badge' };
  Object.entries(sections).forEach(([group, badgeId]) => {
    const badge = document.getElementById(badgeId);
    if (!badge) return;
    const ids  = STEP_GROUPS[group] || [];
    const done = ids.filter(id => state.steps[id]).length;
    badge.textContent = done + '/' + ids.length;
    badge.style.background = done === ids.length ? 'var(--green-lt)' : '';
    badge.style.color      = done === ids.length ? 'var(--green)'    : '';
  });
}

function initTimer() {
  const display  = document.getElementById('timerDisplay');
  const startBtn = document.getElementById('timerStart');
  const pauseBtn = document.getElementById('timerPause');
  const resetBtn2= document.getElementById('timerReset');
  const noteEl   = document.getElementById('timerNote');
  const presets  = document.querySelectorAll('.preset-btn');

  function renderTime(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    display.textContent = m + ':' + s;
  }

  function tick() {
    if (state.timer.remaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      state.timer.running = false;
      display.classList.add('finished');
      noteEl.textContent = '⏰ Time is up!';
      if ('vibrate' in navigator) navigator.vibrate([300,100,300,100,300]);
      return;
    }
    state.timer.remaining--;
    renderTime(state.timer.remaining);
  }

  presets.forEach(btn => {
    btn.addEventListener('click', () => {
      clearInterval(timerInterval);
      timerInterval = null;
      state.timer.running   = false;
      state.timer.remaining = parseInt(btn.dataset.seconds, 10);
      display.classList.remove('finished');
      renderTime(state.timer.remaining);
      presets.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      noteEl.textContent = btn.textContent + ' loaded — press Start';
    });
  });

  startBtn.addEventListener('click', () => {
    if (state.timer.running || state.timer.remaining <= 0) return;
    state.timer.running = true;
    display.classList.remove('finished');
    noteEl.textContent = '⏱ Timer running…';
    timerInterval = setInterval(tick, 1000);
  });

  pauseBtn.addEventListener('click', () => {
    if (!state.timer.running) return;
    clearInterval(timerInterval);
    timerInterval = null;
    state.timer.running = false;
    noteEl.textContent = '⏸ Paused — press Start to resume';
  });

  resetBtn2.addEventListener('click', () => {
    clearInterval(timerInterval);
    timerInterval = null;
    state.timer.running   = false;
    state.timer.remaining = 0;
    display.classList.remove('finished');
    renderTime(0);
    presets.forEach(b => b.classList.remove('active'));
    noteEl.textContent = 'Select a preset or start/pause the timer';
  });

  renderTime(0);
}

function initReset() {
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('Reset all progress? This cannot be undone.')) return;
    state = { steps: {}, ingredients: {}, timer: { remaining: 0, running: false } };
    saveState();
    document.querySelectorAll('.ingredient-list li').forEach(li => {
      const cb = li.querySelector('input[type="checkbox"]');
      if (cb) cb.checked = false;
      li.classList.remove('checked');
    });
    document.querySelectorAll('.step-item').forEach(li => {
      li.classList.remove('done');
      const btn = li.querySelector('.step-check');
      if (btn) btn.textContent = '✓';
    });
    clearInterval(timerInterval);
    timerInterval = null;
    const display = document.getElementById('timerDisplay');
    if (display) { display.textContent = '00:00'; display.classList.remove('finished'); }
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('doneCard').hidden = true;
    updateProgress();
    updateSectionBadges();
    showToast('offlineToast', '↺ Progress reset!');
  });
}

function showToast(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  if (text) el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[SW] Registered:', reg.scope))
      .catch(err => console.warn('[SW] Failed:', err));
  }
}

let deferredPrompt = null;
function initInstallBanner() {
  const banner     = document.getElementById('installBanner');
  const installBtn = document.getElementById('installBtn');
  const dismiss    = document.getElementById('dismissInstall');
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    banner.hidden = false;
  });
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    banner.hidden = true;
    if (outcome === 'accepted') showToast('onlineToast', '📲 App installed!');
  });
  dismiss.addEventListener('click', () => { banner.hidden = true; });
  window.addEventListener('appinstalled', () => {
    banner.hidden = true;
    showToast('onlineToast', '✅ App installed successfully!');
  });
}

function initNetworkStatus() {
  window.addEventListener('offline', () => showToast('offlineToast', '📴 Offline — app works fully offline!'));
  window.addEventListener('online',  () => showToast('onlineToast',  '✅ Back online!'));
}

function checkCompletion() {
  const allSteps = Object.values(STEP_GROUPS).flat();
  const allDone  = allSteps.every(id => state.steps[id]);
  const card     = document.getElementById('doneCard');
  if (card) card.hidden = !allDone;
}

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initTabs();
  initIngredients();
  initSteps();
  initTimer();
  initReset();
  initServiceWorker();
  initInstallBanner();
  initNetworkStatus();
  checkCompletion();
});
