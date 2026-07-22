const PALETTE = {
  bg: '#120d0b',
  wallBase: '#1c1411',
  wallLight: '#2e211c',
  wallDark: '#0f0b09',
  wallHighlight: '#3d2c25',
  floorA: '#241a16',
  floorB: '#1f1613',
  floorLine: '#362720',
  rust: '#6b3020',
  rustLight: '#8f412c',
  rustDark: '#3d1911',
  gear: '#5a4d3f',
  gearLight: '#7d6b58',
  gearDark: '#3b3229',
  gearGold: '#b8933f',
  gearGoldLight: '#e8c45c',
  player: '#d4b04a',
  altar: '#9b59b6',
  altarLight: '#d2a6e8',
  altarGlow: 'rgba(155, 89, 182, 0.4)',
  lightBeam: 'rgba(255, 230, 150, 0.85)',
  lightGlow: 'rgba(255, 200, 80, 0.25)',
  text: '#e8dcc8',
  textDim: '#a89880',
  panel: 'rgba(18, 13, 11, 0.92)',
  door: '#4a352b'
};

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const renderer = {
    ctx,
    width: canvas.width,
    height: canvas.height,
    time: 0,
    render(state) {
      renderer.time += 0.016;
      renderGame(renderer, state);
    }
  };
  return renderer;
}

function renderGame(renderer, state) {
  const { ctx, width, height, time } = renderer;

  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, width, height);

  if (state.currentState === 'MENU') {
    renderMenu(ctx, width, height, time);
    return;
  }

  if (!state.currentLevel) return;

  const level = state.currentLevel;
  const ts = level.tileSize;
  const offsetX = (width - level.width * ts) / 2;
  const offsetY = (height - level.height * ts) / 2;

  renderBackground(ctx, width, height);
  renderLevel(ctx, level, offsetX, offsetY, state, time);
  renderLightPaths(ctx, state.lightPaths, offsetX, offsetY, ts, time);
  renderPlayer(ctx, state.player, offsetX, offsetY, ts, time);
  renderGears(ctx, level.gears, offsetX, offsetY, ts, state.rules, time);
  renderActiveRules(ctx, state.rules, width, height, time);

  if (state.currentState === 'LEVEL_COMPLETE') {
    renderOverlay(ctx, width, height, '仪式完成', '第一重封印已解开', time);
  } else if (state.currentState === 'CHAPTER_COMPLETE') {
    renderOverlay(ctx, width, height, '章节完成', '奖励链接：https://pan.quark.cn/s/32abb700ee52', time);
  }
}

function renderMenu(ctx, width, height, time) {
  const cx = width / 2;
  const cy = height / 2;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.8);
  grad.addColorStop(0, '#2a1d18');
  grad.addColorStop(1, PALETTE.bg);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  drawOrnateFrame(ctx, cx - 260, cy - 160, 520, 320, time);

  ctx.fillStyle = PALETTE.gearGoldLight;
  ctx.font = 'bold 56px "Cinzel", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = PALETTE.gearGold;
  ctx.shadowBlur = 20 + Math.sin(time * 2) * 5;
  ctx.fillText('锈蚀法典', cx, cy - 50);
  ctx.shadowBlur = 0;

  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '18px "Cinzel", serif';
  ctx.fillText('CODEX OF RUST', cx, cy - 10);

  ctx.fillStyle = PALETTE.text;
  ctx.font = '20px sans-serif';
  ctx.fillText('点击任意处，开启齿轮与光的审判', cx, cy + 70);
}

function renderBackground(ctx, width, height) {
  const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
  grad.addColorStop(0, '#1f1613');
  grad.addColorStop(1, PALETTE.bg);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.3, width / 2, height / 2, Math.max(width, height) * 0.8);
  vignette.addColorStop(0, 'transparent');
  vignette.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

function renderLevel(ctx, level, offsetX, offsetY, state, time) {
  const ts = level.tileSize;
  const effects = getEffects(state.rules);

  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      const ch = level.tiles[y][x];
      const px = offsetX + x * ts;
      const py = offsetY + y * ts;

      drawFloorTile(ctx, px, py, ts, (x + y) % 2 === 0, x, y);

      if (ch === '#') {
        drawWall(ctx, px, py, ts, time);
      } else if (ch === 'G') {
        drawGearTile(ctx, px, py, ts, effects.gearIsBridge, time);
      } else if (ch === 'R' || ch === 'D') {
        drawRustTile(ctx, px, py, ts, effects.rustIsVoid, ch === 'D', state.openDoors, x, y, time);
      } else if (ch === 'A') {
        drawAltar(ctx, px, py, ts, time);
      } else if (ch === 'S') {
        drawStartMarker(ctx, px, py, ts, time);
      }

      const light = level.lights?.find(l => l.x === x && l.y === y);
      if (light) drawLightSource(ctx, px, py, ts, light, time);

      const mirror = level.mirrors?.find(m => m.x === x && m.y === y);
      if (mirror) drawMirror(ctx, px, py, ts, mirror, time);

      const receiver = level.receivers?.find(r => r.x === x && r.y === y);
      if (receiver) drawReceiver(ctx, px, py, ts, receiver, state.lightPaths, time);

      const symbol = level.symbols?.find(s => s.x === x && s.y === y);
      if (symbol) drawSymbol(ctx, px, py, ts, symbol);
    }
  }
}

function drawFloorTile(ctx, x, y, size, alt, tx, ty) {
  const base = alt ? PALETTE.floorA : PALETTE.floorB;
  ctx.fillStyle = base;
  ctx.fillRect(x, y, size, size);

  ctx.strokeStyle = PALETTE.floorLine;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

  const inset = size * 0.15;
  ctx.strokeStyle = 'rgba(54, 39, 32, 0.4)';
  ctx.strokeRect(x + inset, y + inset, size - inset * 2, size - inset * 2);

  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(x + size - 4, y, 4, size);
  ctx.fillRect(x, y + size - 4, size, 4);
}

function drawWall(ctx, x, y, size, time) {
  const depth = size * 0.12;
  const top = size * 0.08;

  ctx.fillStyle = PALETTE.wallDark;
  ctx.fillRect(x + depth, y + depth, size - depth, size - depth);

  const grad = ctx.createLinearGradient(x, y, x + size, y + size);
  grad.addColorStop(0, PALETTE.wallBase);
  grad.addColorStop(0.5, PALETTE.wallLight);
  grad.addColorStop(1, PALETTE.wallBase);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, size - depth, size - depth);

  ctx.strokeStyle = PALETTE.wallHighlight;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 2, y + 2, size - depth - 4, size - depth - 4);

  ctx.strokeStyle = PALETTE.wallDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + size - depth, y + depth);
  ctx.lineTo(x + size - depth, y + size - depth);
  ctx.lineTo(x + depth, y + size - depth);
  ctx.stroke();

  const brickH = size / 3;
  const brickW = size / 2;
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  for (let row = 0; row < 3; row++) {
    const offset = (row % 2) * (brickW / 2);
    for (let col = -1; col < 3; col++) {
      const bx = x + offset + col * brickW;
      const by = y + row * brickH;
      ctx.strokeRect(bx, by, brickW, brickH);
    }
  }

  ctx.fillStyle = `rgba(201, 162, 39, ${0.03 + Math.sin(time * 1.5 + x * 0.1 + y * 0.1) * 0.02})`;
  ctx.fillRect(x, y, size - depth, size - depth);
}

function drawGearTile(ctx, x, y, size, isBridge, time) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.32;

  if (isBridge) {
    const grad = ctx.createLinearGradient(x, y + size / 2 - 6, x, y + size / 2 + 6);
    grad.addColorStop(0, PALETTE.gearDark);
    grad.addColorStop(0.5, PALETTE.gearGoldLight);
    grad.addColorStop(1, PALETTE.gearDark);
    ctx.fillStyle = grad;
    ctx.fillRect(x + 6, y + size / 2 - 6, size - 12, 12);

    ctx.strokeStyle = PALETTE.gearGold;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 6, y + size / 2 - 6, size - 12, 12);

    ctx.fillStyle = PALETTE.gearGoldLight;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('桥', cx, cy);
    return;
  }

  const rotation = time * 0.5;
  drawGearShape(ctx, cx, cy, r, 8, rotation, PALETTE.gear, PALETTE.gearDark, PALETTE.gearLight);

  ctx.fillStyle = PALETTE.gearDark;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = PALETTE.gearLight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2);
  ctx.stroke();
}

function drawGearShape(ctx, cx, cy, radius, teeth, rotation, fill, dark, light) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  ctx.beginPath();
  const outer = radius;
  const inner = radius * 0.72;
  const toothAngle = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a1 = i * toothAngle - toothAngle * 0.15;
    const a2 = i * toothAngle + toothAngle * 0.15;
    const a3 = (i + 0.5) * toothAngle - toothAngle * 0.15;
    const a4 = (i + 0.5) * toothAngle + toothAngle * 0.15;
    if (i === 0) ctx.moveTo(Math.cos(a1) * inner, Math.sin(a1) * inner);
    ctx.lineTo(Math.cos(a1) * outer, Math.sin(a1) * outer);
    ctx.lineTo(Math.cos(a2) * outer, Math.sin(a2) * outer);
    ctx.lineTo(Math.cos(a3) * inner, Math.sin(a3) * inner);
    ctx.lineTo(Math.cos(a4) * inner, Math.sin(a4) * inner);
  }
  ctx.closePath();

  const grad = ctx.createRadialGradient(0, 0, inner * 0.2, 0, 0, outer);
  grad.addColorStop(0, light);
  grad.addColorStop(0.6, fill);
  grad.addColorStop(1, dark);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

function drawRustTile(ctx, x, y, size, isVoid, isDoor, openDoors, tx, ty, time) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const isOpen = openDoors.has(`${tx},${ty}`);

  if (isDoor && isOpen) {
    ctx.fillStyle = PALETTE.floorB;
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
    ctx.strokeStyle = PALETTE.gearGold;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);

    ctx.fillStyle = PALETTE.gearGold;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('启', cx, cy);
    return;
  }

  if (isVoid) {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(x + 3, y + 3, size - 6, size - 6);
    ctx.strokeStyle = '#2a1d18';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 5, y + 5, size - 10, size - 10);

    if (isDoor) {
      ctx.strokeStyle = PALETTE.gearGold;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x + 8, y + 8, size - 16, size - 16);
      ctx.setLineDash([]);
    }
    return;
  }

  const grad = ctx.createRadialGradient(cx, cy, size * 0.1, cx, cy, size * 0.5);
  grad.addColorStop(0, PALETTE.rustLight);
  grad.addColorStop(1, PALETTE.rust);
  ctx.fillStyle = grad;
  ctx.fillRect(x + 3, y + 3, size - 6, size - 6);

  ctx.strokeStyle = PALETTE.rustDark;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 3, y + 3, size - 6, size - 6);

  for (let i = 0; i < 4; i++) {
    const rx = x + 8 + Math.random() * (size - 16);
    const ry = y + 8 + Math.random() * (size - 16);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.arc(rx, ry, 2 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (isDoor) {
    ctx.strokeStyle = '#3d1911';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 8, y + 8, size - 16, size - 16);

    ctx.fillStyle = PALETTE.textDim;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('封', cx, cy);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('锈', cx, cy);
  }
}

function drawAltar(ctx, x, y, size, time) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.38;

  const pulse = 1 + Math.sin(time * 3) * 0.08;

  ctx.fillStyle = PALETTE.altarGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.4 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = PALETTE.altar;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + time * 0.3;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.7);
  grad.addColorStop(0, PALETTE.altarLight);
  grad.addColorStop(1, PALETTE.altar);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('核', cx, cy);
}

function drawStartMarker(ctx, x, y, size, time) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.22;
  const pulse = 1 + Math.sin(time * 4) * 0.15;

  ctx.strokeStyle = `rgba(201, 162, 39, ${0.4 + Math.sin(time * 4) * 0.2})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(201, 162, 39, 0.15)';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
  ctx.fill();
}

function drawLightSource(ctx, x, y, size, light, time) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.22;
  const pulse = 1 + Math.sin(time * 4) * 0.1;

  ctx.fillStyle = 'rgba(255, 220, 120, 0.2)';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.8 * pulse, 0, Math.PI * 2);
  ctx.fill();

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, '#fff8d0');
  grad.addColorStop(0.5, PALETTE.gearGoldLight);
  grad.addColorStop(1, 'rgba(255, 200, 80, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('光', cx, cy);
}

function drawMirror(ctx, x, y, size, mirror, time) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.28;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((mirror.angle * Math.PI) / 180);

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = PALETTE.gear;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  const grad = ctx.createLinearGradient(-r * 0.7, -r * 0.7, r * 0.7, r * 0.7);
  grad.addColorStop(0, '#d0d0d0');
  grad.addColorStop(0.5, '#f8f8f8');
  grad.addColorStop(1, '#a0a0a0');
  ctx.fillStyle = grad;
  ctx.fillRect(-r * 0.15, -r * 0.8, r * 0.3, r * 1.6);

  ctx.restore();

  ctx.strokeStyle = 'rgba(255, 200, 80, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2 + Math.sin(time * 3) * 2, 0, Math.PI * 2);
  ctx.stroke();
}

function drawReceiver(ctx, x, y, size, receiver, lightPaths, time) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.25;

  const isHit = lightPaths.some(path =>
    path.hits.some(hit => hit.x === receiver.x && hit.y === receiver.y)
  );

  if (isHit) {
    ctx.fillStyle = `rgba(255, 200, 80, ${0.3 + Math.sin(time * 8) * 0.15})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, isHit ? PALETTE.gearGoldLight : PALETTE.wallLight);
  grad.addColorStop(1, isHit ? PALETTE.gearGold : PALETTE.wallDark);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = isHit ? PALETTE.gearGoldLight : PALETTE.gear;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  const dirAngle = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[receiver.direction] || 0;
  ctx.strokeStyle = isHit ? '#fff' : PALETTE.textDim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(dirAngle) * r * 0.8, cy + Math.sin(dirAngle) * r * 0.8);
  ctx.stroke();

  ctx.fillStyle = isHit ? '#fff' : PALETTE.textDim;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('符', cx, cy);
}

function drawSymbol(ctx, x, y, size, symbol) {
  const cx = x + size / 2;
  const cy = y + size / 2;

  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = PALETTE.gearGold;
  ctx.font = `bold ${size * 0.4}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol.glyph, cx, cy);
  ctx.restore();
}

function renderLightPaths(ctx, lightPaths, offsetX, offsetY, ts, time) {
  for (const path of lightPaths) {
    if (path.segments.length === 0) continue;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < path.segments.length - 1; i++) {
      const s1 = path.segments[i];
      const s2 = path.segments[i + 1];
      const x1 = offsetX + s1.x * ts + ts / 2;
      const y1 = offsetY + s1.y * ts + ts / 2;
      const x2 = offsetX + s2.x * ts + ts / 2;
      const y2 = offsetY + s2.y * ts + ts / 2;

      ctx.strokeStyle = PALETTE.lightGlow;
      ctx.lineWidth = ts * 0.35;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.strokeStyle = PALETTE.lightBeam;
      ctx.lineWidth = ts * 0.12;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      const t = (time * 3 + i * 0.3) % 1;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px, py, ts * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function renderPlayer(ctx, player, offsetX, offsetY, ts, time) {
  const px = offsetX + player.x;
  const py = offsetY + player.y;
  const r = ts * 0.22;

  const bob = player.moving ? Math.sin(time * 15) * 3 : 0;

  ctx.fillStyle = 'rgba(212, 176, 74, 0.2)';
  ctx.beginPath();
  ctx.arc(px, py + bob, r * 1.6, 0, Math.PI * 2);
  ctx.fill();

  const grad = ctx.createRadialGradient(px, py + bob - r * 0.3, 0, px, py + bob, r);
  grad.addColorStop(0, PALETTE.gearGoldLight);
  grad.addColorStop(1, PALETTE.player);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(px, py + bob, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = PALETTE.gearDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py + bob, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#1a1210';
  ctx.beginPath();
  ctx.arc(px - r * 0.3, py + bob - r * 0.15, r * 0.12, 0, Math.PI * 2);
  ctx.arc(px + r * 0.3, py + bob - r * 0.15, r * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = PALETTE.gearDark;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px - r * 0.2, py + bob + r * 0.25);
  ctx.lineTo(px + r * 0.2, py + bob + r * 0.25);
  ctx.stroke();
}

function renderGears(ctx, gears, offsetX, offsetY, ts, rules, time) {
  for (let i = 0; i < gears.length; i++) {
    const gear = gears[i];
    const px = offsetX + gear.x * ts;
    const py = offsetY + gear.y * ts;
    drawGearUI(ctx, px, py, ts, gear, rules[i]?.active, time);
  }
}

function drawGearUI(ctx, x, y, size, gear, activeRule, time) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const radius = size * 0.78;

  drawGearShape(ctx, cx, cy, radius * 0.85, 12, -time * 0.3, PALETTE.gear, PALETTE.gearDark, PALETTE.gearLight);

  ctx.strokeStyle = PALETTE.gearGold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.95, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = PALETTE.panel;
  ctx.beginPath();
  ctx.roundRect(cx - 70, cy - radius - 42, 140, 28, 6);
  ctx.fill();

  ctx.strokeStyle = PALETTE.gearGold;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(cx - 70, cy - radius - 42, 140, 28, 6);
  ctx.stroke();

  ctx.fillStyle = PALETTE.gearGoldLight;
  ctx.font = 'bold 13px "Cinzel", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = activeRule ? `${activeRule.subject} IS ${activeRule.object}` : '???';
  ctx.fillText(label, cx, cy - radius - 28);

  ctx.fillStyle = 'rgba(232, 220, 200, 0.6)';
  ctx.font = '10px sans-serif';
  ctx.fillText('点击旋转法则', cx, cy + radius + 16);
}

function renderActiveRules(ctx, rules, width, height, time) {
  const panelW = 240;
  const panelH = 40 + rules.length * 26;
  const x = 12;
  const y = 12;

  drawOrnateFrame(ctx, x, y, panelW, panelH, time);

  ctx.fillStyle = PALETTE.panel;
  ctx.beginPath();
  ctx.roundRect(x + 4, y + 4, panelW - 8, panelH - 8, 4);
  ctx.fill();

  ctx.fillStyle = PALETTE.gearGoldLight;
  ctx.font = 'bold 15px "Cinzel", serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('生效法则', x + 18, y + 28);

  rules.forEach((rule, i) => {
    const text = `${rule.active.subject} IS ${rule.active.object}`;
    ctx.fillStyle = PALETTE.gearGold;
    ctx.font = '13px sans-serif';
    ctx.fillText(text, x + 18, y + 54 + i * 26);
  });
}

function renderOverlay(ctx, width, height, title, subtitle, time) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;

  drawOrnateFrame(ctx, cx - 280, cy - 110, 560, 220, time);

  ctx.fillStyle = PALETTE.gearGoldLight;
  ctx.font = 'bold 48px "Cinzel", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = PALETTE.gearGold;
  ctx.shadowBlur = 20 + Math.sin(time * 2) * 5;
  ctx.fillText(title, cx, cy - 30);
  ctx.shadowBlur = 0;

  ctx.fillStyle = PALETTE.text;
  ctx.font = '16px sans-serif';
  ctx.fillText(subtitle, cx, cy + 25);
}

function drawOrnateFrame(ctx, x, y, w, h, time) {
  const corner = 18;
  const glow = 8 + Math.sin(time * 2) * 3;

  ctx.save();
  ctx.shadowColor = PALETTE.gearGold;
  ctx.shadowBlur = glow;

  ctx.strokeStyle = PALETTE.gearGold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + corner, y);
  ctx.lineTo(x + w - corner, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + corner);
  ctx.lineTo(x + w, y + h - corner);
  ctx.quadraticCurveTo(x + w, y + h, x + w - corner, y + h);
  ctx.lineTo(x + corner, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - corner);
  ctx.lineTo(x, y + corner);
  ctx.quadraticCurveTo(x, y, x + corner, y);
  ctx.stroke();

  ctx.restore();

  const drawCorner = (cx, cy, rot) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.strokeStyle = PALETTE.gearGold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.lineTo(-8, -18);
    ctx.lineTo(8, -18);
    ctx.lineTo(8, -8);
    ctx.stroke();
    ctx.restore();
  };

  drawCorner(x, y, 0);
  drawCorner(x + w, y, Math.PI / 2);
  drawCorner(x + w, y + h, Math.PI);
  drawCorner(x, y + h, -Math.PI / 2);
}

function getEffects(rules) {
  const effects = {
    shadowIsSolid: false,
    gearIsBridge: false,
    lightBurnsRust: false,
    rustIsVoid: false,
    lightIsKey: false
  };

  for (const rule of rules) {
    const { subject, object } = rule.active;
    const key = `${subject.toLowerCase()}Is${object.charAt(0).toUpperCase() + object.slice(1).toLowerCase()}`;
    if (key in effects) {
      effects[key] = true;
    }
  }

  return effects;
}
