(() => {
  'use strict';

  const doc = document;
  const header = doc.querySelector('[data-header]');
  const menuToggle = doc.querySelector('[data-menu-toggle]');
  const nav = doc.querySelector('[data-nav]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // Header state
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 24);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  // Mobile navigation
  const closeMenu = () => {
    if (!menuToggle || !nav) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
    doc.body.classList.remove('menu-open');
  };

  menuToggle?.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!open));
    nav?.classList.toggle('is-open', !open);
    doc.body.classList.toggle('menu-open', !open);
  });

  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => { if (window.innerWidth > 980) closeMenu(); });

  // Reveal-on-scroll
  const revealItems = [...doc.querySelectorAll('.reveal:not(.is-visible)')];
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(el => el.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    revealItems.forEach(el => revealObserver.observe(el));
  }

  // Play only videos that are actually visible. Keeps mobile and long-page scrolling smooth.
  const videos = [...doc.querySelectorAll('[data-autoplay-video]')];
  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      });
    }, { threshold: 0.22, rootMargin: '80px 0px 80px 0px' });
    videos.forEach(video => videoObserver.observe(video));
  } else {
    videos.forEach(video => video.play().catch(() => {}));
  }

  // Scroll-driven portal: compact duration, no dead black scroll space.
  const portal = doc.querySelector('.portal-section');
  const portalFrame = doc.querySelector('[data-portal-frame]');
  const portalLeft = doc.querySelector('[data-portal-copy="left"]');
  const portalRight = doc.querySelector('[data-portal-copy="right"]');

  const updatePortal = () => {
    if (!portal || !portalFrame || reducedMotion) return;
    const rect = portal.getBoundingClientRect();
    const travel = Math.max(portal.offsetHeight - window.innerHeight, 1);
    const progress = clamp(-rect.top / travel);
    const expand = clamp((progress - 0.08) / 0.78);
    const ease = 1 - Math.pow(1 - expand, 3);

    const mobile = window.innerWidth < 700;
    const startW = Math.min(window.innerWidth * (mobile ? .94 : .64), 1040);
    const startH = startW * 9 / 16;
    const endW = window.innerWidth;
    const endH = window.innerHeight;

    portalFrame.style.width = `${lerp(startW, endW, ease)}px`;
    portalFrame.style.height = `${lerp(startH, endH, ease)}px`;
    portalFrame.style.borderRadius = `${lerp(mobile ? 20 : 30, 0, ease)}px`;

    const copyOpacity = 1 - clamp(progress / .48);
    if (portalLeft) {
      portalLeft.style.opacity = String(copyOpacity);
      portalLeft.style.transform = `translateY(${progress * 24}px)`;
    }
    if (portalRight) {
      portalRight.style.opacity = String(copyOpacity);
      portalRight.style.transform = `translateY(${-progress * 24}px)`;
    }
  };

  if (portal && portalFrame) {
    updatePortal();
    window.addEventListener('scroll', updatePortal, { passive: true });
    window.addEventListener('resize', updatePortal);
  }

  // Interactive game modes
  const gameTabs = [...doc.querySelectorAll('[data-game]')];
  const gameVideos = [...doc.querySelectorAll('[data-game-video]')];
  const gameCopies = [...doc.querySelectorAll('[data-game-copy]')];
  const gameLabel = doc.querySelector('[data-game-label]');

  const gameNames = {
    visual: 'Visual Reveal',
    words: 'Wort-Rätsel',
    show: 'Live Show'
  };

  const selectGame = key => {
    gameTabs.forEach(tab => {
      const active = tab.dataset.game === key;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });

    gameCopies.forEach(copy => copy.classList.toggle('is-active', copy.dataset.gameCopy === key));

    gameVideos.forEach(video => {
      const active = video.dataset.gameVideo === key;
      video.classList.toggle('is-active', active);
      if (active) video.play().catch(() => {});
      else video.pause();
    });

    if (gameLabel) gameLabel.textContent = gameNames[key] || key;
  };

  gameTabs.forEach(tab => tab.addEventListener('click', () => selectGame(tab.dataset.game)));

  const gameStage = doc.querySelector('.game-stage');
  if (gameStage && 'IntersectionObserver' in window) {
    const gameObserver = new IntersectionObserver(([entry]) => {
      const active = doc.querySelector('.game-video.is-active');
      if (!active) return;
      if (entry.isIntersecting) active.play().catch(() => {});
      else gameVideos.forEach(v => v.pause());
    }, { threshold: 0.18 });
    gameObserver.observe(gameStage);
  }

  // Showreel modal with sound. Multiple CTA buttons can open it.
  const showreel = doc.querySelector('[data-showreel]');
  const showreelVideo = doc.querySelector('[data-showreel-video]');
  const openShowreelButtons = [...doc.querySelectorAll('[data-open-showreel]')];
  const closeShowreelButtons = [...doc.querySelectorAll('[data-close-showreel]')];

  const closeShowreel = () => {
    if (!showreel) return;
    showreelVideo?.pause();
    if (showreel.open) showreel.close();
  };

  const openShowreel = () => {
    if (!showreel) return;
    if (typeof showreel.showModal === 'function') showreel.showModal();
    else showreel.setAttribute('open', '');
    if (showreelVideo) {
      showreelVideo.currentTime = 0;
      showreelVideo.muted = false;
      showreelVideo.play().catch(() => {});
    }
  };

  openShowreelButtons.forEach(btn => btn.addEventListener('click', openShowreel));
  closeShowreelButtons.forEach(btn => btn.addEventListener('click', closeShowreel));
  showreel?.addEventListener('cancel', event => {
    event.preventDefault();
    closeShowreel();
  });

  // Placeholder legal links for the prototype.
  doc.querySelectorAll('[data-placeholder-link]').forEach(link => {
    link.addEventListener('click', event => event.preventDefault());
  });

  const year = doc.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
