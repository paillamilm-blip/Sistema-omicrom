// scripts/generate-og-image.cjs
// Genera public/og-image.png (1200x630) — tarjeta holográfica de marca para
// previews al compartir (WhatsApp/TikTok/Facebook/X). Sin dependencias:
// dibujo por pixel + codificación PNG con zlib nativo de Node.
// Regenerar:  node scripts/generate-og-image.cjs

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const W = 1200, H = 630;
const buf = new Uint8Array(W * H * 4); // RGBA

function blend(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
  if (a > 1) a = 1;
  const i = (y * W + x) * 4;
  buf[i]     = Math.round(buf[i]     * (1 - a) + r * a);
  buf[i + 1] = Math.round(buf[i + 1] * (1 - a) + g * a);
  buf[i + 2] = Math.round(buf[i + 2] * (1 - a) + b * a);
  buf[i + 3] = 255;
}
function fillRect(x0, y0, w, h, r, g, b, a) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) blend(x, y, r, g, b, a);
}

// ── Colores de marca ──
const CY = [0, 240, 255], STEEL = [10, 139, 163], AMBER = [245, 158, 11], INK = [234, 242, 255];

// ── 1) Fondo: gradiente vertical void ──
for (let y = 0; y < H; y++) {
  const t = y / H;
  const r = Math.round(2 + (8 - 2) * t);
  const g = Math.round(6 + (18 - 6) * t);
  const b = Math.round(19 + (40 - 19) * t);
  for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = 255; }
}

// ── 2) Grilla tenue ──
for (let x = 0; x <= W; x += 48) for (let y = 0; y < H; y++) blend(x, y, CY[0], CY[1], CY[2], 0.05);
for (let y = 0; y <= H; y += 48) for (let x = 0; x < W; x++) blend(x, y, CY[0], CY[1], CY[2], 0.05);

// ── 3) Glow radial central ──
const gcx = W / 2, gcy = 235;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const d = Math.hypot(x - gcx, y - gcy);
  const a = Math.max(0, 0.22 * (1 - d / 420));
  if (a > 0) blend(x, y, CY[0], CY[1], CY[2], a);
}

// ── 4) Emblema: anillos concéntricos + centro + ticks (energía/red) ──
function annulus(cx, cy, rOut, rIn, col, alpha) {
  for (let y = cy - rOut - 2; y <= cy + rOut + 2; y++)
    for (let x = cx - rOut - 2; x <= cx + rOut + 2; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const edge = Math.min(rOut - d, d - rIn);
      if (edge > -1.2) { const a = Math.max(0, Math.min(1, edge + 0.6)) * alpha; if (a > 0) blend(x, y, col[0], col[1], col[2], a); }
    }
}
function disc(cx, cy, rad, col, alpha) {
  for (let y = cy - rad - 2; y <= cy + rad + 2; y++)
    for (let x = cx - rad - 2; x <= cx + rad + 2; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const a = Math.max(0, Math.min(1, rad - d + 0.6)) * alpha; if (a > 0) blend(x, y, col[0], col[1], col[2], a);
    }
}
annulus(gcx, gcy, 124, 118, CY, 0.35);
annulus(gcx, gcy, 96, 90, STEEL, 0.7);
annulus(gcx, gcy, 64, 58, CY, 0.85);
disc(gcx, gcy, 16, CY, 1);
disc(gcx, gcy, 26, CY, 0.22);
// ticks radiales
for (let k = 0; k < 12; k++) {
  const ang = (k / 12) * Math.PI * 2;
  for (let r = 128; r < 150; r++) {
    const x = Math.round(gcx + Math.cos(ang) * r), y = Math.round(gcy + Math.sin(ang) * r);
    blend(x, y, CY[0], CY[1], CY[2], 0.5);
    blend(x + 1, y, CY[0], CY[1], CY[2], 0.3);
  }
}

// ── 5) Fuente bitmap 5x7 ──
const FONT = {
  'A': ['01110','10001','10001','11111','10001','10001','10001'],
  'C': ['01110','10001','10000','10000','10000','10001','01110'],
  'D': ['11110','10001','10001','10001','10001','10001','11110'],
  'I': ['11111','00100','00100','00100','00100','00100','11111'],
  'L': ['10000','10000','10000','10000','10000','10000','11111'],
  'M': ['10001','11011','10101','10101','10001','10001','10001'],
  'N': ['10001','11001','10101','10011','10001','10001','10001'],
  'O': ['01110','10001','10001','10001','10001','10001','01110'],
  'P': ['11110','10001','10001','11110','10000','10000','10000'],
  'R': ['11110','10001','10001','11110','10100','10010','10001'],
  'S': ['01111','10000','10000','01110','00001','00001','11110'],
  'T': ['11111','00100','00100','00100','00100','00100','00100'],
  'U': ['10001','10001','10001','10001','10001','10001','01110'],
  'E': ['11111','10000','10000','11110','10000','10000','11111'],
  '0': ['01110','10001','10011','10101','11001','10001','01110'],
  '5': ['11111','10000','11110','00001','00001','10001','01110'],
  '.': ['00000','00000','00000','00000','00000','00110','00110'],
  ' ': ['00000','00000','00000','00000','00000','00000','00000'],
};
function textWidth(str, s, sp) { return str.length * 5 * s + (str.length - 1) * sp; }
function drawText(str, cx, y, s, sp, col, alpha, glow) {
  let x = Math.round(cx - textWidth(str, s, sp) / 2);
  for (const ch of str) {
    const g = FONT[ch] || FONT[' '];
    for (let row = 0; row < 7; row++) for (let c = 0; c < 5; c++) {
      if (g[row][c] === '1') {
        if (glow) fillRect(x + c * s - 1, y + row * s - 1, s + 2, s + 2, col[0], col[1], col[2], 0.18);
        fillRect(x + c * s, y + row * s, s, s, col[0], col[1], col[2], alpha);
      }
    }
    x += 5 * s + sp;
  }
}

// ── 6) Wordmark "OMICRON" + acento de Ó ──
drawText('OMICRON', gcx, 388, 11, 13, CY, 1, true);
// acento agudo sobre la primera O
(() => { const tw = textWidth('OMICRON', 11, 13); const startX = gcx - tw / 2; fillRect(Math.round(startX + 22), 368, 26, 7, INK[0], INK[1], INK[2], 0.9); })();

// ── 7) Tagline ──
drawText('INDUSTRIA 5.0', gcx, 500, 5, 7, STEEL, 1, false);

// ── 8) Acento ámbar + marco ──
fillRect(gcx - 150, 482, 300, 3, AMBER[0], AMBER[1], AMBER[2], 0.9);
// marco cyan
fillRect(0, 0, W, 6, CY[0], CY[1], CY[2], 0.5);
fillRect(0, H - 6, W, 6, CY[0], CY[1], CY[2], 0.5);
fillRect(0, 0, 6, H, CY[0], CY[1], CY[2], 0.5);
fillRect(W - 6, 0, 6, H, CY[0], CY[1], CY[2], 0.5);

// ── 9) Codificar PNG (color type 6 = RGBA) ──
function crc32(b) {
  let c = ~0;
  for (let i = 0; i < b.length; i++) {
    c ^= b[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0; // filtro none
  Buffer.from(buf.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1);
}
const idat = zlib.deflateSync(raw, { level: 9 });
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.join(__dirname, '..', 'public', 'og-image.png');
fs.writeFileSync(out, png);
console.log('OK ->', out, (png.length / 1024).toFixed(1) + ' KB');
