(() => {
  'use strict';

  const reduced = typeof matchMedia === 'function'
    ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: true };
  const nativeTransitions = window.top === window && 'onpageswap' in window && 'onpagereveal' in window
    && typeof CSS !== 'undefined' && CSS.supports('view-transition-name', 'none');
  const shared = new Set();
  const activeTransitions = new Set();
  const veil = document.querySelector('[data-page-transition]');
  let exitAnimation = null;
  let exitTimer = null;
  let leaving = false;

  function url(value) {
    if (typeof value !== 'string' || !value) return null;
    try { return new URL(value, document.baseURI); } catch { return null; }
  }
  function samePage(a, b) {
    return a && b && a.origin === b.origin && a.pathname === b.pathname && a.search === b.search;
  }
  function isListing(location) {
    return location && /\/(?:accueil|projets(?:-neufs|-renovations)?)\.html$/.test(location.pathname);
  }
  function isDetail(location) {
    return location && /\/projet(?:-[a-z0-9-]+)?\.html$/.test(location.pathname);
  }
  function cardPhoto(destination) {
    const card = [...document.querySelectorAll('a.hero-project[href],a.project-card[href]')]
      .find(link => samePage(url(link.href), destination));
    return card && card.querySelector('.hero-project-photo,.project-card-image');
  }
  function resetShared() {
    shared.forEach(element => element.style.removeProperty('view-transition-name'));
    shared.clear();
  }
  function namePhoto(element) {
    if (!element || !element.getClientRects().length || element.closest('[hidden]')) return;
    // The shared photograph must not simultaneously run a reveal mask of its own.
    element.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
    element.style.viewTransitionName = 'project-photo';
    shared.add(element);
  }
  function watchTransition(transition) {
    activeTransitions.add(transition);
    transition.ready.catch(() => {});
    const finish = () => {
      activeTransitions.delete(transition);
      resetShared();
    };
    transition.finished.then(finish, finish);
  }
  function resetExit() {
    leaving = false;
    if (exitTimer !== null) clearTimeout(exitTimer);
    exitTimer = null;
    if (exitAnimation) exitAnimation.cancel();
    exitAnimation = null;
    document.body.classList.remove('is-leaving');
  }

  window.addEventListener('pageswap', event => {
    if (!event.viewTransition) return;
    watchTransition(event.viewTransition);
    if (reduced.matches) {
      event.viewTransition.skipTransition();
      return;
    }
    resetShared();
    const current = url(location.href);
    const destination = url(event.activation?.entry?.url);
    if (destination?.origin === current.origin) {
      if (isListing(current) && isDetail(destination)) namePhoto(cardPhoto(destination));
      else if (isDetail(current) && isListing(destination)) namePhoto(document.querySelector('.detail-cover'));
    }
  });
  window.addEventListener('pagereveal', event => {
    if (!event.viewTransition) return;
    watchTransition(event.viewTransition);
    if (reduced.matches) {
      event.viewTransition.skipTransition();
      return;
    }
    resetShared();
    const previous = url(window.navigation?.activation?.from?.url);
    const current = url(location.href);
    if (previous?.origin === current.origin) {
      if (isDetail(current) && isListing(previous)) namePhoto(document.querySelector('.detail-cover'));
      else if (isListing(current) && isDetail(previous)) namePhoto(cardPhoto(previous));
    }
  });

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link || link.hasAttribute('download') || (link.target && link.target.toLowerCase() !== '_self')) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    const destination = url(link.href);
    const current = url(location.href);
    if (!destination || !/^https?:$/.test(destination.protocol) || destination.origin !== current.origin || samePage(destination, current)) return;
    if (!/\.html$/i.test(destination.pathname) && destination.pathname !== url('.')?.pathname) return;
    // Entry's fallback has its own finite photo/veil sequence.
    if (document.body.classList.contains('entry-page')) return;
    if (nativeTransitions || reduced.matches || !veil || typeof veil.animate !== 'function') return;
    event.preventDefault();
    if (leaving) return;
    leaving = true;
    document.body.classList.add('is-leaving');
    document.dispatchEvent(new CustomEvent('site:navigation-start'));
    let navigated = false;
    const navigate = () => {
      if (navigated || !leaving) return;
      navigated = true;
      if (exitTimer !== null) clearTimeout(exitTimer);
      exitTimer = null;
      try { location.assign(destination.href); } catch { resetExit(); }
    };
    try {
      exitAnimation = veil.animate([
        { transform: 'translate3d(0,110%,0)', clipPath: 'polygon(0 14%,100% 0,100% 100%,0 100%)' },
        { transform: 'translate3d(0,0,0)', clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)' },
      ], { duration: 460, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });
      exitTimer = setTimeout(navigate, 600);
      exitAnimation.finished.then(navigate, navigate);
    } catch { navigate(); }
  });

  const preferenceChanged = () => {
    if (!reduced.matches) return;
    activeTransitions.forEach(transition => transition.skipTransition());
    if (exitAnimation) exitAnimation.cancel();
  };
  if (typeof reduced.addEventListener === 'function') reduced.addEventListener('change', preferenceChanged);
  else if (typeof reduced.addListener === 'function') reduced.addListener(preferenceChanged);
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      resetExit();
      resetShared();
    }
  });
})();
