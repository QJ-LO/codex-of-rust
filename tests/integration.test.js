import assert from 'assert';
import {
  createGameState,
  loadLevel,
  rotateGear,
  rotateMirror,
  movePlayer,
  updatePlayerPosition,
  checkLevelComplete,
  isWalkable
} from '../src/engine/state.js';
import chapter1 from '../src/levels/chapter1.json' with { type: 'json' };

function waitForPlayerArrival(state) {
  let iterations = 0;
  while (state.player.moving && iterations < 1000) {
    updatePlayerPosition(state, 16);
    iterations++;
  }
}

function testLevel1_1_requiresGearBridge() {
  const state = createGameState();
  loadLevel(state, chapter1.levels[0]);

  assert.strictEqual(state.rules[0].active.object, 'STOP', 'gear starts as STOP');
  assert.strictEqual(isWalkable(state.currentLevel, 2, 3, state.rules, state.openDoors), false, 'gear block is impassable initially');

  rotateGear(state, state.currentLevel.gears[0]);
  assert.strictEqual(state.rules[0].active.object, 'BRIDGE', 'gear becomes BRIDGE');
  assert.strictEqual(isWalkable(state.currentLevel, 2, 3, state.rules, state.openDoors), true, 'gear block becomes walkable');

  console.log('✓ gear bridge rule works');
}

function testLevel1_1_lightOpensDoor() {
  const state = createGameState();
  loadLevel(state, chapter1.levels[0]);

  rotateGear(state, state.currentLevel.gears[0]);

  const mirror1 = state.currentLevel.mirrors.find(m => m.x === 6 && m.y === 5);
  const mirror2 = state.currentLevel.mirrors.find(m => m.x === 9 && m.y === 5);

  assert.strictEqual(mirror1.angle, 0, 'mirror1 starts at 0');
  assert.strictEqual(mirror2.angle, 0, 'mirror2 starts at 0');

  while (mirror1.angle !== 135) rotateMirror(state, mirror1);
  while (mirror2.angle !== 135) rotateMirror(state, mirror2);

  const receiverHit = state.lightPaths.some(path =>
    path.hits.some(hit => hit.x === 9 && hit.y === 7)
  );
  assert.strictEqual(receiverHit, true, 'light should hit receiver at (9,7)');
  assert.strictEqual(state.openDoors.has('9,6'), true, 'door at (9,6) should be open');

  console.log('✓ light conduction opens door');
}

function testLevel1_1_complete() {
  const state = createGameState();
  loadLevel(state, chapter1.levels[0]);

  rotateGear(state, state.currentLevel.gears[0]);

  const mirror1 = state.currentLevel.mirrors.find(m => m.x === 6 && m.y === 5);
  const mirror2 = state.currentLevel.mirrors.find(m => m.x === 9 && m.y === 5);

  while (mirror1.angle !== 135) rotateMirror(state, mirror1);
  while (mirror2.angle !== 135) rotateMirror(state, mirror2);

  movePlayer(state, 6, 5);
  waitForPlayerArrival(state);

  movePlayer(state, 9, 5);
  waitForPlayerArrival(state);

  movePlayer(state, 9, 6);
  waitForPlayerArrival(state);

  movePlayer(state, 11, 7);
  waitForPlayerArrival(state);

  assert.strictEqual(checkLevelComplete(state), true, 'level 1-1 should complete');
  console.log('✓ level 1-1 complete sequence works');
}

testLevel1_1_requiresGearBridge();
testLevel1_1_lightOpensDoor();
testLevel1_1_complete();
console.log('All integration tests passed.');
