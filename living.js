// Living Puzzles, playable: the two photographs of the real puzzles become the puzzles.
// Living Grid: the photo is cut into its 12 x 8 tiles (100px each, measured from p5-03);
//   click a tile to pick it up, click another to swap them. There is no correct answer.
// Living Cycle: the photo's six rings (65px apart around 597, 399.5, measured from p5-04)
//   turn while the mouse rests on them, follow the hand when it moves along them, and
//   coast to a stop when it leaves. On touch screens a ring is turned by dragging it.
(function () {
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  function overlay(fig, img) {
    fig.classList.add('puzzle');
    const cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    fig.insertBefore(cv, img.nextSibling);
    const ctx = cv.getContext('2d');
    function size() {
      const dpr = Math.min(devicePixelRatio || 1, 2), r = img.getBoundingClientRect();
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    }
    size();
    const pos = (e) => {                                   // pointer position in photo pixels
      const r = cv.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width * img.naturalWidth, (e.clientY - r.top) / r.height * img.naturalHeight];
    };
    return { cv, ctx, size, pos, scale: () => cv.width / img.naturalWidth };
  }

  // ---- Living Grid ----
  function grid(fig, img) {
    const COLS = 12, ROWS = 8, T = 100;
    const o = overlay(fig, img), { cv, ctx } = o;
    const order = Array.from({ length: COLS * ROWS }, (_, i) => i);     // position -> tile
    const at = order.map((_, i) => ({ x: i % COLS, y: Math.floor(i / COLS) }));  // each tile's drawn place
    let picked = null, hover = null, raf = null;

    function draw() {
      raf = null;
      const s = o.scale(), t = T * s;
      ctx.fillStyle = '#070707'; ctx.fillRect(0, 0, cv.width, cv.height);   // an empty slot reads as a gap in the board
      let moving = false;
      const later = [];
      order.forEach((tile, p) => {
        const tx = p % COLS, ty = Math.floor(p / COLS), a = at[tile];
        a.x += (tx - a.x) * 0.2; a.y += (ty - a.y) * 0.2;              // glide into place
        if (Math.abs(tx - a.x) + Math.abs(ty - a.y) < 0.002) { a.x = tx; a.y = ty; } else moving = true;
        if (a.x !== tx || a.y !== ty || p === picked) { later.push([tile, p]); return; }
        ctx.drawImage(img, (tile % COLS) * T, Math.floor(tile / COLS) * T, T, T, a.x * t, a.y * t, t, t);
      });
      // tiles in motion and the picked tile sit on top, lifted with a soft shadow
      later.forEach(([tile, p]) => {
        const a = at[tile], lift = p === picked ? 1.06 : 1.03, w = t * lift, off = (w - t) / 2;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 14 * s; ctx.shadowOffsetY = 5 * s;
        ctx.drawImage(img, (tile % COLS) * T, Math.floor(tile / COLS) * T, T, T, a.x * t - off, a.y * t - off, w, w);
        ctx.restore();
        if (p === picked) { ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(1, 1.5 * s); ctx.strokeRect(a.x * t - off, a.y * t - off, w, w); }
      });
      if (hover !== null && hover !== picked) {                         // a faint lift under the cursor
        ctx.fillStyle = 'rgba(255,255,255,.08)';
        ctx.fillRect((hover % COLS) * t, Math.floor(hover / COLS) * t, t, t);
      }
      if (moving) raf = requestAnimationFrame(draw);
    }
    const redraw = () => { if (!raf) raf = requestAnimationFrame(draw); };
    const cell = (e) => {
      const [x, y] = o.pos(e), c = Math.floor(x / T), r = Math.floor(y / T);
      return c >= 0 && c < COLS && r >= 0 && r < ROWS ? r * COLS + c : null;
    };
    cv.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { hover = cell(e); redraw(); } });
    cv.addEventListener('pointerleave', () => { hover = null; redraw(); });
    cv.addEventListener('click', (e) => {
      const p = cell(e);
      if (p === null) return;
      if (picked === null) picked = p;
      else if (picked === p) picked = null;
      else { [order[picked], order[p]] = [order[p], order[picked]]; picked = null; }
      redraw();
    });
    addEventListener('resize', () => { o.size(); redraw(); });
    draw();
  }

  // ---- Living Cycle ----
  function cycle(fig, img) {
    const CX = 597, CY = 399.5, STEP = 65, RINGS = 6;
    const o = overlay(fig, img), { cv, ctx } = o;
    const angle = new Array(RINGS).fill(0), vel = new Array(RINGS).fill(0);
    const dir = angle.map((_, i) => (i % 2 ? -1 : 1));
    let hover = -1, lastA = null, dragging = false, raf = null, last = 0;

    function draw(now) {
      raf = null;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0; last = now;
      const s = o.scale(), cx = CX * s, cy = CY * s;
      let busy = hover >= 0;
      for (let i = 0; i < RINGS; i++) {
        const target = i === hover && fine && !dragging ? dir[i] * 0.55 : 0;     // turning under the hand
        vel[i] += (target - vel[i]) * Math.min(dt * (target ? 2.2 : 1.4), 1);   // eases up, coasts down
        angle[i] += vel[i] * dt;
        if (Math.abs(vel[i]) > 0.002) busy = true;
      }
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      for (let i = 0; i < RINGS; i++) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, (i + 1) * STEP * s, 0, Math.PI * 2);
        if (i) ctx.arc(cx, cy, i * STEP * s, Math.PI * 2, 0, true);
        ctx.clip();
        ctx.translate(cx, cy); ctx.rotate(angle[i]); ctx.translate(-cx, -cy);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        ctx.restore();
        if (i === hover) {                                                    // the ring in hand, faintly lit
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, (i + 1) * STEP * s, 0, Math.PI * 2);
          if (i) ctx.arc(cx, cy, i * STEP * s, Math.PI * 2, 0, true);
          ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill('evenodd');
          ctx.restore();
        }
      }
      if (busy) raf = requestAnimationFrame(draw); else last = 0;
    }
    const redraw = () => { if (!raf) raf = requestAnimationFrame(draw); };
    const ringAt = (x, y) => { const r = Math.hypot(x - CX, y - CY); return r < RINGS * STEP ? Math.floor(r / STEP) : -1; };

    function move(e) {
      const [x, y] = o.pos(e), a = Math.atan2(y - CY, x - CX), ring = ringAt(x, y);
      // moving along a ring carries it with the hand
      if (ring >= 0 && ring === hover && lastA !== null && (fine || dragging)) {
        let d = a - lastA; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
        angle[ring] += d * 0.9;
        if (Math.abs(d) > 0.0005) dir[ring] = Math.sign(d);                   // keeps turning the way it was pushed
      }
      if (fine || dragging) hover = ring;
      lastA = ring >= 0 ? a : null;
      redraw();
    }
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerleave', () => { hover = -1; lastA = null; redraw(); });
    cv.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { dragging = true; lastA = null; move(e); } });
    const end = () => { if (dragging) { dragging = false; hover = -1; lastA = null; redraw(); } };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    addEventListener('resize', () => { o.size(); redraw(); });
    redraw();
  }

  const make = { grid, cycle };
  document.querySelectorAll('figure[data-puzzle]').forEach((fig) => {
    const img = fig.querySelector('img'), start = () => make[fig.dataset.puzzle](fig, img);
    const hint = fig.querySelector('.puzzle-hint');
    if (hint && !fine && hint.dataset.touch) hint.textContent = hint.dataset.touch;
    if (img.complete && img.naturalWidth) start(); else img.addEventListener('load', start, { once: true });
  });
})();
