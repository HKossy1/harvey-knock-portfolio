# Harvey Knock portfolio

Plain HTML, CSS and a little JavaScript. No build step, so you can edit any file and refresh.

## Files
- `index.html`: home page with your Breathing Ripples sketch and the project list
- `<project>.html`: one page per project. Title, caption, then images
- `about.html`: practice statement and contact
- `style.css`: all styling (colours and font sizes are at the top)
- `puzzles.js`: your p5.js sketches (Breathing Ripples, Concentric Circles, Interactive Concentric Circles, Mosaic Puzzle). To change the photo a sketch uses, edit `data-src` on its `<div data-sketch=...>` in the page
- `lightbox.js`: click-to-enlarge for the Interactive Geometry grid
- `book.js`: the flip-books on Natural Design and REGENERATE (uses the free StPageFlip library). Each book sets its opening page and page shape on its `<div id="book">` (`data-start`, `data-page-width`, `data-page-height`). Pages live in `images/book/` (Natural Design) and `images/regenerate/` (REGENERATE); replace a file to update that page
- `brand/`: the HK wordmark (not currently used on the site). `hk-wordmark.svg` is the master, `favicon.svg` a browser-tab icon, `preview.html` a comparison sheet
- `films.js` and `videos/`: the Composing a Feeling films (web-compressed MP4s with poster stills). The originals are in `originals/films/`
- `images/`: web-sized WebP images (currently taken from the portfolio PDF)
- `originals/`: drop high-quality photos, videos and p5.js sketches here, one folder per project

## Swapping in a better image
1. Export it at about 1600px on its longest side as WebP or JPEG (quality ~80).
2. Put it in `images/` and change the `src` (and `width`/`height`) on the matching `<img>` in the project page.

## Adding a video
```html
<figure class="wide"><video src="images/clip.mp4" autoplay muted loop playsinline></video></figure>
```
Keep clips short (10–20 s) and under about 8 MB.

## Hosting on GitHub Pages (free)
1. Create a repository on github.com, for example `harvey-knock`.
2. Upload everything in this folder **except** `originals/`.
3. In the repository, go to Settings → Pages, choose the `main` branch, and save.
4. The site appears at `https://<username>.github.io/harvey-knock/`. You can add a custom domain on the same settings page.
