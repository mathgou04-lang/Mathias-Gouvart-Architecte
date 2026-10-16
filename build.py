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
      <div class="project-card-image" data-image-motion><img class="project-card-photo" src="{e(p['cover'])}" alt="{e(p['coverAlt'])}" loading="lazy" decoding="async"></div>
      <div class="project-card-body"><p class="project-card-category">{e(CATEGORIES[p['category']]['label'])}</p><h3 class="project-card-title" data-text-reveal>{e(p['title'])}</h3>{tag}{arrow()}</div></a>'''


def brand_markup():
    return f'<img class="brand-logo" src="{asset("assets/logo-mathias-gouvart.webp")}" width="155" height="126" alt="Mathias Gouvart Architecte" decoding="async">'


def header(active):
    def current(key):
        return ' aria-current="page"' if active == key else ''
    return f'''<a class="skip-link" href="#contenu">Aller au contenu</a>
    <header class="site-header"><a class="brand" href="index.html" aria-label="Mathias Gouvart Architecte — Accueil">{brand_markup()}</a>
    <nav id="navigation" class="navigation" aria-label="Navigation principale">
      <a href="index.html"{current('home')} data-intro data-delay="60">Accueil</a>
      <div class="nav-projects"><div class="nav-projects-heading"><a href="projets.html"{current('projects')} data-intro data-delay="110">Projets</a><button class="project-toggle" data-project-toggle aria-expanded="false" aria-controls="project-submenu" aria-label="Afficher les catégories de projets"><span aria-hidden="true">⌄</span></button></div>
      <div id="project-submenu" class="project-submenu"><a href="projets-neufs.html">Constructions neuves</a><a href="projets-renovations.html">Rénovations / Transformations</a></div></div>
      <a href="bureau.html"{current('studio')} data-intro data-delay="160">Le bureau</a><a class="nav-contact" href="contact.html"{current('contact')} data-intro data-delay="210">Contact</a>
    </nav></header>'''


def footer(cta=True):
    invitation = f'''<section class="contact-invitation section-pad" data-reveal><p class="eyebrow">Un premier échange</p><div class="invitation-row"><h2 data-text-reveal>Parlons de votre projet.</h2>{link('contact.html', 'Prendre contact')}</div></section>''' if cta else ''
    return invitation + f'''<footer class="site-footer section-pad"><div class="footer-top"><a class="brand footer-brand" href="index.html">{brand_markup()}</a><div class="footer-contact"><a href="mailto:{e(SITE['email'])}">{e(SITE['email'])}</a><a href="tel:{e(SITE['phoneLink'])}">{e(SITE['phone'])}</a></div><nav aria-label="Navigation de bas de page"><a href="projets.html">Projets</a><a href="bureau.html">Le bureau</a><a href="contact.html">Contact</a></nav></div><div class="footer-bottom"><span>© 2026 Mathias Gouvart Architecte</span><a href="#haut">Retour en haut ↑</a></div></footer>'''


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
    featured = [p for p in DATA['projects'] if p['featured']][:3]
    body = f'''<section class="home-intro section-pad"><h1 class="home-intro-title" data-text-reveal data-intro>Mathias Gouvart <span class="home-profession">Architecte</span></h1><div class="home-intro-copy" data-intro data-delay="220"><p>Constructions neuves.<br>Rénovations et transformations.</p><a href="bureau.html" class="text-link">Découvrir le bureau {arrow()}</a></div></section>
    <section class="home-projects section-pad" id="selection"><div class="section-heading"><h2 data-text-reveal data-reveal>Projets sélectionnés</h2>{link('projets.html', 'Tous les projets')}</div><div class="project-grid" data-project-list data-featured="true" data-limit="3">{''.join(card(p) for p in featured)}</div><p class="sample-note">Les projets signalés comme démonstrations sont des exemples fictifs, en attendant les réalisations du bureau.</p></section>
    <section class="home-studio section-pad"><p class="eyebrow" data-reveal>Le bureau</p><div><h2 data-text-reveal data-reveal>Un projet se construit ensemble.</h2><p data-reveal>Partir de votre lieu, de vos besoins et de vos envies. Étudier les possibilités, préciser les espaces et travailler les détails : le bureau accompagne cette réflexion avec vous.</p><div data-reveal>{link('contact.html', 'Échangeons sur votre projet')}</div></div></section>'''
    page('index.html', 'Accueil', 'Mathias Gouvart Architecte. Constructions neuves, rénovations et transformations. Découvrez les projets et contactez le bureau.', body, 'home')


def studio():
    portrait = SITE.get('portrait')
    if portrait and re.fullmatch(r'assets/(?:[a-zA-Z0-9_-]+/)*[a-zA-Z0-9_-]+\.(?:webp|png|jpe?g|avif)', portrait):
        visual = f'<img src="{e(portrait)}" alt="{e(SITE["portraitAlt"])}" class="portrait-photo">'
    else:
        visual = f'<div class="portrait-placeholder"><img class="portrait-logo" src="{asset("assets/logo-mathias-gouvart.webp")}" alt="Logo de Mathias Gouvart Architecte" width="400" height="325"><p>Portrait à venir</p></div>'
    bio = ''.join(f'<p>{e(text)}</p>' for text in SITE['biography'])
    body = f'''<section class="page-heading section-pad"><p class="eyebrow" data-intro>Mathias Gouvart Architecte</p><h1 data-text-reveal data-intro>Le bureau</h1></section><section class="studio-section section-pad"><div class="portrait-block" data-reveal="image">{visual}</div><div class="studio-copy"><h2 data-text-reveal data-reveal>Mathias Gouvart</h2><p class="studio-role" data-reveal>Architecte</p><div class="prose" data-reveal>{bio}</div><div data-reveal>{link('contact.html', 'Faire connaissance')}</div></div></section>'''
    page('bureau.html', 'Le bureau', 'Mathias Gouvart, architecte. Découvrez le bureau et son approche des constructions neuves, rénovations et transformations.', body, 'studio')


def projects(category=None):
    c = CATEGORIES.get(category)
    title = c['label'] if c else 'Les projets'
    heading = e(c['label']) if c else 'Les projets'
    desc = 'Des constructions neuves pensées à partir du lieu, des usages et de vos envies.' if category == 'constructions-neuves' else 'Transformer l’existant, repenser les espaces et ouvrir de nouvelles perspectives.' if c else 'Construction neuve, rénovation ou transformation : découvrez les univers de projets du bureau.'
    items = [p for p in DATA['projects'] if not category or p['category'] == category]
    tabs = f'<a href="projets.html" {"aria-current=page" if not category else ""}>Tous les projets</a>' + ''.join(f'<a href="{e(item["page"])}" {"aria-current=page" if item["id"] == category else ""}>{e(item["label"])}</a>' for item in DATA['categories'])
    body = f'''<section class="page-heading section-pad"><p class="eyebrow" data-intro>{e(title)}</p><h1 data-text-reveal data-intro data-delay="100">{heading}</h1><p class="page-lead" data-intro data-delay="220">{e(desc)}</p></section><section class="portfolio-section section-pad"><div class="portfolio-toolbar"><nav class="project-tabs" aria-label="Catégories de projets">{tabs}</nav><span class="portfolio-count"><span data-project-count>{len(items):02}</span> projets</span></div><div class="project-grid portfolio-grid" data-project-list>{''.join(card(p) for p in items)}</div><p class="sample-note">Les projets portant la mention « Projet de démonstration » sont des exemples fictifs illustrés par des images d’ambiance.</p></section>'''
    page(c['page'] if c else 'projets.html', title, desc, body, main_attrs=f'data-category="{e(category)}"' if category else '')


def detail(p=None):
    example = p or (DATA['projects'][0] if DATA['projects'] else {'id': 'projet', 'title': 'Un projet à découvrir', 'category': DATA['categories'][0]['id'], 'summary': '', 'cover': 'assets/architecture-hero.webp', 'coverAlt': 'Image d’ambiance architecturale', 'description': [], 'gallery': [], 'sample': False})
    c = CATEGORIES[example['category']]
    photos = ''.join(f'<a class="gallery-item" href="{e(img["src"])}" data-gallery-item data-image="{e(img["src"])}" data-alt="{e(img["alt"])}" data-title="{e(example["title"])}" data-description="{e(img["caption"])}" data-reveal data-image-motion aria-label="Agrandir l’image : {e(img["alt"])}"><img class="gallery-image" src="{e(img["src"])}" alt="{e(img["alt"])}" loading="lazy"><span class="gallery-caption">{e(img["caption"])}</span></a>' for img in example['gallery'])
    i = DATA['projects'].index(example) if DATA['projects'] else 0
    next_p = DATA['projects'][(i + 1) % len(DATA['projects'])] if DATA['projects'] else example
    body = f'''<div data-project-content {"hidden" if not p else ""}><section class="detail-heading section-pad"><a class="back-link" href="projets.html">← Tous les projets</a><div class="detail-title-row"><div><a class="eyebrow" data-project-category href="{e(c['page'])}">{e(c['label'])}</a><h1 data-project-title data-text-reveal data-intro>{e(example['title'])}</h1></div><span class="demo-badge" data-project-status>Projet de démonstration</span></div><p class="detail-summary" data-project-summary data-intro data-delay="150">{e(example['summary'])}</p></section><div class="detail-cover" data-intro="image" data-parallax><img data-project-cover data-parallax-layer src="{e(example['cover'])}" alt="{e(example['coverAlt'])}" fetchpriority="high"></div><section class="project-story section-pad"><div data-reveal><p class="eyebrow">L’intention</p><h2 data-text-reveal>À propos du projet</h2><dl data-project-meta class="project-meta" hidden></dl></div><div class="prose" data-project-description data-reveal>{''.join(f'<p>{e(text)}</p>' for text in example['description'])}</div></section><section class="project-gallery-section section-pad"><div class="section-heading" data-reveal><h2 data-text-reveal>En images</h2><span class="tiny-label">Cliquez pour explorer la galerie ↗</span></div><div class="project-gallery" data-project-gallery data-gallery>{photos}</div></section><div class="next-project section-pad"><span class="eyebrow">Poursuivre la visite</span><a data-project-next href="{e(project_url(next_p))}"><span data-project-next-title>{e(next_p['title'])}</span>{arrow()}</a></div></div><section class="not-found section-pad" data-project-not-found {"hidden" if p else ""}><p class="eyebrow">Les projets</p><h2>Retrouvons<br>le bon <em>projet.</em></h2><p>Ce projet n’est pas disponible. Retrouvez les projets du bureau dans la sélection.</p>{link('projets.html', 'Voir les projets', 'button button-dark')}</section>{gallery_dialog()}'''
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
    body = f'''<section class="contact-layout section-pad"><div class="contact-intro"><p class="eyebrow" data-intro>Contact</p><h1 data-text-reveal data-intro data-delay="100">Contact</h1><p class="page-lead" data-intro data-delay="200">Une construction, une rénovation, une envie de transformer votre lieu de vie ? Parlons-en.</p><div class="contact-details" data-reveal><div><span class="eyebrow">Écrivez-moi</span><a href="mailto:{e(SITE['email'])}">{e(SITE['email'])}</a></div><div><span class="eyebrow">Appelez-moi</span><a href="tel:{e(SITE['phoneLink'])}">{e(SITE['phone'])}</a></div></div><p class="contact-signature" data-reveal>Mathias Gouvart<span>Architecte</span></p></div><div class="contact-form-wrap" data-intro data-delay="200"><h2 data-text-reveal>Parlez-moi de votre projet.</h2><p class="form-intro">Quelques mots suffisent pour un premier échange.</p><form id="contact-form" action="https://formsubmit.co/{e(SITE['email'])}" method="POST"><input type="hidden" name="_subject" value="Nouvelle demande — Mathias Gouvart Architecte"><input type="hidden" name="_template" value="table"><input type="hidden" name="_next" value="{PUBLIC}merci.html"><div class="honeypot" aria-hidden="true"><label>Ne pas remplir ce champ<input name="_honey" tabindex="-1" autocomplete="off"></label></div><div class="form-grid">{fields}</div><p class="form-privacy">Les informations transmises servent à répondre à votre demande. L’envoi est assuré par <a href="https://formsubmit.co/privacy.pdf" target="_blank" rel="noopener noreferrer">FormSubmit</a>. Les champs marqués d’un * sont requis.</p><button class="button button-dark contact-submit" type="submit" data-contact-submit><span data-contact-submit-label>Envoyer ma demande</span>{arrow()}</button><p id="contact-status" class="contact-status" role="status" aria-live="polite"></p></form></div></section>'''
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
        for name in ('styles.css', 'editor.css', 'editor.js', 'assets/logo-mathias-gouvart.webp', 'assets/favicon.png'):
            source = re.sub(r'((?:src|href)="' + re.escape(name) + r')(?:\?v=[^"]*)?"', lambda m: m[1] + '?v=' + asset(name).split('?v=')[1] + '"', source)
        owner.write_text(source)
    print('Generated ' + str(len(OUTPUT)) + ' pages: ' + ', '.join(OUTPUT))
