// Click any image in a .gallery.grid to view it large. Arrow keys / Esc, tap outside to close.
(function () {
  const imgs = [...document.querySelectorAll('.gallery.grid img')];
  if (!imgs.length) return;
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.innerHTML = '<img alt=""><button class="lb-close" aria-label="Close">×</button>';
  document.body.appendChild(box);
  const big = box.querySelector('img');
  let i = 0;
  const show = (n) => { i = (n + imgs.length) % imgs.length; big.src = imgs[i].src; big.alt = imgs[i].alt; };
  imgs.forEach((im, n) => im.addEventListener('click', () => { show(n); box.classList.add('open'); }));
  box.addEventListener('click', (e) => { if (e.target !== big) box.classList.remove('open'); });
  addEventListener('keydown', (e) => {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') box.classList.remove('open');
    if (e.key === 'ArrowRight') show(i + 1);
    if (e.key === 'ArrowLeft') show(i - 1);
  });
})();
