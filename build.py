#!/usr/bin/env python3
"""Generate the static portfolio with Python's standard library only."""
import hashlib
import html
import json
import re
from pathlib import Path
from site_extras import render_entry, render_legal_pages, write_search_files

ROOT = Path(__file__).resolve().parent
DATA = json.loads((ROOT / 'content/projects.json').read_text())
SITE = json.loads((ROOT / 'content/site.json').read_text())
CATEGORIES = {c['id']: c for c in DATA['categories']}
PUBLIC = SITE.get('publicUrl', 'https://mathgou04-lang.github.io/Mathias-Gouvart-Architecte/').rstrip('/') + '/'
if not re.fullmatch(r'https://[a-zA-Z0-9.-]+(?:/[a-zA-Z0-9_-]+)*/', PUBLIC):
    raise ValueError('publicUrl must be an HTTPS site URL without query or fragment')
OUTPUT = []


def e(value):
    return html.escape(str(value), quote=True)


def asset(name):
    return name + '?v=' + hashlib.sha256((ROOT / name).read_bytes()).hexdigest()[:12]


def link(href, text, cls='text-link'):
    return f'<a class="{cls}" href="{e(href)}">{e(text)}</a>'


def project_url(p):
    return p.get('page') or 'projet.html?id=' + p['id']


def card(p):
    tag = '<span class="project-card-tag">Étude d’intention — images d’ambiance</span>' if p['sample'] else ''
    return f'''<a class="project-card" href="{e(project_url(p))}" data-reveal>
      <div class="project-card-image" data-image-motion><img class="project-card-photo" src="{e(p['cover'])}" alt="{e(p['coverAlt'])}" loading="lazy" decoding="async"></div>
      <div class="project-card-body"><p class="project-card-category">{e(CATEGORIES[p['category']]['label'])}</p><h3 class="project-card-title" data-text-reveal>{e(p['title'])}</h3>{tag}</div></a>'''


def brand_markup():
    return f'<img class="brand-logo" src="{asset("assets/logo-mathias-gouvart.webp")}" width="155" height="126" alt="Mathias Gouvart Architecte" decoding="async">'


def header(active):
    def current(key):
        return ' aria-current="page"' if active == key else ''
    return f'''<a class="skip-link" href="#contenu">Aller au contenu</a>
    <header class="site-header"><a class="brand" href="index.html" aria-label="Mathias Gouvart Architecte — Entrée du site">{brand_markup()}</a>
    <nav id="navigation" class="navigation" aria-label="Navigation principale">
      <a href="accueil.html"{current('home')} data-intro data-delay="60">Accueil</a>
      <div class="nav-projects"><div class="nav-projects-heading"><a href="projets.html"{current('projects')} data-intro data-delay="110">Projets</a><button class="project-toggle" data-project-toggle aria-expanded="false" aria-controls="project-submenu" aria-label="Afficher les catégories de projets"><span aria-hidden="true">⌄</span></button></div>
      <div id="project-submenu" class="project-submenu"><a href="projets-neufs.html">Constructions neuves</a><a href="projets-renovations.html">Rénovations / Transformations</a></div></div>
      <a href="bureau.html"{current('studio')} data-intro data-delay="160">Le bureau</a><a class="nav-contact" href="contact.html"{current('contact')} data-intro data-delay="210">Contact</a>
    </nav></header>'''


def footer(cta=True):
    invitation = f'''<section class="contact-invitation section-pad" data-reveal><p class="eyebrow">Une construction, une rénovation, une transformation</p><div class="invitation-row"><h2 data-text-reveal>Parlons de votre projet.</h2>{link('contact.html', 'Prendre contact', 'button button-light')}</div></section>''' if cta else ''
    return invitation + f'''<footer class="site-footer section-pad"><div class="footer-top"><div class="footer-identity"><a class="brand footer-brand" href="index.html">{brand_markup()}</a><p>Mathias Gouvart<br>Architecte</p></div><nav class="footer-column" aria-label="Le site"><h3>Le bureau</h3><a href="accueil.html">Accueil</a><a href="bureau.html">Présentation</a><a href="projets.html">Les projets</a><a href="contact.html">Contact</a></nav><nav class="footer-column" aria-label="Catégories de projets"><h3>Les projets</h3><a href="projets-neufs.html">Constructions neuves</a><a href="projets-renovations.html">Rénovations / Transformations</a></nav><div class="footer-column footer-contact"><h3>Coordonnées</h3><a href="mailto:{e(SITE['email'])}">{e(SITE['email'])}</a><a href="tel:{e(SITE['phoneLink'])}">{e(SITE['phone'])}</a><a href="contact.html">Écrire au bureau</a></div></div><div class="footer-bottom"><span>© 2026 Mathias Gouvart Architecte</span><nav class="footer-legal" aria-label="Informations légales"><a href="mentions-legales.html">Mentions légales</a><a href="confidentialite.html">Confidentialité</a><a href="index.html">Revoir l’entrée</a></nav><a href="#haut">Retour en haut</a></div></footer>'''


def page(path, title, desc, body, active='projects', main_attrs='', contact=False, cta=True):
    bootstrap = json.dumps(DATA, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    canonical = PUBLIC + ('' if path == 'index.html' else path)
    robots = '<meta name="robots" content="noindex,follow">' if path == 'merci.html' else ''
    content = f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#151515">
<title>{e(title)} — Mathias Gouvart Architecte</title><meta name="description" content="{e(desc)}">{robots}<link rel="canonical" href="{e(canonical)}"><link rel="icon" href="{asset("assets/favicon.png")}" type="image/png"><link rel="stylesheet" href="{asset('styles.css')}"><link rel="stylesheet" href="{asset('transitions.css')}">
<meta property="og:title" content="{e(title)} — Mathias Gouvart Architecte"><meta property="og:description" content="{e(desc)}"><meta property="og:url" content="{e(canonical)}"><meta property="og:image" content="{PUBLIC}assets/architecture-hero.webp"><meta property="og:type" content="website"><meta property="og:locale" content="fr_BE">
<script>document.documentElement.classList.add('js');</script>
<script src="{asset('transitions.js')}" defer></script><script id="project-bootstrap" type="application/json">{bootstrap}</script><script src="{asset('project-data.js')}" defer></script><script src="{asset('script.js')}" defer></script><script src="{asset('motion.js')}" defer></script>{f'<script src="{asset("contact.js")}" defer></script>' if contact else ''}</head>
<body id="haut" class="page-{active}">{header(active)}<main id="contenu" {main_attrs}>{body}</main>{footer(cta and active == "studio")}<div class="page-transition" data-page-transition aria-hidden="true"></div></body></html>'''
    (ROOT / path).write_text(content)
    OUTPUT.append(path)


def gallery_dialog():
    return '''<dialog id="study-dialog" class="gallery-dialog" aria-labelledby="study-title"><button class="dialog-close" data-close-dialog aria-label="Fermer la galerie">Fermer <span aria-hidden="true">×</span></button><div class="dialog-image-wrap"><img id="study-image" src="assets/architecture-hero.webp" alt=""></div><div class="dialog-bottom"><div><h2 id="study-title">Le projet en images</h2><p id="study-description"></p></div><div class="gallery-controls"><button data-gallery-step="prev" aria-label="Image précédente">←</button><span data-gallery-counter></span><button data-gallery-step="next" aria-label="Image suivante">→</button></div></div></dialog>'''


def home():
    featured = [p for p in DATA['projects'] if p['featured']]
    lead = featured[0] if featured else None
    remaining = [p for p in featured if not lead or p['id'] != lead['id']][:3]
    hero = ''
    if lead:
        category = CATEGORIES[lead['category']]['label']
        tag = 'Étude d’intention — images d’ambiance' if lead['sample'] else ''
        hero = f'''<a class="hero-project" href="{e(project_url(lead))}" data-home-project><div class="hero-project-photo" data-image-motion><img data-home-project-image src="{e(lead['cover'])}" alt="{e(lead['coverAlt'])}" width="1400" height="900" fetchpriority="high"></div><div class="hero-project-caption"><span class="hero-project-kind" data-home-project-category>{e(category)}</span><h2 data-home-project-title data-text-reveal>{e(lead['title'])}</h2><span class="hero-project-status" data-home-project-status {"hidden" if not tag else ""}>{tag}</span></div></a>'''
    else:
        hero = '<a class="hero-project" data-home-project hidden><div class="hero-project-photo" data-image-motion><img data-home-project-image alt=""></div><div class="hero-project-caption"><span data-home-project-category></span><h2 data-home-project-title data-text-reveal></h2><span data-home-project-status></span></div></a>'
    body = f'''<section class="home-hero section-pad"><div class="home-hero-grid"><div class="hero-identity"><p class="eyebrow" data-intro>Architecture · Mons</p><h1 class="home-title" data-text-reveal data-intro data-delay="80">Mathias<br>Gouvart <span>Architecte</span></h1><p class="home-deck" data-intro data-delay="180">Constructions neuves et transformations.<br>Mons et alentours, dans un rayon de 50 km.</p><div class="hero-actions home-actions" data-intro data-delay="280">{link('projets.html', 'Découvrir les projets', 'button button-light')}{link('contact.html', 'Parlons de votre projet')}</div></div>{hero}</div></section>
    <section class="home-projects section-pad" id="selection"><div class="section-heading"><div><p class="eyebrow" data-reveal>Les projets</p><h2 data-project-selection-title data-text-reveal data-reveal>Études et intentions</h2></div>{link('projets.html', 'Tous les projets')}</div><div class="project-grid home-project-grid" data-project-list data-featured="true" data-exclude-hero="true" data-limit="3">{''.join(card(p) for p in remaining)}</div><p class="sample-note">Les études d’intention présentées sont fictives et illustrées par des images d’ambiance.</p></section>
    <section class="home-domains section-pad"><div class="section-heading"><div><p class="eyebrow" data-reveal>Votre projet</p><h2 data-text-reveal data-reveal>Construire ou transformer</h2></div></div><div class="domain-grid"><a class="domain-card domain-card-new" href="projets-neufs.html" data-reveal><span class="domain-card-number" aria-hidden="true">01</span><div class="domain-copy"><span class="eyebrow">Construire</span><h3 data-text-reveal>Constructions neuves</h3><p>Concevoir une habitation à partir de votre terrain et de votre manière de vivre.</p></div><span class="domain-card-label">Découvrir la catégorie</span></a><a class="domain-card domain-card-renovation" href="projets-renovations.html" data-reveal><span class="domain-card-number" aria-hidden="true">02</span><div class="domain-copy"><span class="eyebrow">Transformer</span><h3 data-text-reveal>Rénovations / Transformations</h3><p>Repenser l’existant, les espaces et les possibilités de votre habitation.</p></div><span class="domain-card-label">Découvrir la catégorie</span></a></div></section>
    <section class="home-studio section-pad"><aside class="home-studio-aside" data-reveal><p class="eyebrow">Le bureau</p><p class="studio-location">Mons <span>et alentours</span></p><p class="tiny-label">Un rayon d’intervention de 50 km</p></aside><div class="home-studio-copy"><h2 data-text-reveal data-reveal>De la conception<br>à la réalisation.</h2><p data-reveal>Mathias Gouvart accompagne vos projets de construction et de transformation, de la première étude jusqu’à leur réalisation.</p><p data-reveal>Le bureau intervient également pour les demandes de permis et les régularisations. Le premier échange permet de définir la mission adaptée à votre situation.</p><div data-reveal>{link('bureau.html', 'Découvrir le bureau')}</div></div></section>'''
    page('accueil.html', 'Accueil', 'Mathias Gouvart Architecte. Constructions neuves, rénovations et transformations. Découvrez les projets et contactez le bureau.', body, 'home')


def studio():
    portrait = SITE.get('portrait')
    if portrait and re.fullmatch(r'assets/(?:[a-zA-Z0-9_-]+/)*[a-zA-Z0-9_-]+\.(?:webp|png|jpe?g|avif)', portrait):
        visual = f'<img src="{e(portrait)}" alt="{e(SITE["portraitAlt"])}" class="portrait-photo">'
    else:
        visual = f'<div class="portrait-placeholder"><img class="portrait-logo" src="{asset("assets/logo-mathias-gouvart.webp")}" alt="Logo de Mathias Gouvart Architecte" width="400" height="325"></div>'
    bio = ''.join(f'<p>{e(text)}</p>' for text in SITE['biography'])
    facts = f'<dl class="studio-facts"><dt>Secteur</dt><dd>{e(SITE["city"])}</dd><dt>Zone d’intervention</dt><dd>{e(SITE["area"])}</dd><dt>Missions</dt><dd>{e(", ".join(SITE["missions"]))}</dd></dl>'
    body = f'''<section class="page-heading section-pad"><p class="eyebrow" data-intro>Mathias Gouvart Architecte</p><h1 data-text-reveal data-intro>Le bureau</h1></section><section class="studio-section section-pad"><div class="portrait-block" data-reveal="image">{visual}</div><div class="studio-copy"><h2 data-text-reveal data-reveal>Mathias Gouvart</h2><p class="studio-role" data-reveal>Architecte</p><div class="prose" data-reveal>{bio}</div>{facts}<div data-reveal>{link('contact.html', 'Faire connaissance')}</div></div></section>'''
    body += '''<section class="studio-method section-pad"><div class="section-heading"><div><p class="eyebrow" data-reveal>Notre premier échange</p><h2 data-text-reveal data-reveal>Comment aborder votre projet ?</h2></div></div><div class="method-grid"><article data-reveal><span class="method-number">01</span><h3>Échanger</h3><p>Préciser votre demande, vos besoins et les premières questions autour du lieu.</p></article><article data-reveal><span class="method-number">02</span><h3>Définir la mission</h3><p>Préciser les études et les démarches à prévoir : conception, permis ou régularisation selon votre situation.</p></article><article data-reveal><span class="method-number">03</span><h3>Accompagner</h3><p>Développer le projet et organiser son accompagnement jusqu’à la réalisation, selon la mission convenue.</p></article></div></section>'''
    page('bureau.html', 'Le bureau', 'Mathias Gouvart, architecte. Découvrez le bureau et son approche des constructions neuves, rénovations et transformations.', body, 'studio')


def projects(category=None):
    c = CATEGORIES.get(category)
    title = c['label'] if c else 'Les projets'
    heading = e(c['label']) if c else 'Les projets'
    desc = 'Des constructions neuves pensées à partir du lieu, des usages et de vos envies.' if category == 'constructions-neuves' else 'Transformer l’existant, repenser les espaces et ouvrir de nouvelles perspectives.' if c else 'Construction neuve, rénovation ou transformation : découvrez les univers de projets du bureau.'
    items = [p for p in DATA['projects'] if not category or p['category'] == category]
    tabs = f'<a href="projets.html" {"aria-current=page" if not category else ""}>Tous les projets</a>' + ''.join(f'<a href="{e(item["page"])}" {"aria-current=page" if item["id"] == category else ""}>{e(item["label"])}</a>' for item in DATA['categories'])
    banner = 'assets/project-renovation-detail.webp' if category == 'renovations-transformations' else 'assets/project-maison-interieur.webp'
    body = f'''<section class="page-heading listing-heading section-pad"><div class="listing-visual" data-image-motion><img src="{banner}" alt="Architecture — image d’ambiance de démonstration." fetchpriority="high"></div><div class="listing-heading-copy"><p class="eyebrow" data-intro>Mathias Gouvart Architecte</p><h1 data-text-reveal data-intro data-delay="100">{heading}</h1><p class="page-lead" data-intro data-delay="220">{e(desc)}</p></div></section><section class="portfolio-section section-pad"><div class="portfolio-toolbar"><nav class="project-tabs" aria-label="Catégories de projets">{tabs}</nav><span class="portfolio-count"><span data-project-count>{len(items):02}</span> <span data-project-count-label>{"projet" if len(items) == 1 else "projets"}</span></span></div><div class="project-grid portfolio-grid" data-project-list>{''.join(card(p) for p in items)}</div><p class="sample-note">Les études d’intention sont des propositions fictives, illustrées par des images d’ambiance. Elles ne sont pas des réalisations du bureau.</p></section>'''
    page(c['page'] if c else 'projets.html', title, desc, body, main_attrs=f'data-category="{e(category)}"' if category else '')


def dossier_markup(project):
    sections = []
    for key, label in [('context', 'Contexte'), ('approach', 'Parti architectural'), ('details', 'Matières et détails')]:
        text = project.get(key, '').strip()
        if text:
            paragraphs = ''.join(f'<p>{e(part.strip())}</p>' for part in re.split(r'\n\s*\n', text) if part.strip())
            sections.append(f'<section class="project-dossier-section" data-reveal><h3 data-text-reveal>{label}</h3>{paragraphs}</section>')
    return ''.join(sections)


def meta_markup(project):
    return ''.join(f'<dt>{label}</dt><dd>{e(project[key])}</dd>' for key, label in [('location', 'Lieu'), ('year', 'Année'), ('mission', 'Mission'), ('stage', 'Stade')] if project.get(key, '').strip())


def detail(p=None):
    example = p or (DATA['projects'][0] if DATA['projects'] else {'id': 'projet', 'title': 'Un projet à découvrir', 'category': DATA['categories'][0]['id'], 'summary': '', 'cover': 'assets/architecture-hero.webp', 'coverAlt': 'Image d’ambiance architecturale', 'description': [], 'gallery': [], 'sample': False})
    c = CATEGORIES[example['category']]
    dossier = dossier_markup(example)
    metadata = meta_markup(example)
    photos = ''.join(f'<a class="gallery-item" href="{e(img["src"])}" data-gallery-item data-image="{e(img["src"])}" data-alt="{e(img["alt"])}" data-title="{e(example["title"])}" data-description="{e(img["caption"])}" data-reveal data-image-motion aria-label="Agrandir l’image : {e(img["alt"])}"><img class="gallery-image" src="{e(img["src"])}" alt="{e(img["alt"])}" loading="lazy"><span class="gallery-caption">{e(img["caption"])}</span></a>' for img in example['gallery'])
    i = DATA['projects'].index(example) if DATA['projects'] else 0
    next_p = DATA['projects'][(i + 1) % len(DATA['projects'])] if DATA['projects'] else example
    body = f'''<div data-project-content {"hidden" if not p else ""}><section class="detail-heading section-pad"><a class="back-link" href="projets.html">Tous les projets</a><div class="detail-title-row"><div><a class="eyebrow" data-project-category href="{e(c['page'])}">{e(c['label'])}</a><h1 data-project-title data-text-reveal data-intro>{e(example['title'])}</h1></div><span class="demo-badge" data-project-status {"hidden" if not example["sample"] else ""}>Étude d’intention — images d’ambiance</span></div></section><div class="project-overview section-pad"><div class="detail-cover" data-intro="image" data-parallax><img data-project-cover data-parallax-layer src="{e(example['cover'])}" alt="{e(example['coverAlt'])}" fetchpriority="high"></div><aside class="project-overview-notes" data-reveal><p class="eyebrow">Le projet</p><p data-project-summary>{e(example['summary'])}</p><dl data-project-meta class="project-meta" {"hidden" if not metadata else ""}>{metadata}</dl>{link('contact.html', 'Parlons de votre projet', 'button button-dark')}</aside></div><section class="project-story section-pad"><div data-reveal><p class="eyebrow">L’intention</p><h2 data-text-reveal>Le projet en détail</h2></div><div class="prose" data-project-description data-reveal>{''.join(f'<p>{e(text)}</p>' for text in example['description'])}</div></section><div class="project-dossier section-pad" data-project-dossier {"hidden" if not dossier else ""}>{dossier}</div><section class="project-gallery-section section-pad"><div class="section-heading" data-reveal><h2 data-text-reveal>En images</h2><span class="tiny-label">Cliquez pour explorer la galerie</span></div><div class="project-gallery" data-project-gallery data-gallery>{photos}</div></section><div class="next-project section-pad"><span class="eyebrow">Poursuivre la visite</span><a data-project-next href="{e(project_url(next_p))}"><span data-project-next-title>{e(next_p['title'])}</span></a></div></div><section class="not-found section-pad" data-project-not-found {"hidden" if p else ""}><p class="eyebrow">Les projets</p><h2>Retrouvons<br>le bon <em>projet.</em></h2><p>Ce projet n’est pas disponible. Retrouvez les projets du bureau dans la sélection.</p>{link('projets.html', 'Voir les projets', 'button button-dark')}</section>{gallery_dialog()}'''
    page(p['page'] if p else 'projet.html', p['title'] if p else 'Un projet à découvrir', example['summary'], body, main_attrs=f'data-project-detail data-project-id="{e(p["id"] if p else "")}"')


def contact_page():
    def field(id_, label, input_, wide=False):
        return f'<div class="form-field {"field-wide" if wide else ""}"><label for="{id_}">{label}</label>{input_}<p class="field-error" id="{id_}-error" hidden></p></div>'
    fields = field('contact-name', 'Nom et prénom <span>*</span>', '<input id="contact-name" name="name" autocomplete="name" required maxlength="120" aria-describedby="contact-name-error">')
    fields += field('contact-email', 'Adresse e-mail <span>*</span>', '<input id="contact-email" name="email" type="email" autocomplete="email" required maxlength="254" aria-describedby="contact-email-error">')
    fields += field('contact-phone', 'Téléphone', '<input id="contact-phone" name="phone" type="tel" autocomplete="tel" maxlength="50" aria-describedby="contact-phone-error">')
    fields += field('contact-type', 'Votre projet <span>*</span>', '<select id="contact-type" name="project_type" required aria-describedby="contact-type-error"><option value="" selected disabled>Choisir une catégorie</option><option>Constructions neuves</option><option>Rénovations / Transformations</option><option>Permis / Régularisation</option></select>')
    fields += field('contact-location', 'Lieu du projet', '<input id="contact-location" name="location" autocomplete="address-level2" maxlength="160" aria-describedby="contact-location-error">', True)
    fields += field('contact-message', 'Parlez-moi de votre projet <span>*</span>', '<textarea id="contact-message" name="message" required minlength="10" maxlength="6000" rows="5" placeholder="Vos envies, votre lieu, vos premières idées…" aria-describedby="contact-message-error"></textarea>', True)
    body = f'''<section class="contact-layout section-pad"><div class="contact-intro"><p class="eyebrow" data-intro>Contact</p><h1 data-text-reveal data-intro data-delay="100">Contact</h1><p class="page-lead" data-intro data-delay="200">Construction, transformation, permis ou régularisation : parlons de votre projet à Mons ou dans les alentours, dans un rayon de 50 km.</p><div class="contact-details" data-reveal><div><span class="eyebrow">Écrivez-moi</span><a href="mailto:{e(SITE['email'])}">{e(SITE['email'])}</a></div><div><span class="eyebrow">Appelez-moi</span><a href="tel:{e(SITE['phoneLink'])}">{e(SITE['phone'])}</a></div></div><section class="contact-next-steps" data-reveal><h2>Que se passe-t-il ensuite ?</h2><ol><li><strong>Votre demande.</strong> Décrivez le lieu, vos besoins et les démarches déjà engagées.</li><li><strong>Un premier échange.</strong> Nous précisons ensemble le projet et les informations utiles.</li><li><strong>Une mission définie.</strong> L’accompagnement, les étapes et les honoraires sont abordés avant de commencer.</li></ol></section><p class="contact-signature" data-reveal>Mathias Gouvart<span>Architecte</span></p></div><div class="contact-form-wrap" data-intro data-delay="200"><h2 data-text-reveal>Parlez-moi de votre projet.</h2><p class="form-intro">Indiquez la commune, le type de projet et vos premières questions. Vous pouvez préciser votre budget envisagé et les échéances souhaitées.</p><form id="contact-form" action="https://formsubmit.co/{e(SITE['email'])}" method="POST"><input type="hidden" name="_subject" value="Nouvelle demande — Mathias Gouvart Architecte"><input type="hidden" name="_template" value="table"><input type="hidden" name="_next" value="{PUBLIC}merci.html"><div class="honeypot" aria-hidden="true"><label>Ne pas remplir ce champ<input name="_honey" tabindex="-1" autocomplete="off"></label></div><div class="form-grid">{fields}</div><p class="form-privacy">Les informations transmises servent à répondre à votre demande. L’envoi est assuré par <a href="https://formsubmit.co/privacy.pdf" target="_blank" rel="noopener noreferrer">FormSubmit</a>. Consultez les informations de <a href="confidentialite.html">confidentialité</a>. Les champs marqués d’un * sont requis.</p><button class="button button-dark contact-submit" type="submit" data-contact-submit><span data-contact-submit-label>Envoyer ma demande</span></button><p id="contact-status" class="contact-status" role="status" aria-live="polite"></p></form></div></section>'''
    page('contact.html', 'Contact', 'Parlons de votre construction neuve, rénovation ou transformation. Contactez Mathias Gouvart Architecte.', body, 'contact', contact=True, cta=False)
    page('merci.html', 'Merci pour votre demande', 'Merci d’avoir pris contact avec Mathias Gouvart Architecte.', f'<section class="thank-you section-pad"><p class="eyebrow" data-intro>Contact</p><h1 data-intro>Merci pour<br>votre <em>confiance.</em></h1><p>Votre demande a été transmise au service d’envoi. Pour toute question, vous pouvez aussi me joindre au {e(SITE["phone"])}.</p>{link("accueil.html", "Revenir à l’accueil", "button button-dark")}</section>', 'contact', cta=False)


if __name__ == '__main__':
    render_entry(ROOT, SITE, PUBLIC, asset)
    OUTPUT.append('index.html')
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
    render_legal_pages(SITE, page)
    write_search_files(ROOT, PUBLIC, OUTPUT)
    # Refresh the independent owner utility without changing its markup.
    owner = ROOT / 'gestion.html'
    if owner.exists():
        source = owner.read_text()
        for name in ('styles.css', 'editor.css', 'editor.js', 'assets/logo-mathias-gouvart.webp', 'assets/favicon.png'):
            source = re.sub(r'((?:src|href)="' + re.escape(name) + r')(?:\?v=[^"]*)?"', lambda m: m[1] + '?v=' + asset(name).split('?v=')[1] + '"', source)
        owner.write_text(source)
    print('Generated ' + str(len(OUTPUT)) + ' pages: ' + ', '.join(OUTPUT))
