(() => {
  'use strict';

  const image = document.querySelector('.entry-visual');
  const veil = document.querySelector('.entry-transition');
  const links = document.querySelectorAll('[data-enter]');
  if (!image || !veil || !links.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  let leaving = false;
  let timer = null;

  function animate(element, frames, options) {
    if (!element || typeof element.animate !== 'function') return null;
    try {
      const animation = element.animate(frames, { easing: 'cubic-bezier(.22,1,.36,1)', ...options });
      animations.add(animation);
      animation.finished.then(() => {
        if (options.fill !== 'forwards') animations.delete(animation);
      }, () => animations.delete(animation));
      return animation;
    } catch { return null; }
  }

  function reset() {
    if (timer) window.clearTimeout(timer);
    timer = null;
    animations.forEach(animation => animation.cancel());
    animations.clear();
    leaving = false;
    document.body.removeAttribute('aria-busy');
    veil.style.opacity = '';
  }

  if (!reduced.matches) {
    animate(image, [{ transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 1800 });
    for (const [selector, delay] of [['.entry-brand', 80], ['.entry-title', 180], ['.entry-button', 330]]) {
      animate(document.querySelector(selector), [{ opacity: 0, translate: '0 12px' }, { opacity: 1, translate: '0 0' }], { duration: 900, delay, fill: 'backwards' });
    }
  }

  links.forEach(link => link.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || reduced.matches || typeof veil.animate !== 'function') return;
    event.preventDefault();
    if (leaving) return;
    leaving = true;
    document.body.setAttribute('aria-busy', 'true');
    const destination = link.href;
    let navigated = false;
    const navigate = () => {
      if (navigated || !leaving) return;
      navigated = true;
      window.location.assign(destination);
    };
    const animation = animate(veil, [{ opacity: 0 }, { opacity: 1 }], { duration: 520, fill: 'forwards' });
    animate(image, [{ transform: 'scale(1)' }, { transform: 'scale(1.025)' }], { duration: 650, fill: 'forwards' });
    if (animation) animation.finished.then(navigate, () => {});
    timer = window.setTimeout(navigate, 700);
  }));

  const changePreference = () => {
    if (!reduced.matches) return;
    // The fallback timer still completes a navigation if the preference changes mid-exit.
    animations.forEach(animation => animation.cancel());
    animations.clear();
  };
  if (typeof reduced.addEventListener === 'function') reduced.addEventListener('change', changePreference);
  else if (typeof reduced.addListener === 'function') reduced.addListener(changePreference);
  window.addEventListener('pageshow', event => {
    if (event.persisted || leaving) reset();
  });
})();
