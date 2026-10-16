(() => {
  'use strict';

  let reducedMotion;
  let desktopPointer;
  // An unsupported preference API leaves the complete static page visible.
  try {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    desktopPointer = window.matchMedia('(min-width: 901px) and (hover: hover) and (pointer: fine)');
  } catch {
    return;
  }

  const easing = 'cubic-bezier(.22,1,.36,1)';
  const canAnimate = typeof Element.prototype.animate === 'function';
  const canObserve = typeof window.IntersectionObserver === 'function';
  const animations = new Set();
  const seenIntros = new WeakSet();
  const seenReveals = new WeakSet();
  const pendingReveals = new Set();
  const layersByWrapper = new Map();
  const visibleLayers = new Set();
  let revealObserver = null;
  let parallaxObserver = null;
  let parallaxEnabled = false;
  let menuOpen = false;
  let dialogOpen = false;
  let frame = null;

  const delayFor = (element) => {
    const delay = Number(element.dataset.delay);
    return Number.isFinite(delay) ? Math.min(1600, Math.max(0, delay)) : 0;
  };

  function animateEntry(element, image = false, intro = false) {
    if (!canAnimate || reducedMotion.matches || document.hidden || menuOpen || dialogOpen) return;
    const keyframes = image
      ? [
        { opacity: 0, clipPath: 'inset(0 0 8% 0)', transform: 'scale(1.035)' },
        { opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'scale(1)' },
      ]
      : [
        { opacity: 0, transform: `translate3d(0, ${intro ? 32 : 24}px, 0)` },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ];
    try {
      const animation = element.animate(keyframes, {
        duration: image ? 1050 : intro ? 800 : 700,
        delay: delayFor(element),
        easing,
        // The visible final state always belongs to the ordinary stylesheet.
        fill: 'backwards',
      });
      animations.add(animation);
      const forget = () => animations.delete(animation);
      if (animation.finished && typeof animation.finished.then === 'function') {
        animation.finished.then(forget, forget);
      } else {
        animation.onfinish = forget;
        animation.oncancel = forget;
      }
    } catch {
      // A failed effect never leaves a hidden inline style behind.
    }
  }

  function cancelEntries() {
    animations.forEach((animation) => {
      try { animation.cancel(); } catch { /* Static content stays visible. */ }
    });
    animations.clear();
  }

  function ensureRevealObserver() {
    if (revealObserver || !canAnimate || !canObserve) return;
    try {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || !pendingReveals.has(entry.target)) return;
          revealObserver.unobserve(entry.target);
          pendingReveals.delete(entry.target);
          if (entry.target.isConnected) animateEntry(entry.target, entry.target.dataset.reveal === 'image');
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    } catch {
      revealObserver = null;
    }
  }

  function revealPendingWithoutMotion() {
    if (revealObserver) revealObserver.disconnect();
    pendingReveals.clear();
  }

  function scanReveals() {
    pendingReveals.forEach((element) => {
      if (element.isConnected) return;
      if (revealObserver) revealObserver.unobserve(element);
      pendingReveals.delete(element);
    });
    document.querySelectorAll('[data-intro]').forEach((element) => {
      if (seenIntros.has(element)) return;
      seenIntros.add(element);
      seenReveals.add(element);
      animateEntry(element, element.dataset.intro === 'image', true);
    });
    if (!reducedMotion.matches) ensureRevealObserver();
    document.querySelectorAll('[data-reveal]').forEach((element) => {
      if (seenReveals.has(element)) return;
      // Register once, even when motion is disabled or the observer is missing.
      seenReveals.add(element);
      if (reducedMotion.matches || !revealObserver) return;
      pendingReveals.add(element);
      revealObserver.observe(element);
    });
  }

  function restoreLayer(item) {
    if (item.offset === null) return;
    if (item.originalTransform) item.layer.style.transform = item.originalTransform;
    else item.layer.style.removeProperty('transform');
    item.offset = null;
  }

  function prepareLayer(item) {
    const transform = window.getComputedStyle(item.layer).transform;
    item.baseTransform = transform === 'none' ? '' : transform;
  }

  function scanParallaxLayers() {
    layersByWrapper.forEach((item, wrapper) => {
      if (wrapper.isConnected && wrapper.querySelector('[data-parallax-layer]') === item.layer) return;
      if (parallaxObserver) parallaxObserver.unobserve(wrapper);
      visibleLayers.delete(item);
      restoreLayer(item);
      layersByWrapper.delete(wrapper);
    });
    document.querySelectorAll('[data-parallax]').forEach((wrapper) => {
      if (layersByWrapper.has(wrapper)) return;
      const layer = wrapper.querySelector('[data-parallax-layer]');
      if (!layer) return;
      const item = { wrapper, layer, originalTransform: layer.style.transform, baseTransform: '', offset: null };
      layersByWrapper.set(wrapper, item);
      if (parallaxEnabled && parallaxObserver) {
        prepareLayer(item);
        parallaxObserver.observe(wrapper);
      }
    });
  }

  function renderParallax() {
    frame = null;
    if (!parallaxEnabled || document.hidden) return;
    const viewportHeight = window.innerHeight;
    const updates = [];
    // Finish all geometry reads before writing transforms.
    visibleLayers.forEach((item) => {
      const bounds = item.wrapper.getBoundingClientRect();
      if (!item.wrapper.isConnected || !bounds.height || bounds.bottom <= 0 || bounds.top >= viewportHeight) {
        updates.push([item, null]);
        return;
      }
      const distance = viewportHeight / 2 - (bounds.top + bounds.height / 2);
      const progress = distance / ((viewportHeight + bounds.height) / 2);
      updates.push([item, (Math.max(-1, Math.min(1, progress)) * 18).toFixed(2)]);
    });
    updates.forEach(([item, offset]) => {
      if (offset === null) restoreLayer(item);
      else if (offset !== item.offset) {
        item.layer.style.transform = `translate3d(0, ${offset}px, 0) ${item.baseTransform}`.trim();
        item.offset = offset;
      }
    });
  }

  function requestParallaxFrame() {
    if (parallaxEnabled && !document.hidden && frame === null) {
      frame = window.requestAnimationFrame(renderParallax);
    }
  }

  function stopParallax() {
    parallaxEnabled = false;
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    window.removeEventListener('scroll', requestParallaxFrame);
    window.removeEventListener('resize', requestParallaxFrame);
    if (parallaxObserver) parallaxObserver.disconnect();
    parallaxObserver = null;
    visibleLayers.clear();
    layersByWrapper.forEach(restoreLayer);
  }

  function updateParallax() {
    const eligible = !reducedMotion.matches && !document.hidden && !menuOpen && !dialogOpen
      && desktopPointer.matches && !navigator.maxTouchPoints && layersByWrapper.size > 0
      && canObserve && typeof window.requestAnimationFrame === 'function';
    if (!eligible) {
      stopParallax();
      return;
    }
    if (parallaxEnabled) {
      requestParallaxFrame();
      return;
    }
    try {
      layersByWrapper.forEach(prepareLayer);
      parallaxObserver = new IntersectionObserver((entries) => {
        if (!parallaxEnabled) return;
        entries.forEach((entry) => {
          const item = layersByWrapper.get(entry.target);
          if (!item) return;
          if (entry.isIntersecting) visibleLayers.add(item);
          else {
            visibleLayers.delete(item);
            restoreLayer(item);
          }
        });
        requestParallaxFrame();
      }, { threshold: 0 });
      parallaxEnabled = true;
      layersByWrapper.forEach((item) => parallaxObserver.observe(item.wrapper));
      window.addEventListener('scroll', requestParallaxFrame, { passive: true });
      window.addEventListener('resize', requestParallaxFrame, { passive: true });
    } catch {
      stopParallax();
    }
  }

  function scanContent() {
    scanReveals();
    scanParallaxLayers();
    updateParallax();
  }

  function onPreferenceChange() {
    if (reducedMotion.matches) {
      cancelEntries();
      revealPendingWithoutMotion();
    }
    updateParallax();
  }

  [reducedMotion, desktopPointer].forEach((preference) => {
    if (typeof preference.addEventListener === 'function') preference.addEventListener('change', onPreferenceChange);
    else if (typeof preference.addListener === 'function') preference.addListener(onPreferenceChange);
  });
  document.addEventListener('site:content-updated', scanContent);
  document.addEventListener('site:menu-change', (event) => {
    menuOpen = Boolean(event.detail && event.detail.open);
    if (menuOpen) cancelEntries();
    updateParallax();
  });
  document.addEventListener('site:dialog-change', (event) => {
    dialogOpen = Boolean(event.detail && event.detail.open);
    if (dialogOpen) cancelEntries();
    updateParallax();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelEntries();
    updateParallax();
  });
  window.addEventListener('pagehide', () => {
    cancelEntries();
    stopParallax();
  });
  window.addEventListener('pageshow', scanContent);

  scanContent();
})();
