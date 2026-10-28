// Flip-book for the publications (Natural Design, REGENERATE), built on StPageFlip.
// Pages are plain <div class="page"><img data-src></div>; images load just ahead of the reader.
// Each book sets its own options on #book: data-start (zero-based opening page) and
// data-page-width / data-page-height (the printed page's proportions).
(function () {
  const el = document.getElementById('book');
  if (!el || !window.St) return;
  const pages = [...el.querySelectorAll('.page')];
  const total = pages.length;
  const counter = document.getElementById('book-count');
  // Turning pages by hand (dragging the bottom corners) is switched off for now;
  // set to true to bring it back. The arrows, keys and autoplay always work.
  const HAND_TURNING = false;
  const START = +(el.dataset.start || 0);
  const PAGE_W = +(el.dataset.pageWidth || 500), PAGE_H = +(el.dataset.pageHeight || 500);

  // Load images around the current page so the whole book never downloads at once
  function loadAround(i) {
    for (let k = Math.max(0, i - 4); k <= Math.min(total - 1, i + 7); k++) {
      const img = pages[k].querySelector('img');
      if (img && !img.src && img.dataset.src) img.src = img.dataset.src;
    }
  }
  loadAround(START);

  const book = new St.PageFlip(el, {
    width: PAGE_W, height: PAGE_H,    // the printed page's proportions
    size: 'stretch',
    minWidth: 240, maxWidth: 1000,
    minHeight: 240, maxHeight: 1000,
    showCover: true,                  // covers turn on their own, like a real book
    usePortrait: true,                // single pages on narrow screens
    maxShadowOpacity: 0.45,
    flippingTime: 1300,                // a slower sweep reads as a smoother curve
    mobileScrollSupport: true,
    startPage: START,
    useMouseEvents: HAND_TURNING,     // no clicking, dragging or swiping on the pages
  });
  book.loadFromHTML(pages);

  function update(i) {
    loadAround(i);
    if (!counter) return;
    if (i === 0) counter.textContent = 'Cover';
    else if (i === total - 1) counter.textContent = 'Back cover';
    else if (book.getOrientation() === 'portrait') counter.textContent = `${i + 1} / ${total}`;
    else counter.textContent = `${i + 1}–${Math.min(i + 2, total)} / ${total}`;
  }
  book.on('flip', (e) => update(e.data));
  book.on('changeOrientation', () => update(book.getCurrentPageIndex()));
  update(START);

  // Page edges: a stack on each outer side, thicker on the left as pages are read
  const stage = el.parentElement;
  const edges = ['left', 'right'].map((side) => {
    const d = document.createElement('div');
    d.className = 'book-edge ' + side;
    d.setAttribute('aria-hidden', 'true');
    stage.prepend(d);
    return d;
  });
  function placeEdges(i = book.getCurrentPageIndex()) {
    const r = book.getBoundsRect();
    const dist = book.getUI().getDistElement().getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    const x0 = dist.left - s.left + r.left, y0 = dist.top - s.top + r.top;
    const max = r.pageWidth * 0.024;                  // about 10px on a laptop
    const read = i / (total - 1);
    const portrait = book.getOrientation() === 'portrait';
    // When the closed book shows only its front cover, nothing sits on the left
    const leftW = portrait || i === 0 ? 0 : max * read;
    const rightW = i >= total - 1 ? 0 : max * (1 - read);
    const pageLeft = portrait || i !== 0 ? x0 : x0 + r.pageWidth;
    Object.assign(edges[0].style, { top: y0 + 'px', height: r.height + 'px', width: leftW + 'px', left: pageLeft - leftW + 'px' });
    Object.assign(edges[1].style, { top: y0 + 'px', height: r.height + 'px', width: rightW + 'px', left: x0 + r.width + 'px' });
  }
  book.on('flip', (e) => placeEdges(e.data));
  book.on('changeOrientation', () => placeEdges());
  new ResizeObserver(() => placeEdges()).observe(el);
  placeEdges(START);

  let state = 'read';
  book.on('changeState', (e) => (state = e.data));

  // A hand-like turn, traced through StPageFlip's own drag controls:
  // the bottom-right corner first lifts diagonally up and in, then the page
  // sweeps over the spine in an arc, and the library settles it on the left.
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  function turnNext() {
    if (state !== 'read' || book.getCurrentPageIndex() >= total - 1) return;
    const r = book.getBoundsRect();
    const pw = r.pageWidth;
    const right = r.left + r.width - 1, bottom = r.top + r.height - 1;
    const p0 = { x: right, y: bottom };
    const p1 = { x: right - pw * 0.3, y: bottom - pw * 0.22 };          // diagonal lift
    const end = { x: right - pw * 1.9, y: bottom };                    // past the spine
    const ctrl = { x: right - pw * 1.0, y: r.top + r.height * 0.45 };  // arc height
    const LIFT = 450, SWEEP = 900;
    const t0 = performance.now();
    book.startUserTouch(p0);
    (function frame(now) {
      const t = now - t0;
      let p;
      if (t < LIFT) {
        const k = ease(t / LIFT);
        p = { x: p0.x + (p1.x - p0.x) * k, y: p0.y + (p1.y - p0.y) * k };
      } else {
        const k = ease(Math.min((t - LIFT) / SWEEP, 1)), u = 1 - k;
        p = {
          x: u * u * p1.x + 2 * u * k * ctrl.x + k * k * end.x,
          y: u * u * p1.y + 2 * u * k * ctrl.y + k * k * end.y,
        };
      }
      book.userMove(p, true);
      if (t < LIFT + SWEEP) requestAnimationFrame(frame);
      else book.userStop(p);
    })(t0);
  }

  // Hand interaction only in a small square at each bottom outer corner, like
  // reaching for the lower edge of a real page. Everywhere else the pages ignore
  // the mouse and touch (the arrows, keys and autoplay still turn them).
  if (HAND_TURNING) {
    const dist = book.getUI().getDistElement();
    function inCorner(x, y) {
      const r = book.getBoundsRect();
      const d = dist.getBoundingClientRect();
      const z = r.pageWidth * 0.14;                     // about 70px on a laptop
      const px = x - d.left - r.left, py = y - d.top - r.top;
      if (py < r.height - z || py > r.height) return false;
      return (px >= 0 && px <= z) || (px >= r.width - z && px <= r.width);
    }
    let dragging = false, wasIn = false;
    const point = (e) => (e.touches ? e.touches[0] : e);
    function onDown(e) {
      const p = point(e);
      if (inCorner(p.clientX, p.clientY)) dragging = true;
      else e.stopPropagation();                         // never reaches StPageFlip
    }
    el.addEventListener('mousedown', onDown, true);
    el.addEventListener('touchstart', onDown, true);
    addEventListener('mouseup', () => (dragging = false));
    addEventListener('touchend', () => (dragging = false));
    // Hover curl and cursor: only inside the corners. One move is let through on the
    // way out so StPageFlip can lay a half-shown corner back down.
    addEventListener('mousemove', (e) => {
      if (dragging) return;
      const inside = inCorner(e.clientX, e.clientY);
      el.style.cursor = inside ? 'grab' : '';
      if (!inside && !wasIn && el.contains(e.target)) e.stopPropagation();
      wasIn = inside;
    }, true);
  }

  // Chapter tabs: turn straight to a chapter's opening spread; the current chapter is lit
  const chapterTabs = [...document.querySelectorAll('.book-chapters [data-page]')];
  function markChapter(i) {
    let current = null;
    chapterTabs.forEach((b) => { if (i >= +b.dataset.page) current = b; });
    chapterTabs.forEach((b) => b.setAttribute('aria-current', b === current ? 'true' : 'false'));
  }
  chapterTabs.forEach((b) => b.addEventListener('click', () => {
    const page = +b.dataset.page;
    if (state === 'read' && page !== book.getCurrentPageIndex()) book.flip(page, 'bottom');
  }));
  book.on('flip', (e) => markChapter(e.data));
  markChapter(START);

  document.getElementById('book-prev')?.addEventListener('click', () => book.flipPrev('bottom'));
  document.getElementById('book-next')?.addEventListener('click', turnNext);

  // All turns lift from the bottom corner, like turning a real page by its lower edge.
  // Autoplay: the first page turns 4 seconds after the book comes on screen, then one every
  // 4 seconds. After a visitor clicks (a page, an arrow, a chapter) or uses the keys, it
  // waits 10 seconds before carrying on. Hovering pauses it.
  const INTERVAL = +(el.dataset.interval || 4000);   // milliseconds between automatic page turns
  const AFTER_CLICK = 10000;                          // wait after a visitor turns or clicks
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = false, hovering = false, timer = null, wait = INTERVAL;

  function schedule() {
    clearTimeout(timer);
    if (still || !visible || hovering || document.hidden) return;
    timer = setTimeout(() => {
      wait = INTERVAL;
      const i = book.getCurrentPageIndex();
      // After the back cover, return to the opening spread and begin again
      if (i >= total - 1) book.flip(START, 'bottom'); else turnNext();
    }, wait);
  }
  function visitorAction() { wait = AFTER_CLICK; schedule(); }
  el.closest('.book-section')?.addEventListener('pointerdown', visitorAction);
  book.on('flip', schedule);
  book.on('changeState', (e) => { if (e.data !== 'read') clearTimeout(timer); else schedule(); });

  el.addEventListener('pointerenter', () => { hovering = true; schedule(); });
  el.addEventListener('pointerleave', () => { hovering = false; schedule(); });
  document.addEventListener('visibilitychange', schedule);

  // Arrow keys turn pages while the book is on screen
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; schedule(); }, { threshold: 0.4 }).observe(el);
  addEventListener('keydown', (e) => {
    if (!visible) return;
    if (e.key === 'ArrowRight') { visitorAction(); turnNext(); }
    if (e.key === 'ArrowLeft') { visitorAction(); book.flipPrev('bottom'); }
  });
})();
