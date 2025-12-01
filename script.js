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
const DEFAULT_TIME_SPEED = 1;
const FAST_TIME_SPEED = 4;
const MAYOR_BODY = "#cbb3f2";
const MAYOR_SUIT = "#b377c9";
const MAYOR_ACCENT = "#f19db8";
const MAYOR_CORAL = "#f6b3c7";
const MAYOR_HAT = "#6b3d8a";
const MAYOR_MONOCLE = "#f2e7c6";
const MAYOR_GLOW = "rgba(200, 162, 221, 0.26)";

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

const tileLegend = {
  grass: 0,
  path: 1,
  water: 2,
  interior: 3,
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
  shopAccent: "#f1c07b",
  houseWall: "#759461",
  houseRoof: "#4c5d3d",
  houseAccent: "#dbe7c8",
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
  crtEnabled: false,
  pixelGridEnabled: false,
  windSwayEnabled: true,
  mayorBounceEnabled: true,
};

const chatBubbles = [];

const npcHighlightRadius = GREET_RADIUS * 1.15;

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
  timeSpeed: DEFAULT_TIME_SPEED,
  timeMode: "normal",
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
  npcRules: {
    schedule: null,
    behavior: null,
    movement: null,
    interactions: null,
  },
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
  taskHudText: "",
  ui: {},
  canvas: null,
  ctx: null,
  sfx: {},
  maps: {},
  currentMapKey: "town",
  collisionGrid: [],
  mailboxSpot: null,
  spawnPoint: null,
  daySummary: null,
  doorCooldown: 0,
};

function normalizeTask(task) {
  return {
    id: task.task_id ?? task.id ?? "",
    title: task.title ?? task.description ?? "Untitled Task",
    body: task.body ?? task.description ?? "",
    from: task.from ?? task.requester ?? "",
    reward: task.reward ?? 0,
    type: task.type ?? "unknown",
    goal: task.goal ?? 0,
    progress: task.progress ?? 0,
    state: task.state ?? task.status ?? "available",
    building: task.building ?? "",
    deadlineMinutes: task.deadline ? parseClockToMinutes(task.deadline) : null,
    postedMinutes: task.posted_at ? parseClockToMinutes(task.posted_at) : null,
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
let currentDoors = [];

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

async function loadJsonSafe(path, fallback = null) {
  try {
    const res = await fetch(path);
    if (!res.ok) {
      console.warn(`Failed to load ${path}: ${res.status}`);
      return fallback;
    }
    return await res.json();
  } catch (err) {
    console.warn(`Error loading ${path}`, err);
    return fallback;
  }
}

function parseClockToMinutes(str) {
  if (!str || typeof str !== "string") return 0;
  const [h, m] = str.split(":").map((p) => parseInt(p, 10) || 0);
  return h * 60 + m;
}

// ===== Map & Data Loading =====
function normalizeMap(mapData) {
  if (!mapData) return null;
  return {
    name: mapData.name ?? "unknown",
    kind: mapData.kind ?? (mapData.name === "town" ? "town" : "interior"),
    cols: mapData.cols ?? gridCols,
    rows: mapData.rows ?? gridRows,
    tileSize: mapData.tileSize ?? TILE_SIZE,
    tiles: mapData.tiles ?? [],
    collision: mapData.collision ?? [],
    doors: mapData.doors ?? [],
    mailbox: mapData.mailbox ?? null,
    spawn: mapData.spawn ?? null,
    buildings: mapData.buildings ?? [],
  };
}

async function loadMapData() {
  const town = normalizeMap(await loadJsonSafe("oia/data/town_map_v01.json"));
  const cityHall = normalizeMap(await loadJsonSafe("oia/data/interiors_v01/city_hall.json"));
  const shop = normalizeMap(await loadJsonSafe("oia/data/interiors_v01/shop.json"));

  const maps = {};
  for (const map of [town, cityHall, shop]) {
    if (map) {
      maps[map.name] = map;
    }
  }
  state.maps = maps;
  if (!state.maps.town) {
    console.warn("Town map missing; falling back to procedural layout");
  }
}

function getCurrentMap() {
  return state.maps?.[state.currentMapKey] ?? null;
}

function applyMap(mapKey, spawnOverride = null) {
  state.currentMapKey = mapKey;
  const map = getCurrentMap();
  if (map) {
    gridCols = map.cols ?? gridCols;
    gridRows = map.rows ?? gridRows;
    worldTiles = map.tiles ?? worldTiles;
    state.collisionGrid = map.collision ?? [];
    currentDoors = map.doors ?? [];
    state.mailboxSpot = map.mailbox ?? null;
    state.spawnPoint = spawnOverride ?? map.spawn ?? state.spawnPoint;
  }
  buildWorldTiles(map);
  buildBuildings(map);
  buildProps(map);
  if (state.spawnPoint && spawnOverride) {
    state.mayor.x = state.spawnPoint.x * TILE_SIZE;
    state.mayor.y = state.spawnPoint.y * TILE_SIZE;
  }
}

function findDoorAt(tileX, tileY) {
  const map = getCurrentMap();
  if (!map) return null;
  return (map.doors ?? []).find((d) => d.from?.x === tileX && d.from?.y === tileY) ?? null;
}

function warpToDoor(door) {
  if (!door || !door.toMap) return;
  if (!state.maps[door.toMap]) return;
  const spawn = door.to ? { x: door.to.x, y: door.to.y } : null;
  applyMap(door.toMap, spawn);
  if (spawn) {
    state.mayor.x = spawn.x * TILE_SIZE;
    state.mayor.y = spawn.y * TILE_SIZE;
  }
}

// ===== Time System =====
function isWorkHour(timeMinutes) {
  const hour = Math.floor(timeMinutes / 60);
  return hour >= 9 && hour <= 16;
}

function updateTime(deltaMs) {
  if (state.timeSpeed <= 0) return;
  state.accumulatedMs += deltaMs * state.timeSpeed;

  while (state.accumulatedMs >= msPerIngameMinute) {
    state.accumulatedMs -= msPerIngameMinute;
    state.timeMinutes += 1;

    if (state.timeMinutes >= 24 * 60) {
      state.day += 1;
      state.timeMinutes = 0;
    }
  }
}

function setTimeMode(mode) {
  state.timeMode = mode;
  if (mode === "paused") {
    state.timeSpeed = 0;
    state.running = false;
  } else if (mode === "fast") {
    state.timeSpeed = FAST_TIME_SPEED;
    state.running = true;
  } else {
    state.timeSpeed = DEFAULT_TIME_SPEED;
    state.running = true;
  }
  updateButtonStates();
  updateHudStats();
}

// ===== HUD & UI Helpers =====
function updateHudStats() {
  if (!state.ui.stats) return;
  const totalMinutes = state.timeMinutes;
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  const formattedTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const speedLabel = state.timeMode === "fast" ? "Fast" : state.timeMode === "paused" ? "Paused" : "Normal";

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

  const nextText = `Day ${state.day} — ${formattedTime} (${speedLabel}) — ${taskText}`;
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
  updateTaskHud();
}

function formatMinutes(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function updateTaskHud() {
  if (!state.ui.taskHud) return;
  const accepted = [];
  if (state.currentTask) accepted.push(state.currentTask);
  const list = accepted.length
    ? accepted.map((t) => `${t.title ?? t.description} — ${t.status ?? t.state}`)
    : ["No active tasks yet. Accept something from the mailbox."];
  const deadlines = accepted
    .map((t) => (t.deadlineMinutes ? `Due ${formatMinutes(t.deadlineMinutes)}` : ""))
    .filter(Boolean);
  const text = `${list.join(" | ")} ${deadlines.length ? `(${deadlines.join(", ")})` : ""}`.trim();
  if (text !== state.taskHudText) {
    state.taskHudText = text;
    state.ui.taskHud.textContent = text;
  }
}

function updateButtonStates() {
  if (state.ui.btnStart && state.ui.btnPause) {
    state.ui.btnStart.classList.toggle("btn-active", state.timeMode === "normal");
    state.ui.btnPause.classList.toggle("btn-active", state.timeMode === "paused");
  }
  if (state.ui.btnFast) {
    state.ui.btnFast.classList.toggle("btn-active", state.timeMode === "fast");
  }
}

function updateGreetHint() {
  const hintEl = state.ui.greetHint;
  if (!hintEl) return;
  const npc = findNearbyNpc();
  const shouldShow = Boolean(npc);
  hintEl.classList.toggle("hidden", !shouldShow);
}

function isNearMailbox() {
  if (!state.mailboxSpot) return true;
  const centerX = state.mayor.x + state.mayor.width / 2;
  const centerY = state.mayor.y + state.mayor.height / 2;
  const mailX = state.mailboxSpot.x * TILE_SIZE + TILE_SIZE / 2;
  const mailY = state.mailboxSpot.y * TILE_SIZE + TILE_SIZE / 2;
  const dist = Math.hypot(centerX - mailX, centerY - mailY);
  return dist < TILE_SIZE * 0.8;
}

function updateMailboxHint() {
  const hintEl = state.ui.mailboxHint;
  if (!hintEl) return;
  const shouldShow = isNearMailbox();
  hintEl.classList.toggle("hidden", !shouldShow);
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
async function loadMailboxTasks() {
  const tasks = await loadJsonSafe("oia/data/mailbox_schema_v01/sample_tasks.json", []);
  state.pendingTasks = tasks.map((task) => {
    const normalized = normalizeTask(task);
    return { ...normalized, status: "new", state: "available", progress: 0 };
  });
}

function beginDay() {
  state.daySummary = null;
  state.timeMinutes = 9 * 60;
  state.currentTask = null;
  state.completedTasks = [];
  state.pendingTasks = state.pendingTasks.map((t) => ({ ...t, state: "available", status: "new", progress: 0 }));
  applyMap("town", getCurrentMap()?.spawn ?? state.spawnPoint ?? { x: 7, y: 6 });
  state.mayor.x = (state.spawnPoint?.x ?? 7) * TILE_SIZE;
  state.mayor.y = (state.spawnPoint?.y ?? 6) * TILE_SIZE;
  setTimeMode("normal");
  state.running = true;
  console.info("Day started");
}

function endDaySummary() {
  const missed = state.pendingTasks.filter((t) => t.state !== "completed" && t.state !== "accepted");
  const completed = [...state.completedTasks];
  if (state.currentTask && state.currentTask.state === "completed") {
    completed.push(state.currentTask);
  }
  state.daySummary = {
    day: state.day,
    completed,
    missed,
    goodwill: state.stats.goodwill,
    budget: state.stats.budget,
  };
  const lines = [
    `End of Day ${state.day}`,
    `Completed: ${completed.length}`,
    `Missed: ${missed.length}`,
    `Budget: ${state.stats.budget}`,
  ];
  openMailboxPanel(lines.join("\n"), { playSound: false });
  setTimeMode("paused");
  state.day += 1;
  console.info("Day summary", state.daySummary);
}

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
  if (task.building) lines.push(`Building: ${task.building}`);
  if (task.deadlineMinutes !== null && task.deadlineMinutes !== undefined) {
    lines.push(`Deadline: ${formatMinutes(task.deadlineMinutes)}`);
  }
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
  state.currentTask.status = "completed";
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
    task.status = "accepted";
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
  if (!isNearMailbox()) {
    openMailboxPanel("Walk up to the mailbox to check for tasks.", { playSound: false });
    return;
  }
  openMailboxPanel();
}

// ===== Input Handling =====
function onStartClicked() {
  beginDay();
}

function onPauseClicked() {
  setTimeMode("paused");
}

function onFastClicked() {
  setTimeMode("fast");
}

function onEndDayClicked() {
  endDaySummary();
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
      if (isNearMailbox()) {
        openMailboxPanel();
      } else {
        openMailboxPanel("Move closer to the mailbox to read letters.", { playSound: false });
      }
      break;
    case "KeyP":
      if (state.timeMode === "paused") {
        setTimeMode("normal");
      } else {
        setTimeMode("paused");
      }
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

function findNearbyNpc(radius = GREET_RADIUS) {
  const mayorCenterX = state.mayor.x + state.mayor.width / 2;
  const mayorCenterY = state.mayor.y + state.mayor.height / 2;
  let closest = null;
  let closestDistSq = Number.POSITIVE_INFINITY;

  for (const npc of state.npcs) {
    if (npc.map && npc.map !== state.currentMapKey) continue;
    const dx = npc.x - mayorCenterX;
    const dy = npc.y - mayorCenterY;
    const distSq = dx * dx + dy * dy;
    if (distSq <= radius * radius && distSq < closestDistSq) {
      closest = npc;
      closestDistSq = distSq;
    }
  }

  return closest;
}

function addChatBubble(npc) {
  const phrases = ["Hey there!", "Nice day in the harbor!", "Busy today?", "Mayor, good to see you!"];
  const text = phrases[Math.floor(Math.random() * phrases.length)];
  const lifetime = 2300;
  chatBubbles.push({
    x: npc.x,
    y: npc.y - npc.radius * 1.8,
    text,
    remaining: lifetime,
    total: lifetime,
    riseRate: 0.014,
  });
}

function greetAttempt() {
  const nearbyNpc = findNearbyNpc();
  if (!nearbyNpc) return;

  addChatBubble(nearbyNpc);

  if (!state.currentTask) return;
  if (state.currentTask.type !== "greet") return;
  if (state.currentTask.state !== "accepted") return;
  if (!isWorkHour(state.timeMinutes)) return;

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
  if (tile === tileLegend.interior) {
    return "#1b2f3a";
  }
  const grassLift = noise * 0.1;
  return adjustBrightness(tilePalette.grassBase, grassLift);
}

function buildWorldTiles(mapOverride = null) {
  if (!state.canvas) return;
  const map = mapOverride ?? getCurrentMap();
  if (map) {
    gridCols = map.cols ?? gridCols;
    gridRows = map.rows ?? gridRows;
  } else {
    gridCols = Math.floor(state.canvas.width / TILE_SIZE);
    gridRows = Math.floor(state.canvas.height / TILE_SIZE);
  }

  worldTiles = Array.from({ length: gridRows }, (_, r) => {
    if (map?.tiles?.[r]) return [...map.tiles[r]];
    return Array.from({ length: gridCols }, () => 0);
  });
  worldTileColors = Array.from({ length: gridRows }, () => Array.from({ length: gridCols }, () => tilePalette.grassBase));
  shorelineMask = Array.from({ length: gridRows }, () => Array.from({ length: gridCols }, () => 0));
  groundDetails = [];

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
      } else if (tile !== 2 && tile !== tileLegend.interior && Math.abs(baseNoise) > 0.35 && Math.abs(baseNoise) < 0.5) {
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

function buildBuildings(mapOverride = null) {
  const map = mapOverride ?? getCurrentMap();
  if (map?.buildings?.length) {
    buildings = map.buildings.map((b, idx) => {
      const kind = b.kind ?? "house";
      return {
        key: `${kind}_${idx}`,
        kind,
        x: (b.x ?? 0) * TILE_SIZE,
        y: (b.y ?? 0) * TILE_SIZE,
        width: (b.w ?? 1) * TILE_SIZE,
        height: (b.h ?? 1) * TILE_SIZE,
        wall: b.wall,
        roof: b.roof,
        accent: b.accent,
      };
    });
    return;
  }

  buildings = [
    {
      key: "city_hall",
      kind: "cityHall",
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
      kind: "shop",
      x: TILE_SIZE * 2,
      y: TILE_SIZE * 2,
      width: TILE_SIZE * 2,
      height: TILE_SIZE * 2,
      wall: buildingPalette.shopWall,
      roof: buildingPalette.shopRoof,
      accent: buildingPalette.shopAccent,
    },
    {
      key: "house1",
      kind: "house",
      x: TILE_SIZE * 11,
      y: TILE_SIZE * 2,
      width: TILE_SIZE * 2,
      height: TILE_SIZE * 2,
      wall: buildingPalette.houseWall,
      roof: buildingPalette.houseRoof,
      accent: buildingPalette.houseAccent,
    },
    {
      key: "market",
      kind: "market",
      x: TILE_SIZE * 3,
      y: TILE_SIZE * 6,
      width: TILE_SIZE * 3,
      height: TILE_SIZE * 2,
      wall: buildingPalette.marketWall,
      roof: buildingPalette.marketRoof,
      accent: adjustBrightness(buildingPalette.marketWall, 0.12),
    },
    {
      key: "house2",
      kind: "house",
      x: TILE_SIZE * 9,
      y: TILE_SIZE * 6,
      width: TILE_SIZE * 2,
      height: TILE_SIZE * 2,
      wall: adjustBrightness(buildingPalette.houseWall, 0.08),
      roof: adjustBrightness(buildingPalette.houseRoof, -0.06),
      accent: adjustBrightness(buildingPalette.houseAccent, -0.04),
    },
  ];
}

function buildProps(mapOverride = null) {
  const map = mapOverride ?? getCurrentMap();
  if (map?.kind === "interior") {
    props = [];
    return;
  }
  const half = TILE_SIZE / 2;
  const centerPathY = Math.floor(gridRows / 2) * TILE_SIZE + half;
  const centerPathX = Math.floor(gridCols / 2) * TILE_SIZE + half;

  props = [
    { type: "bench", x: centerPathX - TILE_SIZE * 2, y: centerPathY - half },
    { type: "bench", x: centerPathX + TILE_SIZE * 2, y: centerPathY - half },
    { type: "bench", x: centerPathX, y: centerPathY + TILE_SIZE * 1.2 },
    { type: "lamp", x: centerPathX - TILE_SIZE * 3, y: centerPathY - TILE_SIZE },
    { type: "lamp", x: centerPathX + TILE_SIZE * 3, y: centerPathY - TILE_SIZE },
    { type: "lamp", x: TILE_SIZE * 9.2, y: TILE_SIZE * 1.3 },
    { type: "crate", x: TILE_SIZE * 3.2, y: TILE_SIZE * 7 },
    { type: "crate", x: TILE_SIZE * 3.9, y: TILE_SIZE * 7.4 },
    { type: "planter", x: TILE_SIZE * 1.5, y: TILE_SIZE * 1.2 },
    { type: "planter", x: TILE_SIZE * 4.6, y: TILE_SIZE * 2.4 },
    { type: "planter", x: TILE_SIZE * 11.5, y: TILE_SIZE * 1.2 },
    { type: "planter", x: TILE_SIZE * 8.8, y: TILE_SIZE * 2.1 },
    { type: "planter", x: TILE_SIZE * 9.8, y: TILE_SIZE * 6.4 },
    { type: "sign", x: TILE_SIZE * 1.4, y: TILE_SIZE * (gridRows - 2) + half * 0.4 },
    { type: "barrel", x: TILE_SIZE * 2.3, y: TILE_SIZE * (gridRows - 2) + half * 0.1 },
    { type: "barrel", x: TILE_SIZE * 2.8, y: TILE_SIZE * (gridRows - 2) + half * 0.45 },
    { type: "coral", x: TILE_SIZE * 1.2, y: TILE_SIZE * (gridRows - 2) + half * 0.2 },
    { type: "coral", x: TILE_SIZE * 2.0, y: TILE_SIZE * (gridRows - 2) - half * 0.2 },
    { type: "coral", x: TILE_SIZE * 0.9, y: TILE_SIZE * (gridRows - 1) - half * 0.5 },
    { type: "coral", x: TILE_SIZE * 3.4, y: TILE_SIZE * (gridRows - 2) - half * 0.3 },
    { type: "junk", x: TILE_SIZE * 1.6, y: TILE_SIZE * (gridRows - 1) - half * 0.3 },
    { type: "junk", x: TILE_SIZE * 2.2, y: TILE_SIZE * (gridRows - 1) - half * 0.6 },
    { type: "junk", x: TILE_SIZE * 3.0, y: TILE_SIZE * (gridRows - 1) - half * 0.45 },
    { type: "pebble", x: TILE_SIZE * 1.1, y: TILE_SIZE * (gridRows - 1) - half * 0.15 },
    { type: "pebble", x: TILE_SIZE * 2.7, y: TILE_SIZE * (gridRows - 1) - half * 0.05 },
    { type: "pebble", x: TILE_SIZE * 3.6, y: TILE_SIZE * (gridRows - 1) - half * 0.2 },
    { type: "sign", x: TILE_SIZE * 12.6, y: TILE_SIZE * 6.2 },
  ];

  props = props.map((prop, idx) => ({ ...prop, swayPhase: seededNoise(idx, idx, 7) * Math.PI * 2 }));
  props.sort((a, b) => a.y - b.y);
}

function tileToWorld(position) {
  if (!position) return { x: 0, y: 0, map: state.currentMapKey };
  return {
    x: position.x * TILE_SIZE + TILE_SIZE / 2,
    y: position.y * TILE_SIZE + TILE_SIZE / 2,
    map: position.map ?? state.currentMapKey,
  };
}

function npcTargetForState(npc, stateName) {
  if (!npc) return tileToWorld(null);
  if (stateName === "work") return tileToWorld(npc.job);
  if (stateName === "social") return tileToWorld(npc.social);
  if (stateName === "sleep") return tileToWorld(npc.sleep);
  return tileToWorld(npc.home);
}

function updateNpcStateFromSchedule(npc) {
  const schedule = state.npcRules.schedule?.default_day ?? [];
  const nowMinutes = state.timeMinutes % (24 * 60);
  let desired = "idle";
  for (const block of schedule) {
    const start = parseClockToMinutes(block.start);
    const end = parseClockToMinutes(block.end);
    if (nowMinutes >= start && nowMinutes < end) {
      desired = block.state ?? "idle";
      break;
    }
  }

  if (npc.state !== desired) {
    npc.state = desired;
    const target = npcTargetForState(npc, desired);
    npc.target = target;
    npc.map = target.map;
    console.info(`NPC ${npc.name} state -> ${desired}`);
  }
}

function moveNpcTowardsTarget(npc, deltaMs) {
  if (!npc.target) return;
  const speed = (state.npcRules.movement?.maxStep ?? 1) * 40;
  const deltaSeconds = deltaMs / 1000;
  const dx = npc.target.x - npc.x;
  const dy = npc.target.y - npc.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) {
    npc.x = npc.target.x;
    npc.y = npc.target.y;
    return;
  }
  const step = Math.min(dist, speed * deltaSeconds);
  npc.x += (dx / dist) * step;
  npc.y += (dy / dist) * step;
}

function updateNpcSchedules(deltaMs) {
  if (state.timeSpeed <= 0) return;
  for (const npc of state.npcs) {
    updateNpcStateFromSchedule(npc);
    moveNpcTowardsTarget(npc, deltaMs);
  }
}

async function loadNpcData() {
  const roster = (await loadJsonSafe("oia/data/npc_starter_pack_v01/npc_roster.json", [])) ?? [];
  state.npcRules.schedule = await loadJsonSafe("oia/data/npc_starter_pack_v01/npc_scheduler.json", {});
  state.npcRules.behavior = await loadJsonSafe("oia/data/npc_starter_pack_v01/npc_behavior_tree.json", {});
  state.npcRules.movement = await loadJsonSafe("oia/data/npc_starter_pack_v01/movement_rules.json", {});
  state.npcRules.interactions = await loadJsonSafe("oia/data/npc_starter_pack_v01/interaction_rules.json", {});

  state.npcs = roster.map((npc, idx) => {
    const start = tileToWorld(npc.home ?? { x: 0, y: 0, map: "town" });
    return {
      id: npc.id ?? `npc${idx}`,
      name: npc.name ?? `Citizen ${idx + 1}`,
      species: npc.species ?? "default",
      map: start.map,
      x: start.x,
      y: start.y,
      radius: NPC_RADIUS,
      bobPhase: idx * 0.4,
      state: "idle",
      job: npc.job,
      home: npc.home,
      social: npc.social,
      sleep: npc.sleep,
      target: start,
    };
  });
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
  const time = (state.lastFrameTimestamp ?? 0) / 1000;
  const driftX = Math.sin(time * 0.22) * 1.1;
  const driftY = Math.cos(time * 0.18) * 0.8;
  for (const detail of groundDetails) {
    ctx.save();
    ctx.translate(driftX, driftY);
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
  const parallax = Math.sin((state.lastFrameTimestamp ?? 0) / 6400) * 1;
  const waveOffset = Math.sin(time + col * 0.7 + row * 0.35) * 1.7 + parallax;

  ctx.fillStyle = baseColor;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  const depthGradient = ctx.createLinearGradient(x, y, x, y + TILE_SIZE);
  depthGradient.addColorStop(0, adjustBrightness(tilePalette.waterLight, 0.04));
  depthGradient.addColorStop(1, adjustBrightness(baseColor, -0.12));
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = depthGradient;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.globalAlpha = 0.055;
  ctx.fillStyle = tilePalette.waterLight;
  const bandOffset = parallax * 0.5;
  ctx.fillRect(x, y + TILE_SIZE * 0.25 + waveOffset + bandOffset, TILE_SIZE, 1.8);
  ctx.fillRect(x, y + TILE_SIZE * 0.6 - waveOffset + bandOffset, TILE_SIZE, 1.1);
  const shimmerOffset = Math.sin((state.lastFrameTimestamp ?? 0) / 760 + col * 0.4 + row * 0.2) * 1.6 + bandOffset;
  ctx.fillRect(x, y + TILE_SIZE * 0.45 + shimmerOffset, TILE_SIZE, 0.9);
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
  const drawCityHall = (b) => {
    const roofHeight = b.height * 0.22;
    const stepHeight = Math.max(6, b.height * 0.12);
    const wallColor = b.wall ?? buildingPalette.civicWall;
    const roofColor = b.roof ?? buildingPalette.civicRoof;
    const accent = b.accent ?? buildingPalette.civicAccent;

    state.ctx.fillStyle = buildingPalette.shadow;
    state.ctx.fillRect(b.x + 6, b.y + b.height - 4, b.width - 12, 6);

    // steps/platform
    state.ctx.fillStyle = adjustBrightness(accent, 0.05);
    state.ctx.fillRect(b.x - 4, b.y + b.height - stepHeight, b.width + 8, stepHeight);
    state.ctx.fillStyle = adjustBrightness(accent, -0.12);
    state.ctx.fillRect(b.x - 4, b.y + b.height - stepHeight + 3, b.width + 8, 4);

    // main body
    const wallGradient =
      b._wallGradient ||
      (() => {
        const g = state.ctx.createLinearGradient(b.x, b.y + roofHeight, b.x, b.y + b.height - stepHeight);
        g.addColorStop(0, adjustBrightness(wallColor, 0.08));
        g.addColorStop(1, adjustBrightness(wallColor, -0.08));
        b._wallGradient = g;
        return g;
      })();
    state.ctx.fillStyle = wallGradient;
    state.ctx.fillRect(b.x, b.y + roofHeight, b.width, b.height - roofHeight - stepHeight);
    state.ctx.strokeStyle = adjustBrightness(wallColor, -0.3);
    state.ctx.lineWidth = 2;
    state.ctx.strokeRect(b.x - 1, b.y + roofHeight - 1, b.width + 2, b.height - roofHeight - stepHeight + 2);
    state.ctx.fillStyle = adjustBrightness(wallColor, -0.22);
    state.ctx.fillRect(b.x, b.y + b.height - stepHeight - 4, b.width, 3);

    // roof bar
    const roofGradient =
      b._roofGradient ||
      (() => {
        const g = state.ctx.createLinearGradient(b.x, b.y, b.x, b.y + roofHeight + 4);
        g.addColorStop(0, adjustBrightness(roofColor, 0.08));
        g.addColorStop(1, roofColor);
        b._roofGradient = g;
        return g;
      })();
    state.ctx.fillStyle = roofGradient;
    state.ctx.fillRect(b.x - 2, b.y, b.width + 4, roofHeight + 4);
    state.ctx.fillStyle = adjustBrightness(roofColor, 0.16);
    state.ctx.fillRect(b.x, b.y + 2, b.width, 6);
    state.ctx.fillStyle = adjustBrightness(roofColor, -0.1);
    state.ctx.fillRect(b.x - 2, b.y + roofHeight - 3, b.width + 4, 5);
    state.ctx.fillStyle = adjustBrightness(roofColor, -0.2);
    state.ctx.fillRect(b.x - 2, b.y + roofHeight + 2, b.width + 4, 2);

    // windows and crest
    const windowWidth = Math.max(12, b.width * 0.18);
    const windowHeight = windowWidth * 0.7;
    const windowY = b.y + roofHeight + 10;
    state.ctx.fillStyle = adjustBrightness(wallColor, 0.22);
    state.ctx.fillRect(b.x + 10, windowY, windowWidth, windowHeight);
    state.ctx.fillRect(b.x + b.width - windowWidth - 10, windowY, windowWidth, windowHeight);
    state.ctx.fillRect(b.x + b.width / 2 - windowWidth / 2, windowY, windowWidth, windowHeight);

    state.ctx.beginPath();
    state.ctx.arc(b.x + b.width / 2, windowY - 6, Math.max(6, b.width * 0.1), 0, Math.PI * 2);
    state.ctx.fillStyle = accent;
    state.ctx.fill();
    state.ctx.strokeStyle = adjustBrightness(accent, -0.18);
    state.ctx.lineWidth = 1.4;
    state.ctx.stroke();

    // door and banner
    const doorWidth = Math.max(16, b.width * 0.2);
    const doorHeight = Math.max(18, b.height * 0.26);
    const doorX = b.x + b.width / 2 - doorWidth / 2;
    const doorY = b.y + b.height - stepHeight - doorHeight + 2;
    state.ctx.fillStyle = adjustBrightness(wallColor, -0.18);
    state.ctx.fillRect(doorX, doorY, doorWidth, doorHeight);
    state.ctx.fillStyle = adjustBrightness(accent, -0.05);
    state.ctx.fillRect(doorX + doorWidth / 2 - 3, doorY + doorHeight * 0.55, 6, 6);

    state.ctx.fillStyle = adjustBrightness(accent, 0.14);
    state.ctx.fillRect(b.x - 4, b.y + b.height - stepHeight + 1, b.width + 8, 2);
    state.ctx.fillStyle = adjustBrightness(accent, -0.08);
    state.ctx.fillRect(b.x - 4, b.y + b.height - stepHeight + 3, b.width + 8, 2);

    state.ctx.fillStyle = accent;
    state.ctx.fillRect(b.x + b.width / 2 - 6, b.y + roofHeight + 2, 12, 14);
  };

  const drawShopBuilding = (b) => {
    const roofHeight = b.height * 0.28;
    const wallColor = b.wall ?? buildingPalette.shopWall;
    const roofColor = b.roof ?? buildingPalette.shopRoof;
    const accent = b.accent ?? buildingPalette.shopAccent;

    state.ctx.fillStyle = buildingPalette.shadow;
    state.ctx.fillRect(b.x + 4, b.y + b.height - 4, b.width - 8, 4);

    // main body
    const wallGradient =
      b._wallGradient ||
      (() => {
        const g = state.ctx.createLinearGradient(b.x, b.y + roofHeight, b.x, b.y + b.height);
        g.addColorStop(0, adjustBrightness(wallColor, 0.06));
        g.addColorStop(1, adjustBrightness(wallColor, -0.1));
        b._wallGradient = g;
        return g;
      })();
    state.ctx.fillStyle = wallGradient;
    state.ctx.fillRect(b.x, b.y + roofHeight, b.width, b.height - roofHeight);
    state.ctx.strokeStyle = adjustBrightness(wallColor, -0.28);
    state.ctx.strokeRect(b.x - 1, b.y + roofHeight - 1, b.width + 2, b.height - roofHeight + 2);
    state.ctx.fillStyle = adjustBrightness(wallColor, -0.22);
    state.ctx.fillRect(b.x, b.y + b.height - 6, b.width, 4);
    state.ctx.fillStyle = adjustBrightness(wallColor, -0.12);
    state.ctx.fillRect(b.x, b.y + b.height - 10, b.width, 2);

    // roof slab
    const roofGradient =
      b._roofGradient ||
      (() => {
        const g = state.ctx.createLinearGradient(b.x, b.y, b.x, b.y + roofHeight + 4);
        g.addColorStop(0, adjustBrightness(roofColor, 0.12));
        g.addColorStop(1, roofColor);
        b._roofGradient = g;
        return g;
      })();
    state.ctx.fillStyle = roofGradient;
    state.ctx.fillRect(b.x - 1, b.y, b.width + 2, roofHeight + 4);
    state.ctx.fillStyle = adjustBrightness(roofColor, 0.2);
    state.ctx.fillRect(b.x, b.y + 3, b.width, 6);
    state.ctx.fillStyle = adjustBrightness(roofColor, -0.08);
    state.ctx.fillRect(b.x - 1, b.y + roofHeight, b.width + 2, 3);
    state.ctx.fillStyle = adjustBrightness(roofColor, -0.16);
    state.ctx.fillRect(b.x - 1, b.y + roofHeight + 3, b.width + 2, 2);

    // awning stripes
    const stripeHeight = Math.max(8, roofHeight * 0.55);
    state.ctx.fillStyle = accent;
    state.ctx.fillRect(b.x - 2, b.y + roofHeight - stripeHeight / 2, b.width + 4, stripeHeight);
    state.ctx.fillStyle = adjustBrightness(accent, -0.22);
    for (let i = 0; i < b.width; i += 10) {
      state.ctx.fillRect(b.x - 2 + i, b.y + roofHeight - stripeHeight / 2, 5, stripeHeight);
    }

    // door and window
    const doorWidth = Math.max(12, b.width * 0.18);
    const doorHeight = Math.max(16, b.height * 0.38);
    const doorX = b.x + b.width * 0.12;
    const doorY = b.y + b.height - doorHeight;
    state.ctx.fillStyle = adjustBrightness(wallColor, -0.22);
    state.ctx.fillRect(doorX, doorY, doorWidth, doorHeight);
    state.ctx.fillStyle = adjustBrightness(accent, -0.05);
    state.ctx.fillRect(doorX + doorWidth * 0.35, doorY + doorHeight * 0.55, 4, 4);

    const windowWidth = Math.max(14, b.width * 0.32);
    const windowHeight = windowWidth * 0.6;
    state.ctx.fillStyle = adjustBrightness(accent, 0.2);
    state.ctx.fillRect(b.x + b.width - windowWidth - 12, b.y + roofHeight + 8, windowWidth, windowHeight);
    state.ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
    state.ctx.fillRect(b.x + b.width - windowWidth - 12, b.y + roofHeight + 8 + windowHeight * 0.35, windowWidth, 2);
    state.ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    state.ctx.fillRect(b.x, b.y + b.height - 6, b.width, 3);
  };

  const drawHouseBuilding = (b) => {
    const roofHeight = b.height * 0.4;
    const wallColor = b.wall ?? buildingPalette.houseWall;
    const roofColor = b.roof ?? buildingPalette.houseRoof;
    const accent = b.accent ?? buildingPalette.houseAccent;

    state.ctx.fillStyle = buildingPalette.shadow;
    state.ctx.fillRect(b.x + 3, b.y + b.height - 3, b.width - 6, 4);

    // roof gable
    state.ctx.beginPath();
    state.ctx.moveTo(b.x - 4, b.y + roofHeight);
    state.ctx.lineTo(b.x + b.width / 2, b.y - 4);
    state.ctx.lineTo(b.x + b.width + 4, b.y + roofHeight);
    state.ctx.closePath();
    state.ctx.fillStyle = roofColor;
    state.ctx.fill();
    state.ctx.strokeStyle = adjustBrightness(roofColor, -0.2);
    state.ctx.stroke();
    state.ctx.fillStyle = adjustBrightness(roofColor, 0.12);
    state.ctx.fillRect(b.x - 4, b.y + roofHeight - 3, b.width + 8, 3);
    state.ctx.fillStyle = adjustBrightness(roofColor, -0.12);
    state.ctx.fillRect(b.x - 4, b.y + roofHeight - 1, b.width + 8, 2);
    state.ctx.fillStyle = adjustBrightness(roofColor, -0.18);
    state.ctx.fillRect(b.x - 4, b.y + roofHeight + 2, b.width + 8, 2);

    // walls
    const wallGradient =
      b._wallGradient ||
      (() => {
        const g = state.ctx.createLinearGradient(b.x, b.y + roofHeight, b.x, b.y + b.height);
        g.addColorStop(0, adjustBrightness(wallColor, 0.06));
        g.addColorStop(1, adjustBrightness(wallColor, -0.08));
        b._wallGradient = g;
        return g;
      })();
    state.ctx.fillStyle = wallGradient;
    state.ctx.fillRect(b.x, b.y + roofHeight, b.width, b.height - roofHeight);
    state.ctx.strokeStyle = adjustBrightness(wallColor, -0.28);
    state.ctx.strokeRect(b.x - 1, b.y + roofHeight - 1, b.width + 2, b.height - roofHeight + 2);
    state.ctx.fillStyle = adjustBrightness(wallColor, -0.22);
    state.ctx.fillRect(b.x, b.y + b.height - 6, b.width, 3);

    // windows & trim
    const windowSize = Math.max(10, b.width * 0.18);
    state.ctx.fillStyle = accent;
    state.ctx.fillRect(b.x + 6, b.y + roofHeight + 8, windowSize, windowSize * 0.8);
    state.ctx.fillRect(b.x + b.width - windowSize - 6, b.y + roofHeight + 8, windowSize, windowSize * 0.8);
    state.ctx.fillStyle = adjustBrightness(accent, -0.18);
    state.ctx.fillRect(b.x, b.y + roofHeight - 2, b.width, 4);

    // door
    const doorWidth = Math.max(12, b.width * 0.18);
    const doorHeight = Math.max(18, b.height * 0.36);
    const doorX = b.x + b.width / 2 - doorWidth / 2;
    const doorY = b.y + b.height - doorHeight;
    state.ctx.fillStyle = adjustBrightness(wallColor, -0.2);
    state.ctx.fillRect(doorX, doorY, doorWidth, doorHeight);

    // chimney
    state.ctx.fillStyle = adjustBrightness(roofColor, 0.08);
    state.ctx.fillRect(b.x + b.width * 0.68, b.y + roofHeight - 14, 10, 18);
  };

  const drawMarketBuilding = (b) => {
    const roofHeight = b.height * 0.25;
    const wallColor = b.wall ?? buildingPalette.marketWall;
    const roofColor = b.roof ?? buildingPalette.marketRoof;
    const accent = b.accent ?? adjustBrightness(wallColor, 0.1);

    state.ctx.fillStyle = buildingPalette.shadow;
    state.ctx.fillRect(b.x + 4, b.y + b.height - 4, b.width - 8, 5);

    const wallGradient = state.ctx.createLinearGradient(b.x, b.y + roofHeight, b.x, b.y + b.height);
    wallGradient.addColorStop(0, adjustBrightness(wallColor, 0.05));
    wallGradient.addColorStop(1, adjustBrightness(wallColor, -0.08));
    state.ctx.fillStyle = wallGradient;
    state.ctx.fillRect(b.x, b.y + roofHeight, b.width, b.height - roofHeight);
    state.ctx.strokeStyle = adjustBrightness(wallColor, -0.25);
    state.ctx.strokeRect(b.x - 1, b.y + roofHeight - 1, b.width + 2, b.height - roofHeight + 2);
    state.ctx.fillStyle = adjustBrightness(wallColor, -0.16);
    state.ctx.fillRect(b.x, b.y + b.height - 5, b.width, 3);

    const roofGradient = state.ctx.createLinearGradient(b.x, b.y, b.x, b.y + roofHeight + 4);
    roofGradient.addColorStop(0, adjustBrightness(roofColor, 0.1));
    roofGradient.addColorStop(1, roofColor);
    state.ctx.fillStyle = roofGradient;
    state.ctx.fillRect(b.x - 2, b.y, b.width + 4, roofHeight + 4);
    state.ctx.fillStyle = adjustBrightness(roofColor, 0.14);
    state.ctx.fillRect(b.x, b.y + 3, b.width, 6);

    // awning banners
    const stripeHeight = Math.max(8, roofHeight * 0.6);
    state.ctx.fillStyle = accent;
    state.ctx.fillRect(b.x - 2, b.y + roofHeight - stripeHeight / 2, b.width + 4, stripeHeight);
    state.ctx.fillStyle = adjustBrightness(accent, -0.15);
    for (let i = 0; i < b.width; i += 12) {
      state.ctx.fillRect(b.x - 2 + i, b.y + roofHeight - stripeHeight / 2, 6, stripeHeight);
    }

    // stalls and windows
    const stallWidth = b.width * 0.3;
    const stallHeight = b.height * 0.25;
    state.ctx.fillStyle = adjustBrightness(wallColor, -0.08);
    state.ctx.fillRect(b.x + b.width * 0.15, b.y + b.height - stallHeight, stallWidth, stallHeight);
    state.ctx.fillRect(b.x + b.width * 0.55, b.y + b.height - stallHeight, stallWidth, stallHeight);

    state.ctx.fillStyle = adjustBrightness(accent, 0.28);
    state.ctx.fillRect(b.x + b.width * 0.36, b.y + roofHeight + 8, b.width * 0.18, roofHeight * 0.7);
  };

  const drawSimpleBuilding = (b) => {
    const roofHeight = b.height * 0.2;
    const wallColor = b.wall ?? "#55636f";
    const roofColor = b.roof ?? "#38434e";
    const accent = adjustBrightness(wallColor, 0.12);

    state.ctx.fillStyle = buildingPalette.shadow;
    state.ctx.fillRect(b.x + 4, b.y + b.height - 4, b.width - 8, 4);

    state.ctx.fillStyle = wallColor;
    state.ctx.fillRect(b.x, b.y + roofHeight, b.width, b.height - roofHeight);
    state.ctx.strokeStyle = adjustBrightness(wallColor, -0.32);
    state.ctx.lineWidth = 1.4;
    state.ctx.strokeRect(b.x - 1, b.y + roofHeight - 1, b.width + 2, b.height - roofHeight + 2);

    state.ctx.fillStyle = roofColor;
    state.ctx.fillRect(b.x - 1, b.y, b.width + 2, roofHeight + 3);
    state.ctx.fillStyle = adjustBrightness(roofColor, 0.14);
    state.ctx.fillRect(b.x, b.y + 2, b.width, 4);

    const doorWidth = Math.max(12, b.width * 0.16);
    const doorHeight = Math.max(16, b.height * 0.24);
    state.ctx.fillStyle = adjustBrightness(wallColor, -0.2);
    state.ctx.fillRect(b.x + b.width / 2 - doorWidth / 2, b.y + b.height - doorHeight, doorWidth, doorHeight);

    const windowWidth = Math.max(10, b.width * 0.2);
    const windowHeight = windowWidth * 0.7;
    state.ctx.fillStyle = accent;
    state.ctx.fillRect(b.x + 8, b.y + roofHeight + 6, windowWidth, windowHeight);
    if (b.width > TILE_SIZE * 1.9) {
      state.ctx.fillRect(b.x + b.width - windowWidth - 8, b.y + roofHeight + 6, windowWidth, windowHeight);
    }
  };

  for (const b of buildings) {
    switch (b.kind || b.key) {
      case "cityHall":
      case "city_hall":
        drawCityHall(b);
        break;
      case "shop":
        drawShopBuilding(b);
        break;
      case "house":
        drawHouseBuilding(b);
        break;
      case "market":
        drawMarketBuilding(b);
        break;
      default:
        drawSimpleBuilding(b);
        break;
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

function drawPebble(prop) {
  const ctx = state.ctx;
  if (!ctx) return;
  ctx.fillStyle = adjustBrightness(tilePalette.pathBase, -0.05);
  ctx.beginPath();
  ctx.ellipse(prop.x, prop.y, TILE_SIZE * 0.16, TILE_SIZE * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = adjustBrightness(tilePalette.pathEdge, -0.08);
  ctx.beginPath();
  ctx.ellipse(prop.x + TILE_SIZE * 0.08, prop.y - TILE_SIZE * 0.03, TILE_SIZE * 0.12, TILE_SIZE * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
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
      case "pebble":
        drawPebble(prop);
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
  const bodyRadius = npc.radius * 1.05;
  const bob = Math.sin((state.lastFrameTimestamp ?? 0) / 480 + (npc.bobPhase ?? 0)) * 1.1;
  const mayorCenterX = state.mayor.x + state.mayor.width / 2;
  const mayorCenterY = state.mayor.y + state.mayor.height / 2;
  const dist = Math.hypot(centerX - mayorCenterX, centerY - mayorCenterY);
  const highlight = Math.max(0, 1 - dist / npcHighlightRadius);
  const outlineBase = adjustBrightness(style.body, -0.36);
  const outline = highlight > 0 ? adjustBrightness(outlineBase, highlight * 0.62) : outlineBase;

  const drawCrabShape = () => {
    const width = bodyRadius * 2.4;
    const height = bodyRadius * 1.1;
    state.ctx.beginPath();
    state.ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
    state.ctx.fillStyle = style.body;
    state.ctx.fill();
    state.ctx.strokeStyle = outline;
    state.ctx.lineWidth = 1.9;
    state.ctx.stroke();

    state.ctx.fillStyle = style.accent;
    const clawSize = bodyRadius * 0.7;
    state.ctx.beginPath();
    state.ctx.arc(centerX - width * 0.55, centerY - height * 0.1, clawSize * 0.6, 0, Math.PI * 2);
    state.ctx.arc(centerX + width * 0.55, centerY - height * 0.1, clawSize * 0.6, 0, Math.PI * 2);
    state.ctx.fill();
    state.ctx.strokeStyle = outline;
    state.ctx.stroke();

    // legs
    state.ctx.fillStyle = adjustBrightness(style.accent, -0.1);
    const legY = centerY + height * 0.2;
    for (let i = -2; i <= 2; i += 1) {
      const lx = centerX + (i / 2) * width * 0.35;
      state.ctx.fillRect(lx - 2, legY, 4, height * 0.22);
    }

    // shell stripe
    state.ctx.fillStyle = style.detail;
    state.ctx.fillRect(centerX - width * 0.4, centerY + height * 0.08, width * 0.8, height * 0.16);

    state.ctx.fillStyle = "#0b0b0f";
    state.ctx.beginPath();
    state.ctx.arc(centerX - bodyRadius * 0.3, centerY - height * 0.25, 1.6, 0, Math.PI * 2);
    state.ctx.arc(centerX + bodyRadius * 0.3, centerY - height * 0.25, 1.6, 0, Math.PI * 2);
    state.ctx.fill();
  };

  const drawOtterShape = () => {
    const width = bodyRadius * 1.6;
    const height = bodyRadius * 2.2;
    state.ctx.beginPath();
    state.ctx.ellipse(centerX, centerY - bodyRadius * 0.1, width / 2, height / 2, 0, 0, Math.PI * 2);
    state.ctx.fillStyle = style.body;
    state.ctx.fill();
    state.ctx.strokeStyle = outline;
    state.ctx.lineWidth = 2;
    state.ctx.stroke();

    state.ctx.fillStyle = style.detail;
    state.ctx.beginPath();
    state.ctx.arc(centerX - width * 0.2, centerY - height * 0.6, bodyRadius * 0.35, 0, Math.PI * 2);
    state.ctx.arc(centerX + width * 0.2, centerY - height * 0.6, bodyRadius * 0.35, 0, Math.PI * 2);
    state.ctx.fill();

    state.ctx.fillStyle = style.accent;
    state.ctx.beginPath();
    state.ctx.roundRect?.(
      centerX + width * 0.3,
      centerY + height * 0.15,
      bodyRadius * 0.9,
      bodyRadius * 0.5,
      3,
    );
    if (!state.ctx.roundRect) {
      state.ctx.rect(centerX + width * 0.3, centerY + height * 0.15, bodyRadius * 0.9, bodyRadius * 0.5);
    }
    state.ctx.fill();

    // ears
    state.ctx.fillStyle = adjustBrightness(style.body, -0.25);
    state.ctx.beginPath();
    state.ctx.arc(centerX - width * 0.22, centerY - height * 0.78, bodyRadius * 0.2, 0, Math.PI * 2);
    state.ctx.arc(centerX + width * 0.22, centerY - height * 0.78, bodyRadius * 0.2, 0, Math.PI * 2);
    state.ctx.fill();

    // tail
    state.ctx.fillStyle = style.accent;
    state.ctx.beginPath();
    state.ctx.ellipse(centerX + width * 0.42, centerY + height * 0.25, bodyRadius * 0.38, bodyRadius * 0.18, Math.PI / 12, 0, Math.PI * 2);
    state.ctx.fill();

    state.ctx.fillStyle = "#0b0b0f";
    state.ctx.beginPath();
    state.ctx.arc(centerX - bodyRadius * 0.25, centerY - bodyRadius * 0.2, 1.6, 0, Math.PI * 2);
    state.ctx.arc(centerX + bodyRadius * 0.25, centerY - bodyRadius * 0.2, 1.6, 0, Math.PI * 2);
    state.ctx.fill();
  };

  const drawDuckShape = () => {
    const bodyWidth = bodyRadius * 1.7;
    const bodyHeight = bodyRadius * 1.15;
    state.ctx.beginPath();
    state.ctx.ellipse(centerX, centerY + bodyRadius * 0.05, bodyWidth / 2, bodyHeight / 2, 0, 0, Math.PI * 2);
    state.ctx.fillStyle = style.body;
    state.ctx.fill();
    state.ctx.strokeStyle = outline;
    state.ctx.lineWidth = 2;
    state.ctx.stroke();

    const headRadius = bodyRadius * 0.62;
    const headX = centerX + bodyRadius * 0.05;
    const headY = centerY - bodyRadius * 0.72;
    state.ctx.beginPath();
    state.ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    state.ctx.fillStyle = style.body;
    state.ctx.fill();
    state.ctx.strokeStyle = outline;
    state.ctx.stroke();

    // beak
    state.ctx.fillStyle = style.accent;
    state.ctx.beginPath();
    state.ctx.moveTo(headX + headRadius * 0.6, headY);
    state.ctx.lineTo(headX + headRadius * 1.1, headY + headRadius * 0.18);
    state.ctx.lineTo(headX + headRadius * 0.6, headY + headRadius * 0.35);
    state.ctx.closePath();
    state.ctx.fill();

    // wing and belly
    state.ctx.fillStyle = style.detail;
    state.ctx.beginPath();
    state.ctx.ellipse(centerX - bodyWidth * 0.1, centerY + bodyRadius * 0.3, bodyRadius * 0.55, bodyRadius * 0.28, -Math.PI / 10, 0, Math.PI * 2);
    state.ctx.fill();

    // eyes
    state.ctx.fillStyle = "#0b0b0f";
    state.ctx.beginPath();
    state.ctx.arc(headX - headRadius * 0.2, headY - headRadius * 0.05, 1.7, 0, Math.PI * 2);
    state.ctx.arc(headX + headRadius * 0.12, headY - headRadius * 0.02, 1.4, 0, Math.PI * 2);
    state.ctx.fill();
  };

  const drawDefaultShape = () => {
    const width = bodyRadius * 1.6;
    const height = bodyRadius * 1.9;
    state.ctx.beginPath();
    state.ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
    state.ctx.fillStyle = style.body;
    state.ctx.fill();
    state.ctx.strokeStyle = outline;
    state.ctx.lineWidth = 1.9;
    state.ctx.stroke();

    state.ctx.fillStyle = style.accent;
    state.ctx.fillRect(centerX - width * 0.25, centerY + height * 0.05, width * 0.5, height * 0.28);
  };

  state.ctx.save();
  state.ctx.translate(0, bob);

  if (highlight > 0) {
    state.ctx.save();
    const glow = state.ctx.createRadialGradient(centerX, centerY, bodyRadius * 0.6, centerX, centerY, bodyRadius * 1.6);
    glow.addColorStop(0, `rgba(255,255,255,${0.18 * highlight})`);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    state.ctx.fillStyle = glow;
    state.ctx.beginPath();
    state.ctx.arc(centerX, centerY + npc.radius * 0.2, bodyRadius * 1.7, 0, Math.PI * 2);
    state.ctx.fill();
    state.ctx.restore();
  }

  drawEntityShadow(centerX, centerY + npc.radius * 0.6, npc.radius * 1.1, npc.radius * 0.55, 0.22);
  if (highlight > 0.15) {
    state.ctx.save();
    state.ctx.strokeStyle = adjustBrightness(style.detail, 0.1);
    state.ctx.globalAlpha = 0.4 * highlight;
    state.ctx.lineWidth = 1.1 + highlight * 0.8;
    state.ctx.beginPath();
    state.ctx.arc(centerX, centerY + npc.radius * 0.08, bodyRadius * 1.22, 0, Math.PI * 2);
    state.ctx.stroke();
    state.ctx.restore();
  }

  state.ctx.save();
  state.ctx.strokeStyle = "rgba(6, 8, 12, 0.38)";
  state.ctx.lineWidth = 2.8;
  state.ctx.beginPath();
  state.ctx.arc(centerX, centerY + npc.radius * 0.08, bodyRadius * 1.2, 0, Math.PI * 2);
  state.ctx.stroke();
  state.ctx.restore();

  switch (npc.species) {
    case "crab":
      drawCrabShape();
      break;
    case "otter":
    case "beaver":
      drawOtterShape();
      break;
    case "duck":
      drawDuckShape();
      break;
    default:
      drawDefaultShape();
      break;
  }

  state.ctx.strokeStyle = adjustBrightness(style.body, -0.36);
  state.ctx.lineWidth = 1.8 + highlight * 0.45;
  state.ctx.beginPath();
  state.ctx.arc(centerX, centerY + npc.radius * 0.15, bodyRadius * 1.08, 0, Math.PI * 2);
  state.ctx.stroke();
  state.ctx.strokeStyle = adjustBrightness(style.detail, 0.16);
  state.ctx.globalAlpha = 0.42 + highlight * 0.18;
  state.ctx.lineWidth = 0.9;
  state.ctx.beginPath();
  state.ctx.arc(centerX, centerY + npc.radius * 0.08, bodyRadius * 0.94, 0, Math.PI * 2);
  state.ctx.stroke();
  state.ctx.globalAlpha = 1;

  state.ctx.restore();
}

function drawNpcs() {
  if (!state.ctx) return;
  for (const npc of state.npcs) {
    if (npc.map && npc.map !== state.currentMapKey) continue;
    drawNpcSprite(npc);
  }
}

function drawMayor() {
  if (!state.ctx) return;
  const centerX = state.mayor.x + state.mayor.width / 2;
  const centerY = state.mayor.y + state.mayor.height / 2;
  const isMoving = Math.hypot(state.mayor.velX, state.mayor.velY) > 2;
  const time = (state.lastFrameTimestamp ?? 0) / 1000;
  const idleBob = Math.sin((state.lastFrameTimestamp ?? 0) / 360) * 1.2;
  const bouncePhase = isMoving ? state.mayor.walkPhase : time * 0.55;
  const bounce = fxConfig.mayorBounceEnabled ? Math.sin(bouncePhase * 2) * (isMoving ? 1.4 : 0.9) : 0;
  const tilt = fxConfig.mayorBounceEnabled ? Math.sin(bouncePhase) * (Math.PI / 180) * 0.9 : 0;
  const scale = fxConfig.mayorBounceEnabled ? 1 + Math.sin(bouncePhase * 2) * (isMoving ? 0.013 : 0.008) : 1;
  const bodyRadius = state.mayor.width * 0.34;
  const glowRadius = state.mayor.width * 0.58;
  const outlineColor = adjustBrightness(MAYOR_BODY, -0.4);
  const tentacleCount = 5;

  state.ctx.save();
  const baseY = centerY + bounce + idleBob;
  drawEntityShadow(centerX, baseY + state.mayor.height * 0.2, bodyRadius * 1.6, bodyRadius * 0.6, 0.24);
  state.ctx.translate(centerX, baseY);
  state.ctx.rotate(tilt);
  state.ctx.scale(scale, scale);
  state.ctx.translate(-centerX, -baseY);

  // soft glow halo
  state.ctx.beginPath();
  state.ctx.arc(centerX, baseY + 6, glowRadius, 0, Math.PI * 2);
  state.ctx.closePath();
  state.ctx.fillStyle = MAYOR_GLOW;
  state.ctx.fill();

  // dome head
  state.ctx.beginPath();
  state.ctx.ellipse(centerX, baseY - bodyRadius * 0.62, bodyRadius * 1.05, bodyRadius * 0.88, 0, Math.PI, 0, true);
  state.ctx.closePath();
  state.ctx.fillStyle = MAYOR_BODY;
  state.ctx.fill();
  state.ctx.strokeStyle = outlineColor;
  state.ctx.lineWidth = 3.2;
  state.ctx.stroke();
  state.ctx.strokeStyle = adjustBrightness(MAYOR_BODY, 0.18);
  state.ctx.lineWidth = 1.6;
  state.ctx.stroke();
  state.ctx.fillStyle = adjustBrightness(MAYOR_BODY, 0.14);
  state.ctx.beginPath();
  state.ctx.ellipse(centerX + bodyRadius * 0.12, baseY - bodyRadius * 0.72, bodyRadius * 0.35, bodyRadius * 0.25, 0, 0, Math.PI * 2);
  state.ctx.fill();

  // hat
  state.ctx.fillStyle = MAYOR_HAT;
  state.ctx.fillRect(centerX - bodyRadius * 0.55, baseY - bodyRadius * 1.05, bodyRadius * 1.1, bodyRadius * 0.18);
  state.ctx.beginPath();
  state.ctx.roundRect?.(
    centerX - bodyRadius * 0.38,
    baseY - bodyRadius * 1.45,
    bodyRadius * 0.76,
    bodyRadius * 0.52,
    bodyRadius * 0.12,
  );
  if (!state.ctx.roundRect) {
    state.ctx.rect(centerX - bodyRadius * 0.38, baseY - bodyRadius * 1.45, bodyRadius * 0.76, bodyRadius * 0.52);
  }
  state.ctx.fill();

  // mantle
  state.ctx.beginPath();
  state.ctx.ellipse(centerX, baseY + bodyRadius * 0.05, bodyRadius * 1.05, bodyRadius, 0, 0, Math.PI * 2);
  state.ctx.fillStyle = MAYOR_BODY;
  state.ctx.fill();
  state.ctx.strokeStyle = outlineColor;
  state.ctx.lineWidth = 2.6;
  state.ctx.stroke();
  state.ctx.strokeStyle = adjustBrightness(MAYOR_BODY, 0.16);
  state.ctx.lineWidth = 1.4;
  state.ctx.stroke();
  state.ctx.strokeStyle = adjustBrightness(MAYOR_BODY, 0.3);
  state.ctx.lineWidth = 0.9;
  state.ctx.stroke();

  // collar
  state.ctx.fillStyle = MAYOR_CORAL;
  state.ctx.beginPath();
  state.ctx.ellipse(centerX, baseY + bodyRadius * 0.28, bodyRadius * 0.95, bodyRadius * 0.32, 0, 0, Math.PI * 2);
  state.ctx.fill();
  state.ctx.strokeStyle = adjustBrightness(MAYOR_CORAL, -0.2);
  state.ctx.stroke();
  state.ctx.strokeStyle = adjustBrightness(MAYOR_CORAL, 0.2);
  state.ctx.lineWidth = 0.8;
  state.ctx.stroke();

  // tentacles
  for (let i = 0; i < tentacleCount; i += 1) {
    const offset = (i - (tentacleCount - 1) / 2) * (bodyRadius * 0.5);
    const sway = Math.sin(bouncePhase * 2 + i * 0.6) * bodyRadius * 0.08;
    const tentacleY = baseY + bodyRadius * 0.78;
    state.ctx.beginPath();
    state.ctx.moveTo(centerX + offset - bodyRadius * 0.2 + sway, tentacleY);
    state.ctx.quadraticCurveTo(
      centerX + offset,
      tentacleY + bodyRadius * 0.7,
      centerX + offset + bodyRadius * 0.24 + sway,
      tentacleY - bodyRadius * 0.05,
    );
    state.ctx.quadraticCurveTo(
      centerX + offset + bodyRadius * 0.12,
      tentacleY + bodyRadius * 0.55,
      centerX + offset - bodyRadius * 0.18 + sway,
      tentacleY - bodyRadius * 0.1,
    );
    state.ctx.closePath();
    state.ctx.fillStyle = MAYOR_SUIT;
    state.ctx.fill();
    state.ctx.strokeStyle = adjustBrightness(MAYOR_SUIT, -0.28);
    state.ctx.lineWidth = 2.2;
    state.ctx.stroke();

    state.ctx.fillStyle = MAYOR_ACCENT;
    state.ctx.beginPath();
    state.ctx.ellipse(centerX + offset, tentacleY + bodyRadius * 0.28, bodyRadius * 0.18, bodyRadius * 0.14, 0, 0, Math.PI * 2);
    state.ctx.fill();
  }

  // face details
  const eyeY = baseY - bodyRadius * 0.4;
  state.ctx.fillStyle = "#0b0b0f";
  state.ctx.beginPath();
  state.ctx.arc(centerX - bodyRadius * 0.25, eyeY, 2.4, 0, Math.PI * 2);
  state.ctx.fill();

  state.ctx.beginPath();
  state.ctx.arc(centerX + bodyRadius * 0.28, eyeY, 3.4, 0, Math.PI * 2);
  state.ctx.strokeStyle = MAYOR_MONOCLE;
  state.ctx.lineWidth = 2;
  state.ctx.stroke();
  state.ctx.fillStyle = "#0b0b0f";
  state.ctx.beginPath();
  state.ctx.arc(centerX + bodyRadius * 0.28, eyeY, 1.8, 0, Math.PI * 2);
  state.ctx.fill();

  state.ctx.beginPath();
  state.ctx.moveTo(centerX + bodyRadius * 0.38, eyeY + 2);
  state.ctx.quadraticCurveTo(centerX + bodyRadius * 0.68, eyeY + bodyRadius * 0.18, centerX + bodyRadius * 0.55, eyeY + bodyRadius * 0.34);
  state.ctx.strokeStyle = adjustBrightness(MAYOR_MONOCLE, -0.08);
  state.ctx.lineWidth = 1.2;
  state.ctx.stroke();

  // smile hint
  state.ctx.strokeStyle = adjustBrightness(MAYOR_BODY, -0.18);
  state.ctx.lineWidth = 1.4;
  state.ctx.beginPath();
  state.ctx.arc(centerX, baseY - bodyRadius * 0.2, bodyRadius * 0.32, Math.PI * 0.1, Math.PI * 0.9);
  state.ctx.stroke();

  state.ctx.restore();
}

function drawChatBubbles() {
  if (!state.ctx) return;
  const ctx = state.ctx;
  const deltaMs = state.lastDeltaMs || 16;
  for (let i = chatBubbles.length - 1; i >= 0; i -= 1) {
    const bubble = chatBubbles[i];
    bubble.remaining -= deltaMs;
    bubble.y -= deltaMs * (bubble.riseRate ?? 0.0125);
    if (bubble.remaining <= 0) {
      chatBubbles.splice(i, 1);
      continue;
    }

    const alpha = Math.max(0, bubble.remaining / bubble.total);
    const easedAlpha = Math.pow(alpha, 0.82);
    const paddingX = 12;
    const paddingY = 8;
    ctx.save();
    ctx.globalAlpha = Math.min(1, easedAlpha * 1.24);
    ctx.font = "700 16px 'Segoe UI', system-ui, sans-serif";
    const textWidth = ctx.measureText(bubble.text).width;
    const bubbleWidth = textWidth + paddingX * 2;
    const bubbleHeight = 24;
    const x = bubble.x - bubbleWidth / 2;
    const y = bubble.y - bubbleHeight - 6;

    const bg = ctx.createLinearGradient(x, y, x, y + bubbleHeight);
    bg.addColorStop(0, "rgba(10, 16, 26, 0.94)");
    bg.addColorStop(1, "rgba(14, 24, 36, 0.9)");
    ctx.fillStyle = bg;
    ctx.strokeStyle = "rgba(240, 250, 255, 0.9)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect?.(x, y, bubbleWidth, bubbleHeight, 6);
    if (!ctx.roundRect) {
      ctx.rect(x, y, bubbleWidth, bubbleHeight);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f7fbff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
    ctx.shadowBlur = 6;
    ctx.fillText(bubble.text, bubble.x - textWidth / 2, y + bubbleHeight - paddingY);
    ctx.restore();
  }
}

function drawEdgeVignette() {
  if (!state.ctx || !state.canvas) return;
  if (!fxConfig.vignetteEnabled) return;
  const ctx = state.ctx;
  const cx = state.canvas.width / 2;
  const cy = state.canvas.height / 2;
  const radius = Math.sqrt(cx * cx + cy * cy) * 1.2;
  const gradient = ctx.createRadialGradient(cx, cy, radius * 0.38, cx, cy, radius);
  gradient.addColorStop(0.22, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
}

function drawPixelGrid() {
  if (!state.ctx || !state.canvas || !fxConfig.pixelGridEnabled) return;
  const ctx = state.ctx;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.0006)";
  ctx.lineWidth = 0.3;
  const spacing = TILE_SIZE * 2;
  for (let x = 0; x <= state.canvas.width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, state.canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= state.canvas.height; y += spacing) {
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
  ctx.globalAlpha = 0.0018;
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  for (let y = 0; y < state.canvas.height; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(state.canvas.width, y + 0.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.006;
  ctx.strokeStyle = "rgba(255,255,255,0.012)";
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
  const points = [
    { x, y },
    { x: x + width, y },
    { x, y: y + height },
    { x: x + width, y: y + height },
  ];
  for (const p of points) {
    const tileX = Math.floor(p.x / TILE_SIZE);
    const tileY = Math.floor(p.y / TILE_SIZE);
    if (state.collisionGrid?.[tileY]?.[tileX]) {
      return true;
    }
  }

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
  state.doorCooldown = Math.max(0, state.doorCooldown - deltaMs);
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
    state.mayor.walkPhase = (state.mayor.walkPhase + deltaSeconds * 5.4) % (Math.PI * 2);
  }

  const tileX = Math.floor((state.mayor.x + state.mayor.width / 2) / TILE_SIZE);
  const tileY = Math.floor((state.mayor.y + state.mayor.height / 2) / TILE_SIZE);
  const door = findDoorAt(tileX, tileY);
  if (door && state.doorCooldown <= 0) {
    state.doorCooldown = 400;
    warpToDoor(door);
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
  drawChatBubbles();
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

  updateNpcSchedules(deltaMs);
  updateMayor(deltaMs);
  updateGreetHint();
  updateMailboxHint();
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
  if (state.ui.btnFast) {
    state.ui.btnFast.addEventListener("click", onFastClicked);
  }
  if (state.ui.btnEndDay) {
    state.ui.btnEndDay.addEventListener("click", onEndDayClicked);
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
  await loadMapData();
  await loadMailboxTasks();
  await loadNpcData();

  state.ui.hud = document.getElementById("hud");
  state.ui.stats = document.getElementById("stats");
  state.ui.overlay = document.getElementById("overlay");
  state.ui.overlayTitle = document.getElementById("overlayTitle");
  state.ui.overlayBody = document.getElementById("overlayBody");
  state.ui.btnStart = document.getElementById("btnStart");
  state.ui.btnPause = document.getElementById("btnPause");
  state.ui.btnFast = document.getElementById("btnFast");
  state.ui.btnMailbox = document.getElementById("btnMailbox");
  state.ui.btnEndDay = document.getElementById("btnEndDay");
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
  state.ui.greetHint = document.getElementById("greetHint");
  state.ui.mailboxHint = document.getElementById("mailboxHint");
  state.ui.taskHud = document.getElementById("taskHud");

  state.canvas = document.getElementById("game");
  state.ctx = state.canvas ? state.canvas.getContext("2d") : null;

  applyMap("town", state.maps.town?.spawn ?? { x: 7, y: 6 });
  state.mayor.x = (state.spawnPoint?.x ?? 7) * TILE_SIZE;
  state.mayor.y = (state.spawnPoint?.y ?? 6) * TILE_SIZE;

  setupUI();
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  state.loopStarted = true;
  setTimeMode("paused");
  window.requestAnimationFrame(gameLoop);
}

window.addEventListener("load", init);
