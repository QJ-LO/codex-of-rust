export function createInput(canvas, state, callbacks) {
  function handlePointerDown(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (state.currentState === 'MENU') {
      callbacks.onStartGame();
      return;
    }

    if (state.currentState !== 'PLAYING') return;

    const level = state.currentLevel;
    if (!level) return;

    const tileSize = level.tileSize;
    const offsetX = (canvas.width - level.width * tileSize) / 2;
    const offsetY = (canvas.height - level.height * tileSize) / 2;

    if (x < offsetX || y < offsetY) return;

    const tileX = Math.floor((x - offsetX) / tileSize);
    const tileY = Math.floor((y - offsetY) / tileSize);

    if (tileX < 0 || tileX >= level.width || tileY < 0 || tileY >= level.height) return;

    const clickedGear = level.gears.find(g => g.x === tileX && g.y === tileY);
    if (clickedGear) {
      callbacks.onRotateGear(clickedGear);
      return;
    }

    const clickedMirror = level.mirrors?.find(m => m.x === tileX && m.y === tileY);
    if (clickedMirror) {
      callbacks.onRotateMirror(clickedMirror);
      return;
    }

    callbacks.onMoveTo(tileX, tileY);
  }

  canvas.addEventListener('pointerdown', handlePointerDown);

  return {
    destroy() {
      canvas.removeEventListener('pointerdown', handlePointerDown);
    }
  };
}
