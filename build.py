#!/usr/bin/env python3
"""Generate the static portfolio with Python's standard library only."""
import hashlib
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = json.loads((ROOT / 'content/projects.json').read_text())
SITE = json.loads((ROOT / 'content/site.json').read_text())
CATEGORIES = {c['id']: c for c in DATA['categories']}
PUBLIC = 'https://mathgou04-lang.github.io/Mathias-Gouvart-Architecte/'
OUTPUT = []


def e(value):
    return html.escape(str(value), quote=True)


def asset(name):
    return name + '?v=' + hashlib.sha256((ROOT / name).read_bytes()).hexdigest()[:12]


def arrow():
    return '<svg class="arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" stroke-width="1.2"/></svg>'


def link(href, text, cls='text-link'):
    return f'<a class="{cls}" href="{e(href)}">{e(text)}{arrow()}</a>'


def project_url(p):
    return p.get('page') or 'projet.html?id=' + p['id']


def card(p):
    tag = '<span class="project-card-tag">Projet de démonstration</span>' if p['sample'] else ''
    return f'''<a class="project-card" href="{e(project_url(p))}" data-reveal>
      <div class="project-card-image"><img class="project-card-photo" src="{e(p['cover'])}" alt="{e(p['coverAlt'])}" loading="lazy" decoding="async"></div>
      <div class="project-card-body"><p class="project-card-category">{e(CATEGORIES[p['category']]['label'])}</p><h3 class="project-card-title">{e(p['title'])}</h3>{tag}{arrow()}</div></a>'''


def brand_markup():
    return f'<img class="brand-symbol" src="{asset("assets/logo-monogramme.webp")}" width="64" height="64" alt="" decoding="async"><span class="brand-wordmark"><span class="brand-name">Mathias Gouvart</span><span class="brand-profession">Architecte</span></span>'


def header(active):
    def current(key):
        return ' aria-current="page"' if active == key else ''
    return f'''<a class="skip-link" href="#contenu">Aller au contenu</a>
    <header class="site-header"><a class="brand" href="index.html" aria-label="Mathias Gouvart Architecte — Accueil">{brand_markup()}</a>
    <button class="menu-toggle" aria-controls="navigation" aria-expanded="false" hidden><span class="menu-label">Menu</span><span class="menu-icon" aria-hidden="true"></span></button>
    <nav id="navigation" class="navigation" aria-label="Navigation principale">
      <a href="index.html"{current('home')}>Accueil</a><a href="bureau.html"{current('studio')}>Le bureau</a>
      <div class="nav-projects"><div class="nav-projects-heading"><a href="projets.html"{current('projects')}>Projets</a><button class="project-toggle" data-project-toggle aria-expanded="false" aria-controls="project-submenu" aria-label="Afficher les catégories de projets"><span aria-hidden="true">⌄</span></button></div>
      <div id="project-submenu" class="project-submenu"><a href="projets-neufs.html">Constructions neuves</a><a href="projets-renovations.html">Rénovations / Transformations</a></div></div>
      <a class="nav-contact" href="contact.html"{current('contact')}>Contact{arrow()}</a>
    </nav></header>'''


def footer(cta=True):
    invitation = f'''<section class="contact-invitation section-pad" data-reveal><p class="eyebrow">Chaque projet commence par une rencontre</p><div class="invitation-row"><h2>Et si nous parlions<br>de votre projet ?</h2>{link('contact.html', 'Commençons un échange', 'button button-light')}</div></section>''' if cta else ''
    return invitation + f'''<footer class="site-footer section-pad"><div class="footer-top"><a class="brand footer-brand" href="index.html">{brand_markup()}</a><div class="footer-contact"><a href="mailto:{e(SITE['email'])}">{e(SITE['email'])}</a><a href="tel:{e(SITE['phoneLink'])}">{e(SITE['phone'])}</a></div><nav aria-label="Navigation de bas de page"><a href="bureau.html">Le bureau</a><a href="projets.html">Les projets</a><a href="contact.html">Contact</a></nav></div><div class="footer-bottom"><span>© 2026 Mathias Gouvart Architecte</span><span>Architecture & espaces de vie</span><a href="#haut">Retour en haut ↑</a></div></footer>'''


def page(path, title, desc, body, active='projects', main_attrs='', contact=False, cta=True):
    bootstrap = json.dumps(DATA, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    content = f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#151515">
<title>{e(title)} — Mathias Gouvart Architecte</title><meta name="description" content="{e(desc)}"><link rel="icon" href="{asset("assets/favicon.png")}" type="image/png"><link rel="stylesheet" href="{asset('styles.css')}">
<meta property="og:title" content="{e(title)} — Mathias Gouvart Architecte"><meta property="og:description" content="{e(desc)}"><meta property="og:image" content="{PUBLIC}assets/architecture-hero.webp"><meta property="og:type" content="website"><meta property="og:locale" content="fr_BE">
<script>document.documentElement.classList.add('js');</script>
<script id="project-bootstrap" type="application/json">{bootstrap}</script><script src="{asset('project-data.js')}" defer></script><script src="{asset('script.js')}" defer></script><script src="{asset('motion.js')}" defer></script>{f'<script src="{asset("contact.js")}" defer></script>' if contact else ''}</head>
<body id="haut" class="page-{active}">{header(active)}<main id="contenu" {main_attrs}>{body}</main>{footer(cta)}<div class="page-transition" data-page-transition aria-hidden="true"></div></body></html>'''
    (ROOT / path).write_text(content)
    OUTPUT.append(path)


def gallery_dialog():
    return '''<dialog id="study-dialog" class="gallery-dialog" aria-labelledby="study-title"><button class="dialog-close" data-close-dialog aria-label="Fermer la galerie">Fermer <span aria-hidden="true">×</span></button><div class="dialog-image-wrap"><img id="study-image" src="assets/architecture-hero.webp" alt=""></div><div class="dialog-bottom"><div><h2 id="study-title">Le projet en images</h2><p id="study-description"></p></div><div class="gallery-controls"><button data-gallery-step="prev" aria-label="Image précédente">←</button><span data-gallery-counter></span><button data-gallery-step="next" aria-label="Image suivante">→</button></div></div></dialog>'''


def home():
    slides = [('assets/architecture-hero.webp', 'Lumière & volumes', 'Un intérieur lumineux en pierre claire et bois, image d’ambiance.'), ('assets/architecture-exterior.webp', 'Architecture & paysage', 'Une maison contemporaine ouverte sur un jardin, image d’ambiance.'), ('assets/architecture-stair.webp', 'Matières & détails', 'Un escalier sculptural aux matières sobres, image d’ambiance.')]
    slide_html = ''.join(f'<div class="hero-slide {"is-active" if i == 0 else ""}" data-caption="{e(caption)}" aria-hidden="{str(i != 0).lower()}"><img src="{src}" alt="{e(alt)}" width="1536" height="1024" decoding="async" {"fetchpriority=high" if i == 0 else "loading=lazy"}></div>' for i, (src, caption, alt) in enumerate(slides))
    dots = ''.join(f'<button class="slide-dot {"is-active" if i == 0 else ""}" data-slide-dot="{i}" aria-label="Afficher le visuel {i + 1}" aria-pressed="{str(i == 0).lower()}"></button>' for i in range(3))
    body = f'''<section class="home-hero"><div class="hero-copy"><p class="eyebrow" data-intro>Mathias Gouvart — Architecte</p><h1 data-intro data-delay="100">Des lieux<br>à votre <em>mesure.</em></h1><p class="hero-description" data-intro data-delay="220">Construire, transformer, révéler.<br>Une architecture qui prend le temps de comprendre votre manière de vivre.</p><div data-intro data-delay="320">{link('projets.html', 'Découvrir les projets', 'button button-dark')}</div><a class="hero-scroll" href="#selection"><span class="scroll-line" aria-hidden="true"></span>Explorer le bureau</a></div>
    <div class="hero-slider" aria-label="Images d’ambiance architecturales" aria-roledescription="diaporama" data-intro="image"><div id="hero-slides" class="hero-slides">{slide_html}</div><div class="hero-photo-note">Images d’ambiance · projets de démonstration</div><div class="hero-controls"><div class="slide-caption"><span data-slide-current>01</span><span class="caption-rule"></span><span data-slide-caption>Lumière & volumes</span></div><div class="slide-buttons"><button data-slide="prev" aria-label="Visuel précédent">←</button><button data-autoplay aria-pressed="false"><span data-autoplay-label>Pause</span></button><button data-slide="next" aria-label="Visuel suivant">→</button></div><div class="slide-dots">{dots}</div><div class="slide-progress"><span data-slide-progress></span></div></div><p class="sr-only" id="slide-status" aria-live="polite" aria-atomic="true"></p></div></section>
    <section class="intro-section section-pad" id="selection"><div class="section-kicker" data-reveal><span class="eyebrow">01 / Une vision</span><span class="tiny-label">Le lieu. La lumière. L’essentiel.</span></div><div class="intro-grid"><h2 data-reveal>Donner du sens<br>à chaque <em>espace.</em></h2><div class="intro-text" data-reveal><p>Un projet commence par une écoute attentive. Vos envies, les qualités d’un lieu et les usages du quotidien dessinent les premières lignes d’une architecture personnelle.</p><p>De la construction neuve à la transformation de l’existant, le bureau recherche un équilibre entre clarté des volumes, qualité des matières et soin du détail.</p>{link('bureau.html', 'Rencontrer le bureau')}</div></div></section>
    <section class="projects-section section-pad"><div class="section-heading" data-reveal><div><p class="eyebrow">02 / Les projets</p><h2>Des espaces,<br>des <em>possibles.</em></h2></div>{link('projets.html', 'Tous les projets')}</div><div class="project-grid" data-project-list data-featured="true" data-limit="3">{''.join(card(p) for p in [p for p in DATA['projects'] if p['featured']][:3])}</div><p class="sample-note">Les projets signalés comme démonstrations sont des exemples fictifs, en attendant les réalisations du bureau.</p></section>
    <section class="approach-section section-pad"><div class="approach-photo" data-reveal="image" data-parallax><img src="assets/project-renovation-detail.webp" alt="Détail de matières en pierre et bois — image d’ambiance." loading="lazy" data-parallax-layer></div><div class="approach-copy"><p class="eyebrow" data-reveal>03 / Le dialogue comme point de départ</p><h2 data-reveal>Une rencontre.<br>Une direction.<br><em>Votre projet.</em></h2><p data-reveal>Réfléchir ensemble aux possibilités d’un lieu. Préciser ce qui compte pour vous. Faire émerger une réponse architecturale cohérente, jusque dans les détails.</p><div data-reveal>{link('contact.html', 'Parlons de vos envies')}</div></div></section>'''
    page('index.html', 'Accueil', 'Mathias Gouvart Architecte : constructions neuves, rénovations et transformations. Une architecture attentive aux lieux et à votre manière de vivre.', body, 'home')


def studio():
    portrait = SITE.get('portrait')
    if portrait and re.fullmatch(r'assets/(?:[a-zA-Z0-9_-]+/)*[a-zA-Z0-9_-]+\.(?:webp|png|jpe?g|avif)', portrait):
        visual = f'<img src="{e(portrait)}" alt="{e(SITE["portraitAlt"])}" class="portrait-photo">'
    else:
        visual = '<div class="portrait-placeholder"><img class="portrait-logo" src="assets/logo-monogramme.webp" alt="Logo de Mathias Gouvart Architecte" width="512" height="512"><div><span class="eyebrow">Mathias Gouvart</span><p>Portrait à venir</p></div></div>'
    bio = ''.join(f'<p>{e(p)}</p>' for p in SITE['biography'])
    body = f'''<section class="page-heading section-pad"><p class="eyebrow" data-intro>Le bureau</p><h1 data-intro data-delay="100">L’architecture<br>commence par <em>vous.</em></h1><p class="page-lead" data-intro data-delay="220">Une écoute, un regard, une attention portée à ce qui fait la singularité de votre projet.</p></section><section class="studio-section section-pad"><div class="portrait-block" data-reveal="image">{visual}</div><div class="studio-copy" data-reveal><p class="eyebrow">Une approche personnelle</p><h2>Mathias Gouvart<span class="studio-role">Architecte</span></h2><div class="prose">{bio}</div>{link('contact.html', 'Faire connaissance')}</div></section><section class="values-section section-pad"><p class="eyebrow" data-reveal>Du premier échange au détail</p><div class="values-grid"><article data-reveal><span class="value-number">01</span><h3>Écouter</h3><p>Comprendre votre quotidien, vos besoins et vos priorités pour poser les bonnes questions.</p></article><article data-reveal><span class="value-number">02</span><h3>Concevoir</h3><p>Mettre en relation le lieu, les volumes et la lumière pour donner une direction claire au projet.</p></article><article data-reveal><span class="value-number">03</span><h3>Affiner</h3><p>Travailler les proportions, les matières et les détails qui donnent sa cohérence à l’ensemble.</p></article></div></section>'''
    page('bureau.html', 'Le bureau', 'Découvrez Mathias Gouvart et son approche de l’architecture, de la construction neuve à la transformation.', body, 'studio')


def projects(category=None):
    c = CATEGORIES.get(category)
    title = c['label'] if c else 'Les projets'
    heading = 'Construire<br>de nouveaux <em>horizons.</em>' if category == 'constructions-neuves' else 'Révéler<br>de nouvelles <em>possibilités.</em>' if c else 'Chaque lieu,<br>une nouvelle <em>histoire.</em>'
    desc = 'Des constructions neuves pensées à partir du lieu, des usages et de vos envies.' if category == 'constructions-neuves' else 'Transformer l’existant, repenser les espaces et ouvrir de nouvelles perspectives.' if c else 'Construction neuve, rénovation ou transformation : découvrez les univers de projets du bureau.'
    items = [p for p in DATA['projects'] if not category or p['category'] == category]
    tabs = f'<a href="projets.html" {"aria-current=page" if not category else ""}>Tous les projets</a>' + ''.join(f'<a href="{e(item["page"])}" {"aria-current=page" if item["id"] == category else ""}>{e(item["label"])}</a>' for item in DATA['categories'])
    body = f'''<section class="page-heading section-pad"><p class="eyebrow" data-intro>{e(title)}</p><h1 data-intro data-delay="100">{heading}</h1><p class="page-lead" data-intro data-delay="220">{e(desc)}</p></section><section class="portfolio-section section-pad"><div class="portfolio-toolbar"><nav class="project-tabs" aria-label="Catégories de projets">{tabs}</nav><span class="portfolio-count"><span data-project-count>{len(items):02}</span> projets</span></div><div class="project-grid portfolio-grid" data-project-list>{''.join(card(p) for p in items)}</div><p class="sample-note">Les projets portant la mention « Projet de démonstration » sont des exemples fictifs illustrés par des images d’ambiance.</p></section>'''
    page(c['page'] if c else 'projets.html', title, desc, body, main_attrs=f'data-category="{e(category)}"' if category else '')


def detail(p=None):
    example = p or (DATA['projects'][0] if DATA['projects'] else {'id': 'projet', 'title': 'Un projet à découvrir', 'category': DATA['categories'][0]['id'], 'summary': '', 'cover': 'assets/architecture-hero.webp', 'coverAlt': 'Image d’ambiance architecturale', 'description': [], 'gallery': [], 'sample': False})
    c = CATEGORIES[example['category']]
    photos = ''.join(f'<a class="gallery-item" href="{e(img["src"])}" data-gallery-item data-image="{e(img["src"])}" data-alt="{e(img["alt"])}" data-title="{e(example["title"])}" data-description="{e(img["caption"])}" data-reveal aria-label="Agrandir l’image : {e(img["alt"])}"><img class="gallery-image" src="{e(img["src"])}" alt="{e(img["alt"])}" loading="lazy"><span class="gallery-caption">{e(img["caption"])}</span></a>' for img in example['gallery'])
    i = DATA['projects'].index(example) if DATA['projects'] else 0
    next_p = DATA['projects'][(i + 1) % len(DATA['projects'])] if DATA['projects'] else example
    body = f'''<div data-project-content {"hidden" if not p else ""}><section class="detail-heading section-pad"><a class="back-link" href="projets.html">← Tous les projets</a><div class="detail-title-row"><div><a class="eyebrow" data-project-category href="{e(c['page'])}">{e(c['label'])}</a><h1 data-project-title data-intro>{e(example['title'])}</h1></div><span class="demo-badge" data-project-status>Projet de démonstration</span></div><p class="detail-summary" data-project-summary data-intro data-delay="150">{e(example['summary'])}</p></section><div class="detail-cover" data-intro="image" data-parallax><img data-project-cover data-parallax-layer src="{e(example['cover'])}" alt="{e(example['coverAlt'])}" fetchpriority="high"></div><section class="project-story section-pad"><div data-reveal><p class="eyebrow">L’intention</p><h2>Penser le lieu.<br><em>Habiter l’espace.</em></h2><dl data-project-meta class="project-meta" hidden></dl></div><div class="prose" data-project-description data-reveal>{''.join(f'<p>{e(text)}</p>' for text in example['description'])}</div></section><section class="project-gallery-section section-pad"><div class="section-heading" data-reveal><h2>Le projet <em>en images.</em></h2><span class="tiny-label">Cliquez pour explorer la galerie ↗</span></div><div class="project-gallery" data-project-gallery data-gallery>{photos}</div></section><div class="next-project section-pad"><span class="eyebrow">Poursuivre la visite</span><a data-project-next href="{e(project_url(next_p))}"><span data-project-next-title>{e(next_p['title'])}</span>{arrow()}</a></div></div><section class="not-found section-pad" data-project-not-found {"hidden" if p else ""}><p class="eyebrow">Les projets</p><h2>Retrouvons<br>le bon <em>projet.</em></h2><p>Ce projet n’est pas disponible. Retrouvez les projets du bureau dans la sélection.</p>{link('projets.html', 'Voir les projets', 'button button-dark')}</section>{gallery_dialog()}'''
    page(p['page'] if p else 'projet.html', p['title'] if p else 'Un projet à découvrir', example['summary'], body, main_attrs=f'data-project-detail data-project-id="{e(p["id"] if p else "")}"')


def contact_page():
    def field(id_, label, input_, wide=False):
        return f'<div class="form-field {"field-wide" if wide else ""}"><label for="{id_}">{label}</label>{input_}<p class="field-error" id="{id_}-error" hidden></p></div>'
    fields = field('contact-name', 'Nom et prénom <span>*</span>', '<input id="contact-name" name="name" autocomplete="name" required maxlength="120" aria-describedby="contact-name-error">')
    fields += field('contact-email', 'Adresse e-mail <span>*</span>', '<input id="contact-email" name="email" type="email" autocomplete="email" required maxlength="254" aria-describedby="contact-email-error">')
    fields += field('contact-phone', 'Téléphone', '<input id="contact-phone" name="phone" type="tel" autocomplete="tel" maxlength="50" aria-describedby="contact-phone-error">')
    fields += field('contact-type', 'Votre projet <span>*</span>', '<select id="contact-type" name="project_type" required aria-describedby="contact-type-error"><option value="" selected disabled>Choisir une catégorie</option><option>Constructions neuves</option><option>Rénovations / Transformations</option></select>')
    fields += field('contact-location', 'Lieu du projet', '<input id="contact-location" name="location" autocomplete="address-level2" maxlength="160" aria-describedby="contact-location-error">', True)
    fields += field('contact-message', 'Parlez-moi de votre projet <span>*</span>', '<textarea id="contact-message" name="message" required minlength="10" maxlength="6000" rows="5" placeholder="Vos envies, votre lieu, vos premières idées…" aria-describedby="contact-message-error"></textarea>', True)
    body = f'''<section class="contact-layout section-pad"><div class="contact-intro"><p class="eyebrow" data-intro>Contact</p><h1 data-intro data-delay="100">Donnons vie<br>à vos <em>idées.</em></h1><p class="page-lead" data-intro data-delay="200">Une construction, une rénovation, une envie de transformer votre lieu de vie ? Parlons-en.</p><div class="contact-details" data-reveal><div><span class="eyebrow">Écrivez-moi</span><a href="mailto:{e(SITE['email'])}">{e(SITE['email'])}</a></div><div><span class="eyebrow">Appelez-moi</span><a href="tel:{e(SITE['phoneLink'])}">{e(SITE['phone'])}</a></div></div><p class="contact-signature" data-reveal>Mathias Gouvart<span>Architecte</span></p></div><div class="contact-form-wrap" data-intro data-delay="200"><h2>Votre projet commence ici.</h2><p class="form-intro">Quelques mots suffisent pour un premier échange.</p><form id="contact-form" action="https://formsubmit.co/{e(SITE['email'])}" method="POST"><input type="hidden" name="_subject" value="Nouvelle demande — Mathias Gouvart Architecte"><input type="hidden" name="_template" value="table"><input type="hidden" name="_next" value="{PUBLIC}merci.html"><div class="honeypot" aria-hidden="true"><label>Ne pas remplir ce champ<input name="_honey" tabindex="-1" autocomplete="off"></label></div><div class="form-grid">{fields}</div><p class="form-privacy">Les informations transmises servent à répondre à votre demande. L’envoi est assuré par <a href="https://formsubmit.co/privacy.pdf" target="_blank" rel="noopener noreferrer">FormSubmit</a>. Les champs marqués d’un * sont requis.</p><button class="button button-dark contact-submit" type="submit" data-contact-submit><span data-contact-submit-label>Envoyer ma demande</span>{arrow()}</button><p id="contact-status" class="contact-status" role="status" aria-live="polite"></p></form></div></section>'''
    page('contact.html', 'Contact', 'Parlons de votre construction neuve, rénovation ou transformation. Contactez Mathias Gouvart Architecte.', body, 'contact', contact=True, cta=False)
    page('merci.html', 'Merci pour votre demande', 'Merci d’avoir pris contact avec Mathias Gouvart Architecte.', f'<section class="thank-you section-pad"><p class="eyebrow" data-intro>Contact</p><h1 data-intro>Merci pour<br>votre <em>confiance.</em></h1><p>Votre demande a été transmise au service d’envoi. Pour toute question, vous pouvez aussi me joindre au {e(SITE["phone"])}.</p>{link("index.html", "Revenir à l’accueil", "button button-dark")}</section>', 'contact', cta=False)


if __name__ == '__main__':
    home()
    studio()
    projects()
    for category in CATEGORIES:
        projects(category)
    for project in DATA['projects']:
        if project.get('page'):
            detail(project)
    detail()
    contact_page()
    # Refresh the independent owner utility without changing its markup.
    owner = ROOT / 'gestion.html'
    if owner.exists():
        source = owner.read_text()
        for name in ('styles.css', 'editor.css', 'editor.js', 'assets/logo-monogramme.webp', 'assets/favicon.png'):
            source = re.sub(r'((?:src|href)="' + re.escape(name) + r')(?:\?v=[^"]*)?"', lambda m: m[1] + '?v=' + asset(name).split('?v=')[1] + '"', source)
        owner.write_text(source)
    print('Generated ' + str(len(OUTPUT)) + ' pages: ' + ', '.join(OUTPUT))
