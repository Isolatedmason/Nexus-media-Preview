document.documentElement.classList.remove("no-js");
/* ============================================================
   NEXUS MEDIA - app.js v3
   Smooth scroll engine + lerped animations
   Inspired by 375.studio's scroll feel
   ============================================================ */
(function () {
  'use strict';

  /* ── SMOOTH SCROLL ENGINE ───────────────────────────────
     Replaces native scroll with lerped smooth scrolling.
     The entire page feels like it's gliding rather than
     jumping. This is the #1 thing that makes 375.studio
     feel premium.                                          */
  const Smooth = {
    current: 0,
    target: 0,
    ease: 0.078,     /* lower = smoother/laggier, 0.08 is 375-level */
    running: false,

    init() {
      /* Only on desktop — mobile smooth scroll feels wrong */
      if ('ontouchstart' in window || window.innerWidth < 900) return;

      /* Hijack scroll wheel */
      window.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.target += e.deltaY;
        this.target = Math.max(0, Math.min(this.target, this.getMax()));
      }, { passive: false });

      /* Hijack keyboard arrows / pageup / pagedown */
      window.addEventListener('keydown', (e) => {
        /* Don't hijack keys when typing in form fields */
        const tag = document.activeElement && document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        const keys = { ArrowUp: -80, ArrowDown: 80, PageUp: -400, PageDown: 400, ' ': 400, Home: -Infinity, End: Infinity };
        if (keys[e.key] !== undefined) {
          e.preventDefault();
          if (e.key === 'Home') this.target = 0;
          else if (e.key === 'End') this.target = this.getMax();
          else this.target = Math.max(0, Math.min(this.target + keys[e.key], this.getMax()));
        }
      });

      /* Sync initial position */
      this.current = window.scrollY;
      this.target  = window.scrollY;

      /* Sync if user clicks an anchor link */
      document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
          const id = a.getAttribute('href').slice(1);
          const el = document.getElementById(id);
          if (el) {
            e.preventDefault();
            this.target = el.offsetTop;
          }
        });
      });

      this.running = true;
      this.tick();
    },

    getMax() {
      return document.documentElement.scrollHeight - window.innerHeight;
    },

    tick() {
      const diff = this.target - this.current;
      this.current += diff * this.ease;

      /* Only write to DOM if value changed meaningfully */
      if (Math.abs(diff) > 0.5) {
        window.scrollTo(0, this.current);
      }

      requestAnimationFrame(() => this.tick());
    }
  };


  /* ── THEME ─────────────────────────────────────────────── */
  const root = document.documentElement;
  root.setAttribute('data-theme', 'dark');

  function updateThemeIcon() {} /* no-op — toggle removed */


  /* ── PROGRESS BAR ───────────────────────────────────────── */
  const bar = document.querySelector('.progress-bar');
  function updateProgress() {
    if (!bar) return;
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  }


  /* ── PAGE LOAD TRANSITION ─────────────────────────────────
     ON LOAD: Colour bands cover the screen, then split apart.
     ON EXIT: Clicking any internal link triggers bands sliding
     back in, then navigates after animation completes.         */
  function initPageTransition() {
    const el = document.getElementById('page-transition');
    if (!el) return;

    /* Reset body opacity in case we arrived via exit transition */
    document.body.style.opacity = '1';

    /* Show transition bands, then animate them away */
    el.classList.add('is-active');

    /* ENTRANCE - bands split apart */
    setTimeout(() => { el.classList.add('is-exiting'); }, 200);
    setTimeout(() => { el.classList.add('is-done'); el.classList.remove('is-active'); }, 1500);

    /* ── BACK/FORWARD CACHE FIX - reset on bfcache restore ── */
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) {
        el.classList.remove('is-entering', 'is-active');
        el.classList.add('is-exiting', 'is-done');
        el.style.display = '';
        document.body.style.opacity = '1';
      }
    });

    /* ── EXIT - intercept internal link clicks ── */
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href ||
          href.startsWith('#') ||
          href.startsWith('http') ||
          href.startsWith('mailto') ||
          href.startsWith('tel') ||
          link.target === '_blank') return;

      e.preventDefault();

      /* Reset transition element for exit */
      el.classList.remove('is-exiting', 'is-done');
      el.style.display = 'flex';

      /* Bands slide in immediately — no body fade, just the bands */
      el.classList.add('is-entering');

      /* Navigate after bands fully cover the screen */
      setTimeout(() => {
        window.location.href = href;
      }, 700);
    });
  }


  /* ── ACTIVE NAV ─────────────────────────────────────────── */
  function markActive() {
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav__link').forEach(l => {
      if (l.getAttribute('href') === page) l.setAttribute('aria-current', 'page');
    });
  }


  /* ── MARQUEE ────────────────────────────────────────────── */
  function initMarquee() {
    document.querySelectorAll('.marquee').forEach(m => {
      m.addEventListener('mouseenter', () =>
        m.querySelectorAll('.marquee__track').forEach(t => t.style.animationPlayState = 'paused'));
      m.addEventListener('mouseleave', () =>
        m.querySelectorAll('.marquee__track').forEach(t => t.style.animationPlayState = 'running'));
    });
  }


  /* ── COUNT-UP ───────────────────────────────────────────── */
  const countObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const dur = 2200, start = performance.now();
      function step(now) {
        const t = Math.min(1, (now - start) / dur);
        /* Expo ease out — slow start, dramatic end */
        const ease = 1 - Math.pow(1 - t, 4);
        el.textContent = (target % 1 === 0 ? Math.round(target * ease) : (target * ease).toFixed(1)) + suffix;
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      countObs.unobserve(el);
    });
  }, { threshold: 0.4 });


  /* ── HERO LINE ENTRANCE ─────────────────────────────────── 
     Slower, more dramatic than before. 1.4s per line with
     heavy stagger. Lines clip up with a custom expo curve.   */
  function initHeroLines() {
    const lines = document.querySelectorAll('.gs-line-inner');
    lines.forEach((el, i) => {
      el.style.transform   = 'translateY(110%)';
      el.style.display     = 'block';
      /* Delayed by 0.8s so lines appear after the transition bands clear */
      el.style.transition  = `transform 1.4s cubic-bezier(0.22, 1, 0.36, 1) ${0.8 + i * 0.18}s`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transform = 'translateY(0)';
      }));
    });

    /* Fade in nav columns and meta after headline lands */
    const delayed = document.querySelectorAll('.nav__col-link, .hero__meta');
    delayed.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(14px)';
      el.style.transition = `opacity 1s cubic-bezier(0.22,1,0.36,1) ${1.5 + i * 0.08}s, transform 1s cubic-bezier(0.22,1,0.36,1) ${1.5 + i * 0.08}s`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }));
    });
  }


  /* ── HERO SMOKE-OUT — lerped clipPath ────────────────────
     Instead of directly setting clipPath on scroll (jerky),
     we lerp toward the target value at 60fps.               */
  function initHeroSmoke() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const headline = hero.querySelector('.hero__headline');
    const meta     = hero.querySelector('.hero__meta');
    const cols     = hero.querySelectorAll('.nav__col');

    let clipCurrent = 0;
    let opCurrent   = 1;

    function tick() {
      const rect   = hero.getBoundingClientRect();
      const total  = rect.height;
      const scrolled = Math.max(0, -rect.top);
      const clipTarget = Math.min(100, (scrolled / total) * 110);
      const opTarget   = Math.max(0, 1 - (scrolled / (total * 0.35)));

      /* Lerp both values */
      clipCurrent += (clipTarget - clipCurrent) * 0.1;
      opCurrent   += (opTarget   - opCurrent)   * 0.1;

      hero.style.clipPath = `inset(0 0 ${clipCurrent.toFixed(1)}% 0)`;
      if (headline) headline.style.opacity = opCurrent.toFixed(3);
      if (meta)     meta.style.opacity     = opCurrent.toFixed(3);
      cols.forEach(c => c.style.opacity = opCurrent.toFixed(3));

      requestAnimationFrame(tick);
    }

    tick();
  }


  /* ── STATEMENT WORD LIGHTING — lerped opacity ───────────
     Each word lerps from dim to lit based on scroll position.
     The lerp makes the transition feel organic rather than
     mechanical on/off.                                       */
  function initStatementWords() {
    const words = Array.from(document.querySelectorAll('.statement__word'));
    const body  = document.querySelector('.statement__body');
    if (!words.length) return;

    /* Per-word state */
    const state = words.map(() => ({ current: 0, target: 0 }));
    let bodyRevealed = false;

    function tick() {
      const vh = window.innerHeight;
      const triggerZone = vh * 0.7;

      words.forEach((word, i) => {
        const rect = word.getBoundingClientRect();
        const mid  = rect.top + rect.height / 2;
        /* Target: 1 when above trigger, 0 when below */
        state[i].target = mid < triggerZone ? 1 : 0;
        /* Lerp */
        state[i].current += (state[i].target - state[i].current) * 0.06;

        const val = state[i].current;
        const isAccent = word.classList.contains('statement__word--accent');
        if (isAccent) {
          word.style.opacity = (0.22 + val * 0.78).toFixed(3);
        } else {
          const r = 242, g = 242, b = 240;
          const a = (0.22 + val * 0.73).toFixed(3);
          word.style.color = `rgba(${r},${g},${b},${a})`;
        }
      });

      /* Body reveal — lerp opacity */
      if (body) {
        const allLit = state.every(s => s.current > 0.8);
        const bTarget = allLit ? 1 : 0;
        const bCurrent = parseFloat(body.style.opacity) || 0;
        const bNext = bCurrent + (bTarget - bCurrent) * 0.04;
        body.style.opacity   = bNext.toFixed(3);
        body.style.transform = `translateY(${((1 - bNext) * 20).toFixed(1)}px)`;
      }

      requestAnimationFrame(tick);
    }

    tick();
  }


  /* ── FEATURED PANELS — strong lerped parallax ───────────
     Background moves at ~50% scroll speed with heavy lerp.
     The slow catch-up is what gives 375.studio its weight.   */
  function initFeatured() {
    const panels = document.querySelectorAll('.feat-panel');
    if (!panels.length) return;

    const state = Array.from(panels).map(() => ({ current: 0, target: 0 }));

    function tick() {
      const vh = window.innerHeight;

      panels.forEach((panel, i) => {
        const rect = panel.getBoundingClientRect();
        const s = state[i];
        const panelCentre = rect.top + rect.height / 2;
        const norm = (panelCentre - vh / 2) / vh;
        s.target = norm * 30; /* 30% travel */
        /* Very slow lerp — 0.04 gives heavy, cinematic lag */
        s.current += (s.target - s.current) * 0.04;

        const bg = panel.querySelector('.feat-panel__bg');
        if (bg) {
          bg.style.transform = `translateY(${s.current.toFixed(2)}%) scale(1.02)`;
        }
      });

      requestAnimationFrame(tick);
    }

    tick();
  }


  /* ── SCROLL REVEALS — longer, smoother ──────────────────
     1.2s duration, heavier easing, bigger travel distance.   */
  function initReveals() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.style.transition = 'opacity 1.2s cubic-bezier(0.22,1,0.36,1), transform 1.2s cubic-bezier(0.22,1,0.36,1)';
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        obs.unobserve(e.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -80px 0px' });

    document.querySelectorAll('.gs-up').forEach(el => {
      el.style.opacity   = '0';
      el.style.transform = 'translateY(44px)';
      obs.observe(el);
    });

    document.querySelectorAll('.gs-fade').forEach(el => {
      el.style.opacity = '0';
      const obs2 = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.style.transition = 'opacity 1.4s cubic-bezier(0.22,1,0.36,1)';
            e.target.style.opacity = '1';
            obs2.unobserve(e.target);
          }
        });
      }, { threshold: 0.08 });
      obs2.observe(el);
    });
  }


  /* ── FEATURED TITLE — character spread ──────────────────
     "Featured" starts with letters compressed, spreads
     to normal spacing as it scrolls into view.              */
  function initFeaturedTitle() {
    const title = document.querySelector('.featured__title');
    if (!title) return;

    /* Wrap each character in a span */
    const text = title.textContent;
    title.innerHTML = '';
    text.split('').forEach(char => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.display = 'inline-block';
      span.style.transition = 'none';
      title.appendChild(span);
    });

    const chars = title.querySelectorAll('span');
    let current = -0.15; /* em — starts compressed */
    let target  = -0.15;

    function tick() {
      const rect = title.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = 1 - Math.max(0, Math.min(1, (rect.top - vh * 0.3) / (vh * 0.5)));
      target = -0.15 + progress * 0.19; /* -0.15 to 0.04em */
      current += (target - current) * 0.06;
      title.style.letterSpacing = current.toFixed(4) + 'em';

      /* Also fade + scale */
      const op = 0.3 + progress * 0.7;
      title.style.opacity = op.toFixed(3);

      requestAnimationFrame(tick);
    }
    tick();
  }


  /* ── ABOUT HEADLINE — word-by-word rise ─────────────────
     Walks the DOM tree to split words while preserving <em>
     tags that wrap multiple words.                           */
  function initAboutWords() {
    const headline = document.querySelector('.about-band__headline');
    if (!headline) return;

    const fragments = [];

    /* Walk child nodes — can be text nodes or <em> elements */
    headline.childNodes.forEach(node => {
      if (node.nodeType === 3) {
        /* Text node — split into words */
        node.textContent.split(/\s+/).filter(Boolean).forEach(word => {
          fragments.push({ word, isEm: false });
        });
      } else if (node.nodeName === 'EM') {
        /* <em> node — split into words but flag as em */
        node.textContent.split(/\s+/).filter(Boolean).forEach(word => {
          fragments.push({ word, isEm: true });
        });
      }
    });

    /* Rebuild with spans */
    headline.innerHTML = fragments.map(f => {
      const cls = f.isEm ? 'about-word about-word--em' : 'about-word';
      const inner = f.isEm ? `<em>${f.word}</em>` : f.word;
      return `<span class="${cls}" style="display:inline-block;opacity:0;transform:translateY(32px);margin-right:0.2em">${inner}</span>`;
    }).join('');

    const words = headline.querySelectorAll('.about-word');
    let revealed = false;

    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting || revealed) return;
        revealed = true;
        words.forEach((w, i) => {
          const delay = i * 0.07 + (w.classList.contains('about-word--em') ? 0.12 : 0);
          w.style.transition = `opacity 1.3s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 1.3s cubic-bezier(0.22,1,0.36,1) ${delay}s`;
          requestAnimationFrame(() => {
            w.style.opacity = '1';
            w.style.transform = 'translateY(0)';
          });
        });
        obs.unobserve(e.target);
      });
    }, { threshold: 0.15 });
    obs.observe(headline);
  }


  /* ── STAT NUMBERS — scale up effect ─────────────────────
     Numbers grow from 85% to 100% scale as they count up,
     adding physical weight to the reveal.                    */
  function initStatScale() {
    const nums = document.querySelectorAll('.stat__num');
    if (!nums.length) return;

    nums.forEach(num => {
      num.style.transform = 'scale(0.85)';
      num.style.opacity = '0';
      num.style.transformOrigin = 'left bottom';
    });

    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.style.transition = 'transform 1.6s cubic-bezier(0.22,1,0.36,1), opacity 1.2s cubic-bezier(0.22,1,0.36,1)';
        e.target.style.transform = 'scale(1)';
        e.target.style.opacity = '1';
        obs.unobserve(e.target);
      });
    }, { threshold: 0.3 });

    nums.forEach(n => obs.observe(n));
  }


  /* ── CTA HEADLINE — 3D tilt entrance ────────────────────
     Slides up with a slight rotateX that flattens on arrival.
     Very 375.studio.                                         */
  function initCtaTilt() {
    const headline = document.querySelector('.cta-banner__headline');
    if (!headline) return;

    headline.style.transform = 'translateY(52px)';
    headline.style.opacity = '0';

    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.style.transition = 'transform 1.6s cubic-bezier(0.22,1,0.36,1), opacity 1.4s cubic-bezier(0.22,1,0.36,1)';
        e.target.style.transform = 'translateY(0)';
        e.target.style.opacity = '1';
        obs.unobserve(e.target);
      });
    }, { threshold: 0.1 });
    obs.observe(headline);
  }


  /* ── FOOTER WORDMARK — horizontal slide ─────────────────
     "Nexus" slides from right to its position as you reach
     the footer. Lerped to scroll.                            */
  function initFooterSlide() {
    const mark = document.querySelector('.footer__wordmark');
    if (!mark) return;

    let currentScale = 0.85;
    let currentOp = 0;

    function tick() {
      const rect = mark.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = 1 - Math.max(0, Math.min(1, (rect.top - vh) / (vh * 0.5)));
      const targetScale = 0.85 + progress * 0.15;
      const targetOp = progress;
      currentScale += (targetScale - currentScale) * 0.05;
      currentOp += (targetOp - currentOp) * 0.05;
      mark.style.transform = `scale(${currentScale.toFixed(4)})`;
      mark.style.opacity = (currentOp * 0.6).toFixed(4); /* max 0.6 — visible but not dominant */
      requestAnimationFrame(tick);
    }
    tick();
  }


  /* ── STAT STAGGER — each column rises independently ──────*/
  function initStatStagger() {
    const stats = document.querySelectorAll('.stat');
    if (!stats.length) return;

    stats.forEach((stat, i) => {
      stat.style.opacity = '0';
      stat.style.transform = 'translateY(40px)';
    });

    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        stats.forEach((stat, i) => {
          setTimeout(() => {
            stat.style.transition = 'opacity 1.4s cubic-bezier(0.22,1,0.36,1), transform 1.4s cubic-bezier(0.22,1,0.36,1)';
            stat.style.opacity = '1';
            stat.style.transform = 'translateY(0)';
          }, i * 120);
        });
        obs.unobserve(e.target);
      });
    }, { threshold: 0.1 });

    const grid = document.querySelector('.stats__grid');
    if (grid) obs.observe(grid);
  }


  /* ── CTA ACTIONS — buttons stagger after headline ──────── */
  function initCtaActions() {
    const actions = document.querySelector('.cta-banner__actions');
    if (!actions) return;

    const items = actions.querySelectorAll('a');
    items.forEach((item, i) => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(24px)';
    });

    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        items.forEach((item, i) => {
          setTimeout(() => {
            item.style.transition = 'opacity 1.2s cubic-bezier(0.22,1,0.36,1), transform 1.2s cubic-bezier(0.22,1,0.36,1)';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
          }, 400 + i * 100); /* 400ms delay — waits for headline tilt to land */
        });
        obs.unobserve(e.target);
      });
    }, { threshold: 0.1 });

    obs.observe(actions);
  }


  /* ── FOOTER REVEALS — columns + logo stagger ───────────── */
  function initFooterReveal() {
    const footer = document.querySelector('.footer');
    if (!footer) return;

    /* Logo scale */
    const logo = footer.querySelector('.footer__logo');
    if (logo) {
      logo.style.opacity = '0';
      logo.style.transform = 'scale(0.88)';
      logo.style.transformOrigin = 'left center';
    }

    /* Each column slides up */
    const cols = footer.querySelectorAll('.footer__col');
    cols.forEach((col, i) => {
      col.style.opacity = '0';
      col.style.transform = 'translateY(28px)';
    });

    /* Brand text */
    const brandP = footer.querySelector('.footer__brand p');
    if (brandP) {
      brandP.style.opacity = '0';
      brandP.style.transform = 'translateY(16px)';
    }

    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;

        if (logo) {
          logo.style.transition = 'opacity 1.2s cubic-bezier(0.22,1,0.36,1), transform 1.2s cubic-bezier(0.22,1,0.36,1)';
          logo.style.opacity = '1';
          logo.style.transform = 'scale(1)';
        }

        if (brandP) {
          setTimeout(() => {
            brandP.style.transition = 'opacity 1.2s cubic-bezier(0.22,1,0.36,1), transform 1.2s cubic-bezier(0.22,1,0.36,1)';
            brandP.style.opacity = '1';
            brandP.style.transform = 'translateY(0)';
          }, 100);
        }

        cols.forEach((col, i) => {
          setTimeout(() => {
            col.style.transition = 'opacity 1.2s cubic-bezier(0.22,1,0.36,1), transform 1.2s cubic-bezier(0.22,1,0.36,1)';
            col.style.opacity = '1';
            col.style.transform = 'translateY(0)';
          }, 200 + i * 80);
        });

        obs.unobserve(e.target);
      });
    }, { threshold: 0.05 });

    obs.observe(footer);
  }


  /* ── SECTION LINE DRAWS — horizontal rules animate width ──
     Any element with .draw-line starts at width:0 and draws
     to width:100% as it enters the viewport.                 */
  function initLineDraws() {
    const lines = document.querySelectorAll('.draw-line');
    if (!lines.length) return;

    lines.forEach(line => {
      line.style.width = '0';
      line.style.height = '1px';
      line.style.background = 'linear-gradient(90deg, #80E7BC, #6BC5E0, #4A7AED, #5B4AED)';
      line.style.opacity = '0.4';
      line.style.display = 'block';
    });

    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.style.transition = 'width 1.8s cubic-bezier(0.22,1,0.36,1)';
        e.target.style.width = '100%';
        obs.unobserve(e.target);
      });
    }, { threshold: 0.05 });

    lines.forEach(l => obs.observe(l));
  }


  /* ── SERVICE PAGE CAROUSEL — auto-scroll ─────────────────
     Scrolls through slides every 3s with smooth scroll.      */
  function initCarousel() {
    const track = document.getElementById('brand-carousel');
    if (!track) return;

    const slides = track.querySelectorAll('.svc-hero__slide');
    if (slides.length < 2) return;

    let current = 0;
    setInterval(() => {
      current = (current + 1) % slides.length;
      track.scrollTo({
        left: slides[current].offsetLeft,
        behavior: 'smooth'
      });
    }, 3000);
  }


  /* ── INIT ───────────────────────────────────────────────── */
  function init() {
    updateThemeIcon();
    updateProgress();
    markActive();
    initPageTransition();
    initMarquee();
    initHeroLines();
    initHeroSmoke();
    initStatementWords();
    initReveals();
    initFeatured();
    initFeaturedTitle();
    initAboutWords();
    initStatScale();
    initStatStagger();
    initCtaTilt();
    initCtaActions();
    initFooterReveal();
    initFooterSlide();
    initLineDraws();
    initCarousel();
    Smooth.init();
    document.querySelectorAll('[data-count]').forEach(el => countObs.observe(el));

    /* Keep progress bar in sync */
    (function progressTick() {
      updateProgress();
      requestAnimationFrame(progressTick);
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
