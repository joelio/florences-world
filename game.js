// Florence's World - Main Game
'use strict';

// ===== CANVAS SETUP =====
const canvases = {};
const contexts = {};

function initCanvases() {
  ['dino', 'space', 'parade', 'magic'].forEach(id => {
    const canvas = document.getElementById(`${id}-canvas`);
    canvases[id] = canvas;
    contexts[id] = canvas.getContext('2d');
    resizeCanvas(canvas);
  });
}

function resizeCanvas(canvas) {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  const ctx = canvas.getContext('2d');
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

function hideStartScreen() {
  const el = document.getElementById('start-screen');
  if (el) el.remove();
}

window.addEventListener('resize', () => {
  Object.values(canvases).forEach(resizeCanvas);
});

// ===== KEYBOARD ZONES =====
const ZONES = {
  left: new Set([
    'Escape','F1','F2','F3','F4',
    'Backquote','Digit1','Digit2','Digit3','Digit4','Digit5',
    'Tab','KeyQ','KeyW','KeyE','KeyR','KeyT',
    'CapsLock','KeyA','KeyS','KeyD','KeyF','KeyG',
    'ShiftLeft','KeyZ','KeyX','KeyC','KeyV','KeyB',
    'ControlLeft','MetaLeft','AltLeft',
  ]),
  right: new Set([
    'F5','F6','F7','F8','F9','F10','F11','F12',
    'Digit6','Digit7','Digit8','Digit9','Digit0','Minus','Equal','Backspace',
    'KeyY','KeyU','KeyI','KeyO','KeyP','BracketLeft','BracketRight',
    'KeyH','KeyJ','KeyK','KeyL','Semicolon','Quote','Backslash','Enter',
    'KeyN','KeyM','Comma','Period','Slash','ShiftRight',
    'ControlRight',
  ]),
  space: new Set([
    'Space','AltRight','MetaRight','ContextMenu',
  ]),
  special: new Set([
    'Insert','Home','End','PageUp','PageDown','Delete',
    'ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
    'NumLock','NumpadDivide','NumpadMultiply','NumpadSubtract',
    'Numpad7','Numpad8','Numpad9','NumpadAdd',
    'Numpad4','Numpad5','Numpad6',
    'Numpad1','Numpad2','Numpad3','NumpadEnter',
    'Numpad0','NumpadDecimal',
    'PrintScreen','ScrollLock','Pause',
  ]),
};

function getZone(code) {
  for (const [zone, keys] of Object.entries(ZONES)) {
    if (keys.has(code)) return zone;
  }
  return 'left';
}

// ===== AUDIO ENGINE =====
let audioCtx = null;
const MAX_GAIN = 0.15;

function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

const PENTATONIC = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

const ZONE_SOUNDS = {
  left: { baseOctave: -1, waveform: 'sawtooth', attack: 0.01, decay: 0.3, filterFreq: 400 },
  right: { baseOctave: 1, waveform: 'sine', attack: 0.05, decay: 0.8, filterFreq: 2000 },
  space: { baseOctave: 0, waveform: 'triangle', attack: 0.01, decay: 0.4, filterFreq: 1500 },
  special: { baseOctave: 1, waveform: 'sine', attack: 0.01, decay: 0.6, filterFreq: 3000 },
};

function playZoneSound(zone) {
  if (!audioCtx) return;
  const config = ZONE_SOUNDS[zone];
  const now = audioCtx.currentTime;
  const baseFreq = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
  const freq = baseFreq * Math.pow(2, config.baseOctave);

  const osc = audioCtx.createOscillator();
  osc.type = config.waveform;
  osc.frequency.setValueAtTime(freq, now);

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(config.filterFreq, now);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(MAX_GAIN, now + config.attack);
  gain.gain.exponentialRampToValueAtTime(0.001, now + config.attack + config.decay);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + config.attack + config.decay + 0.1);
}

// ===== ANIMATION FRAMEWORK =====
const effects = { dino: [], space: [], parade: [], magic: [] };
const zoneFlash = { dino: 0, space: 0, parade: 0, magic: 0 };

const ZONE_TO_CANVAS = {
  left: 'dino',
  right: 'space',
  space: 'parade',
  special: 'magic',
};

class Effect {
  constructor(quadrant, duration = 2000) {
    this.quadrant = quadrant;
    this.startTime = performance.now();
    this.duration = duration;
    this.dead = false;
  }
  get progress() {
    return Math.min(1, (performance.now() - this.startTime) / this.duration);
  }
  update() {
    if (this.progress >= 1) this.dead = true;
  }
  draw(ctx, w, h) {}
}

class Particle extends Effect {
  constructor(quadrant, x, y, config = {}) {
    super(quadrant, config.duration || 1500);
    this.x = x;
    this.y = y;
    this.vx = config.vx || (Math.random() - 0.5) * 4;
    this.vy = config.vy || -Math.random() * 5 - 2;
    this.size = config.size || Math.random() * 8 + 4;
    this.colour = config.colour || '#fff';
    this.gravity = config.gravity || 0.1;
    this.shape = config.shape || 'circle';
  }
  update() {
    super.update();
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
  }
  draw(ctx, w, h) {
    const alpha = 1 - this.progress;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.colour;
    if (this.shape === 'star') {
      drawStar(ctx, this.x, this.y, this.size);
    } else if (this.shape === 'heart') {
      drawHeart(ctx, this.x, this.y, this.size);
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * (1 - this.progress * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawStar(ctx, x, y, size) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const method = i === 0 ? 'moveTo' : 'lineTo';
    ctx[method](x + Math.cos(angle) * size, y + Math.sin(angle) * size);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y + size / 4);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + size / 4);
  ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size * 0.7, x, y + size);
  ctx.bezierCurveTo(x, y + size * 0.7, x + size / 2, y + size / 2, x + size / 2, y + size / 4);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4);
  ctx.fill();
}

// ===== DINOSAUR LAND =====
const DINO_COLOURS = ['#2E7D32', '#4CAF50', '#8BC34A', '#FF6F00', '#D84315'];

class DinoStomp extends Effect {
  constructor() {
    super('dino', 2500);
    this.dinoType = Math.random() < 0.5 ? 'trex' : 'ptero';
    this.x = -80;
    this.y = 0;
    this.colour = DINO_COLOURS[Math.floor(Math.random() * DINO_COLOURS.length)];
  }
  draw(ctx, w, h) {
    const x = this.x + this.progress * (w + 160);
    if (this.dinoType === 'trex') {
      this.y = h * 0.55;
      drawTRex(ctx, x, this.y, this.colour);
    } else {
      this.y = h * 0.15 + Math.sin(this.progress * 8) * 20;
      drawPtero(ctx, x, this.y, this.colour);
    }
  }
}

function drawTRex(ctx, x, y, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(x, y, 40, 25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 35, y - 20, 20, 15, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + 42, y - 24, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(x + 43, y - 24, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colour;
  ctx.fillRect(x - 10, y + 20, 10, 25);
  ctx.fillRect(x + 10, y + 20, 10, 25);
  ctx.beginPath();
  ctx.moveTo(x - 35, y);
  ctx.quadraticCurveTo(x - 60, y - 30, x - 70, y - 15);
  ctx.lineWidth = 6;
  ctx.strokeStyle = colour;
  ctx.stroke();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 50, y - 18);
  ctx.lineTo(x + 55, y - 15);
  ctx.stroke();
}

function drawPtero(ctx, x, y, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(x, y, 20, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  const wingY = Math.sin(performance.now() / 100) * 15;
  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x - 40, y + wingY - 20);
  ctx.lineTo(x - 5, y - 5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 10, y);
  ctx.lineTo(x + 40, y + wingY - 20);
  ctx.lineTo(x + 5, y - 5);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 22, y - 5, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 25, y - 10);
  ctx.lineTo(x + 35, y - 20);
  ctx.lineTo(x + 20, y - 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + 25, y - 6, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(x + 26, y - 6, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

class VolcanoErupt extends Effect {
  constructor(w, h) {
    super('dino', 2000);
    this.particles = [];
    const vx = w * (0.1 + Math.random() * 0.8);
    const vy = h * 0.85;
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x: vx, y: vy,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 8 - 4,
        size: Math.random() * 6 + 3,
        colour: ['#FF5722', '#FF9800', '#FFEB3B', '#F44336'][Math.floor(Math.random() * 4)],
      });
    }
  }
  update() {
    super.update();
    this.particles.forEach(p => {
      p.vy += 0.15;
      p.x += p.vx;
      p.y += p.vy;
    });
  }
  draw(ctx, w, h) {
    const alpha = 1 - this.progress;
    ctx.globalAlpha = alpha;
    this.particles.forEach(p => {
      ctx.fillStyle = p.colour;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
}

function triggerDino(w, h) {
  const roll = Math.random();
  if (roll < 0.5) {
    effects.dino.push(new DinoStomp());
  } else {
    effects.dino.push(new VolcanoErupt(w, h));
  }
  for (let i = 0; i < 5; i++) {
    effects.dino.push(new Particle('dino',
      Math.random() * w, h * 0.9,
      { colour: '#8B4513', vy: -Math.random() * 2, gravity: 0.05, duration: 1000 }
    ));
  }
}

// ===== OUTER SPACE =====
class Rocket extends Effect {
  constructor(w, h) {
    super('space', 2000);
    this.x = Math.random() * w;
    this.y = h + 30;
    this.targetY = -50;
    this.colour = ['#E53935', '#1E88E5', '#43A047', '#FB8C00'][Math.floor(Math.random() * 4)];
    this.trail = [];
  }
  update() {
    super.update();
    this.y = this.y + (this.targetY - this.y) * 0.03;
    this.trail.push({ x: this.x + (Math.random() - 0.5) * 5, y: this.y + 20, age: 0 });
    if (this.trail.length > 20) this.trail.shift();
    this.trail.forEach(t => t.age++);
  }
  draw(ctx, w, h) {
    this.trail.forEach(t => {
      const alpha = 1 - t.age / 20;
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = '#FFA726';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 4 - t.age * 0.15, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.colour;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - 20);
    ctx.lineTo(this.x - 10, this.y + 10);
    ctx.lineTo(this.x + 10, this.y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#E3F2FD';
    ctx.beginPath();
    ctx.arc(this.x, this.y - 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.colour;
    ctx.beginPath();
    ctx.moveTo(this.x - 10, this.y + 5);
    ctx.lineTo(this.x - 18, this.y + 15);
    ctx.lineTo(this.x - 8, this.y + 10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(this.x + 10, this.y + 5);
    ctx.lineTo(this.x + 18, this.y + 15);
    ctx.lineTo(this.x + 8, this.y + 10);
    ctx.fill();
    ctx.fillStyle = ['#FF5722', '#FFEB3B', '#FF9800'][Math.floor(Math.random() * 3)];
    ctx.beginPath();
    ctx.moveTo(this.x - 6, this.y + 10);
    ctx.lineTo(this.x, this.y + 10 + Math.random() * 15 + 10);
    ctx.lineTo(this.x + 6, this.y + 10);
    ctx.fill();
  }
}

class ShootingStar extends Effect {
  constructor(w, h) {
    super('space', 1000);
    this.x = Math.random() * w;
    this.y = Math.random() * h * 0.5;
    this.vx = (Math.random() * 4 + 3) * (Math.random() < 0.5 ? 1 : -1);
    this.vy = Math.random() * 2 + 1;
  }
  update() {
    super.update();
    this.x += this.vx;
    this.y += this.vy;
  }
  draw(ctx, w, h) {
    const alpha = 1 - this.progress;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#FFEB3B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 5, this.y - this.vy * 5);
    ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class Planet extends Effect {
  constructor(w, h) {
    super('space', 3000);
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.radius = Math.random() * 25 + 15;
    this.colour = ['#E91E63', '#9C27B0', '#00BCD4', '#FF9800', '#4CAF50'][Math.floor(Math.random() * 5)];
    this.hasRing = Math.random() < 0.4;
    this.rotation = Math.random() * Math.PI * 2;
  }
  draw(ctx, w, h) {
    const alpha = Math.sin(this.progress * Math.PI);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.colour;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    if (this.hasRing) {
      ctx.strokeStyle = this.colour;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.radius * 1.6, this.radius * 0.4, this.rotation, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function triggerSpace(w, h) {
  const roll = Math.random();
  if (roll < 0.4) {
    effects.space.push(new Rocket(w, h));
  } else if (roll < 0.7) {
    effects.space.push(new ShootingStar(w, h));
    effects.space.push(new ShootingStar(w, h));
  } else {
    effects.space.push(new Planet(w, h));
  }
  for (let i = 0; i < 3; i++) {
    effects.space.push(new Particle('space',
      Math.random() * w, Math.random() * h,
      { colour: '#FFF', size: 2, gravity: 0, vy: 0, vx: 0, duration: 800, shape: 'star' }
    ));
  }
}

// ===== CHARACTER PARADE =====
const CHARACTER_TYPES = [
  { name: 'penguin', bodyColour: '#1A237E', bellyColour: '#FFF', accentColour: '#FF9800' },
  { name: 'pig', bodyColour: '#F8BBD0', bellyColour: '#FCE4EC', accentColour: '#E91E63' },
  { name: 'bunny', bodyColour: '#8D6E63', bellyColour: '#FFF', accentColour: '#F48FB1' },
  { name: 'puppy', bodyColour: '#FF8A65', bellyColour: '#FFF3E0', accentColour: '#5D4037' },
];

class CharacterWalk extends Effect {
  constructor(w, h) {
    super('parade', 4000);
    this.character = CHARACTER_TYPES[Math.floor(Math.random() * CHARACTER_TYPES.length)];
    this.direction = Math.random() < 0.5 ? 1 : -1;
    this.x = this.direction === 1 ? -50 : w + 50;
    this.y = h * (0.3 + Math.random() * 0.5);
    this.bouncePhase = Math.random() * Math.PI * 2;
    this.size = 25 + Math.random() * 15;
    this.w = w;
  }
  update() {
    super.update();
    this.x += this.direction * 2;
    this.bouncePhase += 0.15;
  }
  draw(ctx, w, h) {
    const bounce = Math.abs(Math.sin(this.bouncePhase)) * 10;
    const x = this.x;
    const y = this.y - bounce;
    const s = this.size;
    const c = this.character;

    ctx.fillStyle = c.bodyColour;
    ctx.beginPath();
    ctx.ellipse(x, y, s, s * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = c.bellyColour;
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.2, s * 0.6, s * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(x - s * 0.25, y - s * 0.3, s * 0.2, 0, Math.PI * 2);
    ctx.arc(x + s * 0.25, y - s * 0.3, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x - s * 0.2, y - s * 0.3, s * 0.1, 0, Math.PI * 2);
    ctx.arc(x + s * 0.2, y - s * 0.3, s * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.05, s * 0.25, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    if (c.name === 'penguin') {
      ctx.fillStyle = c.accentColour;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.15);
      ctx.lineTo(x - s * 0.15, y + s * 0.05);
      ctx.lineTo(x + s * 0.15, y + s * 0.05);
      ctx.fill();
    } else if (c.name === 'pig') {
      ctx.fillStyle = c.accentColour;
      ctx.beginPath();
      ctx.ellipse(x, y + s * 0.05, s * 0.2, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.bodyColour;
      ctx.beginPath();
      ctx.arc(x - s * 0.07, y + s * 0.05, 2, 0, Math.PI * 2);
      ctx.arc(x + s * 0.07, y + s * 0.05, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.accentColour;
      ctx.beginPath();
      ctx.ellipse(x - s * 0.4, y - s * 0.6, s * 0.15, s * 0.25, -0.3, 0, Math.PI * 2);
      ctx.ellipse(x + s * 0.4, y - s * 0.6, s * 0.15, s * 0.25, 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.name === 'bunny') {
      ctx.fillStyle = c.bodyColour;
      ctx.beginPath();
      ctx.ellipse(x - s * 0.2, y - s * 1.1, s * 0.12, s * 0.4, -0.1, 0, Math.PI * 2);
      ctx.ellipse(x + s * 0.2, y - s * 1.1, s * 0.12, s * 0.4, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.accentColour;
      ctx.beginPath();
      ctx.ellipse(x - s * 0.2, y - s * 1.1, s * 0.06, s * 0.3, -0.1, 0, Math.PI * 2);
      ctx.ellipse(x + s * 0.2, y - s * 1.1, s * 0.06, s * 0.3, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.accentColour;
      ctx.beginPath();
      ctx.arc(x, y, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.name === 'puppy') {
      ctx.fillStyle = c.accentColour;
      ctx.beginPath();
      ctx.ellipse(x - s * 0.5, y - s * 0.2, s * 0.2, s * 0.35, -0.5, 0, Math.PI * 2);
      ctx.ellipse(x + s * 0.5, y - s * 0.2, s * 0.2, s * 0.35, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(x, y, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = c.name === 'penguin' ? c.accentColour : c.bodyColour;
    const footOffset = Math.sin(this.bouncePhase) * 5;
    ctx.beginPath();
    ctx.ellipse(x - s * 0.3, y + s * 1.2 + bounce, s * 0.2, s * 0.1, footOffset * 0.02, 0, Math.PI * 2);
    ctx.ellipse(x + s * 0.3, y + s * 1.2 + bounce, s * 0.2, s * 0.1, -footOffset * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }
}

class MusicNote extends Effect {
  constructor(w, h) {
    super('parade', 1500);
    this.x = Math.random() * w;
    this.y = h;
    this.colour = ['#E91E63', '#9C27B0', '#2196F3', '#4CAF50', '#FF9800'][Math.floor(Math.random() * 5)];
    this.wobble = Math.random() * Math.PI * 2;
    this.size = 10 + Math.random() * 10;
    this.note = Math.random() < 0.5 ? '\u266A' : '\u266B';
  }
  update() {
    super.update();
    this.y -= 1.5;
    this.wobble += 0.1;
  }
  draw(ctx, w, h) {
    const alpha = 1 - this.progress;
    const xOff = Math.sin(this.wobble) * 20;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.colour;
    ctx.font = `${this.size}px serif`;
    ctx.fillText(this.note, this.x + xOff, this.y);
    ctx.globalAlpha = 1;
  }
}

function triggerParade(w, h) {
  effects.parade.push(new CharacterWalk(w, h));
  for (let i = 0; i < 3; i++) {
    effects.parade.push(new MusicNote(w, h));
  }
}

// ===== FLORENCE'S MAGIC =====
class FlorenceName extends Effect {
  constructor(w, h) {
    super('magic', 3000);
    this.w = w;
    this.h = h;
  }
  draw(ctx, w, h) {
    const alpha = Math.sin(this.progress * Math.PI);
    const size = 30 + Math.sin(this.progress * Math.PI) * 15;
    ctx.globalAlpha = alpha;
    const text = 'FLORENCE';
    ctx.font = `bold ${size}px 'Comic Sans MS', cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const hue = (performance.now() / 10) % 360;
    ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
    ctx.fillText(text, w / 2, h / 2);
    ctx.strokeStyle = `hsl(${(hue + 180) % 360}, 90%, 80%)`;
    ctx.lineWidth = 1;
    ctx.strokeText(text, w / 2, h / 2);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'start';
  }
}

class Firework extends Effect {
  constructor(w, h) {
    super('magic', 2000);
    this.x = Math.random() * w;
    this.y = Math.random() * h * 0.6;
    this.hue = Math.random() * 360;
    this.particles = [];
    const count = 20 + Math.floor(Math.random() * 15);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x: this.x, y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        hueShift: Math.random() * 60 - 30,
      });
    }
  }
  update() {
    super.update();
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.vx *= 0.99;
    });
  }
  draw(ctx, w, h) {
    const alpha = 1 - this.progress;
    ctx.globalAlpha = alpha;
    this.particles.forEach(p => {
      ctx.fillStyle = `hsl(${this.hue + p.hueShift}, 90%, 65%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - this.progress * 0.5), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
}

class RainbowWave extends Effect {
  constructor(w, h) {
    super('magic', 2000);
    this.w = w;
    this.h = h;
  }
  draw(ctx, w, h) {
    const alpha = Math.sin(this.progress * Math.PI) * 0.3;
    ctx.globalAlpha = alpha;
    const hue = (performance.now() / 5) % 360;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `hsl(${(hue + i * 60) % 360}, 80%, 60%)`;
      const waveY = Math.sin(this.progress * Math.PI * 2 + i * 0.5) * 30;
      ctx.fillRect(0, (h / 6) * i + waveY, w, h / 6);
    }
    ctx.globalAlpha = 1;
  }
}

function triggerMagic(w, h) {
  const roll = Math.random();
  if (roll < 0.3) {
    effects.magic.push(new FlorenceName(w, h));
  } else if (roll < 0.6) {
    effects.magic.push(new Firework(w, h));
    effects.magic.push(new Firework(w, h));
  } else {
    effects.magic.push(new RainbowWave(w, h));
  }
  for (let i = 0; i < 5; i++) {
    const isHeart = Math.random() < 0.5;
    effects.magic.push(new Particle('magic',
      Math.random() * w, Math.random() * h,
      {
        colour: `hsl(${Math.random() * 360}, 80%, 70%)`,
        shape: isHeart ? 'heart' : 'star',
        size: 5 + Math.random() * 8,
        gravity: -0.02,
        vy: -Math.random() * 2,
        duration: 2000,
      }
    ));
  }
}

// ===== IDLE ANIMATIONS =====
function drawIdle(quadrant, ctx, w, h, t) {
  switch (quadrant) {
    case 'dino': drawIdleDino(ctx, w, h, t); break;
    case 'space': drawIdleSpace(ctx, w, h, t); break;
    case 'parade': drawIdleParade(ctx, w, h, t); break;
    case 'magic': drawIdleMagic(ctx, w, h, t); break;
  }
}

function drawIdleDino(ctx, w, h, t) {
  ctx.fillStyle = '#2E7D32';
  for (let i = 0; i < 5; i++) {
    const x = (w / 5) * i + w / 10;
    const sway = Math.sin(t / 1000 + i) * 5;
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.quadraticCurveTo(x + sway, h * 0.7, x + sway - 15, h * 0.6);
    ctx.quadraticCurveTo(x + sway, h * 0.65, x + sway + 15, h * 0.6);
    ctx.quadraticCurveTo(x + sway, h * 0.7, x, h);
    ctx.fill();
  }
  ctx.fillStyle = '#5D4037';
  ctx.beginPath();
  ctx.moveTo(w * 0.6, h);
  ctx.lineTo(w * 0.75, h * 0.4);
  ctx.lineTo(w * 0.9, h);
  ctx.fill();
  ctx.fillStyle = '#BF360C';
  ctx.beginPath();
  ctx.ellipse(w * 0.75, h * 0.4, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawIdleSpace(ctx, w, h, t) {
  for (let i = 0; i < 30; i++) {
    const x = ((i * 137.5) % w);
    const y = ((i * 97.3) % h);
    const twinkle = (Math.sin(t / 500 + i * 2) + 1) / 2;
    ctx.globalAlpha = twinkle * 0.8;
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(x, y, 1 + twinkle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const px = w * 0.8;
  const py = h * 0.3 + Math.sin(t / 3000) * 10;
  ctx.fillStyle = '#7B1FA2';
  ctx.beginPath();
  ctx.arc(px, py, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#CE93D8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(px, py, 35, 8, 0.2, 0, Math.PI * 2);
  ctx.stroke();
}

function drawIdleParade(ctx, w, h, t) {
  ctx.fillStyle = '#81C784';
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 10) {
    const y = h * 0.75 + Math.sin(x / 80 + t / 4000) * 15;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.fill();

  const flowerColours = ['#E91E63', '#FF9800', '#FFEB3B', '#9C27B0'];
  for (let i = 0; i < 8; i++) {
    const x = (w / 8) * i + w / 16;
    const baseY = h * 0.75 + Math.sin(x / 80 + t / 4000) * 15;
    const sway = Math.sin(t / 1500 + i * 1.5) * 3;
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(x + sway - 1, baseY - 15, 2, 15);
    ctx.fillStyle = flowerColours[i % 4];
    ctx.beginPath();
    ctx.arc(x + sway, baseY - 18, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = '#8D6E63';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.85);
  ctx.lineTo(w, h * 0.85);
  ctx.stroke();
  for (let x = 0; x < w; x += 40) {
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(x + 18, h * 0.78, 5, h * 0.14);
  }
}

function drawIdleMagic(ctx, w, h, t) {
  for (let i = 0; i < 15; i++) {
    const x = ((i * 173.7 + t / 50) % w);
    const y = ((i * 89.3 + Math.sin(t / 1000 + i) * 30) % h);
    const alpha = (Math.sin(t / 600 + i * 3) + 1) / 2;
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = `hsl(${(t / 20 + i * 40) % 360}, 80%, 75%)`;
    drawStar(ctx, x, y, 3 + alpha * 3);
  }
  ctx.globalAlpha = 1;

  ctx.globalAlpha = 0.08 + Math.sin(t / 2000) * 0.03;
  ctx.font = "bold 24px 'Comic Sans MS', cursive";
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFF';
  ctx.fillText('FLORENCE', w / 2, h / 2);
  ctx.textAlign = 'start';
  ctx.globalAlpha = 1;
}

// ===== ZONE TRIGGER =====
function triggerZone(zone) {
  playZoneSound(zone);
  const canvasId = ZONE_TO_CANVAS[zone];
  zoneFlash[canvasId] = 1.0;
  const canvas = canvases[canvasId];
  const w = canvas.width / window.devicePixelRatio;
  const h = canvas.height / window.devicePixelRatio;

  if (zone === 'left') triggerDino(w, h);
  if (zone === 'right') triggerSpace(w, h);
  if (zone === 'space') triggerParade(w, h);
  if (zone === 'special') triggerMagic(w, h);
}

// ===== KEYBOARD HANDLING =====
let started = false;

document.addEventListener('keydown', (e) => {
  e.preventDefault();
  e.stopPropagation();

  if (!started) {
    started = true;
    hideStartScreen();
    enterFullscreen();
    initAudio();
  }

  const zone = getZone(e.code);
  triggerZone(zone);
});

document.addEventListener('keyup', (e) => { e.preventDefault(); });

function enterFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}

// Prevent right-click, browser shortcuts
document.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('beforeunload', e => {
  e.preventDefault();
  e.returnValue = '';
});

// ===== GAME LOOP =====
function gameLoop(timestamp) {
  for (const [id, ctx] of Object.entries(contexts)) {
    const canvas = canvases[id];
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;

    ctx.clearRect(0, 0, w, h);

    // Draw idle animations
    drawIdle(id, ctx, w, h, timestamp);

    // Zone flash overlay
    if (zoneFlash[id] > 0) {
      ctx.globalAlpha = zoneFlash[id] * 0.15;
      ctx.fillStyle = '#FFF';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      zoneFlash[id] *= 0.9;
      if (zoneFlash[id] < 0.01) zoneFlash[id] = 0;
    }

    // Draw active effects
    const list = effects[id];
    for (let i = list.length - 1; i >= 0; i--) {
      list[i].update();
      list[i].draw(ctx, w, h);
      if (list[i].dead) list.splice(i, 1);
    }
  }
  requestAnimationFrame(gameLoop);
}

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  initCanvases();
  requestAnimationFrame(gameLoop);
});
