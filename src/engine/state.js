export const STATES = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  CHAPTER_COMPLETE: 'CHAPTER_COMPLETE'
};

export function createGameState() {
  return {
    currentState: STATES.MENU,
    levels: [],
    currentLevel: null,
    rules: [],
    player: { x: 0, y: 0, targetX: 0, targetY: 0, moving: false },
    completedLevels: new Set(),
    openDoors: new Set(),
    lightPaths: []
  };
}

export function loadLevel(state, levelData) {
  state.currentLevel = JSON.parse(JSON.stringify(levelData));
  state.openDoors = new Set();
  updateRules(state);
  const ts = state.currentLevel.tileSize;
  state.player = {
    x: levelData.playerStart.x * ts + ts / 2,
    y: levelData.playerStart.y * ts + ts / 2,
    targetX: levelData.playerStart.x * ts + ts / 2,
    targetY: levelData.playerStart.y * ts + ts / 2,
    moving: false
  };
  computeLightPaths(state);
  state.currentState = STATES.PLAYING;
}

function getActiveRuleFromGear(gearData) {
  return {
    subject: gearData.subjectOptions[gearData.subjectIndex],
    verb: gearData.verbOptions[gearData.verbIndex],
    object: gearData.objectOptions[gearData.objectIndex]
  };
}

export function updateRules(state) {
  const level = state.currentLevel;
  if (!level) return;
  state.rules = level.gears.map(g => ({
    gear: g,
    active: getActiveRuleFromGear(g)
  }));
}

export function getEffectsFromRules(rules) {
  const effects = {
    gearIsBridge: false,
    rustIsVoid: false,
    lightIsKey: false,
    shadowIsSolid: false
  };
  for (const rule of rules) {
    const { subject, object } = rule.active;
    const key = `${subject.toLowerCase()}Is${object.charAt(0).toUpperCase() + object.slice(1).toLowerCase()}`;
    if (key in effects) effects[key] = true;
  }
  return effects;
}

export function rotateGear(state, gearData) {
  gearData.objectIndex = (gearData.objectIndex + 1) % gearData.objectOptions.length;
  updateRules(state);
  computeLightPaths(state);
}

export function rotateMirror(state, mirror) {
  mirror.angle = (mirror.angle + 45) % 360;
  computeLightPaths(state);
}

export function movePlayer(state, tileX, tileY) {
  const level = state.currentLevel;
  if (!level) return;
  const ts = level.tileSize;
  if (isWalkable(level, tileX, tileY, state.rules, state.openDoors)) {
    state.player.targetX = tileX * ts + ts / 2;
    state.player.targetY = tileY * ts + ts / 2;
    state.player.moving = true;
  }
}

export function updatePlayerPosition(state, dt) {
  const p = state.player;
  if (!p.moving) return;
  const speed = 240;
  const dx = p.targetX - p.x;
  const dy = p.targetY - p.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < speed * dt / 1000) {
    p.x = p.targetX;
    p.y = p.targetY;
    p.moving = false;
  } else {
    p.x += (dx / dist) * speed * dt / 1000;
    p.y += (dy / dist) * speed * dt / 1000;
  }
}

export function isWalkable(level, tileX, tileY, rules, openDoors) {
  if (tileX < 0 || tileX >= level.width || tileY < 0 || tileY >= level.height) return false;
  const ch = level.tiles[tileY][tileX];
  if (ch === '#') return false;
  const effects = getEffectsFromRules(rules);
  if (ch === 'G' && !effects.gearIsBridge) return false;
  if ((ch === 'R' || ch === 'D') && !openDoors.has(`${tileX},${tileY}`) && !effects.rustIsVoid) return false;
  return true;
}

export function checkLevelComplete(state) {
  const level = state.currentLevel;
  if (!level) return false;
  const ts = level.tileSize;
  const tx = Math.floor(state.player.x / ts);
  const ty = Math.floor(state.player.y / ts);
  return tx === level.altar.x && ty === level.altar.y;
}

export function computeLightPaths(state) {
  const level = state.currentLevel;
  if (!level || !level.lights) {
    state.lightPaths = [];
    return;
  }

  const effects = getEffectsFromRules(state.rules);
  const opened = new Set(state.openDoors);
  const paths = [];

  for (const light of level.lights) {
    if (!light.active) continue;
    const path = traceLight(level, light, effects);
    paths.push(path);
    for (const hit of path.hits) {
      const receiver = level.receivers.find(r => r.x === hit.x && r.y === hit.y);
      if (receiver && receiver.direction === hit.from) {
        opened.add(receiver.opens);
      }
    }
  }

  state.lightPaths = paths;
  state.openDoors = opened;
}

function traceLight(level, light, effects) {
  const segments = [];
  const hits = [];
  let x = light.x;
  let y = light.y;
  let dir = light.direction;
  const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  for (let step = 0; step < 30; step++) {
    const [dx, dy] = dirs[dir];
    x += dx;
    y += dy;

    if (x < 0 || x >= level.width || y < 0 || y >= level.height) break;

    segments.push({ x, y });

    const tile = level.tiles[y][x];
    if (tile === '#' && !effects.lightIsKey) break;

    const mirror = level.mirrors.find(m => m.x === x && m.y === y);
    if (mirror) {
      dir = reflect(dir, mirror.angle);
      continue;
    }

    const receiver = level.receivers.find(r => r.x === x && r.y === y);
    if (receiver) {
      hits.push({ x, y, from: opposite(dir) });
      break;
    }
  }

  return { segments, hits };
}

function opposite(dir) {
  return { up: 'down', down: 'up', left: 'right', right: 'left' }[dir];
}

function reflect(dir, angle) {
  if (angle === 45) {
    if (dir === 'up') return 'right';
    if (dir === 'left') return 'down';
    if (dir === 'down') return 'left';
    if (dir === 'right') return 'up';
  }
  if (angle === 135) {
    if (dir === 'up') return 'left';
    if (dir === 'right') return 'down';
    if (dir === 'down') return 'right';
    if (dir === 'left') return 'up';
  }
  return dir;
}
