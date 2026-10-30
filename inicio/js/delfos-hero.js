/*!
 * Delfos — Hero scroll-driven (sequência de imagens em <canvas>)
 * HTML/CSS/JS puro, sem dependências. ES module.
 *
 * Como funciona, em 4 linhas:
 *  1. A seção tem SECTION_HEIGHT vh; dentro dela, um container sticky de 100svh.
 *  2. O scroll dentro da seção vira um progresso 0–1 (alvo). Um lerp leva o progresso
 *     "atual" até o alvo a cada requestAnimationFrame → movimento amanteigado nos 2 sentidos.
 *  3. O progresso escolhe o frame desenhado no canvas (enquadramento "contain" sobre a
 *     área segura do notebook, então ele nunca é cortado). Os frames ficam em memória
 *     COMPRIMIDOS (Blob WebP, ~8 MB); só uma janela ao redor do frame atual é decodificada
 *     fora da thread principal (createImageBitmap, já no tamanho de tela). Isso elimina o
 *     "decode síncrono" no drawImage — a principal causa de travadas nesse tipo de hero.
 *  4. No fim do vídeo, uma camada separada do D (WebP com alpha, recortada do último frame
 *     com geometria idêntica) assume, o notebook se dissolve e o D sobe, escala, gira e flutua.
 */

// ════════════════════════════════════════════════════════════════════════════
//  CONSTANTES AJUSTÁVEIS
// ════════════════════════════════════════════════════════════════════════════

/** Nº de frames exportados pelo ffmpeg (ver scripts/extract-frames.sh). */
export const TOTAL_FRAMES = 239;

/** Altura da seção em vh. Mais alto = animação mais lenta por pixel rolado. */
export const SECTION_HEIGHT = 500;

/** Fator do lerp por quadro a 60 Hz (é corrigido por delta-time, então vale igual a 120 Hz). */
export const EASE = 0.12;

/** Limite do devicePixelRatio do canvas (2 = nitidez retina sem estourar fill-rate). */
export const DPR_MAX = 2;

/**
 * Faixas de progresso (0–1) de cada cena.
 *  frames  : intervalo em que o vídeo é "tocado" (frame 0 → último frame)
 *  handoff : notebook se dissolve; a camada do D (idêntica ao D do último frame) assume
 *  rise    : o D sobe, escala, gira levemente e passa a flutuar
 *  captions: [início, fim] de cada legenda, na ordem do HTML (.dh__cap)
 * Regra: handoff[0] >= frames[1] e rise[0] perto do fim do handoff (senão aparece um D "fantasma").
 */
export const SCENE_RANGES = {
  frames: [0.0, 0.78],
  handoff: [0.78, 0.86],
  rise: [0.84, 1.0],
  captions: [
    [0.0, 0.16], // legenda 1 — já visível no topo (início <= 0 => sem fade-in)
    [0.34, 0.52], // legenda 2 — enquanto o notebook abre
    [0.9, 1.0], // legenda final — fica (fim >= 1 => sem fade-out)
  ],
};

/** Largura (em progresso) do fade de cada legenda e deslocamento vertical em px. */
export const CAPTION_FADE = 0.035;
export const CAPTION_SHIFT = 20;

/** Cor de fundo da página/seção. Os frames foram tratados para preto puro nas bordas. */
export const BG_COLOR = '#000';

/**
 * Área segura em coordenadas do vídeo-mestre (1920×1080): união do bounding box do
 * notebook + D em TODOS os 239 frames (+16 px de folga). O enquadramento garante que
 * esse retângulo inteiro cabe na tela → topo da tampa nunca é cortado.
 */
export const SAFE_AREA = { x: 122, y: 38, w: 1610, h: 1016 };

/** Respiro do enquadramento, em fração do viewport. padBottom reserva a faixa das legendas. */
export const FIT = { padX: 0.03, padTop: 0.04, padBottom: 0.16, maxScale: 1.25 };

/** Fontes de frames. crop = região do mestre que o arquivo contém. */
export const SOURCES = {
  desktop: {
    dir: 'frames/desktop/', // 1920×1080
    fileW: 1920,
    fileH: 1080,
    crop: { x: 0, y: 0, w: 1920, h: 1080 },
  },
  mobile: {
    dir: 'frames/mobile/', // 1080×648, recorte do mestre que contém a área segura
    fileW: 1080,
    fileH: 648,
    crop: { x: 100, y: 24, w: 1720, h: 1032 },
  },
};
/** Abaixo desta largura (px CSS) carrega o set mobile. Manter igual ao media do <link preload>. */
export const MOBILE_BREAKPOINT = 600;

/** Carregar primeiro 1 a cada N frames (frames-chave), depois o resto. */
export const KEYFRAME_STEP = 10;

/**
 * Janela de frames decodificados (ImageBitmap) ao redor do frame atual.
 * Memória ≈ (AHEAD + BEHIND + 1) × largura × altura × 4 bytes, no tamanho de tela.
 * Ex.: celular 390 px @2x → ~1,5 MB/frame → ~40 MB; notebook 1440 px @1x → ~5 MB/frame.
 */
export const DECODE_WINDOW = { ahead: 18, behind: 8, concurrency: 3 };

/** Camada do D. x/y/w/h = posição exata do recorte no último frame (coords do mestre). */
export const D_LAYER = {
  x: 773,
  y: 55,
  w: 464,
  h: 552,
  targetY: 0.35, // centro final do D, em fração da altura do viewport
  targetHVh: 0.42, // altura final desejada (fração do vh)…
  targetWVw: 0.6, // …limitada por esta fração da largura
  minGrowth: 1.08, // o D sempre cresce pelo menos 8% ao subir
  maxHVh: 0.46, // e nunca passa de 50% da altura (espaço para a legenda final)
  rotateY: 12, // graus — giro leve que vai e volta durante a subida
  rotateZ: -2.5,
  floatAmp: 7, // px — flutuação contínua quando o D já subiu
  floatPeriod: 4200, // ms
  glowMax: 0.9,
};

// ════════════════════════════════════════════════════════════════════════════

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const range = (p, [a, b]) => clamp((p - a) / (b - a));
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const pad4 = (n) => String(n).padStart(4, '0');

/**
 * Inicializa o hero. Retorna { destroy } — chame destroy() ao desmontar (SPA/React).
 * @param {HTMLElement} root  elemento .dh (default: [data-delfos-hero])
 * @param {{basePath?: string}} options  basePath = prefixo dos assets (ex.: '/hero/')
 */
export function initDelfosHero(root = document.querySelector('[data-delfos-hero]'), options = {}) {
  if (!root) return { destroy() {} };
  const basePath = options.basePath ?? '';
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let instance = start(root, basePath, mq.matches);
  // Se o usuário mudar a preferência com a página aberta, reinicia no modo certo.
  const onMq = () => {
    instance.destroy();
    instance = start(root, basePath, mq.matches);
  };
  mq.addEventListener('change', onMq);
  return {
    get stats() {
      return instance.stats;
    },
    destroy() {
      mq.removeEventListener('change', onMq);
      instance.destroy();
    },
  };
}

function start(root, basePath, reducedMotion) {
  const sticky = root.querySelector('.dh__sticky');
  const canvas = root.querySelector('.dh__canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const dEl = root.querySelector('.dh__d');
  const glowEl = root.querySelector('.dh__glow');
  const caps = [...root.querySelectorAll('.dh__cap')];
  const loaderEl = root.querySelector('.dh__loader');
  const loaderBar = loaderEl?.querySelector('span');

  const ac = new AbortController(); // remove todos os listeners de uma vez no destroy()
  const N = TOTAL_FRAMES;
  const source = window.innerWidth <= MOBILE_BREAKPOINT ? SOURCES.mobile : SOURCES.desktop;
  const blobs = new Array(N); // WebP comprimido por índice (barato em memória)
  const pending = new Set();
  const bitmaps = new Map(); // i → ImageBitmap no tamanho de tela (janela deslizante)
  const lowBitmaps = new Array(N); // frames-chave em meia resolução: rede de segurança em scroll muito rápido
  const decoding = new Set();
  let lastFull = null; // último frame em resolução cheia, fixo na memória (é a ponte para a camada do D)
  let decodeW = 0; // largura de decodificação em px de dispositivo
  let decodeH = 0;
  let gen = 0; // invalida decodificações antigas após resize
  let loadedCount = 0;
  let destroyed = false;
  const stats = { draws: 0, neighborDraws: 0, lowResDraws: 0 }; // diagnóstico: desenhos que não eram o frame exato

  // Estado de layout (px CSS)
  const L = { vw: 0, vh: 0, dpr: 1, s: 1, ox: 0, oy: 0, sectionTop: 0, scrollable: 1 };
  // Estado do D
  const D = { left: 0, top: 0, w: 0, h: 0, dx: 0, dy: 0, scale: 1 };

  let target = 0;
  let current = 0;
  let raf = 0;
  let lastTime = 0;
  let inView = true;
  let drawnImg = null;
  let drawnIdx = -1;
  let dirty = true;
  let curIdx = 0;
  let dir = 1;
  const styleCache = new WeakMap(); // evita escrever estilos repetidos (menos style recalc)

  root.classList.toggle('dh--static', reducedMotion);
  root.style.setProperty('--dh-height', reducedMotion ? 'auto' : `${SECTION_HEIGHT}vh`);

  // ─── Layout ──────────────────────────────────────────────────────────────
  function measure() {
    const r = root.getBoundingClientRect();
    L.sectionTop = r.top + window.scrollY;
    L.scrollable = Math.max(1, root.offsetHeight - window.innerHeight);
  }

  function resize() {
    L.vw = sticky.clientWidth;
    L.vh = sticky.clientHeight;
    L.dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    canvas.width = Math.round(L.vw * L.dpr);
    canvas.height = Math.round(L.vh * L.dpr);
    ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Enquadramento: "contain" da ÁREA SEGURA (não do frame inteiro). O resto do frame
    // é fundo preto e pode sangrar para fora da tela sem perda (= "cover" onde dá).
    const fit = reducedMotion ? { ...FIT, padBottom: 0.26 } : FIT;
    const availW = L.vw * (1 - 2 * fit.padX);
    const availH = L.vh * (1 - fit.padTop - fit.padBottom);
    L.s = Math.min(availW / SAFE_AREA.w, availH / SAFE_AREA.h, fit.maxScale);
    const cx = L.vw / 2;
    const cy = L.vh * fit.padTop + availH / 2;
    L.ox = cx - (SAFE_AREA.x + SAFE_AREA.w / 2) * L.s;
    L.oy = cy - (SAFE_AREA.y + SAFE_AREA.h / 2) * L.s;

    // Faixa das legendas: logo abaixo da área segura.
    const safeBottom = L.oy + (SAFE_AREA.y + SAFE_AREA.h) * L.s;
    // Garante que a legenda mais alta nunca vaza pela base da tela (telas largas e baixas).
    const capH = Math.max(0, ...caps.filter((c) => reducedMotion || !c.classList.contains('dh__cap--final')).map((c) => c.offsetHeight));
    const capTop = Math.min(safeBottom + L.vh * 0.02, L.vh - capH - Math.max(20, L.vh * 0.03));
    root.style.setProperty('--dh-cap-top', `${Math.round(capTop)}px`);

    // Camada do D: mesma geometria do D dentro do frame → troca invisível.
    D.left = L.ox + D_LAYER.x * L.s;
    D.top = L.oy + D_LAYER.y * L.s;
    D.w = D_LAYER.w * L.s;
    D.h = D_LAYER.h * L.s;
    dEl.style.width = `${D.w}px`;
    dEl.style.height = `${D.h}px`;
    const aspect = D_LAYER.h / D_LAYER.w;
    let targetH = Math.min(L.vh * D_LAYER.targetHVh, L.vw * D_LAYER.targetWVw * aspect);
    targetH = Math.min(Math.max(targetH, D.h * D_LAYER.minGrowth), L.vh * D_LAYER.maxHVh);
    D.scale = targetH / D.h;
    D.dx = L.vw / 2 - (D.left + D.w / 2);
    D.dy = L.vh * D_LAYER.targetY - (D.top + D.h / 2);
    const glowSize = Math.max(D.w, D.h) * 1.9;
    glowEl.style.width = glowEl.style.height = `${glowSize}px`;
    D.glowOff = (glowSize - D.w) / 2;
    D.glowOffY = (glowSize - D.h) / 2;
    // Legenda final: abaixo do D na posição final.
    const finalBottom = L.vh * D_LAYER.targetY + targetH / 2;
    root.style.setProperty('--dh-final-top', `${Math.round(finalBottom + L.vh * 0.035)}px`);

    // Tamanho em que os frames são decodificados = tamanho em que aparecem (nunca maior que o arquivo).
    const w = Math.min(source.fileW, Math.ceil(source.crop.w * L.s * L.dpr));
    if (!decodeW || Math.abs(w - decodeW) / decodeW > 0.1) {
      decodeW = w;
      decodeH = Math.round((w * source.fileH) / source.fileW);
      gen++;
      bitmaps.forEach((b) => b.close?.());
      bitmaps.clear(); // a janela é refeita no tamanho novo; os lowBitmaps continuam valendo
      lastFull?.close?.();
      lastFull = null;
      decodeLast();
    }

    measure();
    target = computeProgress();
    if (reducedMotion) current = target;
    dirty = true;
    pump();
    kick();
  }

  function computeProgress() {
    if (reducedMotion) return 1;
    return clamp((window.scrollY - L.sectionTop) / L.scrollable);
  }

  // ─── Carregamento progressivo (rede) ───────────────────────────────────
  function loadFrame(i, priority) {
    if (blobs[i] || pending.has(i)) return Promise.resolve();
    pending.add(i);
    const url = `${basePath}${source.dir}frame_${pad4(i + 1)}.webp`;
    return fetch(url, { priority, signal: ac.signal })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!blob || destroyed) return;
        blobs[i] = blob;
        loadedCount++;
        onFrameLoaded(i);
      })
      .catch(() => {}); // frame faltando: o vizinho mais próximo cobre
  }

  async function queue(list, concurrency, priority) {
    let k = 0;
    const worker = async () => {
      while (k < list.length && !destroyed) await loadFrame(list[k++], priority);
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
  }

  let loaderPct = -1;
  function onFrameLoaded(i) {
    const pct = Math.round((loadedCount / N) * 100);
    if (loaderEl && pct !== loaderPct && pct % 2 === 0) {
      loaderPct = pct;
      loaderBar.style.transform = `scaleX(${pct / 100})`;
      loaderEl.setAttribute('aria-valuenow', String(pct));
    }
    if (i % KEYFRAME_STEP === 0 || i === N - 1) decodeLow(i);
    if (i === N - 1) decodeLast();
    pump();
  }

  function decodeLast() {
    if (lastFull || !blobs[N - 1] || !decodeW) return;
    const g = gen;
    lastFull = 'pending';
    toBitmap(blobs[N - 1], decodeW, decodeH, 'high').then((bm) => {
      if (destroyed || g !== gen) return bm.close?.();
      lastFull = bm;
      dirty = true;
      kick();
    });
  }

  async function preload() {
    if (reducedMotion) {
      // Modo estático: só o frame final.
      await loadFrame(N - 1, 'high');
      root.classList.add('is-ready', 'is-loaded');
      return;
    }
    const startIdx = frameIndexFor(current);
    await loadFrame(startIdx, 'high'); // placeholder imediato (o 1º frame no topo da página)
    const keys = [N - 1]; // último frame cedo: necessário para a troca com a camada do D
    for (let i = 0; i < N - 1; i += KEYFRAME_STEP) keys.push(i);
    await queue(keys, 6, 'high');
    if (destroyed) return;
    root.classList.add('is-ready');
    // Resto só depois do load da página e de um momento ocioso → não compete com LCP/TBT.
    if (document.readyState !== 'complete') {
      await new Promise((r) => window.addEventListener('load', r, { once: true, signal: ac.signal }));
    }
    await new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 800 }) : setTimeout(r, 200)));
    if (destroyed) return;
    // Ordem: a partir da posição atual, alternando para frente/trás — o que o usuário vai ver primeiro.
    const rest = [];
    const from = frameIndexFor(current);
    for (let d = 0; d < N; d++) {
      for (const i of [from + d, from - d - 1]) if (i >= 0 && i < N && !blobs[i]) rest.push(i);
    }
    await queue(rest, 4, 'low');
    if (!destroyed) root.classList.add('is-loaded');
  }

  // ─── Decodificação fora da thread principal ────────────────────────────
  const hasBitmap = typeof createImageBitmap === 'function';
  async function toBitmap(blob, w, h, quality) {
    if (hasBitmap) {
      try {
        return await createImageBitmap(blob, { resizeWidth: w, resizeHeight: h, resizeQuality: quality });
      } catch {
        try {
          return await createImageBitmap(blob); // navegadores sem opções de resize
        } catch {}
      }
    }
    // Fallback (navegadores muito antigos): <img> decodificada.
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    await img.decode().catch(() => {});
    URL.revokeObjectURL(img.src);
    return img;
  }

  function decodeLow(i) {
    if (lowBitmaps[i] || !blobs[i]) return;
    lowBitmaps[i] = 'pending';
    const w = Math.max(320, Math.round(decodeW / 2));
    toBitmap(blobs[i], w, Math.round((w * source.fileH) / source.fileW), 'medium').then((bm) => {
      if (destroyed) return bm.close?.();
      lowBitmaps[i] = bm;
      kick();
    });
  }

  /** Mantém decodificados os frames da janela [atual − behind, atual + ahead] e descarta o resto. */
  function pump() {
    if (destroyed || !decodeW) return;
    const { ahead, behind, concurrency } = DECODE_WINDOW;
    const lo = curIdx - (dir > 0 ? behind : ahead);
    const hi = curIdx + (dir > 0 ? ahead : behind);
    for (const [i, bm] of bitmaps) {
      if (i < lo - 4 || i > hi + 4) {
        bm.close?.();
        bitmaps.delete(i);
      }
    }
    // Do mais próximo para o mais distante, priorizando a direção do movimento.
    for (let d = 0; d <= Math.max(ahead, behind) && decoding.size < concurrency; d++) {
      for (const i of [curIdx + d * dir, curIdx - d * dir]) {
        if (i < lo || i > hi || i < 0 || i >= N) continue;
        if (bitmaps.has(i) || decoding.has(i) || !blobs[i]) continue;
        if (decoding.size >= concurrency) break;
        decoding.add(i);
        const g = gen;
        toBitmap(blobs[i], decodeW, decodeH, 'high').then((bm) => {
          decoding.delete(i);
          if (destroyed || g !== gen) return bm.close?.();
          bitmaps.set(i, bm);
          kick();
          pump();
        });
      }
    }
  }

  /** Melhor imagem disponível para o frame i: exata > vizinha (±2) > frame-chave em baixa > qualquer. */
  function pick(i) {
    if (i === N - 1 && lastFull && lastFull !== 'pending') return [lastFull, i];
    let full = null;
    let fd = Infinity;
    for (const [j, bm] of bitmaps) {
      const d = Math.abs(j - i);
      if (d < fd) [full, fd] = [bm, d];
    }
    if (full && fd <= 2) return [full, fd === 0 ? i : -2];
    let low = null;
    let ld = Infinity;
    for (let d = 0; d < N && d < ld; d++) {
      for (const j of [i - d, i + d]) {
        const bm = lowBitmaps[j];
        if (bm && bm !== 'pending') {
          low = bm;
          ld = d;
          break;
        }
      }
    }
    if (low && ld < fd) return [low, -1];
    return full ? [full, -2] : [low, -1];
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  function frameIndexFor(p) {
    return reducedMotion ? N - 1 : Math.round(range(p, SCENE_RANGES.frames) * (N - 1));
  }

  function drawFrame(img, idx) {
    const { x, y, w, h } = source.crop;
    const dx = L.ox + x * L.s;
    const dy = L.oy + y * L.s;
    const dw = w * L.s;
    const dh = h * L.s;
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, L.vw, L.vh);
    ctx.drawImage(img, dx, dy, dw, dh);
    // Feather nas bordas do frame que caem DENTRO da tela: funde o reflexo do chão
    // e qualquer resíduo com o fundo → nenhuma emenda visível entre canvas e página.
    const F = Math.min(90, dh * 0.12);
    const edge = (x0, y0, x1, y1, rx, ry, rw, rh) => {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, BG_COLOR);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(rx, ry, rw, rh);
    };
    if (dy > -1) edge(0, dy, 0, dy + F, 0, dy, L.vw, F);
    if (dy + dh < L.vh + 1) edge(0, dy + dh, 0, dy + dh - F, 0, dy + dh - F, L.vw, F);
    if (dx > -1) edge(dx, 0, dx + F, 0, dx, 0, F, L.vh);
    if (dx + dw < L.vw + 1) edge(dx + dw, 0, dx + dw - F, 0, dx + dw - F, 0, F, L.vh);
    drawnImg = img;
    drawnIdx = idx;
    stats.draws++;
    if (idx === -2) stats.neighborDraws++;
    if (idx === -1) stats.lowResDraws++;
  }

  function setStyle(el, prop, value) {
    let c = styleCache.get(el);
    if (!c) styleCache.set(el, (c = {}));
    if (c[prop] === value) return;
    c[prop] = value;
    el.style[prop] = value;
  }

  function render(p, now) {
    // 1) Frame do vídeo
    const idx = frameIndexFor(p);
    if (idx !== curIdx) {
      dir = idx > curIdx ? 1 : -1;
      curIdx = idx;
      pump();
    }
    const [img, exactIdx] = pick(idx);
    if (img && (img !== drawnImg || dirty)) drawFrame(img, exactIdx);
    dirty = false;

    if (reducedMotion) {
      caps.forEach((el, i) => {
        const on = i === caps.length - 1;
        setStyle(el, 'opacity', on ? '1' : '0');
        setStyle(el, 'transform', 'translate(-50%, 0px)');
      });
      return;
    }

    // 2) Handoff: canvas se dissolve; D-layer (pixel-idêntico) aparece no mesmo instante.
    const tH = range(p, SCENE_RANGES.handoff);
    const lastReady = drawnIdx === N - 1; // só troca para a camada do D com o último frame NÍTIDO na tela
    const dVisible = p >= SCENE_RANGES.handoff[0] && lastReady;
    // O canvas só se dissolve se a camada do D já estiver por cima → nunca há um quadro sem D.
    setStyle(canvas, 'opacity', dVisible ? (1 - easeOutCubic(tH)).toFixed(3) : '1');

    // 3) Subida do D
    const tR = easeInOutCubic(range(p, SCENE_RANGES.rise));
    const floatY = tR > 0 ? Math.sin((now / D_LAYER.floatPeriod) * Math.PI * 2) * D_LAYER.floatAmp * tR : 0;
    const swing = Math.sin(Math.PI * tR); // 0 → 1 → 0 : gira e volta
    const sc = 1 + (D.scale - 1) * tR;
    const x = D.left + D.dx * tR;
    const y = D.top + D.dy * tR + floatY;
    setStyle(dEl, 'opacity', dVisible ? '1' : '0');
    setStyle(
      dEl,
      'transform',
      `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) perspective(1400px) rotateY(${(D_LAYER.rotateY * swing).toFixed(2)}deg) rotateZ(${(D_LAYER.rotateZ * swing).toFixed(2)}deg) scale(${sc.toFixed(4)})`
    );
    const glowA = dVisible ? D_LAYER.glowMax * tR * (0.92 + 0.08 * Math.sin(now / 900)) : 0;
    setStyle(glowEl, 'opacity', glowA.toFixed(3));
    setStyle(
      glowEl,
      'transform',
      `translate3d(${(x - D.glowOff).toFixed(2)}px, ${(y - D.glowOffY).toFixed(2)}px, 0) scale(${(sc * (0.8 + 0.2 * tR)).toFixed(4)})`
    );

    // 4) Legendas: fade + translateY(20px) entrando por baixo, saindo por cima.
    caps.forEach((el, i) => {
      const [a, b] = SCENE_RANGES.captions[i] || [2, 3];
      const fin = a <= 0 ? 1 : clamp((p - a) / CAPTION_FADE);
      const fout = b >= 1 ? 1 : clamp((b - p) / CAPTION_FADE);
      const o = Math.min(fin, fout);
      const ty = fin < 1 ? (1 - fin) * CAPTION_SHIFT : (fout - 1) * CAPTION_SHIFT;
      setStyle(el, 'opacity', o.toFixed(3));
      setStyle(el, 'transform', `translate(-50%, ${ty.toFixed(2)}px)`);
      setStyle(el, 'visibility', o > 0 ? 'visible' : 'hidden');
    });
  }

  // ─── Loop ────────────────────────────────────────────────────────────────
  function tick(now) {
    raf = 0;
    const dt = lastTime ? Math.min(64, now - lastTime) : 16.667;
    lastTime = now;
    // lerp independente da taxa de quadros (60/90/120 Hz andam igual)
    const k = 1 - Math.pow(1 - EASE, dt / 16.667);
    current += (target - current) * k;
    if (Math.abs(target - current) < 0.00005) current = target;
    render(current, now);
    const floating = !reducedMotion && inView && current > SCENE_RANGES.rise[0];
    if (current !== target || floating || dirty) raf = requestAnimationFrame(tick);
    else lastTime = 0;
  }

  function kick() {
    if (!raf && !destroyed) raf = requestAnimationFrame(tick);
  }

  // ─── Eventos ─────────────────────────────────────────────────────────────
  const opts = { passive: true, signal: ac.signal };
  window.addEventListener(
    'scroll',
    () => {
      target = computeProgress();
      kick();
    },
    opts
  );
  window.addEventListener('resize', measure, opts);

  const ro = new ResizeObserver(resize);
  ro.observe(sticky);
  const roDoc = new ResizeObserver(measure); // conteúdo acima mudou de altura
  roDoc.observe(document.documentElement);
  const io = new IntersectionObserver(
    ([e]) => {
      inView = e.isIntersecting;
      if (inView) kick();
    },
    { rootMargin: '200px 0px' }
  );
  io.observe(root);

  resize();
  current = target; // ao recarregar no meio da página, começa no lugar certo (sem "voo")
  preload();

  return {
    stats,
    destroy() {
      destroyed = true;
      ac.abort();
      ro.disconnect();
      roDoc.disconnect();
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      bitmaps.forEach((b) => b.close?.());
      bitmaps.clear();
      lowBitmaps.forEach((b) => b?.close?.());
      lastFull?.close?.();
      blobs.length = 0;
      root.classList.remove('is-ready', 'is-loaded', 'dh--static');
    },
  };
}
