(() => {
  'use strict';

  const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
  let reducedMotion;
  let desktopPointer;
  try {
    reducedMotion = window.matchMedia(reducedMotionQuery);
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
  const secondaryTargets = new WeakSet();
  const secondarySelector = '.hero-project-caption, .project-card-category, .project-card-tag, .domain-card-number, .domain-card-label, .method-number, .project-tabs a, .portfolio-count, .back-link, .next-project > .eyebrow, .next-project > a, .footer-column, .footer-bottom';
  let revealObserver = null;
  let parallaxObserver = null;
  let parallaxEnabled = false;
  let menuOpen = false;
  let dialogOpen = false;
  let frame = null;
  let pointer = null;
  let previousFrameTime = 0;
  let preferenceFrame = null;

  const motionAllowed = () => !reducedMotion.matches && !document.hidden && !menuOpen && !dialogOpen;
  const sequenceDelay = (element) => {
    const groupItem = element.closest('.project-card, .domain-card, .method-grid > article');
    if (groupItem && groupItem.parentElement) {
      const index = Array.prototype.indexOf.call(groupItem.parentElement.children, groupItem);
      const local = element === groupItem ? 0 : element.matches('h1, h2, h3') ? 140 : 65;
      return Math.min(280, Math.max(0, index) * 95) + local;
    }
    if (element.matches('.hero-project-caption')) return 160;
    if (element.matches('.project-tabs a, .footer-column') && element.parentElement) {
      return Math.min(210, Array.prototype.indexOf.call(element.parentElement.children, element) * 60);
    }
    return 0;
  };
  const delayFor = (element) => {
    const delay = Number(element.dataset.delay);
    const order = Number(element.dataset.motionIndex);
    return (Number.isFinite(delay) ? Math.min(1000, Math.max(0, delay)) : 0)
      + (Number.isFinite(order) ? Math.min(300, Math.max(0, order) * 65) : 0) + sequenceDelay(element);
  };

  function listenToPreference(preference, attach) {
    if (typeof preference.addEventListener === 'function') {
      preference[attach ? 'addEventListener' : 'removeEventListener']('change', onPreferenceChange);
    } else if (typeof preference.addListener === 'function') {
      preference[attach ? 'addListener' : 'removeListener'](onPreferenceChange);
    }
  }

  function syncReducedMotion() {
    // A document handoff can retain an older MediaQueryList while a newly
    // queried one already reflects the current preference. Rebind that list.
    try {
      const fresh = window.matchMedia(reducedMotionQuery);
      if (fresh.matches !== reducedMotion.matches) {
        listenToPreference(reducedMotion, false);
        reducedMotion = fresh;
        listenToPreference(reducedMotion, true);
      }
    } catch { /* Keep the last working preference when matchMedia fails. */ }
    return reducedMotion.matches;
  }

  function respectReducedMotion() {
    if (!syncReducedMotion()) return false;
    cancelEntries();
    revealPendingWithoutMotion();
    stopParallax();
    return true;
  }

  function watchActiveAnimations() {
    if (preferenceFrame !== null || !animations.size || typeof window.requestAnimationFrame !== 'function') return;
    preferenceFrame = window.requestAnimationFrame(() => {
      preferenceFrame = null;
      if (respectReducedMotion()) return;
      // The guard runs only while this script owns live animations. It never
      // polls an idle page, including pages without WAAPI or observers.
      watchActiveAnimations();
    });
  }

  function play(element, keyframes, options) {
    if (!canAnimate || respectReducedMotion() || !motionAllowed()) return;
    try {
      const animation = element.animate(keyframes, { easing, fill: 'backwards', ...options });
      animations.add(animation);
      const forget = () => {
        animations.delete(animation);
        if (!animations.size && preferenceFrame !== null) {
          window.cancelAnimationFrame(preferenceFrame);
          preferenceFrame = null;
        }
      };
      if (animation.finished && typeof animation.finished.then === 'function') animation.finished.then(forget, forget);
      else {
        animation.onfinish = forget;
        animation.oncancel = forget;
      }
      watchActiveAnimations();
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
    if (!canAnimate || respectReducedMotion() || !motionAllowed()) return;
    // A shared photograph is already moving between documents. Its local
    // observer may run after pagereveal, so it must not rearm a second mask.
    if (element.style.viewTransitionName === 'project-photo') return;
    const delay = delayFor(element);
    if (element.hasAttribute('data-text-reveal')) {
      const words = prepareText(element);
      if (words.length) {
        // Each word clears its own baseline before a small, finite settle.
        // Spans remain transparent to the heading's accessible name.
        words.forEach((word, index) => play(word, [
          { opacity: 0, transform: 'translate3d(0,.72em,0)', clipPath: 'inset(0 0 100% 0)', offset: 0 },
          { opacity: 1, transform: 'translate3d(0,-.035em,0)', clipPath: 'inset(-12% -3% -12% -3%)', offset: .76 },
          { opacity: 1, transform: 'translate3d(0,0,0)', clipPath: 'inset(-12% -3% -12% -3%)', offset: 1 },
        ], { duration: 1080, delay: delay + Math.min(510, index * 62), easing: 'cubic-bezier(.19,1,.3,1)' }));
        return;
      }
    }
    const image = element.hasAttribute('data-image-motion') || element.dataset.reveal === 'image' || element.dataset.intro === 'image';
    if (image) {
      // A shallow diagonal gives photographs a distinct reveal without changing
      // their final rectangular shape or applying a decorative frame.
      play(element, [
        { opacity: .35, clipPath: 'polygon(0 0,100% 0,100% 2%,0 13%)', offset: 0 },
        { opacity: 1, clipPath: 'polygon(0 0,100% 0,100% 88%,0 100%)', offset: .72 },
        { opacity: 1, clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)', offset: 1 },
      ], { duration: 1420, delay, easing: 'cubic-bezier(.2,.75,.2,1)' });
      const photo = element.matches('img') ? null : element.querySelector('img');
      if (photo) {
        const computed = window.getComputedStyle(photo).transform;
        const base = computed === 'none' ? '' : computed;
        play(photo, [
          { transform: `${base} scale(1.12) translate3d(0,-1.5%,0)`.trim() },
          { transform: base || 'none' },
        ], { duration: 1850, delay, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
      return;
    }
    const secondary = secondaryTargets.has(element);
    play(element, [
      { opacity: 0, transform: `translate3d(0,${secondary ? 11 : intro ? 28 : 22}px,0)`, offset: 0 },
      { opacity: 1, transform: 'translate3d(0,-1px,0)', offset: .78 },
      { opacity: 1, transform: 'translate3d(0,0,0)', offset: 1 },
    ], { duration: secondary ? 720 : intro ? 1000 : 900, delay });
  }

  function cancelEntries() {
    animations.forEach((animation) => {
      try { animation.cancel(); } catch { /* The ordinary stylesheet is visible. */ }
    });
    animations.clear();
    if (preferenceFrame !== null) window.cancelAnimationFrame(preferenceFrame);
    preferenceFrame = null;
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
    const targets = new Set(document.querySelectorAll('[data-reveal], [data-text-reveal], [data-image-motion]'));
    document.querySelectorAll(secondarySelector).forEach((element) => {
      secondaryTargets.add(element);
      targets.add(element);
    });
    targets.forEach((element) => {
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
    item.vx = 0;
    item.vy = 0;
    item.scale = 1.065;
    item.vs = 0;
    item.prepared = false;
  }

  function prepareLayer(item) {
    if (item.prepared) return;
    const style = window.getComputedStyle(item.layer);
    item.baseTransform = style.transform === 'none' ? '' : style.transform;
    item.ownsScale = individualTransforms && style.scale === 'none';
    if (item.ownsScale) item.layer.style.scale = String(item.scale);
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
        baseTransform: '', ownsScale: false, prepared: false, x: 0, y: 0, vx: 0, vy: 0, scale: 1.065, vs: 0,
      };
      layersByWrapper.set(wrapper, item);
      if (parallaxEnabled && parallaxObserver) parallaxObserver.observe(wrapper);
    });
  }

  function renderParallax(timestamp) {
    frame = null;
    if (respectReducedMotion() || !parallaxEnabled || !motionAllowed()) return;
    const step = previousFrameTime ? Math.min(1.7, Math.max(.45, (timestamp - previousFrameTime) / 16.667)) : 1;
    previousFrameTime = timestamp;
    const viewportHeight = window.innerHeight;
    const updates = [];
    let settling = false;
    const spring = (current, velocity, target, tolerance) => {
      const nextVelocity = (velocity + (target - current) * .1 * step) * Math.pow(.74, step);
      const next = current + nextVelocity * step;
      if (Math.abs(target - next) < tolerance && Math.abs(nextVelocity) < tolerance) return [target, 0, false];
      return [next, nextVelocity, true];
    };
    // Read every visible figure first; write only after geometry is collected.
    visibleLayers.forEach((item) => {
      const bounds = item.wrapper.getBoundingClientRect();
      if (!item.wrapper.isConnected || !bounds.height || bounds.bottom <= 0 || bounds.top >= viewportHeight) {
        updates.push([item, null]);
        return;
      }
      const progress = (viewportHeight / 2 - bounds.top - bounds.height / 2) / ((viewportHeight + bounds.height) / 2);
      let targetX = 0;
      let targetY = Math.max(-1, Math.min(1, progress)) * Math.min(18, bounds.height * .018);
      let targetScale = 1.065;
      if (pointer && pointer.item === item) {
        const x = Math.max(-1, Math.min(1, (pointer.x - bounds.left) / bounds.width * 2 - 1));
        const y = Math.max(-1, Math.min(1, (pointer.y - bounds.top) / bounds.height * 2 - 1));
        targetX = x * Math.min(9, bounds.width * .01);
        targetY += y * Math.min(5, bounds.height * .006);
        targetScale = 1.095;
      }
      const x = spring(item.x, item.vx, targetX, .025);
      const y = spring(item.y, item.vy, targetY, .025);
      const scale = spring(item.scale, item.vs, targetScale, .00008);
      settling = settling || x[2] || y[2] || scale[2];
      updates.push([item, { x: x[0], vx: x[1], y: y[0], vy: y[1], scale: scale[0], vs: scale[1] }]);
    });
    updates.forEach(([item, values]) => {
      if (values === null) { restoreLayer(item); return; }
      prepareLayer(item);
      Object.assign(item, values);
      if (individualTransforms) {
        item.layer.style.translate = `${item.x.toFixed(2)}px ${item.y.toFixed(2)}px`;
        if (item.ownsScale) item.layer.style.scale = item.scale.toFixed(5);
      } else item.layer.style.transform = `translate3d(${item.x.toFixed(2)}px,${item.y.toFixed(2)}px,0) ${item.baseTransform} scale(${item.scale.toFixed(5)})`.trim();
    });
    if (settling) requestParallaxFrame();
    else previousFrameTime = 0;
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
    previousFrameTime = 0;
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
    if (respectReducedMotion()) return;
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

  function onLinkEnter(event) {
    if (!canAnimate || !desktopPointer.matches || !motionAllowed() || event.pointerType === 'touch') return;
    const link = event.target instanceof Element ? event.target.closest('a.text-link, a.button, a.domain-card') : null;
    if (!link || event.relatedTarget instanceof Node && link.contains(event.relatedTarget)) return;
    const label = link.matches('.domain-card') ? link.querySelector('.domain-card-label') : link;
    if (!label) return;
    // No pointer tracking: the link gets one short, finite response and
    // always returns to its ordinary position before the next interaction.
    const computed = window.getComputedStyle(label).transform;
    const base = computed === 'none' ? '' : computed;
    play(label, [
      { transform: base || 'none', offset: 0 },
      { transform: `${base} translate3d(5px,0,0)`.trim(), offset: .35 },
      { transform: `${base} translate3d(-.6px,0,0)`.trim(), offset: .75 },
      { transform: base || 'none', offset: 1 },
    ], { duration: 650, easing: 'cubic-bezier(.2,.65,.35,1)' });
  }

  function scanContent() {
    respectReducedMotion();
    scanReveals();
    scanParallaxLayers();
    updateParallax();
  }

  function onPreferenceChange() {
    respectReducedMotion();
    updateParallax();
  }

  [reducedMotion, desktopPointer].forEach((preference) => listenToPreference(preference, true));
  document.addEventListener('pointerover', onLinkEnter, { passive: true });
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
  window.addEventListener('pagereveal', onPreferenceChange);

  scanContent();
})();
