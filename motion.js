(() => {
  'use strict';

  const easing = 'cubic-bezier(.22,1,.36,1)';
  const animations = new Set();
  let reducedMotion;
  let desktopPointer;

  // Unsupported preferences leave the fully visible static page intact.
  try {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    desktopPointer = window.matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)');
  } catch {
    return;
  }

  const canAnimate = typeof Element.prototype.animate === 'function';
  const delayFor = (element) => {
    const delay = Number(element.dataset.delay);
    return Number.isFinite(delay) ? Math.min(1600, Math.max(0, delay)) : 0;
  };

  function animateEntry(element, image = false, intro = false) {
    if (!canAnimate || reducedMotion.matches || document.hidden) return;

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
        // Final appearance always comes from the regular, visible stylesheet.
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
      // A failed effect never applies hidden styles to the underlying element.
    }
  }

  function cancelEntries() {
    animations.forEach((animation) => {
      try { animation.cancel(); } catch { /* Static content remains visible. */ }
    });
    animations.clear();
  }

  const introElements = new Set(document.querySelectorAll('[data-intro]'));
  introElements.forEach((element) => {
    animateEntry(element, element.dataset.intro === 'image', true);
  });

  const revealElements = [...document.querySelectorAll('[data-reveal]')]
    .filter((element) => !introElements.has(element));
  let revealObserver;

  if (canAnimate && typeof window.IntersectionObserver === 'function') {
    try {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          revealObserver.unobserve(entry.target);
          animateEntry(entry.target, entry.target.dataset.reveal === 'image');
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      revealElements.forEach((element) => revealObserver.observe(element));
    } catch {
      if (revealObserver) revealObserver.disconnect();
    }
  }

  const layers = [...document.querySelectorAll('[data-parallax]')]
    .map((wrapper) => {
      const layer = wrapper.querySelector('[data-parallax-layer]');
      return layer ? {
        wrapper,
        layer,
        originalTransform: layer.style.transform,
        baseTransform: '',
        offset: null,
      } : null;
    })
    .filter(Boolean);
  const layersByWrapper = new Map(layers.map((item) => [item.wrapper, item]));
  const visibleLayers = new Set();
  let parallaxObserver;
  let parallaxEnabled = false;
  let frame = null;

  function restoreLayer(item) {
    if (item.offset === null) return;
    if (item.originalTransform) item.layer.style.transform = item.originalTransform;
    else item.layer.style.removeProperty('transform');
    item.offset = null;
  }

  function renderParallax() {
    frame = null;
    if (!parallaxEnabled || document.hidden) return;
    const viewportHeight = window.innerHeight;
    const updates = [];

    // Batch geometry reads before transform writes.
    visibleLayers.forEach((item) => {
      const bounds = item.wrapper.getBoundingClientRect();
      if (!bounds.height || bounds.bottom <= 0 || bounds.top >= viewportHeight) {
        updates.push([item, null]);
        return;
      }
      const distance = viewportHeight / 2 - (bounds.top + bounds.height / 2);
      const progress = distance / ((viewportHeight + bounds.height) / 2);
      updates.push([item, (Math.max(-1, Math.min(1, progress)) * 18).toFixed(2)]);
    });

    updates.forEach(([item, offset]) => {
      if (offset === null) {
        restoreLayer(item);
      } else if (offset !== item.offset) {
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
    visibleLayers.clear();
    layers.forEach(restoreLayer);
  }

  function updateParallax() {
    const eligible = !reducedMotion.matches && desktopPointer.matches
      && !navigator.maxTouchPoints && layers.length > 0
      && typeof window.IntersectionObserver === 'function'
      && typeof window.requestAnimationFrame === 'function';
    if (!eligible) {
      stopParallax();
      return;
    }
    if (parallaxEnabled) return;

    try {
      layers.forEach((item) => {
        const transform = window.getComputedStyle(item.layer).transform;
        item.baseTransform = transform === 'none' ? '' : transform;
      });
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
      layers.forEach((item) => parallaxObserver.observe(item.wrapper));
      window.addEventListener('scroll', requestParallaxFrame, { passive: true });
      window.addEventListener('resize', requestParallaxFrame, { passive: true });
    } catch {
      stopParallax();
    }
  }

  function onPreferenceChange() {
    if (reducedMotion.matches) cancelEntries();
    updateParallax();
  }

  [reducedMotion, desktopPointer].forEach((preference) => {
    if (typeof preference.addEventListener === 'function') {
      preference.addEventListener('change', onPreferenceChange);
    } else if (typeof preference.addListener === 'function') {
      preference.addListener(onPreferenceChange);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelEntries();
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      layers.forEach(restoreLayer);
    } else {
      requestParallaxFrame();
    }
  });

  updateParallax();
})();
