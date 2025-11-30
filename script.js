/*
  Octopus In Action — Web Alpha (Hotfix Parity)

  Current systems:
  - Time system with configurable real-to-game minute scale
  - 09:00–17:00 work hours gating task progress
  - Tile-based town map with City Hall and simple buildings
  - Movable Mayor character with collision
  - NPC dots and greet loop: greet citizens during work hours
  - Mailbox overlay with Accept / Complete flow and rewards
  - Task progress and rewards shown in HUD
  - Basic SFX for mailbox, clicks, greet success, and task completion

  patch_manifest.json is the source of truth for:
  - Time scale
  - Asset paths
  - Mailbox task definitions
*/

"use strict";

// ===== Manifest & Global State =====
const TILE_SIZE = 48;
const GREET_RADIUS = 40;
const NPC_RADIUS = 7;
const MAYOR_BODY = "#f59e74";
const MAYOR_SUIT = "#1f2230";
const MAYOR_ACCENT = "#e35d5b";
const MAYOR_HAT = "#131722";
const MAYOR_MONOCLE = "#f3d9a4";
const MAYOR_GLOW = "rgba(243, 158, 130, 0.28)";

const npcSpeciesStyles = {
  duck: {
    body: "#f6d365",
    accent: "#f2994a",
    detail: "#f7e7b6",
  },
  beaver: {
    body: "#8c5a3c",
    accent: "#5a3c2c",
    detail: "#caa58c",
  },
  otter: {
    body: "#b28b67",
    accent: "#8a6a4d",
    detail: "#e4c9a8",
  },
  crab: {
    body: "#e15b64",
    accent: "#b73c45",
    detail: "#f5c1c5",
  },
  frog: {
    body: "#6bbf59",
    accent: "#4d8f3e",
    detail: "#d5eacb",
  },
  default: {
    body: "#c9a85a",
    accent: "#9b8547",
    detail: "#f2e0b7",
  },
};

const tilePalette = {
  grassBase: "#0d2d1c",
  grassLight: "#114025",
  pathBase: "#7b5537",
  pathWarm: "#9a6b42",
  pathEdge: "#c7924f",
  waterDeep: "#0c2436",
  waterMid: "#123750",
  waterLight: "#1b4a69",
  shoreLine: "#6db8d5",
};

const buildingPalette = {
  civicWall: "#6f86a5",
  civicRoof: "#30435a",
  civicAccent: "#d6e2ef",
  shopWall: "#9b7953",
  shopRoof: "#5e4936",
  houseWall: "#759461",
  houseRoof: "#4c5d3d",
  marketWall: "#a56b7c",
  marketRoof: "#5f3b47",
  shadow: "rgba(0, 0, 0, 0.18)",
};

const propPalette = {
  woodLight: "#c9a26a",
  woodDark: "#8a6b46",
  metal: "#b6c6cf",
  foliage: "#5fa36e",
  foliageDark: "#3d6f49",
  accent: "#d3e4ed",
  coral: "#ff8f8f",
  coralDeep: "#e26b6b",
  riverJunk: "#5c5144",
  riverJunkDark: "#3d332a",
};

const PROP_SHADOW_COLOR = "rgba(0, 0, 0, 0.22)";
const PROP_SHADOW_BLUR = 6;
const SWAY_TYPES = new Set(["lamp", "sign", "planter", "coral"]);

const fxConfig = {
  vignetteEnabled: true,
  crtEnabled: true,
  pixelGridEnabled: true,
  windSwayEnabled: true,
  mayorBounceEnabled: true,
};

const movementSmoothingMs = 12;
const hudFadeDurationMs = 140;
const shakeDefaults = { duration: 90, magnitude: 3 };
const shakeOffset = { x: 0, y: 0 };

const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,
  Space: false,
  KeyM: false,
  KeyP: false,
  KeyC: false,
};

const state = {
  manifest: null,
  timeMinutes: 8 * 60,
  day: 1,
  running: false,
  lastFrameTimestamp: null,
  loopStarted: false,
  mayor: {
    x: 384,
    y: 288,
    width: 48,
    height: 48,
    speed: 150,
    velX: 0,
    velY: 0,
    walkPhase: 0,
  },
  npcs: [],
  pendingTasks: [],
  completedTasks: [],
  currentTask: null,
  mailboxIndex: 0,
  stats: {
    budget: 0,
    goodwill: 0,
  },
  accumulatedMs: 0,
  screenShake: { remaining: 0, duration: 0, magnitude: 0 },
  controlsVisible: false,
  hudPulseTimeout: null,
  lastDeltaMs: 0,
  hudText: "",
  ui: {},
  canvas: null,
  ctx: null,
  sfx: {},
};

function normalizeTask(task) {
  return {
    id: task.id ?? "",
    title: task.title ?? "Untitled Task",
    body: task.body ?? "",
    from: task.from ?? "",
    reward: task.reward ?? 0,
    type: task.type ?? "unknown",
    goal: task.goal ?? 0,
    progress: task.progress ?? 0,
    state: task.state ?? "available",
  };
}

let msPerIngameMinute = 1000;
let gridCols = 0;
let gridRows = 0;
let worldTiles = [];
let worldTileColors = [];
let shorelineMask = [];
let groundDetails = [];
let buildings = [];
let props = [];

// ===== SFX =====
function resolveSfxPath(name) {
  const sfxEntries = state.manifest?.sfx ?? [];
  if (name === "click") {
    return sfxEntries.find((p) => p.includes("ui_click")) ?? "assets/sfx/ui_click.wav";
  }
  if (name === "mailOpen") {
    return sfxEntries.find((p) => p.includes("mail_open")) ?? "assets/sfx/mail_open.wav";
  }
  if (name === "taskComplete") {
    return (
      sfxEntries.find((p) => p.includes("task_complete")) ??
      sfxEntries.find((p) => p.includes("complete")) ??
      "assets/sfx/task_complete.wav"
    );
  }
  return null;
}

function loadSfx() {
  try {
    const clickPath = resolveSfxPath("click");
    const mailOpenPath = resolveSfxPath("mailOpen");
    const taskCompletePath = resolveSfxPath("taskComplete");

    if (clickPath) {
      state.sfx.click = new Audio(clickPath);
      state.sfx.click.volume = 0.4;
    }
    if (mailOpenPath) {
      state.sfx.mailOpen = new Audio(mailOpenPath);
      state.sfx.mailOpen.volume = 0.4;
    }
    if (taskCompletePath) {
      state.sfx.taskComplete = new Audio(taskCompletePath);
      state.sfx.taskComplete.volume = 0.5;
    }
  } catch (err) {
    console.warn("SFX load error:", err);
  }
}

function playSfx(name) {
  const audio = state.sfx?.[name];
  if (!audio) return;
  try {
    audio.currentTime = 0;
    audio.play();
  } catch (err) {
    // ignore playback issues for now
  }
}

// ===== Manifest Loading =====
async function loadManifest() {
  try {
    const response = await fetch("patch_manifest.json");
    if (!response.ok) {
      throw new Error(`Failed to load manifest: ${response.status}`);
    }
    const manifest = await response.json();
    return manifest;
  } catch (err) {
    console.error("Error loading manifest", err);
    throw err;
  }
}

// ===== Time System =====
function isWorkHour(timeMinutes) {
  const hour = Math.floor(timeMinutes / 60);
  return hour >= 9 && hour <= 16;
}

function updateTime(deltaMs) {
  state.accumulatedMs += deltaMs;

  while (state.accumulatedMs >= msPerIngameMinute) {
    state.accumulatedMs -= msPerIngameMinute;
    state.timeMinutes += 1;

    if (state.timeMinutes >= 24 * 60) {
      state.day += 1;
      state.timeMinutes = 0;
    }
  }
}

// ===== HUD & UI Helpers =====
function updateHudStats() {
  if (!state.ui.stats) return;
  const totalMinutes = state.timeMinutes;
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  const formattedTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  let taskText = "Task: (none yet)";
  if (state.currentTask) {
    const t = state.currentTask;
    if (t.state === "accepted") {
      taskText = `Task: ${t.title} ${t.progress ?? 0}/${t.goal} (Accepted)`;
    } else if (t.state === "completed") {
      taskText = `Task: ${t.title} ${t.goal}/${t.goal} (Completed)`;
    } else {
      taskText = `Task: ${t.title} (Available)`;
    }
  } else if (state.pendingTasks.length > 0) {
    taskText = "Task: Available (check mailbox)";
  }

  const nextText = `Day ${state.day} — ${formattedTime} — ${taskText}`;
  if (state.hudText !== nextText) {
    state.hudText = nextText;
    state.ui.stats.textContent = nextText;

    state.ui.stats.classList.remove("hud-pulse");
    if (state.hudPulseTimeout) {
      clearTimeout(state.hudPulseTimeout);
    }
    // trigger fade-in pulse when the text changes
    void state.ui.stats.offsetWidth;
    state.ui.stats.classList.add("hud-pulse");
    state.hudPulseTimeout = window.setTimeout(() => {
      state.ui.stats?.classList.remove("hud-pulse");
      state.hudPulseTimeout = null;
    }, hudFadeDurationMs + 40);
  }
}

function updateButtonStates() {
  if (state.ui.btnStart && state.ui.btnPause) {
    state.ui.btnStart.classList.toggle("btn-active", state.running);
    state.ui.btnPause.classList.toggle("btn-active", !state.running);
  }
}

function showOverlay() {
  state.ui.overlay?.classList.remove("hidden");
  const panel = state.ui.overlayPanel;
  if (panel) {
    panel.classList.remove("pop");
    // force reflow to retrigger animation
    void panel.offsetWidth;
    panel.classList.add("pop");
  }
}

function hideOverlay() {
  state.ui.overlay?.classList.add("hidden");
}

function toggleControlsOverlay(forceVisible) {
  const target = typeof forceVisible === "boolean" ? forceVisible : !state.controlsVisible;
  state.controlsVisible = target;
  if (!state.ui.controlsOverlay) return;
  if (target && state.ui.overlay && !state.ui.overlay.classList.contains("hidden")) {
    hideOverlay();
  }
  if (target) {
    state.ui.controlsOverlay.classList.remove("hidden");
  } else {
    state.ui.controlsOverlay.classList.add("hidden");
  }
}

// ===== Tasks & Mailbox =====
function setOverlayButtons({ acceptVisible, acceptDisabled = false, completeVisible, completeDisabled = false }) {
  if (state.ui.btnAccept) {
    state.ui.btnAccept.style.display = acceptVisible ? "inline-block" : "none";
    state.ui.btnAccept.disabled = acceptDisabled;
  }
  if (state.ui.btnComplete) {
    state.ui.btnComplete.style.display = completeVisible ? "inline-block" : "none";
    state.ui.btnComplete.disabled = completeDisabled;
  }
}

function setNavVisibility(visible) {
  const displayValue = visible ? "inline-block" : "none";
  if (state.ui.btnPrevTask) state.ui.btnPrevTask.style.display = displayValue;
  if (state.ui.btnNextTask) state.ui.btnNextTask.style.display = displayValue;
}

function getMailboxTasks() {
  const tasks = [];
  if (state.currentTask) {
    tasks.push(state.currentTask);
  }
  return tasks.concat(state.pendingTasks);
}

function buildOverlayLines(task, tasksLength, note) {
  const lines = [];
  const positionLabel = tasksLength > 0 ? `Task ${state.mailboxIndex + 1} of ${tasksLength}` : "Task";
  const stateLabel = task.state ?? "available";
  let stateLine = `${positionLabel} — State: ${stateLabel}`;
  if (task === state.currentTask && task.state === "accepted") {
    stateLine += " — Currently active task.";
  } else if (task.state === "completed") {
    stateLine += " — Completed. You may accept a new task.";
  }
  lines.push(stateLine);
  lines.push(task.body ?? "");
  lines.push(`From: ${task.from}`);
  lines.push(`Reward: ${task.reward}`);
  lines.push(`Goal: ${task.goal}`);
  lines.push(`Type: ${task.type}`);
  lines.push(`Progress: ${task.progress ?? 0}/${task.goal}`);
  if (note) {
    lines.push("", note);
  }
  return lines;
}

function onPrevTaskClicked() {
  const tasks = getMailboxTasks();
  if (tasks.length <= 1) {
    playSfx("click");
    return;
  }

  const len = tasks.length;
  state.mailboxIndex = (state.mailboxIndex - 1 + len) % len;
  playSfx("click");
  openMailboxPanel("", { playSound: false });
}

function onNextTaskClicked() {
  const tasks = getMailboxTasks();
  if (tasks.length <= 1) {
    playSfx("click");
    return;
  }

  const len = tasks.length;
  state.mailboxIndex = (state.mailboxIndex + 1) % len;
  playSfx("click");
  openMailboxPanel("", { playSound: false });
}

function openMailboxPanel(note = "", options = {}) {
  const playSound = options.playSound !== false;
  toggleControlsOverlay(false);
  if (playSound) {
    playSfx("mailOpen");
  }

  const tasks = getMailboxTasks();
  if (tasks.length > 0) {
    state.mailboxIndex = Math.max(0, Math.min(state.mailboxIndex, tasks.length - 1));
  } else {
    state.mailboxIndex = 0;
  }

  const task = tasks[state.mailboxIndex] ?? null;

  if (!task) {
    if (state.ui.overlayTitle) state.ui.overlayTitle.textContent = "Mailbox";
    if (state.ui.overlayBody) state.ui.overlayBody.textContent = note || "No letters at the moment.";
    setOverlayButtons({ acceptVisible: false, completeVisible: false });
    setNavVisibility(false);
    showOverlay();
    return;
  }

  if (state.ui.overlayTitle) state.ui.overlayTitle.textContent = task.title;

  if (state.ui.overlayBody) {
    const lines = buildOverlayLines(task, tasks.length, note);
    state.ui.overlayBody.textContent = lines.join("\n");
  }

  const isActiveAccepted = state.currentTask && state.currentTask.state === "accepted";
  const taskIsPending = state.pendingTasks.some((t) => t.id === task.id);
  const acceptVisible = taskIsPending && task.state === "available";
  const acceptDisabled = Boolean(isActiveAccepted && state.currentTask?.id !== task.id);
  const completeVisible = task === state.currentTask;
  const completeDisabled = task.state !== "accepted";
  setOverlayButtons({ acceptVisible, acceptDisabled, completeVisible, completeDisabled });
  setNavVisibility(tasks.length > 1 && state.pendingTasks.length > 0);

  showOverlay();
}

function tryCompleteTask() {
  if (!state.currentTask) {
    openMailboxPanel("No active task.", { playSound: false });
    return;
  }

  if (state.currentTask.state !== "accepted") {
    openMailboxPanel("No active task is ready to complete.", { playSound: false });
    return;
  }

  const progressValue = state.currentTask.progress ?? 0;
  if (progressValue < state.currentTask.goal) {
    openMailboxPanel(
      `You haven't finished this task yet. Progress ${progressValue}/${state.currentTask.goal}.`,
      { playSound: false },
    );
    return;
  }

  state.currentTask.state = "completed";
  state.currentTask.progress = state.currentTask.goal;

  state.stats.budget += state.currentTask.reward ?? 0;
  if (!state.completedTasks.find((t) => t.id === state.currentTask.id)) {
    state.completedTasks.push({ ...state.currentTask });
  }
  openMailboxPanel("Task completed! Check your mailbox for new letters.", { playSound: false });
  playSfx("taskComplete");
  startScreenShake();
  updateHudStats();
}

function onAcceptClicked() {
  playSfx("click");
  const tasks = getMailboxTasks();
  const task = tasks[state.mailboxIndex] ?? null;

  if (!task || !state.pendingTasks.some((t) => t.id === task.id)) {
    openMailboxPanel("No available task to accept.", { playSound: false });
    return;
  }

  if (state.currentTask && state.currentTask.state === "accepted" && state.currentTask.id !== task.id) {
    openMailboxPanel("You already have an active task. Complete it before accepting another.", { playSound: false });
    return;
  }

  const replaceCompleted = state.currentTask && state.currentTask.state === "completed" && state.currentTask.id !== task.id;
  if (!state.currentTask || replaceCompleted || (state.currentTask && state.currentTask.id === task.id && state.currentTask.state !== "accepted")) {
    task.progress = task.progress ?? 0;
    task.state = "accepted";
    state.currentTask = task;
    const pendingIndex = state.pendingTasks.findIndex((t) => t.id === task.id);
    if (pendingIndex >= 0) {
      state.pendingTasks.splice(pendingIndex, 1);
    }
    state.mailboxIndex = Math.min(state.mailboxIndex, Math.max(0, state.pendingTasks.length - 1));
    updateHudStats();
    hideOverlay();
    return;
  }

  openMailboxPanel("You already have an active task. Complete it before accepting another.", { playSound: false });
}

function onCompleteClicked() {
  playSfx("click");
  tryCompleteTask();
}

function onCloseClicked() {
  playSfx("click");
  hideOverlay();
}

function onMailboxClicked() {
  openMailboxPanel();
}

// ===== Input Handling =====
function onStartClicked() {
  state.running = true;
  updateButtonStates();
  updateHudStats();
}

function onPauseClicked() {
  state.running = false;
  updateButtonStates();
  updateHudStats();
}

function onOptionsClicked() {
  window.alert("Options will be available in a later build.");
}

function onKeyDown(event) {
  if (event.code in keys) {
    keys[event.code] = true;
  }
  switch (event.code) {
    case "Space":
      event.preventDefault();
      greetAttempt();
      break;
    case "KeyM":
      event.preventDefault();
      openMailboxPanel();
      break;
    case "KeyP":
      state.running = !state.running;
      updateButtonStates();
      updateHudStats();
      break;
    case "KeyC":
      event.preventDefault();
      toggleControlsOverlay();
      break;
    case "Escape":
      if (state.controlsVisible) {
        toggleControlsOverlay(false);
      }
      break;
    default:
      break;
  }
}

function onKeyUp(event) {
  if (event.code in keys) {
    keys[event.code] = false;
  }
}

function greetAttempt() {
  if (!state.currentTask) return;
  if (state.currentTask.type !== "greet") return;
  if (state.currentTask.state !== "accepted") return;
  if (!isWorkHour(state.timeMinutes)) return;

  const mayorCenterX = state.mayor.x + state.mayor.width / 2;
  const mayorCenterY = state.mayor.y + state.mayor.height / 2;
  let found = false;
  for (const npc of state.npcs) {
    const dx = npc.x - mayorCenterX;
    const dy = npc.y - mayorCenterY;
    const distSq = dx * dx + dy * dy;
    if (distSq <= GREET_RADIUS * GREET_RADIUS) {
      found = true;
      break;
    }
  }

  if (!found) return;

  const currentProgress = state.currentTask.progress ?? 0;
  if (currentProgress >= state.currentTask.goal) {
    return;
  }

  const nextProgress = Math.min(currentProgress + 1, state.currentTask.goal);
  state.currentTask.progress = nextProgress;

  playSfx("click");
  updateHudStats();
}

// ===== World & Buildings =====
function tileNoise(row, col) {
  const n = Math.sin(row * 127.1 + col * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function seededNoise(row, col, offset = 0) {
  const n = Math.sin(row * 157.1 + col * 263.2 + offset * 37.7) * 43758.5453;
  return n - Math.floor(n);
}

function adjustBrightness(hex, factor) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const clamp = (value) => Math.min(255, Math.max(0, Math.round(value)));
  const apply = (value) => clamp(value * (1 + factor));
  const toHex = (value) => value.toString(16).padStart(2, "0");
  return `#${toHex(apply(r))}${toHex(apply(g))}${toHex(apply(b))}`;
}

function computeTileColor(tile, row, col) {
  const noise = tileNoise(row, col) - 0.5;
  if (tile === 1) {
    const base = noise > 0 ? tilePalette.pathWarm : tilePalette.pathBase;
    const warmth = noise * 0.08 + 0.1;
    return adjustBrightness(base, warmth);
  }
  if (tile === 2) {
    const depthFactor = ((row / Math.max(1, gridRows - 1)) - 0.5) * 0.08;
    const ripple = noise * 0.06;
    return adjustBrightness(tilePalette.waterMid, depthFactor + ripple);
  }
  const grassLift = noise * 0.1;
  return adjustBrightness(tilePalette.grassBase, grassLift);
}

function buildWorldTiles() {
  if (!state.canvas) return;
  gridCols = Math.floor(state.canvas.width / TILE_SIZE);
  gridRows = Math.floor(state.canvas.height / TILE_SIZE);
  worldTiles = Array.from({ length: gridRows }, () => Array.from({ length: gridCols }, () => 0));
  worldTileColors = Array.from({ length: gridRows }, () => Array.from({ length: gridCols }, () => tilePalette.grassBase));
  shorelineMask = Array.from({ length: gridRows }, () => Array.from({ length: gridCols }, () => 0));
  groundDetails = [];

  const midRow = Math.floor(gridRows / 2);
  for (let col = 0; col < gridCols; col += 1) {
    worldTiles[midRow][col] = 1;
  }

  const verticalCol = Math.floor(gridCols / 2) - 1;
  for (let row = 1; row < midRow + 2; row += 1) {
    worldTiles[row][verticalCol] = 1;
  }

  for (let row = gridRows - 2; row < gridRows; row += 1) {
    for (let col = 1; col < 3; col += 1) {
      worldTiles[row][col] = 2;
    }
  }

  for (let row = 0; row < gridRows; row += 1) {
    for (let col = 0; col < gridCols; col += 1) {
      worldTileColors[row][col] = computeTileColor(worldTiles[row][col], row, col);
      const tile = worldTiles[row][col];
      const baseNoise = tileNoise(row, col) - 0.5;
      const cx = col * TILE_SIZE + TILE_SIZE * (0.3 + seededNoise(row, col, 1) * 0.4);
      const cy = row * TILE_SIZE + TILE_SIZE * (0.3 + seededNoise(row, col, 2) * 0.4);

      if (tile === 0 && baseNoise > 0.62) {
        groundDetails.push({ type: "pebble", x: cx, y: cy, size: 2 + seededNoise(row, col, 3) * 3, alpha: 0.25 });
      } else if (tile === 0 && baseNoise < -0.55) {
        groundDetails.push({ type: "moss", x: cx, y: cy, size: 6 + seededNoise(row, col, 4) * 5, alpha: 0.18 });
      } else if (tile !== 2 && Math.abs(baseNoise) > 0.35 && Math.abs(baseNoise) < 0.5) {
        groundDetails.push({ type: "blade", x: cx, y: cy, size: 6 + seededNoise(row, col, 5) * 4, alpha: 0.28 });
      }
    }
  }

  for (let row = 0; row < gridRows; row += 1) {
    for (let col = 0; col < gridCols; col += 1) {
      if (worldTiles[row][col] !== 2) continue;

      const topWater = row > 0 && worldTiles[row - 1][col] === 2;
      const rightWater = col < gridCols - 1 && worldTiles[row][col + 1] === 2;
      const bottomWater = row < gridRows - 1 && worldTiles[row + 1][col] === 2;
      const leftWater = col > 0 && worldTiles[row][col - 1] === 2;

      let mask = 0;
      if (!topWater) mask |= 1;
      if (!rightWater) mask |= 2;
      if (!bottomWater) mask |= 4;
      if (!leftWater) mask |= 8;
      shorelineMask[row][col] = mask;
    }
  }
}

function buildBuildings() {
  buildings = [
    {
      key: "city_hall",
      x: Math.floor(gridCols / 2 - 1) * TILE_SIZE,
      y: TILE_SIZE,
      width: TILE_SIZE * 3,
      height: TILE_SIZE * 3,
      wall: buildingPalette.civicWall,
      roof: buildingPalette.civicRoof,
      accent: buildingPalette.civicAccent,
    },
    {
      key: "shop",
      x: TILE_SIZE * 2,
      y: TILE_SIZE * 2,
      width: TILE_SIZE * 2,
      height: TILE_SIZE * 2,
      wall: buildingPalette.shopWall,
      roof: buildingPalette.shopRoof,
    },
    {
      key: "house1",
      x: TILE_SIZE * 11,
      y: TILE_SIZE * 2,
      width: TILE_SIZE * 2,
      height: TILE_SIZE * 2,
      wall: buildingPalette.houseWall,
      roof: buildingPalette.houseRoof,
    },
    {
      key: "market",
      x: TILE_SIZE * 3,
      y: TILE_SIZE * 6,
      width: TILE_SIZE * 3,
      height: TILE_SIZE * 2,
      wall: buildingPalette.marketWall,
      roof: buildingPalette.marketRoof,
    },
  ];
}

function buildProps() {
  const half = TILE_SIZE / 2;
  const centerPathY = Math.floor(gridRows / 2) * TILE_SIZE + half;
  const centerPathX = Math.floor(gridCols / 2) * TILE_SIZE + half;

  props = [
    { type: "bench", x: centerPathX - TILE_SIZE * 2, y: centerPathY - half },
    { type: "bench", x: centerPathX + TILE_SIZE * 2, y: centerPathY - half },
    { type: "lamp", x: centerPathX - TILE_SIZE * 3, y: centerPathY - TILE_SIZE },
    { type: "lamp", x: centerPathX + TILE_SIZE * 3, y: centerPathY - TILE_SIZE },
    { type: "crate", x: TILE_SIZE * 3.2, y: TILE_SIZE * 7 },
    { type: "crate", x: TILE_SIZE * 3.9, y: TILE_SIZE * 7.4 },
    { type: "planter", x: TILE_SIZE * 1.5, y: TILE_SIZE * 1.2 },
    { type: "planter", x: TILE_SIZE * 11.5, y: TILE_SIZE * 1.2 },
    { type: "sign", x: TILE_SIZE * 1.4, y: TILE_SIZE * (gridRows - 2) + half * 0.4 },
    { type: "barrel", x: TILE_SIZE * 2.3, y: TILE_SIZE * (gridRows - 2) + half * 0.1 },
    { type: "barrel", x: TILE_SIZE * 2.8, y: TILE_SIZE * (gridRows - 2) + half * 0.45 },
    { type: "coral", x: TILE_SIZE * 1.2, y: TILE_SIZE * (gridRows - 2) + half * 0.2 },
    { type: "coral", x: TILE_SIZE * 2.0, y: TILE_SIZE * (gridRows - 2) - half * 0.2 },
    { type: "junk", x: TILE_SIZE * 1.6, y: TILE_SIZE * (gridRows - 1) - half * 0.3 },
    { type: "junk", x: TILE_SIZE * 2.2, y: TILE_SIZE * (gridRows - 1) - half * 0.6 },
    { type: "sign", x: TILE_SIZE * 12.6, y: TILE_SIZE * 6.2 },
  ];

  props = props.map((prop, idx) => ({ ...prop, swayPhase: seededNoise(idx, idx, 7) * Math.PI * 2 }));
  props.sort((a, b) => a.y - b.y);
}

function initNpcs() {
  const centerX = Math.floor(gridCols / 2) * TILE_SIZE + TILE_SIZE / 2;
  const pathRowY = Math.floor(gridRows / 2) * TILE_SIZE + TILE_SIZE / 2;

  state.npcs = [
    {
      id: "npc1",
      x: centerX,
      y: pathRowY,
      radius: NPC_RADIUS,
      name: "Clerk",
      species: "duck",
      bobPhase: 0,
    },
    {
      id: "npc2",
      x: Math.floor(gridCols / 2 - 2) * TILE_SIZE + TILE_SIZE / 2,
      y: TILE_SIZE * 2 + TILE_SIZE / 2,
      radius: NPC_RADIUS,
      name: "Vendor",
      species: "beaver",
      bobPhase: 0.6,
    },
    {
      id: "npc3",
      x: Math.floor(gridCols / 2 + 3) * TILE_SIZE + TILE_SIZE / 2,
      y: TILE_SIZE * 4 + TILE_SIZE / 2,
      radius: NPC_RADIUS,
      name: "Jogger",
      species: "otter",
      bobPhase: 1.2,
    },
    {
      id: "npc4",
      x: TILE_SIZE * 4 + TILE_SIZE / 2,
      y: TILE_SIZE * 5 + TILE_SIZE / 2,
      radius: NPC_RADIUS,
      name: "Fisher",
      species: "crab",
      bobPhase: 1.8,
    },
    {
      id: "npc5",
      x: TILE_SIZE * 9 + TILE_SIZE / 2,
      y: TILE_SIZE * 6 + TILE_SIZE / 2,
      radius: NPC_RADIUS,
      name: "Ranger",
      species: "frog",
      bobPhase: 2.4,
    },
  ];
}

function drawTiles() {
  if (!state.ctx) return;
  for (let row = 0; row < gridRows; row += 1) {
    for (let col = 0; col < gridCols; col += 1) {
      const tile = worldTiles[row][col];
      if (tile === 2) {
        drawWaterTile(row, col);
      } else {
        state.ctx.fillStyle = worldTileColors[row][col] ?? tilePalette.grassBase;
        state.ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        if (tile === 1) {
          state.ctx.fillStyle = tilePalette.pathEdge;
          state.ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, 4);
        }
      }
    }
  }
}

function drawGroundDetails() {
  const ctx = state.ctx;
  if (!ctx) return;
  for (const detail of groundDetails) {
    ctx.save();
    if (detail.type === "pebble") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.globalAlpha = detail.alpha ?? 0.25;
      ctx.beginPath();
      ctx.arc(detail.x, detail.y, detail.size ?? 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (detail.type === "moss") {
      ctx.fillStyle = "rgba(40, 84, 52, 0.28)";
      ctx.globalAlpha = detail.alpha ?? 0.2;
      ctx.beginPath();
      ctx.ellipse(detail.x, detail.y, (detail.size ?? 6) * 1.2, detail.size ?? 6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (detail.type === "blade") {
      ctx.strokeStyle = "rgba(129, 179, 113, 0.5)";
      ctx.lineWidth = 1;
      const len = detail.size ?? 8;
      ctx.beginPath();
      ctx.moveTo(detail.x, detail.y);
      ctx.lineTo(detail.x, detail.y - len);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawWaterTile(row, col) {
  const ctx = state.ctx;
  if (!ctx) return;
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const baseColor = worldTileColors[row][col] ?? tilePalette.waterMid;
  const time = (state.lastFrameTimestamp ?? 0) / 800;
  const waveOffset = Math.sin(time + col * 0.7 + row * 0.35) * 2;

  ctx.fillStyle = baseColor;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = tilePalette.waterLight;
  ctx.fillRect(x, y + TILE_SIZE * 0.25 + waveOffset, TILE_SIZE, 5);
  ctx.fillRect(x, y + TILE_SIZE * 0.6 - waveOffset, TILE_SIZE, 4);
  const shimmerOffset = Math.sin((state.lastFrameTimestamp ?? 0) / 700 + col * 0.4 + row * 0.2) * 3;
  ctx.fillRect(x, y + TILE_SIZE * 0.45 + shimmerOffset, TILE_SIZE, 2);
  ctx.globalAlpha = 1;

  const mask = shorelineMask[row][col] ?? 0;
  const edgeColor = tilePalette.shoreLine;
  ctx.fillStyle = edgeColor;
  const thickness = 3;
  if (mask & 1) ctx.fillRect(x, y, TILE_SIZE, thickness);
  if (mask & 4) ctx.fillRect(x, y + TILE_SIZE - thickness, TILE_SIZE, thickness);
  if (mask & 8) ctx.fillRect(x, y, thickness, TILE_SIZE);
  if (mask & 2) ctx.fillRect(x + TILE_SIZE - thickness, y, thickness, TILE_SIZE);

  ctx.restore();
}

function drawBuildings() {
  if (!state.ctx) return;
  for (const b of buildings) {
    const roofHeight = b.height * 0.28;
    const wallColor = b.wall ?? "#55636f";
    const roofColor = b.roof ?? "#38434e";
    const shadowColor = buildingPalette.shadow;
    const wallShadow = adjustBrightness(wallColor, -0.18);
    const roofHighlight = adjustBrightness(roofColor, 0.1);

    // ground shadow
    state.ctx.fillStyle = shadowColor;
    state.ctx.fillRect(b.x + 4, b.y + b.height - 6, b.width - 8, 6);

    // facade with subtle side shade
    state.ctx.fillStyle = wallColor;
    state.ctx.fillRect(b.x, b.y + roofHeight, b.width, b.height - roofHeight);
    const sideWidth = Math.max(6, b.width * 0.22);
    state.ctx.fillStyle = wallShadow;
    state.ctx.fillRect(b.x + b.width - sideWidth, b.y + roofHeight, sideWidth, b.height - roofHeight);

    // roof block and highlight
    state.ctx.fillStyle = roofColor;
    state.ctx.fillRect(b.x, b.y, b.width, roofHeight);
    state.ctx.fillStyle = roofHighlight;
    state.ctx.fillRect(b.x + 2, b.y + 2, b.width - 4, 4);

    // subtle outline
    state.ctx.strokeStyle = adjustBrightness(wallColor, -0.35);
    state.ctx.lineWidth = 1.5;
    state.ctx.strokeRect(b.x - 1, b.y + roofHeight - 1, b.width + 2, b.height - roofHeight + 2);

    // doorway band
    const doorWidth = Math.max(10, b.width * 0.14);
    const doorHeight = Math.max(14, b.height * 0.18);
    state.ctx.fillStyle = adjustBrightness(wallColor, -0.25);
    state.ctx.fillRect(b.x + b.width / 2 - doorWidth / 2, b.y + b.height - doorHeight, doorWidth, doorHeight);
    state.ctx.fillStyle = adjustBrightness(wallColor, 0.2);
    state.ctx.fillRect(b.x + b.width / 2 - doorWidth / 2 + 4, b.y + b.height - doorHeight + 6, 4, 6);

    // windows
    const windowSize = Math.max(10, b.width * 0.18);
    const windowY = b.y + roofHeight + 8;
    state.ctx.fillStyle = adjustBrightness(wallColor, 0.28);
    state.ctx.fillRect(b.x + 8, windowY, windowSize, windowSize * 0.7);
    state.ctx.fillRect(b.x + b.width - windowSize - 8, windowY, windowSize, windowSize * 0.7);

    if (b.key === "city_hall") {
      const stripeY = b.y + roofHeight - 6;
      state.ctx.fillStyle = b.accent ?? buildingPalette.civicAccent;
      state.ctx.fillRect(b.x + 6, stripeY, b.width - 12, 4);

      state.ctx.save();
      state.ctx.globalAlpha = 0.35;
      state.ctx.fillStyle = adjustBrightness(b.accent ?? buildingPalette.civicAccent, 0.25);
      state.ctx.fillRect(b.x + 4, b.y + 4, b.width - 8, roofHeight * 0.5);
      state.ctx.restore();

      // cast shadow trapezoid
      state.ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
      state.ctx.beginPath();
      state.ctx.moveTo(b.x + b.width * 0.12, b.y + b.height);
      state.ctx.lineTo(b.x + b.width * 0.88, b.y + b.height);
      state.ctx.lineTo(b.x + b.width * 0.7, b.y + b.height + 10);
      state.ctx.lineTo(b.x + b.width * 0.3, b.y + b.height + 10);
      state.ctx.closePath();
      state.ctx.fill();

      // crest
      const crestRadius = Math.max(6, b.width * 0.12);
      const crestX = b.x + b.width / 2;
      const crestY = b.y + roofHeight + 18;
      state.ctx.beginPath();
      state.ctx.arc(crestX, crestY, crestRadius, 0, Math.PI * 2);
      state.ctx.closePath();
      state.ctx.fillStyle = adjustBrightness(b.accent ?? buildingPalette.civicAccent, -0.08);
      state.ctx.fill();
    }
  }
}

function drawBench(prop) {
  const ctx = state.ctx;
  if (!ctx) return;
  const seatWidth = TILE_SIZE * 1.2;
  const seatHeight = 8;
  const legHeight = 10;

  ctx.fillStyle = propPalette.woodLight;
  ctx.fillRect(prop.x - seatWidth / 2, prop.y - seatHeight, seatWidth, seatHeight);
  ctx.fillStyle = propPalette.woodDark;
  ctx.fillRect(prop.x - seatWidth / 2, prop.y - seatHeight - 6, seatWidth, 4);

  ctx.fillStyle = propPalette.woodDark;
  ctx.fillRect(prop.x - seatWidth / 2 + 6, prop.y - seatHeight, 4, legHeight);
  ctx.fillRect(prop.x + seatWidth / 2 - 10, prop.y - seatHeight, 4, legHeight);
}

function drawLamp(prop) {
  const ctx = state.ctx;
  if (!ctx) return;
  ctx.fillStyle = propPalette.metal;
  ctx.fillRect(prop.x - 2, prop.y - TILE_SIZE * 0.9, 4, TILE_SIZE * 0.9);
  ctx.fillRect(prop.x - 6, prop.y - TILE_SIZE * 0.95, 12, 6);

  ctx.beginPath();
  ctx.arc(prop.x, prop.y - TILE_SIZE, 8, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 235, 200, 0.35)";
  ctx.fill();
}

function drawCrate(prop) {
  const ctx = state.ctx;
  if (!ctx) return;
  const size = TILE_SIZE * 0.7;
  ctx.fillStyle = propPalette.woodDark;
  ctx.fillRect(prop.x, prop.y, size, size);
  ctx.fillStyle = propPalette.woodLight;
  ctx.fillRect(prop.x + 4, prop.y + 4, size - 8, size - 8);
  ctx.strokeStyle = propPalette.woodDark;
  ctx.lineWidth = 2;
  ctx.strokeRect(prop.x + 4, prop.y + 4, size - 8, size - 8);
}

function drawPlanter(prop) {
  const ctx = state.ctx;
  if (!ctx) return;
  const width = TILE_SIZE * 0.9;
  const height = TILE_SIZE * 0.35;
  ctx.fillStyle = propPalette.woodDark;
  ctx.fillRect(prop.x - width / 2, prop.y, width, height);
  ctx.fillStyle = propPalette.foliage;
  ctx.fillRect(prop.x - width / 2 + 4, prop.y - height * 0.5, width - 8, height);
  ctx.fillStyle = propPalette.foliageDark;
  ctx.fillRect(prop.x - width / 2 + 8, prop.y - height * 0.35, width - 16, height * 0.5);
}

function drawSign(prop) {
  const ctx = state.ctx;
  if (!ctx) return;
  const width = TILE_SIZE * 1.1;
  const height = TILE_SIZE * 0.45;
  ctx.fillStyle = propPalette.woodLight;
  ctx.fillRect(prop.x - width / 2, prop.y, width, height);
  ctx.fillStyle = propPalette.woodDark;
  ctx.fillRect(prop.x - 6, prop.y + height, 4, TILE_SIZE * 0.4);
  ctx.fillRect(prop.x + 2, prop.y + height, 4, TILE_SIZE * 0.4);
  ctx.fillStyle = propPalette.accent;
  ctx.fillRect(prop.x - width / 2 + 6, prop.y + 6, width - 12, 4);
}

function drawBarrel(prop) {
  const ctx = state.ctx;
  if (!ctx) return;
  const width = TILE_SIZE * 0.65;
  const height = TILE_SIZE * 0.7;
  const x = prop.x - width / 2;
  const y = prop.y - height;
  ctx.fillStyle = propPalette.woodDark;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = propPalette.woodLight;
  ctx.fillRect(x + 4, y + 6, width - 8, height - 12);
  ctx.fillStyle = propPalette.metal;
  ctx.fillRect(x, y + 8, width, 4);
  ctx.fillRect(x, y + height - 12, width, 4);
}

function drawCoral(prop) {
  const ctx = state.ctx;
  if (!ctx) return;
  const baseX = prop.x;
  const baseY = prop.y;
  ctx.fillStyle = propPalette.coralDeep;
  ctx.beginPath();
  ctx.arc(baseX - 6, baseY - 6, 8, 0, Math.PI * 2);
  ctx.arc(baseX + 4, baseY - 4, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = propPalette.coral;
  ctx.beginPath();
  ctx.arc(baseX - 2, baseY - 10, 6, 0, Math.PI * 2);
  ctx.arc(baseX + 8, baseY - 12, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawJunk(prop) {
  const ctx = state.ctx;
  if (!ctx) return;
  ctx.fillStyle = propPalette.riverJunk;
  ctx.fillRect(prop.x - TILE_SIZE * 0.4, prop.y - TILE_SIZE * 0.15, TILE_SIZE * 0.8, TILE_SIZE * 0.12);
  ctx.fillStyle = propPalette.riverJunkDark;
  ctx.fillRect(prop.x - TILE_SIZE * 0.2, prop.y - TILE_SIZE * 0.25, TILE_SIZE * 0.5, TILE_SIZE * 0.08);
  ctx.fillRect(prop.x - TILE_SIZE * 0.1, prop.y - TILE_SIZE * 0.35, TILE_SIZE * 0.3, TILE_SIZE * 0.06);
}

function drawPropShadow(prop) {
  const ctx = state.ctx;
  if (!ctx) return;
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.beginPath();
  ctx.ellipse(prop.x, prop.y + TILE_SIZE * 0.08, TILE_SIZE * 0.45, TILE_SIZE * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEntityShadow(cx, cy, radiusX, radiusY, alpha = 0.22) {
  const ctx = state.ctx;
  if (!ctx) return;
  const gradient = ctx.createRadialGradient(cx, cy, radiusX * 0.2, cx, cy, radiusX);
  gradient.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(cx, cy + radiusY * 0.2, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawProps() {
  if (!state.ctx) return;
  for (const prop of props) {
    drawPropShadow(prop);
    const time = (state.lastFrameTimestamp ?? 0) / 1000;
    const swayAngle = fxConfig.windSwayEnabled && SWAY_TYPES.has(prop.type)
      ? Math.sin(time * 0.8 + (prop.swayPhase ?? 0)) * (Math.PI / 180) * 4.5
      : 0;

    state.ctx.save();
    state.ctx.translate(prop.x, prop.y);
    if (swayAngle !== 0) {
      state.ctx.rotate(swayAngle);
    }
    state.ctx.translate(-prop.x, -prop.y);
    state.ctx.shadowColor = PROP_SHADOW_COLOR;
    state.ctx.shadowBlur = PROP_SHADOW_BLUR;
    state.ctx.shadowOffsetY = 2;
    switch (prop.type) {
      case "bench":
        drawBench(prop);
        break;
      case "lamp":
        drawLamp(prop);
        break;
      case "crate":
        drawCrate(prop);
        break;
      case "planter":
        drawPlanter(prop);
        break;
      case "sign":
        drawSign(prop);
        break;
      case "barrel":
        drawBarrel(prop);
        break;
      case "coral":
        drawCoral(prop);
        break;
      case "junk":
        drawJunk(prop);
        break;
      default:
        break;
    }
    state.ctx.restore();
  }
}

function drawNpcSprite(npc) {
  const style = npcSpeciesStyles[npc.species] ?? npcSpeciesStyles.default;
  const centerX = npc.x;
  const centerY = npc.y;
  const bodyRadius = npc.radius;
  const bob = Math.sin((state.lastFrameTimestamp ?? 0) / 420 + (npc.bobPhase ?? 0)) * 1.5;

  state.ctx.save();
  state.ctx.translate(0, bob);

  drawEntityShadow(centerX, centerY + npc.radius * 0.6, npc.radius * 1.1, npc.radius * 0.55, 0.22);

  // base body
  state.ctx.beginPath();
  state.ctx.arc(centerX, centerY, bodyRadius, 0, Math.PI * 2);
  state.ctx.closePath();
  state.ctx.fillStyle = style.body;
  state.ctx.fill();

  // species-specific accents
  switch (npc.species) {
    case "duck": {
      state.ctx.fillStyle = style.detail;
      state.ctx.fillRect(centerX - bodyRadius * 0.6, centerY, bodyRadius * 1.2, bodyRadius * 0.7);
      state.ctx.fillStyle = style.accent;
      state.ctx.fillRect(centerX - bodyRadius * 0.5, centerY + bodyRadius * 0.4, bodyRadius, bodyRadius * 0.3);
      break;
    }
    case "beaver": {
      state.ctx.fillStyle = style.detail;
      state.ctx.fillRect(centerX - bodyRadius * 0.6, centerY + bodyRadius * 0.1, bodyRadius * 1.2, bodyRadius * 0.6);
      state.ctx.fillStyle = style.accent;
      state.ctx.fillRect(centerX + bodyRadius * 0.7, centerY - bodyRadius * 0.3, bodyRadius * 0.6, bodyRadius * 1.1);
      break;
    }
    case "otter": {
      state.ctx.fillStyle = style.detail;
      state.ctx.fillRect(centerX - bodyRadius * 0.5, centerY + bodyRadius * 0.2, bodyRadius, bodyRadius * 0.9);
      state.ctx.fillStyle = style.accent;
      state.ctx.fillRect(centerX - bodyRadius * 0.1, centerY - bodyRadius * 0.8, bodyRadius * 0.2, bodyRadius * 0.7);
      break;
    }
    case "crab": {
      state.ctx.fillStyle = style.accent;
      state.ctx.fillRect(centerX - bodyRadius * 1.2, centerY - bodyRadius * 0.2, bodyRadius * 0.6, bodyRadius * 0.6);
      state.ctx.fillRect(centerX + bodyRadius * 0.6, centerY - bodyRadius * 0.2, bodyRadius * 0.6, bodyRadius * 0.6);
      state.ctx.fillStyle = style.detail;
      state.ctx.fillRect(centerX - bodyRadius * 0.8, centerY + bodyRadius * 0.4, bodyRadius * 1.6, bodyRadius * 0.2);
      break;
    }
    case "frog": {
      state.ctx.fillStyle = style.detail;
      state.ctx.beginPath();
      state.ctx.arc(centerX - bodyRadius * 0.45, centerY - bodyRadius * 0.7, bodyRadius * 0.35, 0, Math.PI * 2);
      state.ctx.arc(centerX + bodyRadius * 0.45, centerY - bodyRadius * 0.7, bodyRadius * 0.35, 0, Math.PI * 2);
      state.ctx.fill();
      state.ctx.fillStyle = style.accent;
      state.ctx.fillRect(centerX - bodyRadius * 0.8, centerY + bodyRadius * 0.2, bodyRadius * 1.6, bodyRadius * 0.4);
      break;
    }
    default: {
      state.ctx.fillStyle = style.accent;
      state.ctx.fillRect(centerX - bodyRadius * 0.5, centerY + bodyRadius * 0.2, bodyRadius, bodyRadius * 0.5);
    }
  }

  state.ctx.restore();
}

function drawNpcs() {
  if (!state.ctx) return;
  for (const npc of state.npcs) {
    drawNpcSprite(npc);
  }
}

function drawMayor() {
  if (!state.ctx) return;
  const centerX = state.mayor.x + state.mayor.width / 2;
  const centerY = state.mayor.y + state.mayor.height / 2;
  const isMoving = Math.hypot(state.mayor.velX, state.mayor.velY) > 2;
  const time = (state.lastFrameTimestamp ?? 0) / 1000;
  const idleBob = Math.sin((state.lastFrameTimestamp ?? 0) / 320) * 1.5;
  const bouncePhase = isMoving ? state.mayor.walkPhase : time * 0.6;
  const bounce = fxConfig.mayorBounceEnabled ? Math.sin(bouncePhase * 2) * (isMoving ? 3 : 1.5) : 0;
  const tilt = fxConfig.mayorBounceEnabled ? Math.sin(bouncePhase) * (Math.PI / 180) * 2 : 0;
  const scale = fxConfig.mayorBounceEnabled ? 1 + Math.sin(bouncePhase * 2) * (isMoving ? 0.03 : 0.015) : 1;
  const bodyRadius = state.mayor.width * 0.32;
  const glowRadius = state.mayor.width * 0.56;

  state.ctx.save();
  const baseY = centerY + bounce + idleBob;
  drawEntityShadow(centerX, baseY + state.mayor.height * 0.2, bodyRadius * 1.6, bodyRadius * 0.6, 0.24);
  state.ctx.translate(centerX, baseY);
  state.ctx.rotate(tilt);
  state.ctx.scale(scale, scale);
  state.ctx.translate(-centerX, -baseY);

  // soft glow halo
  state.ctx.beginPath();
  state.ctx.arc(centerX, baseY + 4, glowRadius, 0, Math.PI * 2);
  state.ctx.closePath();
  state.ctx.fillStyle = MAYOR_GLOW;
  state.ctx.fill();

  // body
  state.ctx.beginPath();
  state.ctx.arc(centerX, baseY, bodyRadius, 0, Math.PI * 2);
  state.ctx.closePath();
  state.ctx.fillStyle = MAYOR_BODY;
  state.ctx.fill();

  // suit jacket
  const suitHeight = bodyRadius * 1.25;
  state.ctx.fillStyle = MAYOR_SUIT;
  state.ctx.fillRect(centerX - bodyRadius, baseY, bodyRadius * 2, suitHeight);

  // tie
  state.ctx.fillStyle = MAYOR_ACCENT;
  state.ctx.beginPath();
  state.ctx.moveTo(centerX - 3, baseY + 4);
  state.ctx.lineTo(centerX + 3, baseY + 4);
  state.ctx.lineTo(centerX, baseY + 16);
  state.ctx.closePath();
  state.ctx.fill();

  // hat brim
  state.ctx.fillStyle = MAYOR_HAT;
  state.ctx.fillRect(centerX - bodyRadius * 0.9, baseY - bodyRadius * 1.2, bodyRadius * 1.8, 4);
  // hat crown
  state.ctx.fillRect(centerX - bodyRadius * 0.55, baseY - bodyRadius * 1.65, bodyRadius * 1.1, bodyRadius * 0.8);

  // monocle and eye
  state.ctx.beginPath();
  state.ctx.arc(centerX + bodyRadius * 0.35, baseY - 4, 4, 0, Math.PI * 2);
  state.ctx.closePath();
  state.ctx.strokeStyle = MAYOR_MONOCLE;
  state.ctx.lineWidth = 2;
  state.ctx.stroke();

  state.ctx.beginPath();
  state.ctx.arc(centerX + bodyRadius * 0.2, baseY - 4, 1.5, 0, Math.PI * 2);
  state.ctx.closePath();
  state.ctx.fillStyle = "#0b0b0f";
  state.ctx.fill();

  state.ctx.restore();
}

function drawEdgeVignette() {
  if (!state.ctx || !state.canvas) return;
  if (!fxConfig.vignetteEnabled) return;
  const ctx = state.ctx;
  const cx = state.canvas.width / 2;
  const cy = state.canvas.height / 2;
  const radius = Math.sqrt(cx * cx + cy * cy) * 1.2;
  const gradient = ctx.createRadialGradient(cx, cy, radius * 0.35, cx, cy, radius);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
}

function drawPixelGrid() {
  if (!state.ctx || !state.canvas || !fxConfig.pixelGridEnabled) return;
  const ctx = state.ctx;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= state.canvas.width; x += TILE_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, state.canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= state.canvas.height; y += TILE_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(state.canvas.width, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawScanlines() {
  if (!state.ctx || !state.canvas || !fxConfig.crtEnabled) return;
  const ctx = state.ctx;
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  for (let y = 0; y < state.canvas.height; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(state.canvas.width, y + 0.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  const inset = 6;
  ctx.beginPath();
  ctx.roundRect?.(inset, inset, state.canvas.width - inset * 2, state.canvas.height - inset * 2, 8);
  if (!ctx.roundRect) {
    ctx.rect(inset, inset, state.canvas.width - inset * 2, state.canvas.height - inset * 2);
  }
  ctx.stroke();
  ctx.restore();
}

function startScreenShake(duration = shakeDefaults.duration, magnitude = shakeDefaults.magnitude) {
  state.screenShake = {
    remaining: duration,
    duration,
    magnitude,
  };
}

function applyScreenShake(deltaMs) {
  if (state.screenShake.remaining <= 0) {
    shakeOffset.x = 0;
    shakeOffset.y = 0;
    return shakeOffset;
  }
  state.screenShake.remaining = Math.max(0, state.screenShake.remaining - deltaMs);
  const progress = state.screenShake.duration > 0 ? state.screenShake.remaining / state.screenShake.duration : 0;
  const amp = state.screenShake.magnitude * progress;
  shakeOffset.x = (Math.random() * 2 - 1) * amp;
  shakeOffset.y = (Math.random() * 2 - 1) * amp;
  return shakeOffset;
}

function collidesWithBuildings(x, y, width, height) {
  for (const b of buildings) {
    const overlapX = x < b.x + b.width && x + width > b.x;
    const overlapY = y < b.y + b.height && y + height > b.y;
    if (overlapX && overlapY) {
      return true;
    }
  }
  return false;
}

function updateMayor(deltaMs) {
  if (!state.canvas) return;
  const deltaSeconds = deltaMs / 1000;
  let dx = 0;
  let dy = 0;

  if (keys.ArrowUp || keys.KeyW) dy -= 1;
  if (keys.ArrowDown || keys.KeyS) dy += 1;
  if (keys.ArrowLeft || keys.KeyA) dx -= 1;
  if (keys.ArrowRight || keys.KeyD) dx += 1;

  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.sqrt(2);
    dx *= inv;
    dy *= inv;
  }

  const targetVX = dx * state.mayor.speed;
  const targetVY = dy * state.mayor.speed;
  const lerpFactor = Math.min(1, deltaMs / movementSmoothingMs);
  state.mayor.velX += (targetVX - state.mayor.velX) * lerpFactor;
  state.mayor.velY += (targetVY - state.mayor.velY) * lerpFactor;
  if (Math.abs(state.mayor.velX) < 0.05) state.mayor.velX = 0;
  if (Math.abs(state.mayor.velY) < 0.05) state.mayor.velY = 0;

  const proposedX = state.mayor.x + state.mayor.velX * deltaSeconds;
  const proposedY = state.mayor.y + state.mayor.velY * deltaSeconds;
  const minX = 0;
  const minY = 0;
  const maxX = (state.canvas?.width ?? 0) - state.mayor.width;
  const maxY = (state.canvas?.height ?? 0) - state.mayor.height;
  const clampedX = Math.min(Math.max(proposedX, minX), maxX);
  const clampedY = Math.min(Math.max(proposedY, minY), maxY);

  if (!collidesWithBuildings(clampedX, clampedY, state.mayor.width, state.mayor.height)) {
    state.mayor.x = clampedX;
    state.mayor.y = clampedY;
  }

  const movingMagnitude = Math.hypot(state.mayor.velX, state.mayor.velY);
  if (movingMagnitude > 1) {
    state.mayor.walkPhase = (state.mayor.walkPhase + deltaSeconds * 6) % (Math.PI * 2);
  }
}

// ===== Render & Game Loop =====
function render() {
  if (!state.ctx || !state.canvas) return;
  state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);

  const shakeOffset = applyScreenShake(state.lastDeltaMs);
  state.ctx.save();
  state.ctx.translate(shakeOffset.x, shakeOffset.y);

  drawTiles();
  drawGroundDetails();
  drawBuildings();
  drawProps();
  drawNpcs();
  drawMayor();
  state.ctx.restore();

  drawEdgeVignette();
  drawPixelGrid();
  drawScanlines();
}

function gameLoop(timestamp) {
  if (state.lastFrameTimestamp === null) {
    state.lastFrameTimestamp = timestamp;
    window.requestAnimationFrame(gameLoop);
    return;
  }

  const deltaMs = timestamp - state.lastFrameTimestamp;
  state.lastFrameTimestamp = timestamp;
  state.lastDeltaMs = deltaMs;

  if (state.running) {
    updateTime(deltaMs);
  }

  updateMayor(deltaMs);
  render();
  updateHudStats();

  window.requestAnimationFrame(gameLoop);
}

// ===== Initialization =====
function setupUI() {
  if (state.ui.btnStart) {
    state.ui.btnStart.addEventListener("click", onStartClicked);
  }
  if (state.ui.btnPause) {
    state.ui.btnPause.addEventListener("click", onPauseClicked);
  }
  if (state.ui.btnOptions) {
    state.ui.btnOptions.addEventListener("click", onOptionsClicked);
  }
  if (state.ui.btnControls) {
    state.ui.btnControls.addEventListener("click", () => toggleControlsOverlay(true));
  }
  if (state.ui.btnMailbox) {
    state.ui.btnMailbox.addEventListener("click", onMailboxClicked);
  }
  if (state.ui.btnPrevTask) {
    state.ui.btnPrevTask.addEventListener("click", onPrevTaskClicked);
  }
  if (state.ui.btnNextTask) {
    state.ui.btnNextTask.addEventListener("click", onNextTaskClicked);
  }
  if (state.ui.btnAccept) {
    state.ui.btnAccept.addEventListener("click", onAcceptClicked);
  }
  if (state.ui.btnComplete) {
    state.ui.btnComplete.addEventListener("click", onCompleteClicked);
  }
  if (state.ui.btnClose) {
    state.ui.btnClose.addEventListener("click", onCloseClicked);
  }
  if (state.ui.btnCloseControls) {
    state.ui.btnCloseControls.addEventListener("click", () => toggleControlsOverlay(false));
  }
  if (state.ui.controlsOverlay) {
    state.ui.controlsOverlay.addEventListener("click", (e) => {
      if (e.target === state.ui.controlsOverlay) {
        toggleControlsOverlay(false);
      }
    });
  }

  updateButtonStates();
  updateHudStats();
}

async function init() {
  if (state.loopStarted) return;
  try {
    state.manifest = await loadManifest();
    msPerIngameMinute = state.manifest?.time_scale?.REAL_MS_PER_INGAME_MINUTE ?? msPerIngameMinute;
  } catch (err) {
    console.error("Initialization halted due to manifest load failure.", err);
    return;
  }

  loadSfx();

  state.pendingTasks = (state.manifest?.mailbox_tasks ?? []).map((task) => {
    const normalized = normalizeTask(task);
    return { ...normalized, progress: 0, state: "available" };
  });

  state.ui.hud = document.getElementById("hud");
  state.ui.stats = document.getElementById("stats");
  state.ui.overlay = document.getElementById("overlay");
  state.ui.overlayTitle = document.getElementById("overlayTitle");
  state.ui.overlayBody = document.getElementById("overlayBody");
  state.ui.btnStart = document.getElementById("btnStart");
  state.ui.btnPause = document.getElementById("btnPause");
  state.ui.btnMailbox = document.getElementById("btnMailbox");
  state.ui.btnOptions = document.getElementById("btnOptions");
  state.ui.btnControls = document.getElementById("btnControls");
  state.ui.btnPrevTask = document.getElementById("btnPrevTask");
  state.ui.btnNextTask = document.getElementById("btnNextTask");
  state.ui.btnAccept = document.getElementById("btnAccept");
  state.ui.btnComplete = document.getElementById("btnComplete");
  state.ui.btnClose = document.getElementById("btnClose");
  state.ui.controlsOverlay = document.getElementById("controlsOverlay");
  state.ui.overlayPanel = state.ui.overlay?.querySelector?.(".panel") ?? null;
  state.ui.btnCloseControls = document.getElementById("btnCloseControls");

  state.canvas = document.getElementById("game");
  state.ctx = state.canvas ? state.canvas.getContext("2d") : null;

  buildWorldTiles();
  buildBuildings();
  buildProps();
  initNpcs();

  setupUI();
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  state.loopStarted = true;
  window.requestAnimationFrame(gameLoop);
}

window.addEventListener("load", init);
