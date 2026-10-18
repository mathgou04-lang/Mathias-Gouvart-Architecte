/* Local content preparation. No authentication, remote upload or automatic publication. */
(() => {
  'use strict';

  const encoder = new TextEncoder();
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let k = 0; k < 8; k += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    crcTable[n] = value >>> 0;
  }
  function crc32(bytes) {
    let value = 0xffffffff;
    for (const byte of bytes) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
    return (value ^ 0xffffffff) >>> 0;
  }
  function zipHeader(size, fields) {
    const bytes = new Uint8Array(size);
    const view = new DataView(bytes.buffer);
    for (const [offset, value, width] of fields) {
      if (width === 4) view.setUint32(offset, value, true);
      else view.setUint16(offset, value, true);
    }
    return bytes;
  }
  async function createZip(entries) {
    if (!Array.isArray(entries) || !entries.length || entries.length > 65535) throw new Error('Nombre de fichiers invalide pour l’archive.');
    const localParts = [];
    const centralParts = [];
    const seen = new Set();
    let offset = 0;
    let centralSize = 0;
    for (const entry of entries) {
      const name = String(entry.name || '');
      if (!name || name.startsWith('/') || name.includes('\\') || name.split('/').some(part => !part || part === '.' || part === '..') || seen.has(name)) throw new Error('Nom de fichier invalide dans l’archive.');
      seen.add(name);
      const nameBytes = encoder.encode(name);
      const bytes = typeof entry.data === 'string' ? encoder.encode(entry.data) : entry.data instanceof Uint8Array ? entry.data : new Uint8Array(await entry.data.arrayBuffer());
      if (nameBytes.length > 65535 || bytes.length > 0xffffffff || offset + 30 + nameBytes.length + bytes.length > 0xffffffff) throw new Error('Cette archive dépasse la taille prise en charge.');
      const crc = crc32(bytes);
      const local = zipHeader(30, [[0,0x04034b50,4],[4,20,2],[6,0x800,2],[8,0,2],[10,0,2],[12,33,2],[14,crc,4],[18,bytes.length,4],[22,bytes.length,4],[26,nameBytes.length,2],[28,0,2]]);
      const central = zipHeader(46, [[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x800,2],[10,0,2],[12,0,2],[14,33,2],[16,crc,4],[20,bytes.length,4],[24,bytes.length,4],[28,nameBytes.length,2],[30,0,2],[32,0,2],[34,0,2],[36,0,2],[38,0,4],[42,offset,4]]);
      localParts.push(local, nameBytes, bytes);
      centralParts.push(central, nameBytes);
      centralSize += central.length + nameBytes.length;
      offset += local.length + nameBytes.length + bytes.length;
    }
    if (offset + centralSize + 22 > 0xffffffff) throw new Error('Cette archive dépasse la taille prise en charge.');
    const end = zipHeader(22, [[0,0x06054b50,4],[4,0,2],[6,0,2],[8,entries.length,2],[10,entries.length,2],[12,centralSize,4],[16,offset,4],[20,0,2]]);
    return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
  }
  globalThis.ArchitectEditorZip = createZip;
  if (typeof document === 'undefined') return;

  const categories = [
    { id: 'constructions-neuves', label: 'Constructions neuves', page: 'projets-neufs.html' },
    { id: 'renovations-transformations', label: 'Rénovations / Transformations', page: 'projets-renovations.html' }
  ];
  const categoryIds = new Set(categories.map(category => category.id));
  const imageExtensions = /\.(?:jpe?g|png|webp|avif)$/i;
  const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
  const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const maxImageSize = 10 * 1024 * 1024;
  const maxNewImagesSize = 100 * 1024 * 1024;
  const element = id => document.getElementById(`editor-${id}`);
  const form = element('form');
  const errorBox = element('error');
  const status = element('status');
  const imageInput = element('images');
  const uploadedFiles = new Map();
  const previewURLs = new Map();
  const allObjectURLs = new Set();
  let data = { version: 1, categories, projects: [] };
  let gallery = [];
  let coverIndex = 0;
  let editingId = null;
  let formDirty = false;
  let selectionDirty = false;
  let autoId = true;
  let ready = false;
  let importing = false;
  let loadingImages = false;

  function node(tag, className, text) {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text !== undefined) result.textContent = text;
    return result;
  }
  function setError(message) {
    errorBox.textContent = message;
    errorBox.hidden = !message;
  }
  function tell(message) { status.textContent = message; }
  function slug(value) {
    return value.toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-$/, '') || 'projet';
  }
  function validAsset(value) {
    return typeof value === 'string' && value.length <= 250 && /^assets\/[a-zA-Z0-9_./-]+$/.test(value) && !value.split('/').some(part => !part || part === '.' || part === '..') && imageExtensions.test(value);
  }
  function textValue(value, label, max, required = false) {
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error(`${label} : texte ${required ? 'obligatoire ou trop long' : 'invalide ou trop long'}.`);
    return value.trim();
  }
  function validateProject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Une fiche de projet est invalide.');
    const id = textValue(value.id, 'Identifiant', 80, true);
    if (!idPattern.test(id)) throw new Error(`« ${id} » : l’identifiant doit contenir uniquement des lettres minuscules, des chiffres et des tirets.`);
    if (!categoryIds.has(value.category)) throw new Error(`« ${id} » : choisissez l’une des deux catégories du site.`);
    if (!Array.isArray(value.description) || !value.description.length || value.description.length > 40) throw new Error(`« ${id} » : ajoutez entre 1 et 40 paragraphes de description.`);
    const description = value.description.map(paragraph => textValue(paragraph, 'Paragraphe', 5000, true));
    if (description.join('\n\n').length > 30000) throw new Error(`« ${id} » : la description dépasse 30 000 caractères.`);
    if (!Array.isArray(value.gallery) || !value.gallery.length || value.gallery.length > 40) throw new Error(`« ${id} » : ajoutez entre 1 et 40 photographies.`);
    const checkedGallery = value.gallery.map(image => {
      if (!image || !validAsset(image.src)) throw new Error(`« ${id} » : une image doit utiliser un chemin sûr dans assets/ et un format JPG, PNG, WebP ou AVIF.`);
      return { src: image.src, alt: textValue(image.alt, 'Description de l’image', 500, true), caption: textValue(image.caption ?? '', 'Légende', 500) };
    });
    if (!validAsset(value.cover) || !checkedGallery.some(image => image.src === value.cover)) throw new Error(`« ${id} » : choisissez une couverture parmi les images du projet.`);
    if (typeof value.featured !== 'boolean' || typeof value.sample !== 'boolean') throw new Error(`« ${id} » : les options de mise en avant et de démonstration sont invalides.`);
    const project = {
      id, title: textValue(value.title, 'Nom du projet', 120, true), category: value.category,
      summary: textValue(value.summary, 'Présentation courte', 500, true), description,
      location: textValue(value.location ?? '', 'Localisation', 120), year: textValue(value.year ?? '', 'Année', 40),
      context: textValue(value.context === undefined ? '' : value.context, 'Contexte', 10000),
      approach: textValue(value.approach === undefined ? '' : value.approach, 'Parti architectural', 10000),
      details: textValue(value.details === undefined ? '' : value.details, 'Matières et détails', 10000),
      mission: textValue(value.mission === undefined ? '' : value.mission, 'Mission', 120),
      stage: textValue(value.stage === undefined ? '' : value.stage, 'Stade', 80),
      sample: value.sample, featured: value.featured, cover: value.cover,
      coverAlt: textValue(value.coverAlt || checkedGallery.find(image => image.src === value.cover).alt, 'Description de la couverture', 500, true),
      gallery: checkedGallery
    };
    if (value.page !== undefined) {
      if (typeof value.page !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*\.html$/.test(value.page) || value.page.length > 120) throw new Error(`« ${id} » : le nom de page est invalide.`);
      project.page = value.page;
    }
    return project;
  }
  function validateData(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.projects) || value.projects.length > 200) throw new Error('Le JSON doit contenir version: 1 et une liste projects de 200 projets maximum.');
    if (!Array.isArray(value.categories) || value.categories.length !== 2 || !categories.every(category => value.categories.some(item => item && item.id === category.id))) throw new Error('Le JSON doit conserver les deux catégories du site.');
    const projects = value.projects.map(validateProject);
    const ids = new Set();
    for (const project of projects) {
      if (ids.has(project.id)) throw new Error(`L’identifiant « ${project.id} » est utilisé par plusieurs projets.`);
      ids.add(project.id);
    }
    return { version: 1, categories: categories.map(category => ({ ...category })), projects };
  }
  function imageURL(src) {
    if (!uploadedFiles.has(src)) return src;
    if (!previewURLs.has(src)) {
      const url = URL.createObjectURL(uploadedFiles.get(src));
      previewURLs.set(src, url);
      allObjectURLs.add(url);
    }
    return previewURLs.get(src);
  }
  function markFormDirty() { formDirty = true; updateButtons(); }
  function updateButtons() {
    element('new').disabled = !ready || importing || loadingImages;
    element('import').disabled = !ready || importing || loadingImages;
    element('export').disabled = !ready || !data.projects.length || importing || loadingImages;
    imageInput.disabled = loadingImages;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = loadingImages;
  }
  function mayDiscardForm() {
    return !formDirty || window.confirm('Cette fiche contient des modifications non enregistrées. Fermer la fiche sans les conserver ?');
  }
  function releaseStagedPreviews() {
    for (const item of gallery) if (item._previewURL) {
      URL.revokeObjectURL(item._previewURL);
      allObjectURLs.delete(item._previewURL);
    }
  }
  function pruneUploads() {
    const used = new Set(data.projects.flatMap(project => project.gallery.map(image => image.src)));
    for (const image of gallery) if (image.src) used.add(image.src);
    for (const path of uploadedFiles.keys()) if (!used.has(path)) {
      uploadedFiles.delete(path);
      if (previewURLs.has(path)) {
        URL.revokeObjectURL(previewURLs.get(path));
        allObjectURLs.delete(previewURLs.get(path));
        previewURLs.delete(path);
      }
    }
  }
  function closeForm() {
    form.hidden = true;
    element('empty').hidden = false;
    formDirty = false;
    editingId = null;
    releaseStagedPreviews();
    gallery = [];
    pruneUploads();
    renderList();
    updateButtons();
  }
  function renderList() {
    const list = element('list');
    list.replaceChildren();
    element('count').textContent = `${data.projects.length} projet${data.projects.length === 1 ? '' : 's'}`;
    if (!data.projects.length) list.append(node('p', 'editor-help', 'Votre sélection est vide. Créez votre premier projet pour commencer.'));
    for (const project of data.projects) {
      const card = node('article', `editor-card${project.id === editingId ? ' is-selected' : ''}`);
      const image = node('img', 'editor-card-image');
      image.src = imageURL(project.cover);
      image.alt = project.coverAlt;
      image.loading = 'lazy';
      const content = node('div', 'editor-card-content');
      content.append(node('p', 'editor-card-category', categories.find(category => category.id === project.category).label));
      content.append(node('h3', 'editor-card-title', project.title));
      const options = [`${project.gallery.length} image${project.gallery.length === 1 ? '' : 's'}`];
      if (project.featured) options.push('À l’accueil');
      if (project.sample) options.push('Étude fictive');
      content.append(node('p', 'editor-card-meta', options.join(' · ')));
      const actions = node('div', 'editor-card-actions');
      const edit = node('button', 'editor-card-action', 'Modifier');
      edit.type = 'button';
      edit.setAttribute('aria-label', `Modifier ${project.title}`);
      edit.addEventListener('click', () => { if (mayDiscardForm()) openForm(project); });
      const remove = node('button', 'editor-card-action editor-card-action-delete', 'Supprimer');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Supprimer ${project.title}`);
      remove.addEventListener('click', () => {
        if (project.id === editingId && !mayDiscardForm()) return;
        if (!window.confirm(`Supprimer « ${project.title} » de la sélection ? Le site public restera inchangé jusqu’à la publication des fichiers exportés.`)) return;
        data.projects = data.projects.filter(item => item.id !== project.id);
        selectionDirty = true;
        if (editingId === project.id) closeForm();
        pruneUploads();
        renderList();
        updateButtons();
        setError('');
        tell(`« ${project.title} » a été retiré de la sélection. Exportez les fichiers pour conserver cette modification.`);
      });
      actions.append(edit, remove);
      content.append(actions);
      card.append(image, content);
      list.append(card);
    }
  }
  function openForm(project = null) {
    releaseStagedPreviews();
    form.reset();
    setError('');
    editingId = project ? project.id : null;
    autoId = !project;
    const values = project || { title: '', id: '', category: 'constructions-neuves', summary: '', description: [], location: '', year: '', context: '', approach: '', details: '', mission: '', stage: '', featured: false, sample: false, gallery: [] };
    for (const field of ['title', 'id', 'category', 'summary', 'location', 'year', 'context', 'approach', 'details', 'mission', 'stage']) element(field).value = values[field] || '';
    element('description').value = values.description.join('\n\n');
    element('featured').checked = values.featured;
    element('sample').checked = values.sample;
    gallery = values.gallery.map(image => ({ ...image }));
    coverIndex = Math.max(0, gallery.findIndex(image => image.src === values.cover));
    element('form-title').textContent = project ? 'Modifier le projet' : 'Nouveau projet';
    form.hidden = false;
    element('empty').hidden = true;
    formDirty = false;
    renderGallery();
    renderList();
    updateButtons();
    element('title').focus({ preventScroll: true });
    form.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    tell(project ? `Modification de « ${project.title} ».` : 'Nouvelle fiche. Ajoutez vos textes et au moins une photographie.');
  }
  function renderGallery() {
    const container = element('gallery');
    container.replaceChildren();
    element('gallery-count').textContent = `${gallery.length} image${gallery.length === 1 ? '' : 's'}`;
    gallery.forEach((item, index) => {
      const row = node('article', 'editor-gallery-item');
      const image = node('img', 'editor-gallery-image');
      image.src = item._previewURL || imageURL(item.src);
      image.alt = item.alt || `Photographie ${index + 1}`;
      const details = node('div', 'editor-gallery-details');
      for (const [key, label, required] of [['alt', 'Description de l’image *', true], ['caption', 'Légende (facultative)', false]]) {
        const field = node('div', 'editor-field');
        const input = node('input');
        input.id = `editor-image-${index}-${key}`;
        input.type = 'text';
        input.maxLength = 500;
        input.required = required;
        input.value = item[key] || '';
        const inputLabel = node('label', '', `${label} — image ${index + 1}`);
        inputLabel.htmlFor = input.id;
        input.addEventListener('input', () => { item[key] = input.value; if (key === 'alt') image.alt = input.value; markFormDirty(); });
        field.append(inputLabel, input);
        details.append(field);
      }
      const controls = node('div', 'editor-gallery-controls');
      const coverLabel = node('label', 'editor-check');
      const radio = node('input');
      radio.type = 'radio';
      radio.name = 'gallery-cover';
      radio.value = String(index);
      radio.checked = coverIndex === index;
      radio.setAttribute('aria-label', `Choisir l’image ${index + 1} comme couverture`);
      radio.addEventListener('change', () => { coverIndex = index; markFormDirty(); });
      coverLabel.append(radio, node('span', '', 'Image de couverture'));
      const remove = node('button', 'editor-card-action editor-card-action-delete', 'Retirer l’image');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Retirer l’image ${index + 1}`);
      remove.addEventListener('click', () => {
        if (item._previewURL) { URL.revokeObjectURL(item._previewURL); allObjectURLs.delete(item._previewURL); }
        gallery.splice(index, 1);
        if (coverIndex > index) coverIndex -= 1;
        else if (coverIndex === index) coverIndex = 0;
        markFormDirty();
        renderGallery();
      });
      controls.append(coverLabel, remove);
      details.append(controls);
      row.append(image, details);
      container.append(row);
    });
  }
  function uniqueFilename(file) {
    const lastDot = file.name.lastIndexOf('.');
    const extension = file.name.slice(lastDot + 1).toLowerCase();
    const base = slug(file.name.slice(0, lastDot)).slice(0, 50);
    const random = new Uint32Array(2);
    crypto.getRandomValues(random);
    return `${base}-${Array.from(random, value => value.toString(16).padStart(8, '0')).join('')}.${extension}`;
  }
  function decodeImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => image.naturalWidth && image.naturalHeight ? resolve() : reject(new Error('Image vide.'));
      image.onerror = () => reject(new Error('Le navigateur ne parvient pas à lire cette image.'));
      image.src = url;
    });
  }
  async function addImages(files) {
    setError('');
    loadingImages = true;
    updateButtons();
    const errors = [];
    let added = 0;
    let stagedSize = gallery.reduce((sum, image) => sum + (image._file ? image._file.size : 0), 0);
    const storedSize = Array.from(uploadedFiles.values()).reduce((sum, file) => sum + file.size, 0);
    for (const file of files) {
      if (gallery.length >= 40) { errors.push('40 images maximum par projet.'); break; }
      if (!imageExtensions.test(file.name) || (file.type && !allowedMimeTypes.has(file.type))) { errors.push(`${file.name} : format non pris en charge.`); continue; }
      if (!file.size || file.size > maxImageSize) { errors.push(`${file.name} : choisissez une image de moins de 10 Mo.`); continue; }
      if (storedSize + stagedSize + file.size > maxNewImagesSize) { errors.push('Les nouvelles images dépassent 100 Mo. Exportez votre sélection avant de préparer davantage de projets.'); break; }
      const url = URL.createObjectURL(file);
      try {
        await decodeImage(url);
        allObjectURLs.add(url);
        gallery.push({ _file: file, _filename: uniqueFilename(file), _previewURL: url, alt: '', caption: '' });
        stagedSize += file.size;
        added += 1;
      } catch (error) {
        URL.revokeObjectURL(url);
        errors.push(`${file.name} : ${error.message}`);
      }
    }
    loadingImages = false;
    imageInput.value = '';
    if (added) markFormDirty();
    renderGallery();
    updateButtons();
    if (errors.length) setError(errors.join(' '));
    tell(`${added} photographie${added === 1 ? '' : 's'} ajoutée${added === 1 ? '' : 's'}. Renseignez les descriptions et enregistrez la fiche.`);
  }
  form.addEventListener('input', markFormDirty);
  form.addEventListener('change', markFormDirty);
  element('title').addEventListener('input', () => { if (autoId) element('id').value = slug(element('title').value); });
  element('id').addEventListener('input', () => { autoId = false; });
  imageInput.addEventListener('change', () => { if (imageInput.files.length) addImages(Array.from(imageInput.files)); });
  element('new').addEventListener('click', () => { if (mayDiscardForm()) openForm(); });
  element('cancel').addEventListener('click', () => { if (mayDiscardForm()) { closeForm(); tell('Fiche fermée. Votre sélection de projets reste disponible pour l’export.'); } });
  form.addEventListener('submit', event => {
    event.preventDefault();
    setError('');
    if (loadingImages) return;
    try {
      const id = element('id').value.trim();
      if (data.projects.some(project => project.id === id && project.id !== editingId)) throw new Error('Cet identifiant existe déjà. Choisissez un identifiant différent.');
      if (!gallery.length) throw new Error('Ajoutez au moins une photographie au projet.');
      const preparedUploads = [];
      const savedGallery = gallery.map(item => {
        const src = item._file ? `assets/projets/${id}/${item._filename}` : item.src;
        if (item._file) preparedUploads.push([src, item._file]);
        return { src, alt: item.alt.trim(), caption: item.caption.trim() };
      });
      const oldProject = data.projects.find(project => project.id === editingId);
      const candidate = {
        id, title: element('title').value, category: element('category').value,
        summary: element('summary').value,
        description: element('description').value.trim().split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(Boolean),
        location: element('location').value, year: element('year').value,
        context: element('context').value, approach: element('approach').value, details: element('details').value,
        mission: element('mission').value, stage: element('stage').value,
        featured: element('featured').checked, sample: element('sample').checked,
        cover: savedGallery[coverIndex].src, coverAlt: savedGallery[coverIndex].alt,
        gallery: savedGallery
      };
      if (oldProject && oldProject.id === id && oldProject.page) candidate.page = oldProject.page;
      const project = validateProject(candidate);
      for (const [path, file] of preparedUploads) uploadedFiles.set(path, file);
      if (oldProject) data.projects[data.projects.indexOf(oldProject)] = project;
      else data.projects.push(project);
      selectionDirty = true;
      formDirty = false;
      editingId = id;
      releaseStagedPreviews();
      gallery = project.gallery.map(image => ({ ...image }));
      pruneUploads();
      coverIndex = gallery.findIndex(image => image.src === project.cover);
      renderGallery();
      renderList();
      updateButtons();
      element('form-title').textContent = 'Modifier le projet';
      tell(`« ${project.title} » est enregistré dans la sélection. Exportez les fichiers pour conserver votre travail et le publier.`);
    } catch (error) { setError(error.message); }
  });
  element('import').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    if ((formDirty || selectionDirty) && !window.confirm('L’import remplacera la sélection actuelle. Avez-vous exporté les modifications que vous souhaitez conserver ?')) { event.target.value = ''; return; }
    importing = true;
    updateButtons();
    setError('');
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Le fichier JSON doit faire moins de 2 Mo.');
      const imported = validateData(JSON.parse(await file.text()));
      data = imported;
      ready = true;
      selectionDirty = true;
      closeForm();
      tell(`${data.projects.length} projet${data.projects.length === 1 ? '' : 's'} importé${data.projects.length === 1 ? '' : 's'}. Les images référencées doivent déjà exister sur le site ou être ajoutées séparément.`);
    } catch (error) { setError(error instanceof SyntaxError ? 'Ce fichier ne contient pas un JSON valide.' : error.message); }
    importing = false;
    event.target.value = '';
    updateButtons();
  });
  element('export').addEventListener('click', async () => {
    setError('');
    if (formDirty) { setError('Enregistrez d’abord la fiche ouverte avec « Enregistrer dans la sélection », ou fermez-la sans conserver les modifications.'); return; }
    const button = element('export');
    button.disabled = true;
    try {
      const checked = validateData(data);
      if (!checked.projects.length) throw new Error('Ajoutez au moins un projet avant d’exporter.');
      const entries = [{ name: 'content/projects.json', data: `${JSON.stringify(checked, null, 2)}\n` }];
      const imagePaths = new Set(checked.projects.flatMap(project => project.gallery.map(image => image.src)));
      for (const path of imagePaths) if (uploadedFiles.has(path)) entries.push({ name: path, data: uploadedFiles.get(path) });
      tell('Préparation de l’archive…');
      const blob = await createZip(entries);
      const url = URL.createObjectURL(blob);
      allObjectURLs.add(url);
      const link = node('a');
      link.href = url;
      link.download = `mathias-gouvart-projets-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => { URL.revokeObjectURL(url); allObjectURLs.delete(url); }, 60000);
      selectionDirty = false;
      tell(`Archive prête : ${checked.projects.length} projet${checked.projects.length === 1 ? '' : 's'} et ${entries.length - 1} nouvelle${entries.length === 2 ? '' : 's'} image${entries.length === 2 ? '' : 's'}. Vérifiez le téléchargement, puis suivez les étapes de publication ci-dessous.`);
    } catch (error) { setError(`Export impossible : ${error.message}`); }
    updateButtons();
  });
  window.addEventListener('beforeunload', event => {
    if (formDirty || selectionDirty || loadingImages) { event.preventDefault(); event.returnValue = ''; }
  });
  window.addEventListener('pagehide', event => {
    if (!event.persisted) for (const url of allObjectURLs) URL.revokeObjectURL(url);
  });
  async function load() {
    updateButtons();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('content/projects.json', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
      if (!response.ok) throw new Error(`Le fichier des projets ne répond pas (HTTP ${response.status}).`);
      data = validateData(await response.json());
      tell('Vos projets sont chargés. Sélectionnez une fiche ou créez un nouveau projet.');
    } catch (error) {
      const reason = error.name === 'AbortError' ? 'le serveur a mis trop de temps à répondre.' : error.message;
      setError(`Chargement impossible : ${reason} Vous pouvez importer votre fichier projects.json ou créer une nouvelle sélection. Ouvrez cet outil depuis le site ou un serveur local.`);
      tell('Aucun projet chargé. L’import JSON et la création restent disponibles.');
    }
    clearTimeout(timeout);
    ready = true;
    renderList();
    updateButtons();
  }
  load();
})();
