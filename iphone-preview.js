(() => {
  'use strict';

  const frame = document.querySelector('#site-frame');
  const stage = document.querySelector('.device-stage');
  const intro = document.querySelector('.preview-intro');
  const back = document.querySelector('#back-preview');
  const forward = document.querySelector('#forward-preview');
  const address = document.querySelector('#preview-address');
  const open = document.querySelector('#open-site');
  const status = document.querySelector('#preview-status');
  if (!frame || !stage) return;

  const siteRoot = new URL('.', location.href);
  const visits = [];
  let position = -1;
  let requestedPosition = null;
  let external = false;
  let navigating = false;

  function controls() {
    back.disabled = navigating || (position <= 0 && !external);
    forward.disabled = navigating || external || position >= visits.length - 1;
  }
  function markLoading() {
    navigating = true;
    frame.setAttribute('aria-busy', 'true');
    controls();
  }
  function visit(path) {
    requestedPosition = null;
    markLoading();
    frame.src = new URL(path, siteRoot).href;
  }
  function traverse(nextPosition) {
    if (navigating || nextPosition < 0 || nextPosition >= visits.length) return;
    requestedPosition = nextPosition;
    markLoading();
    // Keep these controls inside the phone, independently of the enclosing
    // browser tab's joint session history.
    try { frame.contentWindow.location.replace(visits[nextPosition]); }
    catch { frame.src = visits[nextPosition]; }
  }
  function loaded() {
    let current;
    try {
      current = new URL(frame.contentWindow.location.href);
      if (current.protocol === 'about:') return;
      if (current.origin !== location.origin) throw new Error('External page');
    } catch {
      external = true;
      navigating = false;
      frame.removeAttribute('aria-busy');
      address.textContent = 'Page externe';
      requestedPosition = null;
      controls();
      return;
    }
    external = false;
    navigating = false;
    frame.removeAttribute('aria-busy');
    if (requestedPosition !== null && visits[requestedPosition] === current.href) {
      position = requestedPosition;
    } else if (visits[position] !== current.href) {
      visits.splice(position + 1);
      visits.push(current.href);
      position = visits.length - 1;
    }
    requestedPosition = null;
    address.textContent = current.host;
    address.title = current.href;
    open.href = current.href;
    status.textContent = frame.contentDocument.title + ' — aperçu iPhone';
    controls();
  }

  frame.addEventListener('load', loaded);
  back.addEventListener('click', () => traverse(external ? position : position - 1));
  forward.addEventListener('click', () => traverse(position + 1));
  document.querySelector('#home-preview').addEventListener('click', () => visit('accueil.html'));
  document.querySelector('#restart-preview').addEventListener('click', () => visit('index.html'));
  document.querySelector('#reload-preview').addEventListener('click', () => {
    if (external) { visit('index.html'); return; }
    markLoading();
    try { frame.contentWindow.location.reload(); }
    catch { visit(visits[position] || 'index.html'); }
  });
  try {
    if (frame.contentDocument.readyState === 'complete') loaded();
  } catch { /* The iframe's load event will update the controls. */ }

  let resizeFrame = null;
  function fitPhone() {
    resizeFrame = null;
    const narrow = innerWidth <= 800;
    const layoutStyle = getComputedStyle(document.querySelector('.preview-layout'));
    const desktopSpace = innerWidth - parseFloat(layoutStyle.paddingLeft)
      - parseFloat(layoutStyle.paddingRight) - parseFloat(layoutStyle.columnGap);
    const availableWidth = narrow ? Math.max(250, innerWidth - 32)
      : Math.max(250, desktopSpace - Math.min(350, desktopSpace * .45));
    const availableHeight = narrow
      ? Math.max(440, innerHeight - intro.getBoundingClientRect().height - 58)
      : Math.max(480, innerHeight - 72);
    const scale = Math.max(.55, Math.min(1, availableWidth / 418, availableHeight / 872));
    stage.style.setProperty('--phone-scale', scale.toFixed(4));
  }
  function queueFit() {
    if (resizeFrame === null) resizeFrame = requestAnimationFrame(fitPhone);
  }
  window.addEventListener('resize', queueFit, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', queueFit, { passive: true });
  fitPhone();
})();
