/**
 * ============================================================
 *  ARIEL NOY — Magician & Mentalist
 *  mobile.js  |  MOBILE-ONLY behaviour
 *
 *  Fetched only when the viewport is 1100px or narrower — see
 *  loadDeviceScript() in common.js. common.js calls
 *  initShowsCarousel() itself right after this file finishes
 *  loading, so nothing here needs its own DOMContentLoaded hook.
 *
 *  Editing this file can never affect desktop.js or common.js —
 *  it only drives the swipeable shows carousel that mobile.css
 *  switches on at the 768px tier.
 * ============================================================ */


/* ============================================================
   SHOWS CAROUSEL  (mobile only)
   ============================================================
   Stays inactive above 768px even though this file loads for the
   whole ≤1100px range, matching the .shows-grid { display: flex }
   switch mobile.css makes at that same 768px tier.
   ============================================================ */

function initShowsCarousel() {
    const grid  = $('.shows-grid');
    const dots  = $$('.carousel-dot', $('#showsDots'));
    const cards = $$('.show-card');

    if (!grid || !cards.length) return;

    let active  = false;
    let current = 0;

    function activate() {
        if (active) return;
        active = true;
        current = 0;
        goTo(0);
    }

    function deactivate() {
        if (!active) return;
        active = false;
        grid.style.transform = '';
    }

    function goTo(index) {
        current = Math.max(0, Math.min(index, cards.length - 1));
        grid.style.transform = `translateX(-${current * 100}%)`;
        dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
    }

    dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

    let startX = 0;
    let dragDelta = 0;
    let dragging = false;

    grid.addEventListener('touchstart', (e) => {
        if (!active) return;
        startX = e.touches[0].clientX;
        dragging = true;
        grid.style.transition = 'none';
    }, { passive: true });

    grid.addEventListener('touchmove', (e) => {
        if (!active || !dragging) return;
        dragDelta = e.touches[0].clientX - startX;
        const percent = (dragDelta / grid.offsetWidth) * 100;
        grid.style.transform = `translateX(calc(-${current * 100}% + ${percent}%))`;
    }, { passive: true });

    grid.addEventListener('touchend', () => {
        if (!active || !dragging) return;
        dragging = false;
        grid.style.transition = '';
        const diff = -dragDelta;
        if (Math.abs(diff) > CONFIG.swipeThreshold) {
            goTo(diff > 0 ? current + 1 : current - 1);
        } else {
            goTo(current);
        }
        dragDelta = 0;
    }, { passive: true });

    const mq = window.matchMedia('(max-width: 768px)');
    const handleMQ = (e) => e.matches ? activate() : deactivate();
    mq.addEventListener('change', handleMQ);
    handleMQ(mq);
}
