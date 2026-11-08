// Harvey's p5.js sketches, ported to instance mode so several can live on one page.
// Any element with data-sketch="ripples|circles|interactive-circles|mosaic" and
// data-src="image" becomes a sketch, sized to the element's width.

const stillMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Fit an image to a container width, returning canvas width/height
function fitTo(el, img) {
  const w = el.clientWidth;
  return [w, Math.round(w * img.height / img.width)];
}

// --- Breathing ripples (home page) ---
const rippleVert = `
precision mediump float;
attribute vec3 aPosition;
attribute vec2 aTexCoord;
varying vec2 vTexCoord;
void main(){
  vTexCoord = aTexCoord;
  vec4 p = vec4(aPosition, 1.0);
  p.xy = p.xy * 2.0 - 1.0;
  gl_Position = p;
}`;

const rippleFrag = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_imgResolution;
uniform sampler2D u_texture;
uniform float u_freq;
uniform float u_speed;
uniform float u_amp;
uniform float u_zoom;
uniform float u_fade;
varying vec2 vTexCoord;
void main(){
  vec2 uv = vec2(vTexCoord.x, 1.0 - vTexCoord.y);
  // Cover the canvas whatever its shape
  vec2 canvasAspect = u_resolution / min(u_resolution.x, u_resolution.y);
  vec2 imageAspect  = u_imgResolution / min(u_imgResolution.x, u_imgResolution.y);
  vec2 s = canvasAspect / imageAspect;
  uv = (uv - 0.5) * s / max(s.x, s.y) + 0.5;
  uv = (uv - 0.5) / u_zoom + 0.5;
  vec2 delta = uv - 0.5;
  float dist = length(delta);
  float wave = sin(dist * u_freq - u_time * u_speed);
  vec2 uv2 = uv + normalize(delta) * wave * u_amp;
  // Zoomed out past the photo's edges (data-zoom below 1), it fades softly into black
  float edge = min(min(uv2.x, 1.0 - uv2.x), min(uv2.y, 1.0 - uv2.y));
  float m = u_fade > 0.0 ? smoothstep(0.0, u_fade, edge) : 1.0;
  gl_FragColor = vec4(texture2D(u_texture, clamp(uv2, 0.0, 1.0)).rgb * m, 1.0);
}`;

function ripples(el) {
  return (p) => {
    let img, sh;
    // Intensity 0–1 from the glass slider, eased towards so changes never jump
    const slider = document.getElementById('ripple-intensity');
    let level = 0, phase = 0, last = 0;
    const start = performance.now();
    const target = () => (slider ? parseFloat(slider.value) : 0.2);
    const mix = (a, b, k) => a + (b - a) * k;
    const zoomBase = parseFloat(el.dataset.zoom || 1);
    const breatheBy = parseFloat(el.dataset.breathe ?? 0.25);
    const fade = parseFloat(el.dataset.fade || 0);

    // The slider drifts on its own: up to the top and back down to its starting
    // value over 30 seconds, then rests for 30 seconds, and repeats. Moving the
    // slider by hand hands control to the visitor for good.
    const base = slider ? parseFloat(slider.value) : 0.2;
    const RISE_FALL = 30, REST = 30;                       // seconds
    const DELAY = parseFloat(el.dataset.delay ?? 30);       // rests this long after the page opens (data-delay)
    let autoDrift = !!slider && !stillMotion;
    if (slider) slider.addEventListener('input', (e) => { if (e.isTrusted) autoDrift = false; placeThumb(); });

    // Position the visible thumb dot from the slider's value (sub-pixel, so it glides)
    const thumb = slider && slider.parentElement.querySelector('.ripple-thumb');
    function placeThumb() {
      if (!thumb) return;
      const travel = slider.clientWidth - thumb.offsetWidth;
      thumb.style.setProperty('--thumb-x', (parseFloat(slider.value) * travel).toFixed(2) + 'px');
    }
    placeThumb();
    addEventListener('resize', placeThumb);
    function drift(t) {
      const c = (t - DELAY) % (RISE_FALL + REST);
      if (t < DELAY || c >= RISE_FALL) return base;
      return base + (1 - base) * (1 - Math.cos((2 * Math.PI * c) / RISE_FALL)) / 2;
    }

    p.preload = () => { img = p.loadImage(el.dataset.src); };
    p.setup = () => {
      p.pixelDensity(1);
      p.createCanvas(el.clientWidth, el.clientHeight, p.WEBGL).parent(el);
      p.noStroke();
      sh = p.createShader(rippleVert, rippleFrag);
      if (stillMotion) { level = target(); p.noLoop(); }
      if (slider && stillMotion) slider.addEventListener('input', () => { level = target(); p.redraw(); });
    };
    p.windowResized = () => p.resizeCanvas(el.clientWidth, el.clientHeight);
    p.draw = () => {
      const now = performance.now();
      const t = stillMotion ? 20 : (now - start) / 1000;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;

      // Fade in from stillness over the first few seconds, then follow the slider gently
      if (autoDrift) { slider.value = drift(t); placeThumb(); }
      const intro = Math.min(t / Math.min(6, DELAY || 6), 1);
      const ease = intro * intro * (3 - 2 * intro);
      if (!stillMotion) level += (target() * ease - level) * Math.min(dt * 1.5, 1);

      // Each parameter still breathes at its own rhythm, within a range set by the slider
      const breathe = (rate, off) => (Math.sin(t * rate + off) + 1) / 2;
      const speed = mix(0.15, 1.1, level) * mix(0.7, 1.3, breathe(0.15, 1.0));
      phase += speed * dt;
      p.shader(sh);
      sh.setUniform('u_time', stillMotion ? 20 : phase);
      sh.setUniform('u_speed', 1.0);
      sh.setUniform('u_resolution', [p.width, p.height]);
      sh.setUniform('u_imgResolution', [img.width, img.height]);
      sh.setUniform('u_texture', img);
      sh.setUniform('u_freq', mix(30, 70, level) * mix(0.85, 1.15, breathe(0.2, 0)));
      sh.setUniform('u_amp', mix(0.0015, 0.028, level) * mix(0.6, 1, breathe(0.1, 2.0)));
      // data-zoom: below 1 shows more of the photo; data-breathe: how far it slowly drifts in
      sh.setUniform('u_zoom', zoomBase * mix(1.0, 1 + breatheBy, breathe(0.05, 3.0)));
      sh.setUniform('u_fade', fade);
      p.rect(-p.width / 2, -p.height / 2, p.width, p.height);
    };
  };
}

// --- Concentric circles: split and rotate (continuous, or on hover) ---
function circles(el, interactive) {
  return (p) => {
    let img, ringWidth, scaled, lineW = 0.5;
    // Ring count and width can be set per page (data-rings, data-ring-width as a fraction of the photo width)
    const numRings = parseInt(el.dataset.rings, 10) || (interactive ? 6 : 8);
    const angles = [], speeds = [];
    // The live (non-interactive) version runs on a clock: each ring's angle is its own speed
    // times the time t, so time can be sped up, run backwards, or returned to zero, where
    // every ring lines up again into the untouched photograph
    let t = 0, rate = 1, vel = 1, rewinding = false, last = 0, holdUntil = 0;   // vel: how fast time is actually moving, easing towards rate
    p.preload = () => { img = p.loadImage(el.dataset.src); };
    function size() {
      if (!interactive) {
        // As in the original file: the photo's own proportions, 150px rings (or data-ring-width),
        // optionally cropped to a portrait frame. Drawn at the size it is shown (up to 2x for
        // sharp screens) from a copy of the photo scaled once, rather than redrawing the full
        // 2000px photo 21 times a frame
        const aspect = parseFloat(el.dataset.aspect) || img.width / img.height;
        const w = Math.min(img.width, Math.round(img.height * aspect));
        const k = Math.min(1, (el.clientWidth || w) * Math.min(window.devicePixelRatio || 1, 2) / w);
        p.resizeCanvas(Math.round(w * k), Math.round(w * k / aspect));
        ringWidth = (el.dataset.ringWidth ? img.width * parseFloat(el.dataset.ringWidth) : 150) * k;
        lineW = Math.max(0.5 * k, 0.35);
        scaled = document.createElement('canvas');
        scaled.width = Math.round(img.width * k); scaled.height = Math.round(img.height * k);
        const sc = scaled.getContext('2d'); sc.imageSmoothingQuality = 'high';
        sc.drawImage(img.canvas || img.elt, 0, 0, scaled.width, scaled.height);
        return;
      }
      const [w, h] = fitTo(el, img);
      p.resizeCanvas(w, h);
      ringWidth = Math.min(w, h) / 2 / numRings;
    }
    p.setup = () => {
      if (!interactive) p.pixelDensity(1);
      p.createCanvas(10, 10).parent(el);
      size();
      p.imageMode(p.CENTER);
      for (let i = 0; i < numRings; i++) {
        angles[i] = 0;
        speeds[i] = interactive ? 0.005 : p.random(-0.0015, 0.0015);
      }
      if (stillMotion && !interactive) {
        t = 400;                                              // a still, already-turned frame
        p.noLoop();
      }
      if (!interactive && el.dataset.controls === 'time') timeControls();
    };

    // Speed slider (left of centre runs time backwards), a return-to-the-photograph button,
    // and a clock in the specimen labels' mono
    function timeControls() {
      const bar = document.createElement('div');
      bar.className = 'time-control';
      bar.innerHTML = `
        <button type="button" class="tc-rewind" aria-label="Return to the photograph"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"/></svg></button>
        <span class="tc-label">Time</span>
        <input type="range" min="-4" max="4" step="0.05" value="1" aria-label="Speed of time, backwards to the left, forwards to the right">
        <span class="tc-rate">×1.0</span>
        <span class="tc-clock" aria-live="off">T+ 00:00</span>`;
      el.appendChild(bar);
      const range = bar.querySelector('input'), out = bar.querySelector('.tc-rate');
      el._tc = { clock: bar.querySelector('.tc-clock') };
      range.addEventListener('input', () => {
        let v = parseFloat(range.value);
        if (Math.abs(v) < 0.15) { v = 0; range.value = 0; }      // a soft stop at the centre: time stands still
        rate = v; rewinding = false; holdUntil = 0;
        out.textContent = v === 0 ? 'Still' : `×${v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;
        p.loop();
      });
      bar.querySelector('.tc-rewind').addEventListener('click', () => { rewinding = true; holdUntil = 0; p.loop(); });
    }
    p.windowResized = () => { size(); if (!interactive) p.redraw(); };
    // The live version, drawn straight onto the canvas: the photo once, then each ring as only
    // the square of photo it needs, clipped to its band and turned to its angle
    function drawRings() {
      const ctx = p.drawingContext, W = p.width, H = p.height, cx = W / 2, cy = H / 2;
      const sw = scaled.width, sh = scaled.height;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(scaled, cx - sw / 2, cy - sh / 2);
      for (let i = 0; i < numRings; i++) {
        const R = (i + 1) * ringWidth;
        const x0 = Math.max(0, sw / 2 - R), y0 = Math.max(0, sh / 2 - R), x1 = Math.min(sw, sw / 2 + R), y1 = Math.min(sh, sh / 2 + R);
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(angles[i]);
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.arc(0, 0, i * ringWidth, Math.PI * 2, 0, true);
        ctx.closePath(); ctx.clip();
        ctx.drawImage(scaled, x0, y0, x1 - x0, y1 - y0, x0 - sw / 2, y0 - sh / 2, x1 - x0, y1 - y0);
        ctx.restore();
      }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = lineW;
      for (let i = 1; i <= numRings; i++) { ctx.beginPath(); ctx.arc(cx, cy, i * ringWidth, 0, Math.PI * 2); ctx.stroke(); }
    }
    p.draw = () => {
      if (!interactive) {
        const now = performance.now(), dt = last ? Math.min((now - last) / 1000, 0.1) : 0; last = now;
        // Time never jumps: its speed always eases towards where it's asked to be, whether the
        // slider moves, time stops, or it winds back to the photograph (fast at first, slowing
        // as it nears zero), so the spin glides through every change
        let want = rate;
        if (rewinding) want = Math.max(-40, Math.min(40, -t * 2.2));
        else if (now < holdUntil || (stillMotion && rate === 1)) want = 0;
        vel += (want - vel) * Math.min(dt * 4, 1);
        t += vel * dt;
        if (rewinding && Math.abs(t) < 0.05) { t = 0; vel = 0; rewinding = false; holdUntil = now + 1800; }
        for (let i = 0; i < numRings; i++) angles[i] = speeds[i] * 60 * t;
        if (el._tc) {
          const a = Math.abs(Math.round(t)), m = String(Math.floor(a / 60)).padStart(2, '0'), sec = String(a % 60).padStart(2, '0');
          el._tc.clock.textContent = `T${t < -0.5 ? '−' : '+'} ${m}:${sec}`;
        }
        drawRings();
        // Time standing still: draw this frame, then rest until something changes
        if (rate === 0 && !rewinding && now >= holdUntil && Math.abs(vel) < 0.001) { vel = 0; p.noLoop(); last = 0; }
        return;
      }
      p.background(0);
      const iw = interactive ? p.width : img.width, ih = interactive ? p.height : img.height;
      p.image(img, p.width / 2, p.height / 2, iw, ih);
      const d = p.dist(p.mouseX, p.mouseY, p.width / 2, p.height / 2);
      const ctx = p.drawingContext;
      p.push();
      p.translate(p.width / 2, p.height / 2);
      for (let i = 0; i < numRings; i++) {
        if (interactive && d > i * ringWidth && d < (i + 1) * ringWidth) angles[i] += speeds[i];
        p.push();
        p.rotate(angles[i]);
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, (i + 1) * ringWidth, 0, Math.PI * 2);
        ctx.arc(0, 0, i * ringWidth, Math.PI * 2, 0, true);
        ctx.closePath();
        ctx.clip();
        p.image(img, 0, 0, iw, ih);
        ctx.restore();
        p.pop();
      }
      p.stroke(255);
      p.strokeWeight(interactive ? 1 : 0.5);
      p.noFill();
      for (let i = 1; i <= numRings; i++) p.ellipse(0, 0, 2 * i * ringWidth);
      p.pop();
    };
  };
}

// --- Interactive mosaic puzzle ---
function mosaic(el) {
  return (p) => {
    let img, cols, rows, block, cell;
    const blocks = [], cells = [], assignment = [];
    let selected = null;
    p.preload = () => { img = p.loadImage(el.dataset.src); };
    function size() {
      cell = el.clientWidth / cols;
      p.resizeCanvas(Math.round(cols * cell), Math.round(rows * cell));
    }
    p.setup = () => {
      // Same proportions as the original: 100px blocks, about 8 across
      block = Math.ceil(img.width / 8);
      cols = Math.ceil(img.width / block);
      rows = Math.ceil(img.height / block);
      p.createCanvas(10, 10).parent(el);
      size();
      img.loadPixels();
      // Divide into blocks and measure each block's brightness
      for (let y = 0; y < img.height; y += block) {
        for (let x = 0; x < img.width; x += block) {
          let sum = 0, n = 0;
          for (let j = y; j < y + block && j < img.height; j += 2) {
            for (let i = x; i < x + block && i < img.width; i += 2) {
              const k = (i + j * img.width) * 4;
              sum += 0.2126 * img.pixels[k] + 0.7152 * img.pixels[k + 1] + 0.0722 * img.pixels[k + 2];
              n++;
            }
          }
          blocks.push({ x, y, w: Math.min(block, img.width - x), h: Math.min(block, img.height - y), b: sum / n });
        }
      }
      // Brightest first, laid out along the diagonals
      blocks.sort((a, b) => b.b - a.b);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ r, c, sum: r + c });
      cells.sort((a, b) => (a.sum === b.sum ? a.c - b.c : a.sum - b.sum));
      cells.forEach((_, i) => assignment.push(i));
    };
    p.windowResized = size;
    p.draw = () => {
      p.background(0);
      cells.forEach((c, i) => {
        const x = c.c * cell, y = c.r * cell;
        const hover = p.mouseX >= x && p.mouseX < x + cell && p.mouseY >= y && p.mouseY < y + cell;
        const blk = blocks[assignment[i]];
        if (hover) p.tint(173, 216, 230); else p.noTint();
        p.image(img, x, y, cell, cell, blk.x, blk.y, blk.w, blk.h);
        if (hover || selected === i) {
          p.noFill();
          p.stroke(selected === i ? p.color(0, 255, 255) : p.color(173, 216, 230));
          p.strokeWeight(selected === i ? 4 : 3);
          p.rect(x, y, cell, cell);
        }
      });
      p.noTint();
    };
    p.mousePressed = () => {
      if (p.mouseX < 0 || p.mouseX >= p.width || p.mouseY < 0 || p.mouseY >= p.height) return;
      const col = Math.floor(p.mouseX / cell), row = Math.floor(p.mouseY / cell);
      const i = cells.findIndex((c) => c.r === row && c.c === col);
      if (i === -1) return;
      if (selected === null) selected = i;
      else if (selected === i) selected = null;
      else { [assignment[selected], assignment[i]] = [assignment[i], assignment[selected]]; selected = null; }
      return false;
    };
  };
}

const sketches = {
  ripples,
  circles: (el) => circles(el, false),
  'interactive-circles': (el) => circles(el, true),
  mosaic,
};

document.querySelectorAll('[data-sketch]').forEach((el) => {
  const make = sketches[el.dataset.sketch];
  // Start a sketch only once it is near view; pause it while off-screen
  let inst = null;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !inst) inst = new p5(make(el));
    else if (inst && !stillMotion) e.isIntersecting ? inst.loop() : inst.noLoop();
  }, { rootMargin: '200px' }).observe(el);
});
