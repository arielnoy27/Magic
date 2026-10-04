/**
 * ============================================================
 *  ARIEL NOY — Magician & Mentalist
 *  desktop.js  |  DESKTOP-ONLY behaviour
 *
 *  Fetched only when the viewport is 1101px or wider — see
 *  loadDeviceScript() in common.js. common.js calls
 *  initCardInteractions() itself right after this file finishes
 *  loading, so nothing here needs its own DOMContentLoaded hook.
 *
 *  Editing this file can never affect mobile.js or common.js —
 *  it only adds pointer-driven depth to elements common.js has
 *  already rendered.
 * ============================================================ */


/* ============================================================
   CARD DEPTH — TILT & CURSOR SPOTLIGHT
   ============================================================
   Fine-pointer + hover-capable only, and skipped entirely under
   prefers-reduced-motion (this file is only ever fetched on wide
   viewports, but a fine-pointer/hover check is kept too, since a
   wide viewport doesn't guarantee a mouse — e.g. a large touch
   tablet in landscape). Purely decorative: updates a transform
   plus a couple of CSS custom properties, both compositor-
   friendly and rAF-throttled to one update per frame.
   ============================================================ */

function initCardInteractions() {
    const finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reduceMotion) return;

    $$('.show-card').forEach((card) => {
        let frame = null;

        card.addEventListener('mouseenter', () => { card.style.willChange = 'transform'; });

        card.addEventListener('mousemove', (e) => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                const rect = card.getBoundingClientRect();
                const px = (e.clientX - rect.left) / rect.width;
                const py = (e.clientY - rect.top) / rect.height;
                const rx = (0.5 - py) * 6;
                const ry = (px - 0.5) * 6;
                card.style.transform = `translateY(-6px) perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg)`;
                card.style.setProperty('--mx', `${px * 100}%`);
                card.style.setProperty('--my', `${py * 100}%`);
                frame = null;
            });
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.willChange = '';
        });
    });

    const form = $('.contact-form');
    if (form) {
        let frame = null;
        form.addEventListener('mousemove', (e) => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                const rect = form.getBoundingClientRect();
                form.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
                form.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
                frame = null;
            });
        });
    }
}
