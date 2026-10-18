(() => {
  'use strict';

  const header = document.querySelector('.site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#navigation');
  const main = document.querySelector('#contenu');
  const reducedMotion = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };
  const mobileViewport = typeof window.matchMedia === 'function'
    ? window.matchMedia('(max-width: 900px)')
    : { matches: true };
  const finePointer = typeof window.matchMedia === 'function'
    ? window.matchMedia('(hover: hover) and (pointer: fine)')
    : { matches: false };
  const projectToggle = document.querySelector('[data-project-toggle]');
  const projectSubmenu = document.querySelector('#project-submenu');
  const projectNavigation = projectToggle && projectToggle.closest('.nav-projects');
  let menuOpen = false;
  let projectExpanded = false;
  let projectHovered = false;
  let projectCloseTimer = null;
  let dialogOpen = false;
  let pageLeaving = false;
  let updatePlayback = () => {};

  function setInert(element, value) {
    if (!element) return;
    element.inert = value;
    element.toggleAttribute('inert', value);
  }

  function setProjectExpanded(open, restoreFocus = false) {
    if (!projectToggle || !projectSubmenu || !projectNavigation) return;
    if (projectCloseTimer !== null) {
      window.clearTimeout(projectCloseTimer);
      projectCloseTimer = null;
    }
    projectExpanded = Boolean(open);
    projectToggle.setAttribute('aria-expanded', String(projectExpanded));
    projectNavigation.classList.toggle('is-expanded', projectExpanded);
    setInert(projectSubmenu, !projectExpanded);
    if (restoreFocus) projectToggle.focus({ preventScroll: true });
  }

  function setMenu(open, restoreFocus = false) {
    if (!header || !menuToggle || !navigation) return;
    menuOpen = Boolean(open && mobileViewport.matches);
    menuToggle.setAttribute('aria-expanded', String(menuOpen));
    const label = menuToggle.querySelector('.menu-label');
    if (label) label.textContent = menuOpen ? 'Fermer' : 'Menu';
    header.classList.toggle('is-open', menuOpen);
    navigation.classList.toggle('is-open', menuOpen);
    document.body.classList.toggle('menu-open', menuOpen);
    setInert(navigation, mobileViewport.matches && !menuOpen);
    setInert(main, menuOpen);
    if (!menuOpen) setProjectExpanded(false);
    if (restoreFocus && mobileViewport.matches) menuToggle.focus({ preventScroll: true });
    updatePlayback();
    document.dispatchEvent(new CustomEvent('site:menu-change', { detail: { open: menuOpen } }));
  }

  if (projectToggle && projectSubmenu && projectNavigation) {
    // The unenhanced submenu remains usable; CSS animates its enhanced state.
    projectSubmenu.hidden = false;
    setProjectExpanded(false);
    projectToggle.addEventListener('click', () => setProjectExpanded(!projectExpanded));
    const scheduleProjectClose = () => {
      if (projectCloseTimer !== null) window.clearTimeout(projectCloseTimer);
      projectCloseTimer = window.setTimeout(() => {
        projectCloseTimer = null;
        if (!projectHovered && !projectNavigation.contains(document.activeElement)) setProjectExpanded(false);
      }, 180);
    };
    projectNavigation.addEventListener('pointerenter', (event) => {
      if (mobileViewport.matches || !finePointer.matches || event.pointerType === 'touch') return;
      projectHovered = true;
      setProjectExpanded(true);
    });
    projectNavigation.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'touch') return;
      projectHovered = false;
      scheduleProjectClose();
    });
    projectNavigation.addEventListener('focusout', scheduleProjectClose);
    document.addEventListener('click', (event) => {
      if (projectExpanded && !projectNavigation.contains(event.target)) setProjectExpanded(false);
    });
  }

  if (header && menuToggle && navigation) {
    const syncMenuViewport = () => {
      const focusedToggle = document.activeElement === menuToggle;
      const focusedNavigation = navigation.contains(document.activeElement);
      menuToggle.hidden = !mobileViewport.matches;
      projectHovered = false;
      setMenu(false);
      if (mobileViewport.matches && focusedNavigation) menuToggle.focus({ preventScroll: true });
      else if (!mobileViewport.matches && focusedToggle) header.querySelector('.brand')?.focus({ preventScroll: true });
    };
    menuToggle.addEventListener('click', () => setMenu(!menuOpen));
    header.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('a[href]')) {
        // Unlock an anchor destination before the browser follows its link.
        setMenu(false);
      }
    });
    if (typeof mobileViewport.addEventListener === 'function') mobileViewport.addEventListener('change', syncMenuViewport);
    else if (typeof mobileViewport.addListener === 'function') mobileViewport.addListener(syncMenuViewport);
    syncMenuViewport();
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && projectExpanded) {
      event.preventDefault();
      setProjectExpanded(false, true);
      return;
    }
    if (!menuOpen || !header) return;
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
      !document.hidden && !menuOpen && !dialogOpen && !pageLeaving && heroVisible &&
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
  const galleryCounter = dialog && dialog.querySelector('[data-gallery-counter]');
  const gallerySteps = dialog ? Array.from(dialog.querySelectorAll('[data-gallery-step]')) : [];
  let dialogOpener = null;
  let galleryItems = [];
  let galleryIndex = 0;

  function closeStudy() {
    if (dialog && dialog.open && typeof dialog.close === 'function') dialog.close();
  }

  function safeImageSource(value) {
    if (!value || value.includes('\\')) return null;
    try {
      const resolved = new URL(value, document.baseURI);
      if (!/^https?:$/.test(resolved.protocol) || resolved.origin !== window.location.origin) return null;
      return resolved.href;
    } catch {
      return null;
    }
  }

  function gallerySource(item) {
    return safeImageSource(item?.dataset.image || item?.getAttribute('href'));
  }

  function renderStudy() {
    const item = galleryItems[galleryIndex];
    const source = gallerySource(item);
    if (!item || !source || !studyImage || !studyTitle || !studyDescription) return;
    studyImage.src = source;
    studyImage.alt = item.dataset.alt || '';
    studyTitle.textContent = item.dataset.title || 'Étude architecturale';
    studyDescription.textContent = item.dataset.description || '';
    if (galleryCounter) galleryCounter.textContent = `${String(galleryIndex + 1).padStart(2, '0')} / ${String(galleryItems.length).padStart(2, '0')}`;
    gallerySteps.forEach((button) => { button.hidden = galleryItems.length < 2; });
  }

  function stepGallery(direction) {
    if (galleryItems.length < 2) return;
    galleryIndex = (galleryIndex + direction + galleryItems.length) % galleryItems.length;
    renderStudy();
  }

  if (dialog && studyImage && studyTitle && studyDescription && typeof dialog.showModal === 'function') {
    document.addEventListener('click', (event) => {
        const item = event.target instanceof Element ? event.target.closest('[data-study], [data-gallery-item]') : null;
        if (!item) return;
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (!gallerySource(item)) return;
        event.preventDefault();
        dialogOpener = item;
        const collection = item.closest('[data-gallery]');
        galleryItems = collection
          ? Array.from(collection.querySelectorAll('[data-gallery-item]')).filter((entry) => gallerySource(entry))
          : [item];
        if (!galleryItems.includes(item)) galleryItems = [item];
        galleryIndex = galleryItems.indexOf(item);
        renderStudy();
        if (menuOpen) setMenu(false);
        setProjectExpanded(false);
        if (!dialog.open) dialog.showModal();
        dialogOpen = true;
        document.body.classList.add('dialog-open');
        updatePlayback();
        document.dispatchEvent(new CustomEvent('site:dialog-change', { detail: { open: true } }));
    });
    gallerySteps.forEach((button) => {
      button.addEventListener('click', () => stepGallery(button.dataset.galleryStep === 'prev' ? -1 : 1));
    });
    dialog.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', closeStudy));
    dialog.addEventListener('keydown', (event) => {
      if (!dialog.open || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        stepGallery(event.key === 'ArrowRight' ? 1 : -1);
      }
    });
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

  document.addEventListener('site:navigation-start', () => {
    pageLeaving = true;
    setMenu(false);
    setProjectExpanded(false);
    updatePlayback();
  });
  window.addEventListener('pageshow', () => {
    pageLeaving = false;
    updatePlayback();
  });
  window.addEventListener('pagehide', stopTimer);

  const year = document.querySelector('#year');
  if (year) year.textContent = String(new Date().getFullYear());
  // Content and navigation stay available if JavaScript does not run.
  document.documentElement.classList.add('js');
})();
