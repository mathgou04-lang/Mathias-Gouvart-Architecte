(() => {
  'use strict';

  let reducedMotion;
  let desktopPointer;
  try {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    desktopPointer = window.matchMedia('(min-width: 901px) and (hover: hover) and (pointer: fine)');
  } catch {
    return; // The complete static page remains visible.
  }

  const easing = 'cubic-bezier(.22,1,.36,1)';
  const canAnimate = typeof Element.prototype.animate === 'function';
  const canObserve = typeof window.IntersectionObserver === 'function';
  const individualTransforms = typeof CSS !== 'undefined' && CSS.supports('translate', '1px 1px') && CSS.supports('scale', '1.05');
  const animations = new Set();
  const seenIntros = new WeakSet();
  const seenReveals = new WeakSet();
  const textStates = new WeakMap();
  const pendingReveals = new Set();
  const layersByWrapper = new Map();
  const visibleLayers = new Set();
  let revealObserver = null;
  let parallaxObserver = null;
  let parallaxEnabled = false;
  let menuOpen = false;
  let dialogOpen = false;
  let frame = null;
  let pointer = null;

  const motionAllowed = () => !reducedMotion.matches && !document.hidden && !menuOpen && !dialogOpen;
  const delayFor = (element) => {
    const delay = Number(element.dataset.delay);
    const order = Number(element.dataset.motionIndex);
    return (Number.isFinite(delay) ? Math.min(1000, Math.max(0, delay)) : 0)
      + (Number.isFinite(order) ? Math.min(300, Math.max(0, order) * 65) : 0);
  };

  function play(element, keyframes, options) {
    try {
      const animation = element.animate(keyframes, { easing, fill: 'backwards', ...options });
      animations.add(animation);
      const forget = () => animations.delete(animation);
      if (animation.finished && typeof animation.finished.then === 'function') animation.finished.then(forget, forget);
      else {
        animation.onfinish = forget;
        animation.oncancel = forget;
      }
    } catch { /* No persistent hidden style is ever written. */ }
  }

  function headingText(element) {
    const copy = element.cloneNode(true);
    copy.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }

  function prepareText(element) {
    const previous = textStates.get(element);
    if (previous && previous.words.every((word) => element.contains(word)) && headingText(element) === previous.label) return previous.words;
    // Project content can replace the text of an existing heading. Its accessible
    // name must change with it, rather than retaining the previous project name.
    if (previous && previous.generatedLabel && element.getAttribute('aria-label') === previous.label) element.removeAttribute('aria-label');
    if (reducedMotion.matches || !canAnimate || !/^H[1-6]$/.test(element.tagName) && element.getAttribute('role') !== 'heading') return [];
    if (element.querySelector('a, button, input, textarea, select, svg, img, [aria-label], [aria-hidden]')) return [];
    const label = headingText(element);
    if (!label || label.length > 220) return [];
    const words = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (!node.textContent.trim()) return;
      const fragment = document.createDocumentFragment();
      node.textContent.match(/\S+|\s+/g).forEach((token) => {
        if (!token.trim()) fragment.appendChild(document.createTextNode(token));
        else {
          const word = document.createElement('span');
          word.textContent = token;
          word.dataset.motionWord = '';
          word.setAttribute('aria-hidden', 'true');
          word.style.display = 'inline-block';
          fragment.appendChild(word);
          words.push(word);
        }
      });
      node.replaceWith(fragment);
    });
    const generatedLabel = !element.hasAttribute('aria-label');
    if (generatedLabel) element.setAttribute('aria-label', label);
    textStates.set(element, { words, label, generatedLabel });
    return words;
  }

  function animateEntry(element, intro = false) {
    if (!canAnimate || !motionAllowed()) return;
    const delay = delayFor(element);
    if (element.hasAttribute('data-text-reveal')) {
      const words = prepareText(element);
      if (words.length) {
        words.forEach((word, index) => play(word, [
          { opacity: 0, transform: 'translate3d(0,.55em,0)', clipPath: 'inset(0 0 100% 0)' },
          { opacity: 1, transform: 'translate3d(0,0,0)', clipPath: 'inset(0 0 0 0)' },
        ], { duration: 900, delay: delay + Math.min(460, index * 45) }));
        return;
      }
    }
    const image = element.hasAttribute('data-image-motion') || element.dataset.reveal === 'image' || element.dataset.intro === 'image';
    if (image) {
      play(element, [
        { opacity: .35, clipPath: 'inset(0 0 100% 0)' },
        { opacity: 1, clipPath: 'inset(0 0 0 0)' },
      ], { duration: 1200, delay });
      const photo = element.matches('img') ? null : element.querySelector('img');
      if (photo) {
        const computed = window.getComputedStyle(photo).transform;
        const base = computed === 'none' ? '' : computed;
        play(photo, [
          { transform: `${base} scale(1.065)`.trim() },
          { transform: base || 'none' },
        ], { duration: 1550, delay });
      }
      return;
    }
    play(element, [
      { opacity: 0, transform: `translate3d(0,${intro ? 22 : 16}px,0)` },
      { opacity: 1, transform: 'translate3d(0,0,0)' },
    ], { duration: intro ? 850 : 750, delay });
  }

  function cancelEntries() {
    animations.forEach((animation) => {
      try { animation.cancel(); } catch { /* The ordinary stylesheet is visible. */ }
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
          if (entry.target.isConnected) animateEntry(entry.target);
        });
      }, { threshold: 0.025, rootMargin: '0px 0px 4% 0px' });
    } catch { revealObserver = null; }
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
    document.querySelectorAll('[data-text-reveal]').forEach(prepareText);
    document.querySelectorAll('[data-intro]').forEach((element) => {
      if (seenIntros.has(element)) return;
      seenIntros.add(element);
      seenReveals.add(element);
      animateEntry(element, true);
    });
    if (!reducedMotion.matches) ensureRevealObserver();
    document.querySelectorAll('[data-reveal], [data-text-reveal], [data-image-motion]').forEach((element) => {
      if (seenReveals.has(element)) return;
      seenReveals.add(element);
      if (reducedMotion.matches || !revealObserver) return;
      pendingReveals.add(element);
      revealObserver.observe(element);
    });
  }

  function restoreLayer(item) {
    if (!item.prepared) return;
    if (individualTransforms) {
      if (item.originalTranslate) item.layer.style.translate = item.originalTranslate;
      else item.layer.style.removeProperty('translate');
      if (item.ownsScale) {
        if (item.originalScale) item.layer.style.scale = item.originalScale;
        else item.layer.style.removeProperty('scale');
      }
    } else if (item.originalTransform) item.layer.style.transform = item.originalTransform;
    else item.layer.style.removeProperty('transform');
    item.x = 0;
    item.y = 0;
    item.prepared = false;
  }

  function prepareLayer(item) {
    if (item.prepared) return;
    const style = window.getComputedStyle(item.layer);
    item.baseTransform = style.transform === 'none' ? '' : style.transform;
    item.ownsScale = individualTransforms && style.scale === 'none';
    if (item.ownsScale) item.layer.style.scale = '1.045';
    item.prepared = true;
  }

  function scanParallaxLayers() {
    layersByWrapper.forEach((item, wrapper) => {
      if (wrapper.isConnected && wrapper.contains(item.layer)) return;
      if (parallaxObserver) parallaxObserver.unobserve(wrapper);
      visibleLayers.delete(item);
      restoreLayer(item);
      layersByWrapper.delete(wrapper);
    });
    document.querySelectorAll('[data-parallax], [data-image-motion]').forEach((wrapper) => {
      if (layersByWrapper.has(wrapper)) return;
      const layer = wrapper.querySelector('[data-parallax-layer]') || wrapper.querySelector('img');
      if (!layer || layer.closest('[data-image-motion], [data-parallax]') !== wrapper) return;
      const item = {
        wrapper, layer, originalTransform: layer.style.transform,
        originalTranslate: layer.style.translate, originalScale: layer.style.scale,
        baseTransform: '', ownsScale: false, prepared: false, x: 0, y: 0,
      };
      layersByWrapper.set(wrapper, item);
      if (parallaxEnabled && parallaxObserver) parallaxObserver.observe(wrapper);
    });
  }

  function renderParallax() {
    frame = null;
    if (!parallaxEnabled || !motionAllowed()) return;
    const viewportHeight = window.innerHeight;
    const updates = [];
    let settling = false;
    // Batch all geometry reads before writing any transforms.
    visibleLayers.forEach((item) => {
      const bounds = item.wrapper.getBoundingClientRect();
      if (!item.wrapper.isConnected || !bounds.height || bounds.bottom <= 0 || bounds.top >= viewportHeight) {
        updates.push([item, null, null]);
        return;
      }
      const progress = (viewportHeight / 2 - bounds.top - bounds.height / 2) / ((viewportHeight + bounds.height) / 2);
      let targetX = 0;
      let targetY = Math.max(-1, Math.min(1, progress)) * Math.min(12, bounds.height * .012);
      if (pointer && pointer.item === item) {
        const x = Math.max(-1, Math.min(1, (pointer.x - bounds.left) / bounds.width * 2 - 1));
        const y = Math.max(-1, Math.min(1, (pointer.y - bounds.top) / bounds.height * 2 - 1));
        targetX = x * Math.min(5, bounds.width * .006);
        targetY += y * Math.min(4, bounds.height * .006);
      }
      const nextX = item.x + (targetX - item.x) * .14;
      const nextY = item.y + (targetY - item.y) * .14;
      if (Math.abs(nextX - targetX) > .08 || Math.abs(nextY - targetY) > .08) settling = true;
      updates.push([item, Math.abs(nextX - targetX) < .08 ? targetX : nextX, Math.abs(nextY - targetY) < .08 ? targetY : nextY]);
    });
    updates.forEach(([item, x, y]) => {
      if (x === null) { restoreLayer(item); return; }
      prepareLayer(item);
      item.x = x;
      item.y = y;
      if (individualTransforms) item.layer.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
      else item.layer.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) ${item.baseTransform} scale(1.045)`.trim();
    });
    if (settling) requestParallaxFrame();
  }

  function requestParallaxFrame() {
    if (parallaxEnabled && motionAllowed() && frame === null) frame = window.requestAnimationFrame(renderParallax);
  }

  function onPointerMove(event) {
    if (event.pointerType === 'touch') return;
    const wrapper = event.target instanceof Element ? event.target.closest('[data-image-motion], [data-parallax]') : null;
    const item = wrapper && layersByWrapper.get(wrapper);
    if (!item && !pointer) return;
    pointer = item ? { item, x: event.clientX, y: event.clientY } : null;
    requestParallaxFrame();
  }

  function onPointerLeave() {
    pointer = null;
    requestParallaxFrame();
  }

  function stopParallax() {
    parallaxEnabled = false;
    pointer = null;
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    window.removeEventListener('scroll', requestParallaxFrame);
    window.removeEventListener('resize', requestParallaxFrame);
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerleave', onPointerLeave);
    if (parallaxObserver) parallaxObserver.disconnect();
    parallaxObserver = null;
    visibleLayers.clear();
    layersByWrapper.forEach(restoreLayer);
  }

  function updateParallax() {
    const eligible = motionAllowed() && desktopPointer.matches && !navigator.maxTouchPoints
      && layersByWrapper.size > 0 && canObserve && typeof window.requestAnimationFrame === 'function';
    if (!eligible) { stopParallax(); return; }
    if (parallaxEnabled) { requestParallaxFrame(); return; }
    try {
      parallaxObserver = new IntersectionObserver((entries) => {
        if (!parallaxEnabled) return;
        entries.forEach((entry) => {
          const item = layersByWrapper.get(entry.target);
          if (!item) return;
          if (entry.isIntersecting) visibleLayers.add(item);
          else { visibleLayers.delete(item); restoreLayer(item); }
        });
        requestParallaxFrame();
      }, { threshold: 0 });
      parallaxEnabled = true;
      layersByWrapper.forEach((item) => parallaxObserver.observe(item.wrapper));
      window.addEventListener('scroll', requestParallaxFrame, { passive: true });
      window.addEventListener('resize', requestParallaxFrame, { passive: true });
      document.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('pointerleave', onPointerLeave, { passive: true });
    } catch { stopParallax(); }
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
  window.addEventListener('pagehide', () => { cancelEntries(); stopParallax(); });
  window.addEventListener('pageshow', scanContent);

  scanContent();
})();
