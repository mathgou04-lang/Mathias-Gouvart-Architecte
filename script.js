(() => {
  'use strict';

  const header = document.querySelector('.site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#navigation');
  const main = document.querySelector('#contenu');
  const reducedMotion = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };
  let menuOpen = false;
  let dialogOpen = false;
  let updatePlayback = () => {};

  function setInert(element, value) {
    if (!element) return;
    element.inert = value;
    element.toggleAttribute('inert', value);
  }

  function setMenu(open, restoreFocus = false) {
    if (!header || !menuToggle || !navigation) return;
    menuOpen = Boolean(open);
    menuToggle.setAttribute('aria-expanded', String(menuOpen));
    const label = menuToggle.querySelector('.menu-label');
    if (label) label.textContent = menuOpen ? 'Fermer' : 'Menu';
    header.classList.toggle('is-open', menuOpen);
    navigation.classList.toggle('is-open', menuOpen);
    document.body.classList.toggle('menu-open', menuOpen);
    setInert(navigation, !menuOpen);
    setInert(main, menuOpen);
    if (restoreFocus) menuToggle.focus({ preventScroll: true });
    updatePlayback();
    document.dispatchEvent(new CustomEvent('site:menu-change', { detail: { open: menuOpen } }));
  }

  if (header && menuToggle && navigation) {
    menuToggle.hidden = false;
    menuToggle.addEventListener('click', () => setMenu(!menuOpen));
    header.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('a[href]') && menuOpen) {
        // Let the browser follow the anchor once the destination is interactive again.
        setMenu(false);
      }
    });
    document.addEventListener('keydown', (event) => {
      if (!menuOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenu(false, true);
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(header.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter((element) => !element.closest('[inert]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !header.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !header.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    });
    setMenu(false);
  }

  if (header) {
    let scrollPending = false;
    const updateHeader = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 40);
      scrollPending = false;
    };
    window.addEventListener('scroll', () => {
      if (scrollPending) return;
      scrollPending = true;
      window.requestAnimationFrame(updateHeader);
    }, { passive: true });
    updateHeader();
  }

  const slider = document.querySelector('.hero-slider');
  const slides = Array.from(document.querySelectorAll('#hero-slides .hero-slide'));
  const autoplayButton = document.querySelector('[data-autoplay]');
  const dots = Array.from(document.querySelectorAll('[data-slide-dot]'));
  const currentLabel = document.querySelector('[data-slide-current]');
  const caption = document.querySelector('[data-slide-caption]');
  const progress = document.querySelector('[data-slide-progress]');
  const status = document.querySelector('#slide-status');
  const interval = 7200;
  let currentIndex = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));
  let requestedIndex = currentIndex;
  let transitionVersion = 0;
  let loading = false;
  let timer = null;
  let progressAnimation = null;
  let userPaused = false;
  let heroVisible = true;
  let controlsHovered = false;
  let controlsFocused = false;
  const failedSlides = new Set();
  const imageReadiness = new WeakMap();
  const carouselControls = slider && slider.querySelector('.hero-controls, [data-slider-controls]');

  function stopTimer() {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
    if (progressAnimation) {
      progressAnimation.cancel();
      progressAnimation = null;
    }
    if (progress) progress.style.transform = 'scaleX(0)';
  }

  function canPlay() {
    return slides.length > 1 && !userPaused && !reducedMotion.matches &&
      !document.hidden && !menuOpen && !dialogOpen && heroVisible &&
      !controlsHovered && !controlsFocused && !loading;
  }

  function updatePlayButton() {
    if (!autoplayButton) return;
    autoplayButton.hidden = reducedMotion.matches || slides.length < 2;
    const label = autoplayButton.querySelector('[data-autoplay-label]');
    if (label) label.textContent = userPaused ? 'Lecture' : 'Pause';
    autoplayButton.setAttribute('aria-label', userPaused ? 'Lancer le diaporama' : 'Mettre le diaporama en pause');
    autoplayButton.setAttribute('aria-pressed', String(userPaused));
    autoplayButton.classList.toggle('is-paused', userPaused);
  }

  updatePlayback = () => {
    stopTimer();
    updatePlayButton();
    if (!canPlay()) return;
    if (progress && typeof progress.animate === 'function') {
      progressAnimation = progress.animate(
        [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration: interval, easing: 'linear', fill: 'forwards' }
      );
    }
    timer = window.setTimeout(() => {
      timer = null;
      let next = (currentIndex + 1) % slides.length;
      for (let attempt = 0; attempt < slides.length && failedSlides.has(next); attempt += 1) {
        next = (next + 1) % slides.length;
      }
      if (next === currentIndex) {
        userPaused = true;
        updatePlayback();
        return;
      }
      requestSlide(next, false);
    }, interval);
  };

  function renderSlide(manual = false) {
    slides.forEach((slide, index) => {
      slide.classList.toggle('is-active', index === currentIndex);
      slide.setAttribute('aria-hidden', String(index !== currentIndex));
    });
    dots.forEach((dot) => {
      const active = Number(dot.dataset.slideDot) === currentIndex;
      dot.setAttribute('aria-pressed', String(active));
      dot.classList.toggle('is-active', active);
    });
    if (currentLabel) currentLabel.textContent = String(currentIndex + 1).padStart(2, '0');
    const text = slides[currentIndex]?.dataset.caption || '';
    if (caption) caption.textContent = text;
    if (manual && status) status.textContent = `Image ${currentIndex + 1} sur ${slides.length}. ${text}`;
  }

  function imageReady(slide) {
    const picture = slide.querySelector('img');
    if (!picture) return Promise.resolve(true);
    if (picture.complete) return Promise.resolve(picture.naturalWidth > 0);
    if (!imageReadiness.has(picture)) {
      imageReadiness.set(picture, new Promise((resolve) => {
        const finish = (success) => {
          picture.removeEventListener('load', onLoad);
          picture.removeEventListener('error', onError);
          resolve(success);
        };
        const onLoad = () => finish(picture.naturalWidth > 0);
        const onError = () => finish(false);
        picture.addEventListener('load', onLoad, { once: true });
        picture.addEventListener('error', onError, { once: true });
        // Hero images must be eligible to load even when their slide is transparent.
        picture.loading = 'eager';
      }));
    }
    return imageReadiness.get(picture);
  }

  function requestSlide(index, manual = true) {
    if (!slides.length) return;
    const next = (index + slides.length) % slides.length;
    const version = ++transitionVersion;
    requestedIndex = next;
    stopTimer();
    if (next === currentIndex) {
      loading = false;
      updatePlayback();
      return;
    }
    loading = true;
    imageReady(slides[next]).then((ready) => {
      if (version !== transitionVersion) return;
      loading = false;
      if (ready) {
        currentIndex = next;
        failedSlides.delete(next);
        renderSlide(manual);
      } else {
        failedSlides.add(next);
        if (manual && status) status.textContent = 'Cette image ne peut pas être chargée. L’image actuelle reste affichée.';
      }
      requestedIndex = currentIndex;
      updatePlayback();
    });
  }

  if (slider && slides.length) {
    document.querySelectorAll('[data-slide]').forEach((button) => {
      button.addEventListener('click', () => {
        const direction = button.dataset.slide === 'prev' ? -1 : 1;
        requestSlide(requestedIndex + direction);
      });
    });
    dots.forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.slideDot);
        if (Number.isInteger(index) && index >= 0 && index < slides.length) requestSlide(index);
      });
    });
    if (autoplayButton) {
      autoplayButton.addEventListener('click', () => {
        userPaused = !userPaused;
        updatePlayback();
      });
    }
    // Pausing only the controls keeps the image area available for a quiet hover.
    const controlRoots = carouselControls ? [carouselControls] : Array.from(slider.querySelectorAll('[data-slide], [data-slide-dot], [data-autoplay]'));
    controlRoots.forEach((controls) => {
      controls.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'touch') return;
        controlsHovered = true;
        updatePlayback();
      });
      controls.addEventListener('pointerleave', (event) => {
        if (event.pointerType === 'touch') return;
        controlsHovered = false;
        updatePlayback();
      });
      controls.addEventListener('focusin', () => {
        controlsFocused = true;
        updatePlayback();
      });
      controls.addEventListener('focusout', () => {
        window.requestAnimationFrame(() => {
          controlsFocused = controlRoots.some((root) => root.contains(document.activeElement));
          updatePlayback();
        });
      });
    });
    document.addEventListener('visibilitychange', updatePlayback);
    const motionChanged = () => updatePlayback();
    if (typeof reducedMotion.addEventListener === 'function') reducedMotion.addEventListener('change', motionChanged);
    else if (typeof reducedMotion.addListener === 'function') reducedMotion.addListener(motionChanged);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        heroVisible = entries.some((entry) => entry.isIntersecting);
        updatePlayback();
      }, { threshold: 0.05 });
      observer.observe(slider);
    }
    renderSlide();
    updatePlayback();
  }

  const dialog = document.querySelector('#study-dialog');
  const studyImage = document.querySelector('#study-image');
  const studyTitle = document.querySelector('#study-title');
  const studyDescription = document.querySelector('#study-description');
  let dialogOpener = null;

  function closeStudy() {
    if (dialog && dialog.open && typeof dialog.close === 'function') dialog.close();
  }

  function safeImageSource(value) {
    if (!value || /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//') || value.includes('\\')) return null;
    try {
      const resolved = new URL(value, document.baseURI);
      return resolved.origin === window.location.origin ? value : null;
    } catch {
      return null;
    }
  }

  if (dialog && studyImage && studyTitle && studyDescription && typeof dialog.showModal === 'function') {
    document.querySelectorAll('[data-study]').forEach((button) => {
      button.addEventListener('click', (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const source = safeImageSource(button.dataset.image);
        if (!source) return;
        event.preventDefault();
        dialogOpener = button;
        studyImage.src = source;
        studyImage.alt = button.dataset.alt || '';
        studyTitle.textContent = button.dataset.title || 'Étude architecturale';
        studyDescription.textContent = button.dataset.description || '';
        if (menuOpen) setMenu(false);
        if (!dialog.open) dialog.showModal();
        dialogOpen = true;
        document.body.classList.add('dialog-open');
        updatePlayback();
        document.dispatchEvent(new CustomEvent('site:dialog-change', { detail: { open: true } }));
      });
    });
    dialog.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', closeStudy));
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeStudy();
    });
    dialog.addEventListener('close', () => {
      dialogOpen = false;
      document.body.classList.remove('dialog-open');
      if (dialogOpener && dialogOpener.isConnected && !menuOpen) dialogOpener.focus({ preventScroll: true });
      updatePlayback();
      document.dispatchEvent(new CustomEvent('site:dialog-change', { detail: { open: false } }));
    });
  }

  const year = document.querySelector('#year');
  if (year) year.textContent = String(new Date().getFullYear());
  // Content and navigation stay available if JavaScript does not run.
  document.documentElement.classList.add('js');
})();
