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
};

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

  state.ui.stats.textContent = `Day ${state.day} — ${formattedTime} — ${taskText}`;
}

function updateButtonStates() {
  if (state.ui.btnStart && state.ui.btnPause) {
    state.ui.btnStart.classList.toggle("btn-active", state.running);
    state.ui.btnPause.classList.toggle("btn-active", !state.running);
  }
}

function showOverlay() {
  state.ui.overlay?.classList.remove("hidden");
}

function hideOverlay() {
  state.ui.overlay?.classList.add("hidden");
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
  if (event.code === "Space") {
    event.preventDefault();
    greetAttempt();
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
  ];
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

function drawProps() {
  if (!state.ctx) return;
  for (const prop of props) {
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
      default:
        break;
    }
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
  const bob = Math.sin((state.lastFrameTimestamp ?? 0) / 320) * 2;
  const bodyRadius = state.mayor.width * 0.32;
  const glowRadius = state.mayor.width * 0.56;

  state.ctx.save();
  state.ctx.translate(0, bob);

  // soft glow halo
  state.ctx.beginPath();
  state.ctx.arc(centerX, centerY + 4, glowRadius, 0, Math.PI * 2);
  state.ctx.closePath();
  state.ctx.fillStyle = MAYOR_GLOW;
  state.ctx.fill();

  // body
  state.ctx.beginPath();
  state.ctx.arc(centerX, centerY, bodyRadius, 0, Math.PI * 2);
  state.ctx.closePath();
  state.ctx.fillStyle = MAYOR_BODY;
  state.ctx.fill();

  // suit jacket
  const suitHeight = bodyRadius * 1.25;
  state.ctx.fillStyle = MAYOR_SUIT;
  state.ctx.fillRect(centerX - bodyRadius, centerY, bodyRadius * 2, suitHeight);

  // tie
  state.ctx.fillStyle = MAYOR_ACCENT;
  state.ctx.beginPath();
  state.ctx.moveTo(centerX - 3, centerY + 4);
  state.ctx.lineTo(centerX + 3, centerY + 4);
  state.ctx.lineTo(centerX, centerY + 16);
  state.ctx.closePath();
  state.ctx.fill();

  // hat brim
  state.ctx.fillStyle = MAYOR_HAT;
  state.ctx.fillRect(centerX - bodyRadius * 0.9, centerY - bodyRadius * 1.2, bodyRadius * 1.8, 4);
  // hat crown
  state.ctx.fillRect(centerX - bodyRadius * 0.55, centerY - bodyRadius * 1.65, bodyRadius * 1.1, bodyRadius * 0.8);

  // monocle and eye
  state.ctx.beginPath();
  state.ctx.arc(centerX + bodyRadius * 0.35, centerY - 4, 4, 0, Math.PI * 2);
  state.ctx.closePath();
  state.ctx.strokeStyle = MAYOR_MONOCLE;
  state.ctx.lineWidth = 2;
  state.ctx.stroke();

  state.ctx.beginPath();
  state.ctx.arc(centerX + bodyRadius * 0.2, centerY - 4, 1.5, 0, Math.PI * 2);
  state.ctx.closePath();
  state.ctx.fillStyle = "#0b0b0f";
  state.ctx.fill();

  state.ctx.restore();
}

function drawEdgeVignette() {
  if (!state.ctx || !state.canvas) return;
  const thickness = 12;
  state.ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
  state.ctx.fillRect(0, 0, state.canvas.width, thickness);
  state.ctx.fillRect(0, state.canvas.height - thickness, state.canvas.width, thickness);
  state.ctx.fillRect(0, 0, thickness, state.canvas.height);
  state.ctx.fillRect(state.canvas.width - thickness, 0, thickness, state.canvas.height);
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

  if (dx === 0 && dy === 0) return;

  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.sqrt(2);
    dx *= inv;
    dy *= inv;
  }

  const proposedX = state.mayor.x + dx * state.mayor.speed * deltaSeconds;
  const proposedY = state.mayor.y + dy * state.mayor.speed * deltaSeconds;
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
}

// ===== Render & Game Loop =====
function render() {
  if (!state.ctx || !state.canvas) return;
  state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);

  drawTiles();
  drawBuildings();
  drawProps();
  drawNpcs();
  drawMayor();
  drawEdgeVignette();
}

function gameLoop(timestamp) {
  if (state.lastFrameTimestamp === null) {
    state.lastFrameTimestamp = timestamp;
    window.requestAnimationFrame(gameLoop);
    return;
  }

  const deltaMs = timestamp - state.lastFrameTimestamp;
  state.lastFrameTimestamp = timestamp;

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
  state.ui.btnPrevTask = document.getElementById("btnPrevTask");
  state.ui.btnNextTask = document.getElementById("btnNextTask");
  state.ui.btnAccept = document.getElementById("btnAccept");
  state.ui.btnComplete = document.getElementById("btnComplete");
  state.ui.btnClose = document.getElementById("btnClose");

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
