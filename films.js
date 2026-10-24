// Composing a Feeling: the chosen film plays large, with the other films as thumbnails
// below. Clicking a thumbnail moves that film into the large player and plays it.
// Full screen has its own button (and double-click), independent of the built-in controls.
(function () {
  const player = document.querySelector('.film-feature');
  if (!player) return;
  const films = JSON.parse(document.getElementById('films-data').textContent);
  const frame = player.querySelector('.film-frame');
  const inner = player.querySelector('.feature-inner');
  const video = frame.querySelector('video');
  const play = frame.querySelector('.film-play');
  const full = frame.querySelector('.film-full');
  const title = player.querySelector('.feature-title');
  const sub = player.querySelector('.feature-sub');
  const reel = document.querySelector('.film-reel');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 0;

  function load(i, autoplay) {
    current = i;
    const f = films[i];
    video.pause();
    video.controls = false;
    video.poster = f.poster;
    // The player takes the film's own shape, no taller than about three-quarters of the screen
    frame.style.aspectRatio = String(f.ratio);
    inner.style.maxWidth = `calc(74vh * ${f.ratio})`;
    video.src = f.src;
    frame.classList.remove('is-playing');
    play.setAttribute('aria-label', 'Play ' + f.title);
    title.textContent = f.title;
    sub.textContent = f.sub;
    renderReel();
    if (autoplay) start();
  }
  function start() {
    video.controls = true;
    frame.classList.add('is-playing');
    video.play();
  }
  function renderReel() {
    reel.innerHTML = '';
    films.forEach((f, i) => {
      if (i === current) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'reel-item';
      b.setAttribute('aria-label', 'Play ' + f.title);
      b.innerHTML = `<span class="reel-thumb"><img src="${f.poster}" alt="" loading="lazy"><span class="reel-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg></span></span>
        <span class="reel-caption"><span class="film-title">${f.title}</span><span class="film-sub">${f.sub}</span></span>`;
      b.addEventListener('click', () => {
        load(i, true);
        player.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
      });
      reel.appendChild(b);
    });
  }

  play.addEventListener('click', start);
  video.addEventListener('ended', () => {
    if (fullscreenElement() === frame) exitFullscreen();
    video.controls = false;
    video.load();                 // back to the poster
    frame.classList.remove('is-playing');
  });

  const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  function exitFullscreen() { (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
  function toggleFullscreen() {
    if (fullscreenElement() === frame) { exitFullscreen(); return; }
    if (!frame.classList.contains('is-playing')) start();
    if (frame.requestFullscreen) frame.requestFullscreen();
    else if (frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();   // iPhone
  }
  full.addEventListener('click', toggleFullscreen);
  video.addEventListener('dblclick', (e) => { e.preventDefault(); toggleFullscreen(); });
  ['fullscreenchange', 'webkitfullscreenchange'].forEach((t) => document.addEventListener(t, () => {
    const on = fullscreenElement() === frame;
    full.classList.toggle('is-on', on);
    full.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
  }));

  load(0, false);
})();
