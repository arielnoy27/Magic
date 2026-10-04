/**
 * ============================================================
 *  ARIEL NOY — Magician & Mentalist
 *  script.js  |  shared by index.html (EN) and hebrew.html (HE)
 * ============================================================
 *
 *  Table of Contents
 *  -----------------
 *  1.  Config & Utilities
 *  2.  Navigation
 *  3.  Scroll Behaviour (active links, parallax, scroll-top)
 *  4.  Tabs (About section)
 *  5.  FAQ Accordion  (JS fallback — <details> handles natively)
 *  6.  Stats Counter
 *  7.  Scroll-reveal Animations
 *  8.  Shows Carousel  (mobile)
 *  9.  Testimonials Carousel
 * 10.  Gallery Lightbox
 * 11.  Contact Form
 * 12.  Scroll-to-Top Button
 * 13.  Accessibility Helpers
 * 14.  Scroll Progress Bar
 * 15.  Staggered Reveal (grid/list children)
 * 16.  Card Depth — Tilt & Cursor Spotlight
 * 17.  Bootstrap (DOMContentLoaded)
 *
 * ============================================================ */


/* ============================================================
   1.  CONFIG & UTILITIES
   ============================================================ */

const CONFIG = Object.freeze({
    navHeight:              72,    // px — must match CSS --nav-height
    scrollThrottle:        100,    // ms
    animationDuration:     600,    // ms
    statsCountDuration:   1200,    // ms
    notificationTimeout:  5000,    // ms
    testimonialAutoplay:  7000,    // ms
    cardsPerView:             3,    // testimonials on desktop
    swipeThreshold:          50,    // px — min swipe distance
});

/**
 * Throttle — limits how often `fn` can fire.
 */
function throttle(fn, limit) {
    let throttling = false;
    return function (...args) {
        if (throttling) return;
        fn.apply(this, args);
        throttling = true;
        setTimeout(() => { throttling = false; }, limit);
    };
}

/**
 * Debounce — delays `fn` until after `wait` ms of silence.
 */
function debounce(fn, wait) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), wait);
    };
}

/**
 * Inject a <style> block into <head> once, identified by `id`.
 * Colors reference the CSS custom properties defined in style.css,
 * so injected UI (lightbox, toasts, scroll-top button) always
 * matches the page's palette from one source of truth.
 */
function injectStyles(id, css) {
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
}

const $  = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];


/* ============================================================
   2.  NAVIGATION
   ============================================================ */

function initNavigation() {
    const navbar    = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navMenu   = document.getElementById('navMenu');

    if (!navbar || !hamburger || !navMenu) return;

    hamburger.addEventListener('click', () => {
        const isOpen = !navMenu.classList.contains('is-open');
        navMenu.classList.toggle('is-open', isOpen);
        hamburger.setAttribute('aria-expanded', String(isOpen));
        document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    navMenu.addEventListener('click', (e) => {
        if (e.target.matches('.nav-link')) closeMenu();
    });

    document.addEventListener('click', (e) => {
        if (!navbar.contains(e.target)) closeMenu();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });

    window.addEventListener('scroll', throttle(() => {
        navbar.classList.toggle('is-scrolled', window.scrollY > 50);
    }, CONFIG.scrollThrottle));

    function closeMenu() {
        navMenu.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }
}


/* ============================================================
   3.  SCROLL BEHAVIOUR
   ============================================================ */

function initScrollBehaviour() {
    document.addEventListener('click', (e) => {
        const anchor = e.target.closest('a[href^="#"]');
        if (!anchor) return;

        const targetId = anchor.getAttribute('href');
        if (targetId === '#') return;

        const target = document.querySelector(targetId);
        if (!target) return;

        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - CONFIG.navHeight;
        window.scrollTo({ top, behavior: 'smooth' });
    });

    const sections = $$('section[id]');
    const navLinks = $$('.nav-link');

    const onScroll = throttle(() => {
        let currentId = '';
        sections.forEach((section) => {
            if (window.scrollY >= section.offsetTop - CONFIG.navHeight - 20) {
                currentId = section.id;
            }
        });
        navLinks.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === `#${currentId}`);
        });
    }, CONFIG.scrollThrottle);

    window.addEventListener('scroll', onScroll);
    onScroll();

    const heroContent = $('.hero-content');
    if (heroContent && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        let rafPending = false;
        window.addEventListener('scroll', () => {
            if (rafPending) return;
            rafPending = true;
            requestAnimationFrame(() => {
                const scrolled = window.scrollY;
                if (scrolled < window.innerHeight) {
                    heroContent.style.transform = `translateY(${scrolled * 0.3}px)`;
                    heroContent.style.opacity   = String(Math.max(0, 1 - scrolled / 700));
                }
                rafPending = false;
            });
        });
    }
}


/* ============================================================
   4.  TABS  (About section)
   ============================================================ */

function initTabs() {
    const tabBtns   = $$('.tab-btn');
    const tabPanels = $$('.tab-panel');

    if (!tabBtns.length) return;

    tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const targetId = `tab-${btn.dataset.tab}`;

            tabBtns.forEach((b) => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            tabPanels.forEach((p) => p.classList.remove('active'));

            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');

            const panel = document.getElementById(targetId);
            if (panel) panel.classList.add('active');
        });
    });
}


/* ============================================================
   5.  FAQ ACCORDION
   ============================================================
   Native <details>/<summary> handles open/close on its own;
   this only enforces "one open at a time".
   ============================================================ */

function initFAQ() {
    const detailsItems = $$('.faq-item');
    if (!detailsItems.length) return;

    const supportsAnimate = typeof detailsItems[0].animate === 'function';
    if (!supportsAnimate) {
        detailsItems.forEach((details) => {
            details.addEventListener('toggle', () => {
                if (details.open) {
                    detailsItems.forEach((other) => {
                        if (other !== details) other.open = false;
                    });
                }
            });
        });
        return;
    }

    const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    detailsItems.forEach((details) => {
        const summary = details.querySelector('.faq-question');
        const body    = details.querySelector('.faq-body');
        if (!summary || !body) return;

        let animation   = null;
        let isClosing   = false;
        let isExpanding = false;

        summary.addEventListener('click', (e) => {
            e.preventDefault();

            if (reduceMotion()) {
                if (!details.open) {
                    detailsItems.forEach((other) => { if (other !== details) other.open = false; });
                }
                details.open = !details.open;
                return;
            }

            if (isClosing || !details.open) {
                openItem();
            } else if (isExpanding || details.open) {
                closeItem();
            }
        });

        function openItem() {
            detailsItems.forEach((other) => {
                if (other !== details && other.open) collapse(other);
            });

            details.style.overflow = 'hidden';
            details.open = true;

            requestAnimationFrame(() => {
                const startHeight = `${summary.offsetHeight}px`;
                const endHeight   = `${summary.offsetHeight + body.scrollHeight}px`;
                runAnimation(startHeight, endHeight, true);
            });
        }

        function closeItem() {
            details.style.overflow = 'hidden';
            const startHeight = `${details.offsetHeight}px`;
            const endHeight   = `${summary.offsetHeight}px`;
            runAnimation(startHeight, endHeight, false);
        }

        function collapse(other) {
            const otherSummary = other.querySelector('.faq-question');
            const otherBody    = other.querySelector('.faq-body');
            if (!otherSummary || !otherBody) { other.open = false; return; }

            other.style.overflow = 'hidden';
            const startHeight = `${other.offsetHeight}px`;
            const endHeight   = `${otherSummary.offsetHeight}px`;
            const anim = other.animate(
                { height: [startHeight, endHeight] },
                { duration: 250, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
            );
            anim.onfinish = () => { other.open = false; other.style.overflow = ''; };
        }

        function runAnimation(startHeight, endHeight, opening) {
            if (animation) animation.cancel();

            animation = details.animate(
                { height: [startHeight, endHeight] },
                { duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
            );
            isExpanding = opening;
            isClosing   = !opening;

            animation.onfinish = () => {
                details.open = opening;
                details.style.overflow = '';
                animation = null;
                isExpanding = false;
                isClosing   = false;
            };
            animation.oncancel = () => {
                isExpanding = false;
                isClosing   = false;
            };
        }
    });
}


/* ============================================================
   6.  STATS COUNTER
   ============================================================ */

function initStatsCounter() {
    const statsContainer = $('.stats-row');
    if (!statsContainer) return;

    let hasRun = false;

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !hasRun) {
            hasRun = true;
            observer.disconnect();
            runCounters();
        }
    }, { threshold: 0.5 });

    observer.observe(statsContainer);

    function runCounters() {
        $$('.stat-number', statsContainer).forEach((el) => {
            const raw     = el.textContent.trim();
            const hasPlus = raw.endsWith('+');
            const target  = parseInt(raw.replace(/\D/g, ''), 10);
            if (isNaN(target)) return;

            const duration = CONFIG.statsCountDuration;
            const start    = performance.now();

            function tick(now) {
                const elapsed  = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
                const current  = Math.round(target * eased);
                el.textContent = current + (hasPlus ? '+' : '');
                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    el.classList.add('stat-pop');
                }
            }
            requestAnimationFrame(tick);
        });
    }
}


/* ============================================================
   7.  SCROLL-REVEAL ANIMATIONS
   ============================================================
   Targets every [data-reveal] wrapper; style.css owns the actual
   opacity/transform values via .js-loaded [data-reveal] and
   [data-reveal].is-visible, so this only toggles the class.
   ============================================================ */

function initScrollReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    const targets = $$('[data-reveal]');
    if (!targets.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    targets.forEach((el) => observer.observe(el));
}


/* ============================================================
   8.  SHOWS CAROUSEL  (mobile only)
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


/* ============================================================
   9.  TESTIMONIALS CAROUSEL
   ============================================================ */

function initTestimonialsCarousel() {
    const track      = document.getElementById('testimonialsSlider');
    const cards       = $$('.testimonial-card', track || document);
    const prevBtn     = document.getElementById('prevBtn');
    const nextBtn     = document.getElementById('nextBtn');
    const indicators  = document.getElementById('carouselIndicators');

    if (!track || !cards.length) return;

    function cardsPerView() {
        return window.innerWidth <= 768 ? 1 : CONFIG.cardsPerView;
    }

    let current = 0;
    let autoplayTimer = null;

    function groupCount() {
        return Math.max(1, Math.ceil(cards.length / cardsPerView()));
    }

    function buildIndicators() {
        if (!indicators) return;
        indicators.innerHTML = '';
        for (let i = 0; i < groupCount(); i++) {
            const dot = document.createElement('button');
            dot.className = 'carousel-dot';
            dot.setAttribute('aria-label', `Testimonials group ${i + 1}`);
            dot.addEventListener('click', () => goToGroup(i));
            indicators.appendChild(dot);
        }
    }

    function goToGroup(index) {
        const groups = groupCount();
        current = ((index % groups) + groups) % groups;
        const offset = current * 100;
        track.style.transform = `translateX(-${offset}%)`;
        $$('.carousel-dot', indicators).forEach((dot, i) => dot.classList.toggle('active', i === current));
    }

    function next() { goToGroup(current + 1); }
    function prev() { goToGroup(current - 1); }

    prevBtn?.addEventListener('click', prev);
    nextBtn?.addEventListener('click', next);

    function startAutoplay() {
        stopAutoplay();
        autoplayTimer = setInterval(next, CONFIG.testimonialAutoplay);
    }
    function stopAutoplay() {
        if (autoplayTimer) clearInterval(autoplayTimer);
        autoplayTimer = null;
    }

    const carousel = track.closest('.testimonials-carousel');
    carousel?.addEventListener('mouseenter', stopAutoplay);
    carousel?.addEventListener('mouseleave', startAutoplay);

    document.addEventListener('keydown', (e) => {
        if (!carousel?.matches(':hover')) return;
        if (e.key === 'ArrowLeft')  prev();
        if (e.key === 'ArrowRight') next();
    });

    let swipeStartX = 0;
    let swipeDelta   = 0;
    let swiping      = false;

    carousel?.addEventListener('touchstart', (e) => {
        swipeStartX = e.touches[0].clientX;
        swiping = true;
        stopAutoplay();
        track.style.transition = 'none';
    }, { passive: true });

    carousel?.addEventListener('touchmove', (e) => {
        if (!swiping) return;
        swipeDelta = e.touches[0].clientX - swipeStartX;
        const percent = (swipeDelta / track.offsetWidth) * 100;
        track.style.transform = `translateX(calc(-${current * 100}% + ${percent}%))`;
    }, { passive: true });

    carousel?.addEventListener('touchend', () => {
        if (!swiping) return;
        swiping = false;
        track.style.transition = '';
        const diff = -swipeDelta;
        if (Math.abs(diff) > CONFIG.swipeThreshold) {
            diff > 0 ? next() : prev();
        } else {
            goToGroup(current);
        }
        swipeDelta = 0;
        startAutoplay();
    }, { passive: true });

    window.addEventListener('resize', debounce(() => {
        buildIndicators();
        goToGroup(0);
    }, 250));

    buildIndicators();
    goToGroup(0);
    startAutoplay();
}


/* ============================================================
   10.  GALLERY LIGHTBOX
   ============================================================ */

function initGalleryLightbox() {
    injectStyles('lightbox-styles', `
        .lightbox-overlay {
            position: fixed;
            inset: 0;
            background: rgba(11, 10, 8, 0.96);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: lbFadeIn 0.25s ease;
            cursor: zoom-out;
            padding: 20px;
        }
        .lightbox-overlay img {
            max-width: min(90vw, 1200px);
            max-height: 88vh;
            box-shadow: 0 24px 80px rgba(0,0,0,0.8);
            animation: lbZoomIn 0.3s ease;
            cursor: default;
        }
        .lightbox-close {
            position: absolute;
            inset-block-start: 20px;
            inset-inline-end: 24px;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: var(--grad-gold);
            color: var(--stage);
            font-size: 1.4rem;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border: none;
            transition: transform 0.25s ease;
        }
        .lightbox-close:hover { transform: rotate(90deg) scale(1.1); }
        @keyframes lbFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lbFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes lbZoomIn  { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        @keyframes lbZoomOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.85); } }
    `);

    const galleryItems = $$('.gallery-item');
    if (!galleryItems.length) return;

    galleryItems.forEach((item, index) => {
        item.setAttribute('tabindex', '0');
        item.setAttribute('role', 'button');
        item.setAttribute('aria-label', `Open image ${index + 1} in lightbox`);

        const open = () => {
            const img = item.querySelector('img');
            if (!img) return;
            openLightbox(img.src, img.alt);
        };

        item.addEventListener('click', open);
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
    });

    function openLightbox(src, alt) {
        const overlay = document.createElement('div');
        overlay.className = 'lightbox-overlay';

        const img = document.createElement('img');
        img.src = src;
        img.alt = alt || '';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'lightbox-close';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.setAttribute('aria-label', 'Close lightbox');

        overlay.append(img, closeBtn);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
        closeBtn.focus();

        function close() {
            overlay.style.animation = 'lbFadeOut 0.25s ease forwards';
            img.style.animation = 'lbZoomOut 0.25s ease forwards';
            overlay.addEventListener('animationend', () => {
                overlay.remove();
                document.body.style.overflow = '';
            }, { once: true });
        }

        closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); }, { once: true });
    }
}


/* ============================================================
   11.  CONTACT FORM
   ============================================================ */

function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    injectStyles('notification-styles', `
        .notification {
            position: fixed;
            inset-block-start: 100px;
            inset-inline-end: 20px;
            max-width: 380px;
            padding: 18px 24px;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 1rem;
            z-index: 10001;
            box-shadow: 0 10px 30px rgba(0,0,0,0.4);
            animation: slideInRight 0.3s ease;
        }
        .notification--success { background: var(--grad-whatsapp); }
        .notification--error   { background: linear-gradient(135deg, var(--wine-soft), var(--wine)); }
        @keyframes slideInRight  { from { opacity:0; transform:translateX(120%); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideOutRight { from { opacity:1; transform:translateX(0); }    to { opacity:0; transform:translateX(120%); } }
    `);

    $$('input, select, textarea', form).forEach((field) => {
        field.addEventListener('blur',  () => validateField(field));
        field.addEventListener('input', () => resetFieldError(field));
    });

    form.addEventListener('submit', (e) => {
        const fields = $$('[required]', form);
        const allValid = fields.every((f) => validateField(f));

        if (!allValid) {
            e.preventDefault();
            showNotification('Please fill in all required fields correctly.', 'error');
            return;
        }

        const submitBtn = form.querySelector('[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
        }
    });

    function validateField(field) {
        if (!field.required) return true;

        const valid = field.value.trim() !== '' &&
            (field.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value));

        field.style.borderColor = valid ? 'var(--gold)' : 'var(--wine-soft)';
        return valid;
    }

    function resetFieldError(field) {
        field.style.borderColor = '';
    }
}

function showNotification(message, type = 'success') {
    $$('.notification').forEach((n) => n.remove());

    const note = document.createElement('div');
    note.className = `notification notification--${type}`;
    note.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>`;

    document.body.appendChild(note);

    setTimeout(() => {
        note.style.animation = 'slideOutRight 0.3s ease forwards';
        note.addEventListener('animationend', () => note.remove(), { once: true });
    }, CONFIG.notificationTimeout);
}


/* ============================================================
   12.  SCROLL-TO-TOP BUTTON
   ============================================================ */

function initScrollTopButton() {
    injectStyles('scroll-top-styles', `
        .scroll-top-btn {
            position: fixed;
            inset-block-end: 28px;
            inset-inline-end: 28px;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: var(--grad-gold);
            color: var(--stage);
            font-size: 1.1rem;
            border: none;
            cursor: pointer;
            opacity: 0;
            visibility: hidden;
            transform: translateY(10px);
            transition: opacity 0.3s ease, visibility 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
            z-index: 900;
            box-shadow: 0 6px 20px var(--gold-glow);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .scroll-top-btn.visible {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }
        .scroll-top-btn:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 28px var(--gold-glow);
        }
    `);

    const btn = document.createElement('button');
    btn.className = 'scroll-top-btn';
    btn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    btn.setAttribute('aria-label', 'Scroll to top');
    document.body.appendChild(btn);

    window.addEventListener('scroll', throttle(() => {
        btn.classList.toggle('visible', window.scrollY > 500);
    }, CONFIG.scrollThrottle));

    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}


/* ============================================================
   13.  ACCESSIBILITY HELPERS
   ============================================================ */

function initAccessibility() {
    injectStyles('shared-animations', `
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    `);
}


/* ============================================================
   14.  SCROLL PROGRESS BAR
   ============================================================ */

function initScrollProgress() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    let ticking = false;

    function update() {
        const scrollTop = window.scrollY;
        const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
        const progress   = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
        bar.style.transform = `scaleX(${progress})`;
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }, { passive: true });

    update();
}


/* ============================================================
   15.  STAGGERED REVEAL  (grid / list children)
   ============================================================
   The section-level [data-reveal] fade is handled by
   initScrollReveal(); this only stamps a per-child
   --stagger-index custom property so style.css can cascade
   each card/row in with a short delay instead of the whole
   group popping in at once.
   ============================================================ */

function initStaggerReveal() {
    const groups = [
        { container: '.shows-grid[data-reveal]',           item: '.show-card' },
        { container: '.gallery-grid[data-reveal]',          item: '.gallery-item' },
        { container: '.clients-grid[data-reveal]',          item: '.client-item' },
        { container: '.faq-list[data-reveal]',              item: '.faq-item' },
        { container: '.testimonials-carousel[data-reveal]', item: '.testimonial-card' },
    ];

    groups.forEach(({ container, item }) => {
        $$(container).forEach((group) => {
            $$(item, group).forEach((el, i) => {
                el.style.setProperty('--stagger-index', i);
            });
        });
    });
}


/* ============================================================
   16.  CARD DEPTH — TILT & CURSOR SPOTLIGHT
   ============================================================
   Desktop-only (fine pointer + hover capable) and skipped
   entirely under prefers-reduced-motion. Purely decorative:
   updates a transform plus a couple of CSS custom properties,
   both compositor-friendly and rAF-throttled to one update
   per frame.
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


/* ============================================================
   17.  BOOTSTRAP  (DOMContentLoaded)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    initAccessibility();
    initNavigation();
    initScrollBehaviour();
    initTabs();
    initFAQ();
    initStatsCounter();
    initScrollReveal();
    initStaggerReveal();
    initShowsCarousel();
    initTestimonialsCarousel();
    initGalleryLightbox();
    initContactForm();
    initScrollTopButton();
    initScrollProgress();
    initCardInteractions();

    document.body.classList.add('js-loaded');

    console.log(
        '%c♠ Ariel Noy — Magic & Mentalism',
        'color:#C9A24E; font-size:16px; font-weight:700;'
    );
});

/* ── Global error safety net ── */
window.addEventListener('error', (e) => console.error('[AN]', e.error));
