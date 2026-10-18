(() => {
  'use strict';

  const CATEGORIES = Object.freeze({
    'constructions-neuves': 'projets-neufs.html',
    'renovations-transformations': 'projets-renovations.html'
  });
  const STATIC_PAGES = new Set([
    'projet-maison-horizon.html',
    'projet-maison-lumiere.html',
    'projet-appartement-matiere.html'
  ]);
  const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const IMAGE = /^assets\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:avif|jpe?g|png|webp|svg)$/i;
  const HTML_PAGE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.html$/;
  const DOSSIER_FIELDS = Object.freeze([
    ['context', 'Contexte'],
    ['approach', 'Parti architectural'],
    ['details', 'Matières et détails']
  ]);
  const OPTIONAL_TEXT_LIMITS = Object.freeze({ context: 10000, approach: 10000, details: 10000, mission: 120, stage: 80 });
  const SAMPLE_LABEL = 'Étude d’intention — images d’ambiance';
  let lastSignature = '';

  const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const isText = (value, allowEmpty = false) => typeof value === 'string' && (allowEmpty || value.trim().length > 0);

  // Copy only the supported fields. All content is inserted through DOM text nodes.
  function normalize(data) {
    if (!isRecord(data) || data.version !== 1 || !Array.isArray(data.categories) || data.categories.length !== 2 || !Array.isArray(data.projects)) return null;

    const categoryIds = new Set();
    const categories = [];
    for (const category of data.categories) {
      if (!isRecord(category) || !Object.prototype.hasOwnProperty.call(CATEGORIES, category.id) || categoryIds.has(category.id) || !isText(category.label) || category.page !== CATEGORIES[category.id]) return null;
      categoryIds.add(category.id);
      categories.push({ id: category.id, label: category.label, page: category.page });
    }

    const projectIds = new Set();
    const projects = [];
    for (const project of data.projects) {
      if (!isRecord(project) || !isText(project.id) || !SLUG.test(project.id) || projectIds.has(project.id) || !categoryIds.has(project.category)) return null;
      if (!isText(project.title) || !isText(project.summary) || !Array.isArray(project.description) || !project.description.length || !project.description.every(paragraph => isText(paragraph))) return null;
      if (!isText(project.location, true) || !isText(project.year, true) || typeof project.sample !== 'boolean' || typeof project.featured !== 'boolean') return null;
      if (!isText(project.cover) || !IMAGE.test(project.cover) || !isText(project.coverAlt) || !Array.isArray(project.gallery)) return null;
      if (project.page !== undefined && (!isText(project.page) || !HTML_PAGE.test(project.page))) return null;
      for (const [field, maxLength] of Object.entries(OPTIONAL_TEXT_LIMITS)) {
        if (project[field] !== undefined && (!isText(project[field], true) || project[field].length > maxLength)) return null;
      }

      const gallery = [];
      for (const item of project.gallery) {
        if (!isRecord(item) || !isText(item.src) || !IMAGE.test(item.src) || !isText(item.alt) || !isText(item.caption, true)) return null;
        gallery.push({ src: item.src, alt: item.alt, caption: item.caption });
      }

      projectIds.add(project.id);
      const copy = {
        id: project.id,
        title: project.title,
        category: project.category,
        summary: project.summary,
        description: project.description.slice(),
        location: project.location,
        year: project.year,
        sample: project.sample,
        featured: project.featured,
        cover: project.cover,
        coverAlt: project.coverAlt,
        gallery
      };
      for (const field of Object.keys(OPTIONAL_TEXT_LIMITS)) copy[field] = (project[field] || '').trim();
      if (project.page !== undefined) copy.page = project.page;
      projects.push(copy);
    }

    return { version: 1, categories, projects };
  }

  function validate(data) {
    return normalize(data) !== null;
  }

  function projectUrl(project) {
    if (!isRecord(project) || typeof project.id !== 'string' || !SLUG.test(project.id)) return 'projets.html';
    const staticPage = `projet-${project.id}.html`;
    if (project.page === staticPage && STATIC_PAGES.has(staticPage)) return staticPage;
    return `projet.html?id=${encodeURIComponent(project.id)}`;
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function makeCard(project, category) {
    const card = makeElement('a', 'project-card');
    card.href = projectUrl(project);
    card.dataset.reveal = '';
    card.dataset.projectId = project.id;

    const imageContainer = makeElement('div', 'project-card-image');
    imageContainer.dataset.imageMotion = '';
    const photo = makeElement('img', 'project-card-photo');
    photo.src = project.cover;
    photo.alt = project.coverAlt;
    photo.loading = 'lazy';
    photo.decoding = 'async';
    imageContainer.append(photo);

    const body = makeElement('div', 'project-card-body');
    body.append(makeElement('p', 'project-card-category', category.label));
    const title = makeElement('h3', 'project-card-title', project.title);
    title.dataset.textReveal = '';
    body.append(title);
    if (project.sample) body.append(makeElement('span', 'project-card-tag', SAMPLE_LABEL));
    card.append(imageContainer, body);
    return card;
  }

  function categoryForNode(node) {
    return node.dataset.category || node.closest('[data-category]')?.dataset.category || document.body?.dataset.category || '';
  }

  function renderHomeHero(data, categoryMap) {
    const selectionTitle = document.querySelector('[data-project-selection-title]');
    if (selectionTitle) selectionTitle.textContent = data.projects.some(project => !project.sample) ? 'Sélection de projets' : 'Études et intentions';
    const hero = document.querySelector('[data-home-project]');
    if (!hero) return;
    const project = data.projects.find(item => item.featured);
    hero.hidden = !project;
    if (!project) return;
    hero.href = projectUrl(project);
    const photo = hero.querySelector('[data-home-project-image]');
    if (photo) { photo.src = project.cover; photo.alt = project.coverAlt; }
    const title = hero.querySelector('[data-home-project-title]');
    if (title) title.textContent = project.title;
    const category = hero.querySelector('[data-home-project-category]');
    if (category) category.textContent = categoryMap.get(project.category).label;
    const status = hero.querySelector('[data-home-project-status]');
    if (status) { status.hidden = !project.sample; status.textContent = project.sample ? SAMPLE_LABEL : ''; }
  }

  function renderLists(data, categoryMap) {
    document.querySelectorAll('[data-project-list]').forEach(list => {
      const category = categoryForNode(list);
      let projects = data.projects.filter(project => !category || project.category === category);
      if (list.dataset.featured === 'true') projects = projects.filter(project => project.featured);
      if (list.dataset.excludeHero === 'true') {
        const hero = data.projects.find(project => project.featured);
        if (hero) projects = projects.filter(project => project.id !== hero.id);
      }
      const limit = Number(list.dataset.limit);
      if (Number.isInteger(limit) && limit > 0) projects = projects.slice(0, limit);
      const fragment = document.createDocumentFragment();
      projects.forEach(project => fragment.append(makeCard(project, categoryMap.get(project.category))));
      list.replaceChildren(fragment);
    });

    document.querySelectorAll('[data-project-count]').forEach(counter => {
      const category = categoryForNode(counter);
      const count = data.projects.filter(project => !category || project.category === category).length;
      counter.textContent = String(count).padStart(2, '0');
    });
    document.querySelectorAll('[data-project-count-label]').forEach(label => {
      const category = categoryForNode(label);
      const count = data.projects.filter(project => !category || project.category === category).length;
      label.textContent = count === 1 ? 'projet' : 'projets';
    });
  }

  function setText(root, selector, text) {
    root.querySelectorAll(selector).forEach(node => { node.textContent = text; });
  }

  function renderMeta(root, project) {
    root.querySelectorAll('[data-project-meta]').forEach(meta => {
      const fragment = document.createDocumentFragment();
      if (project.location.trim()) fragment.append(makeElement('dt', '', 'Lieu'), makeElement('dd', '', project.location));
      if (project.year.trim()) fragment.append(makeElement('dt', '', 'Année'), makeElement('dd', '', project.year));
      if (project.mission) fragment.append(makeElement('dt', '', 'Mission'), makeElement('dd', '', project.mission));
      if (project.stage) fragment.append(makeElement('dt', '', 'Stade'), makeElement('dd', '', project.stage));
      meta.replaceChildren(fragment);
      meta.hidden = !project.location.trim() && !project.year.trim() && !project.mission && !project.stage;
    });
  }

  function renderDossier(root, project) {
    root.querySelectorAll('[data-project-dossier]').forEach(container => {
      const fragment = document.createDocumentFragment();
      for (const [field, label] of DOSSIER_FIELDS) {
        if (!project[field]) continue;
        const section = makeElement('section', 'project-dossier-section');
        section.dataset.reveal = '';
        const heading = makeElement('h3', '', label);
        heading.dataset.textReveal = '';
        section.append(heading);
        project[field].split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(Boolean).forEach(paragraph => {
          section.append(makeElement('p', '', paragraph));
        });
        fragment.append(section);
      }
      container.replaceChildren(fragment);
      container.hidden = !DOSSIER_FIELDS.some(([field]) => project[field]);
    });
  }

  function renderGallery(root, project) {
    root.querySelectorAll('[data-project-gallery]').forEach(gallery => {
      gallery.dataset.gallery = '';
      const fragment = document.createDocumentFragment();
      project.gallery.forEach(item => {
        const link = makeElement('a', 'gallery-item');
        link.href = item.src;
        link.dataset.galleryItem = '';
        link.dataset.imageMotion = '';
        link.dataset.image = item.src;
        link.dataset.alt = item.alt;
        link.dataset.title = project.title;
        link.dataset.description = item.caption;
        link.dataset.reveal = '';
        link.setAttribute('aria-label', `Agrandir l’image : ${item.alt}`);

        const photo = makeElement('img', 'gallery-image');
        photo.src = item.src;
        photo.alt = item.alt;
        photo.loading = 'lazy';
        photo.decoding = 'async';
        link.append(photo);
        if (item.caption) link.append(makeElement('span', 'gallery-caption', item.caption));
        fragment.append(link);
      });
      gallery.replaceChildren(fragment);
      gallery.hidden = project.gallery.length === 0;
    });
  }

  function renderDetail(data, categoryMap) {
    const root = document.querySelector('main[data-project-detail]');
    if (!root) return;

    const id = root.dataset.projectId || new URLSearchParams(window.location.search).get('id') || '';
    const project = SLUG.test(id) ? data.projects.find(item => item.id === id) : undefined;
    root.querySelectorAll('[data-project-content]').forEach(node => { node.hidden = !project; });
    root.querySelectorAll('[data-project-not-found]').forEach(node => { node.hidden = Boolean(project); });
    if (!project) {
      document.title = 'Projet introuvable — Mathias Gouvart Architecte';
      return;
    }

    const category = categoryMap.get(project.category);
    document.title = `${project.title} — Mathias Gouvart Architecte`;
    setText(root, '[data-project-title]', project.title);
    setText(root, '[data-project-summary]', project.summary);
    root.querySelectorAll('[data-project-category]').forEach(node => {
      node.textContent = category.label;
      if (node instanceof HTMLAnchorElement) node.href = category.page;
    });
    root.querySelectorAll('[data-project-description]').forEach(node => {
      const fragment = document.createDocumentFragment();
      project.description.forEach(paragraph => fragment.append(makeElement('p', '', paragraph)));
      node.replaceChildren(fragment);
    });
    root.querySelectorAll('[data-project-status]').forEach(node => {
      node.textContent = project.sample ? SAMPLE_LABEL : '';
      node.hidden = !project.sample;
    });
    root.querySelectorAll('[data-project-cover]').forEach(photo => {
      if (photo instanceof HTMLImageElement) {
        photo.src = project.cover;
        photo.alt = project.coverAlt;
      }
    });
    renderDossier(root, project);
    renderMeta(root, project);
    renderGallery(root, project);

    const index = data.projects.findIndex(item => item.id === project.id);
    const next = data.projects[(index + 1) % data.projects.length];
    root.querySelectorAll('[data-project-next]').forEach(link => {
      link.hidden = data.projects.length < 2;
      if (!next) return;
      link.href = projectUrl(next);
      const title = link.querySelector('[data-project-next-title]');
      if (title) title.textContent = next.title;
      else link.textContent = `Projet suivant : ${next.title}`;
    });
  }

  function render(rawData) {
    const data = normalize(rawData);
    if (!data) return false;
    const signature = JSON.stringify(data);
    if (signature === lastSignature) return false;

    const categoryMap = new Map(data.categories.map(category => [category.id, category]));
    renderHomeHero(data, categoryMap);
    renderLists(data, categoryMap);
    renderDetail(data, categoryMap);
    lastSignature = signature;
    document.dispatchEvent(new CustomEvent('site:content-updated'));
    return true;
  }

  async function refresh() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(new URL('content/projects.json', document.baseURI), {
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      if (response.ok) render(await response.json());
    } catch (_) {
      // Keep the embedded content and static HTML available when offline.
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function start() {
    const bootstrap = document.getElementById('project-bootstrap');
    if (bootstrap?.type === 'application/json') {
      try { render(JSON.parse(bootstrap.textContent)); } catch (_) { /* Preserve the static content. */ }
    }
    refresh();
  }

  window.ArchitectProjects = Object.freeze({ validate, projectUrl, render });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
