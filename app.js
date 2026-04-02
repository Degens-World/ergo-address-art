// Ergo Address Art — generative canvas art seeded by wallet address + on-chain data
// Uses Ergo Explorer API for live balance & tx count

const EXPLORER = 'https://api.ergoplatform.com/api/v1';

// ─── PRNG (seeded) ────────────────────────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function addressSeed(addr) {
  let h = 0x811c9dc5;
  for (let i = 0; i < addr.length; i++) {
    h ^= addr.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return `#${[f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function buildPalette(rng, balanceErg) {
  // Base hue shifts depending on balance tiers
  const baseHue = balanceErg < 1 ? 200
    : balanceErg < 100 ? 270
    : balanceErg < 1000 ? 30
    : balanceErg < 10000 ? 50
    : 0; // rich red-gold

  const spread = 60 + rng() * 80;
  return Array.from({ length: 6 }, (_, i) => {
    const h = baseHue + (i * spread / 5) + rng() * 20 - 10;
    const s = 65 + rng() * 30;
    const l = 40 + rng() * 25;
    return hslToHex(h, s, l);
  });
}

// ─── Art renderer ─────────────────────────────────────────────────────────────
function renderArt(canvas, address, balanceErg, txCount) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const rng = mulberry32(addressSeed(address));
  const layers = Math.min(3 + Math.floor(txCount / 20), 9);
  const palette = buildPalette(rng, balanceErg);

  // Background gradient
  const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.75);
  bgGrad.addColorStop(0, '#141620');
  bgGrad.addColorStop(1, '#08090d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // --- Layer 1: Flowing concentric rings ---
  const cx = W / 2 + (rng() - 0.5) * 60;
  const cy = H / 2 + (rng() - 0.5) * 60;
  for (let i = 0; i < 18 + layers; i++) {
    const r = 15 + i * (W / 2 / (18 + layers)) + rng() * 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = palette[i % palette.length] + Math.floor(40 + rng() * 80).toString(16).padStart(2, '0');
    ctx.lineWidth = 0.8 + rng() * 2.5;
    ctx.stroke();
  }

  // --- Layer 2: Geometric shards (triangles/quads) ---
  const shardCount = 12 + layers * 3;
  for (let i = 0; i < shardCount; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const size = 20 + rng() * 80;
    const sides = rng() > 0.5 ? 3 : 4;
    const angle = rng() * Math.PI * 2;
    ctx.beginPath();
    for (let s = 0; s < sides; s++) {
      const a = angle + (s / sides) * Math.PI * 2;
      const px = x + Math.cos(a) * size;
      const py = y + Math.sin(a) * size;
      s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    const col = palette[i % palette.length];
    ctx.fillStyle = col + '22';
    ctx.strokeStyle = col + 'aa';
    ctx.lineWidth = 1 + rng();
    ctx.fill();
    ctx.stroke();
  }

  // --- Layer 3: Address-derived dot grid ---
  const gridSize = 9;
  const step = W / gridSize;
  for (let gx = 0; gx < gridSize; gx++) {
    for (let gy = 0; gy < gridSize; gy++) {
      const charIdx = (gx * gridSize + gy) % address.length;
      const charVal = address.charCodeAt(charIdx);
      const norm = (charVal - 48) / 75; // normalise roughly 0-1
      if (rng() > 0.45) {
        const px = step * gx + step / 2;
        const py = step * gy + step / 2;
        const r = 2 + norm * 8 + rng() * 4;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = palette[charVal % palette.length] + 'cc';
        ctx.fill();
      }
    }
  }

  // --- Layer 4: Connecting web lines between dots ---
  const nodes = [];
  for (let i = 0; i < 18 + layers; i++) {
    nodes.push({ x: rng() * W, y: rng() * H, c: palette[i % palette.length] });
  }
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 160 + layers * 8) {
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        const alpha = Math.floor((1 - dist / 200) * 120).toString(16).padStart(2, '0');
        ctx.strokeStyle = nodes[i].c + alpha;
        ctx.lineWidth = 0.5 + rng() * 0.8;
        ctx.stroke();
      }
    }
  }

  // --- Layer 5: Central glyph (Σ) ---
  const glowGrad = ctx.createRadialGradient(W / 2, H / 2, 5, W / 2, H / 2, 70);
  glowGrad.addColorStop(0, palette[0] + '88');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = 'bold 72px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff22';
  ctx.fillText('Σ', W / 2 + 2, H / 2 + 2);
  ctx.fillStyle = palette[0];
  ctx.fillText('Σ', W / 2, H / 2);

  // --- Layer 6: Balance / tx count watermark ---
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#ffffff33';
  ctx.fillText(`${balanceErg.toFixed(2)} ERG · ${txCount} txs`, 12, H - 10);
  ctx.textAlign = 'right';
  ctx.fillText(address.slice(0, 10) + '…' + address.slice(-6), W - 12, H - 10);

  return palette;
}

// ─── Stats panel ──────────────────────────────────────────────────────────────
function renderStats(balanceErg, txCount, address, palette) {
  const el = document.getElementById('statsContent');
  const degenScore = Math.min(100, Math.round(
    (Math.log10(txCount + 1) * 20) +
    (balanceErg > 0 ? Math.min(40, Math.log10(balanceErg + 1) * 15) : 0) +
    (address.length > 50 ? 5 : 0)
  ));

  el.innerHTML = `
    <div class="stat-row"><span class="stat-label">Balance</span><span class="stat-value positive">${balanceErg.toFixed(4)} ERG</span></div>
    <div class="stat-row"><span class="stat-label">Transactions</span><span class="stat-value">${txCount.toLocaleString()}</span></div>
    <div class="stat-row"><span class="stat-label">Address length</span><span class="stat-value">${address.length} chars</span></div>
    <div class="stat-row"><span class="stat-label">Degen Score</span><span class="stat-value highlight">${degenScore}/100</span></div>
    <div class="stat-row"><span class="stat-label">Art layers</span><span class="stat-value">${Math.min(3 + Math.floor(txCount / 20), 9)}</span></div>
    <div class="stat-row"><span class="stat-label">Palette seed</span><span class="stat-value">${balanceErg < 1 ? 'Void Blue' : balanceErg < 100 ? 'Degen Violet' : balanceErg < 1000 ? 'Ember Orange' : balanceErg < 10000 ? 'Gold Rush' : 'Blood Red'}</span></div>
  `;

  const row = document.getElementById('paletteRow');
  row.innerHTML = palette.map(c => `<div class="swatch" style="background:${c}" title="${c}"></div>`).join('');
}

// ─── API fetch ────────────────────────────────────────────────────────────────
async function fetchAddressData(address) {
  const [balRes, txRes] = await Promise.allSettled([
    fetch(`${EXPLORER}/addresses/${address}/balance/confirmed`),
    fetch(`${EXPLORER}/addresses/${address}/transactions?limit=1`)
  ]);

  let balanceErg = 0;
  let txCount = 0;

  if (balRes.status === 'fulfilled' && balRes.value.ok) {
    const data = await balRes.value.json();
    balanceErg = (data.nanoErgs || 0) / 1e9;
  }

  if (txRes.status === 'fulfilled' && txRes.value.ok) {
    const data = await txRes.value.json();
    txCount = data.total || 0;
  }

  return { balanceErg, txCount };
}

// ─── Main flow ────────────────────────────────────────────────────────────────
async function generate(address) {
  address = address.trim();
  if (!address) return;

  const canvas = document.getElementById('artCanvas');
  const loading = document.getElementById('loadingOverlay');
  const dlBtn = document.getElementById('downloadBtn');

  loading.classList.remove('hidden');
  dlBtn.disabled = true;

  try {
    const { balanceErg, txCount } = await fetchAddressData(address);
    const palette = renderArt(canvas, address, balanceErg, txCount);
    renderStats(balanceErg, txCount, address, palette);
    dlBtn.disabled = false;
    dlBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `ergo-art-${address.slice(0, 10)}.png`;
      a.click();
    };
  } catch (e) {
    console.error(e);
    // Render with zeroed data so art still works offline
    const palette = renderArt(canvas, address, 0, 0);
    renderStats(0, 0, address, palette);
    dlBtn.disabled = false;
  } finally {
    loading.classList.add('hidden');
  }
}

// ─── Wiring ───────────────────────────────────────────────────────────────────
document.getElementById('generateBtn').addEventListener('click', () => {
  generate(document.getElementById('addressInput').value);
});

document.getElementById('addressInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') generate(e.target.value);
});

// Sample addresses for "Try Random"
const SAMPLES = [
  '9fRAWhdxEsTd1x8C4jxBiBBe4vA8c4FbdFmtpYCfbwipJDf9E6E',
  '9hY16vzHmmfyVBwKeFGHvb2bMFsG94A1u7To1QWtUokACyFVENQ',
  '9g7oxZkBEQBpsBuhrHHwqfuJbKGKe4qBuoEuww9cjU2APe9L7gu',
  '9iJd9drp1KR3R7HLi7YmQbB5sJ5avRQ9QKe6MkVK6aFCPYDrMJK',
];
let sampleIdx = 0;
document.getElementById('randomBtn').addEventListener('click', () => {
  const addr = SAMPLES[sampleIdx++ % SAMPLES.length];
  document.getElementById('addressInput').value = addr;
  generate(addr);
});

// Draw placeholder on load
(function initPlaceholder() {
  const canvas = document.getElementById('artCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = '#0e101a';
  ctx.fillRect(0, 0, W, H);
  ctx.font = '18px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1e2235';
  ctx.fillText('Enter an address above to generate art', W / 2, H / 2);
  ctx.font = 'bold 80px serif';
  ctx.fillStyle = '#1e2235';
  ctx.fillText('Σ', W / 2, H / 2 - 60);
})();
