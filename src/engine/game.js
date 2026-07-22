import {
  STATES,
  createGameState,
  loadLevel,
  rotateGear,
  rotateMirror,
  movePlayer,
  updatePlayerPosition,
  checkLevelComplete
} from './state.js';
import { createHUD } from '../ui/hud.js';

export async function initGame(renderer, inputFactory, levelData) {
  const state = createGameState();
  state.levels = levelData.levels;

  const callbacks = {
    onStartGame: () => {
      loadLevel(state, state.levels[0]);
    },
    onRotateGear: (gearData) => {
      rotateGear(state, gearData);
    },
    onRotateMirror: (mirror) => {
      rotateMirror(state, mirror);
    },
    onMoveTo: (tileX, tileY) => {
      movePlayer(state, tileX, tileY);
    },
    onResetLevel: () => {
      if (state.currentLevel) {
        const original = state.levels.find(l => l.id === state.currentLevel.id);
        loadLevel(state, original);
      }
    }
  };

  const input = inputFactory(state, callbacks);
  const hud = createHUD(renderer.ctx.canvas, state, callbacks);

  let lastTime = performance.now();

  function loop(now) {
    const dt = now - lastTime;
    lastTime = now;

    if (state.currentState === STATES.PLAYING) {
      updatePlayerPosition(state, dt);

      if (checkLevelComplete(state)) {
        state.currentState = STATES.LEVEL_COMPLETE;
        state.completedLevels.add(state.currentLevel.id);
        setTimeout(() => {
          const nextIndex = state.levels.indexOf(state.currentLevel) + 1;
          if (nextIndex < state.levels.length) {
            loadLevel(state, state.levels[nextIndex]);
          } else {
            state.currentState = STATES.CHAPTER_COMPLETE;
          }
        }, 2500);
      }
    }

    renderer.render(state);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  return { state, input, hud };
}
