import { createRenderer } from './engine/renderer.js';
import { createInput } from './engine/input.js';
import { initGame } from './engine/game.js';
import chapter1 from './levels/chapter1.json';

async function main() {
  const canvas = document.getElementById('game-canvas');
  const renderer = createRenderer(canvas);

  await initGame(renderer, (state, callbacks) => createInput(canvas, state, callbacks), chapter1);
}

main().catch(console.error);
