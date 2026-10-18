"""Entry, public information pages, and search metadata for the portfolio."""
import html
import json
from urllib.parse import urlsplit


def esc(value):
    return html.escape(str(value), quote=True)


def render_entry(root, site, public, asset):
    title = 'Mathias Gouvart Architecte — Mons et alentours'
    description = 'Architecture à Mons et dans un rayon de 50 km. Conception, réalisation, permis et régularisation. Entrez et découvrez le bureau.'
    business = {
        '@context': 'https://schema.org', '@type': 'ProfessionalService',
        'name': 'Mathias Gouvart Architecte', 'url': public,
        'email': site['email'], 'telephone': '+32' + site['phoneLink'].lstrip('0'),
        'areaServed': {'@type': 'Place', 'name': site['area']},
        'description': description,
    }
    schema = json.dumps(business, ensure_ascii=False).replace('<', '\\u003c')
    markup = f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#151515">
<title>{esc(title)}</title><meta name="description" content="{esc(description)}"><link rel="canonical" href="{esc(public)}">
<link rel="icon" href="{asset('assets/favicon.png')}" type="image/png"><link rel="stylesheet" href="{asset('entree.css')}">
<link rel="preload" as="image" href="{asset('assets/entree-perspective-3d.webp')}">
<meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:type" content="website"><meta property="og:locale" content="fr_BE"><meta property="og:url" content="{esc(public)}"><meta property="og:image" content="{esc(public)}assets/entree-perspective-3d.webp">
<script type="application/ld+json">{schema}</script><script src="{asset('entree.js')}" defer></script></head>
<body class="entry-page"><main class="entry-scene">
<img class="entry-visual" src="{asset('assets/entree-perspective-3d.webp')}" width="1672" height="941" alt="Perspective 3D d’ambiance : une maison contemporaine blanche et anthracite autour d’un patio, à la tombée du jour." fetchpriority="high" decoding="async">
<div class="entry-shade" aria-hidden="true"></div>
<a class="entry-brand" data-enter href="accueil.html" aria-label="Mathias Gouvart Architecte — entrer">Mathias Gouvart <span>Architecte</span></a>
<div class="entry-center"><h1 class="entry-title">Mathias Gouvart <span>Architecte</span></h1><a class="entry-button" data-enter href="accueil.html">Entrer</a></div>
<p class="entry-location">Mons &amp; alentours · 50 km</p><p class="entry-caption">Perspective 3D d’ambiance</p><a class="entry-contact" href="contact.html">Contact</a>
</main><div class="entry-transition" aria-hidden="true"></div></body></html>'''
    (root / 'index.html').write_text(markup)


def render_legal_pages(site, page):
    email = esc(site['email'])
    phone = esc(site['phone'])
    legal = site.get('legal', {})
    details = [('Éditeur', 'Mathias Gouvart Architecte'), ('Zone d’intervention', site['area'])]
    for key, label in [('registeredAddress', 'Adresse professionnelle'), ('companyNumber', 'Numéro d’entreprise'), ('professionalRegistration', 'Inscription professionnelle')]:
        if legal.get(key):
            details.append((label, legal[key]))
    facts = ''.join(f'<dt>{esc(label)}</dt><dd>{esc(value)}</dd>' for label, value in details)
    body = f'''<section class="legal-page section-pad"><p class="eyebrow" data-intro>Informations du site</p><h1 data-text-reveal data-intro>Mentions légales</h1><div class="prose">
<h2>Éditeur et contact</h2><dl>{facts}</dl><p><a href="mailto:{email}">{email}</a><br><a href="tel:{esc(site['phoneLink'])}">{phone}</a></p>
<h2>Hébergement</h2><p>Ce site est hébergé par GitHub Pages, un service de GitHub. Les informations sur ce service sont disponibles sur <a href="https://docs.github.com/fr/pages" target="_blank" rel="noopener noreferrer">la documentation GitHub Pages</a>.</p>
<h2>Projets et images</h2><p>Les contenus portant la mention « Étude d’intention — images d’ambiance » présentent des propositions fictives. Ils ne constituent pas des réalisations du bureau. La perspective d’entrée est également une image d’ambiance générée. Les photographies de réalisations seront identifiées comme telles, avec les crédits correspondants.</p>
<h2>Utilisation des contenus</h2><p>Les textes et l’identité graphique du bureau sont présentés pour découvrir son activité. Pour réutiliser un contenu ou obtenir une information relative aux droits d’une image, contactez le bureau.</p>
<h2>Données personnelles</h2><p>Les informations concernant le formulaire et la navigation figurent sur la page <a href="confidentialite.html">Confidentialité</a>.</p></div></section>'''
    page('mentions-legales.html', 'Mentions légales', 'Éditeur, hébergement et informations sur les contenus du site Mathias Gouvart Architecte.', body, 'legal', cta=False)
    body = f'''<section class="legal-page section-pad"><p class="eyebrow" data-intro>Vos informations</p><h1 data-text-reveal data-intro>Confidentialité</h1><div class="prose">
<h2>Vos demandes au bureau</h2><p>Le formulaire recueille votre nom, votre adresse e-mail, le type de projet et votre message. Le téléphone et le lieu du projet sont facultatifs. Ces informations permettent à Mathias Gouvart Architecte de vous répondre et d’échanger sur votre demande. Elles ne sont pas destinées à une liste publicitaire.</p>
<h2>Envoi du formulaire</h2><p>L’envoi passe par FormSubmit, un service externe. Son système de protection peut afficher une vérification supplémentaire. Consultez <a href="https://formsubmit.co/privacy.pdf" target="_blank" rel="noopener noreferrer">la politique de confidentialité de FormSubmit</a> pour connaître ses propres conditions de traitement. Vous pouvez aussi écrire directement à <a href="mailto:{email}">{email}</a>.</p>
<h2>Navigation et fichiers techniques</h2><p>Les photographies, les polices et les scripts du site sont hébergés avec ses pages. Cette version n’intègre aucun outil publicitaire ni service d’analyse d’audience. L’hébergeur et le service d’envoi peuvent traiter les informations techniques nécessaires au fonctionnement et à la sécurité de leurs services.</p>
<h2>Conservation et droits</h2><p>La durée utile de conservation dépend de la suite donnée à votre demande et, le cas échéant, des obligations applicables à votre dossier. Pour connaître les données détenues à votre sujet, demander leur rectification ou leur suppression, écrivez à <a href="mailto:{email}">{email}</a>. Votre demande sera examinée en tenant compte des obligations professionnelles applicables.</p>
<h2>Votre espace de préparation</h2><p>L’outil de gestion des projets prépare un export sur votre appareil. Il ne publie pas directement vos modifications et ne réalise aucune sauvegarde automatique. Conservez le fichier exporté avant de fermer l’outil.</p></div></section>'''
    page('confidentialite.html', 'Confidentialité', 'Traitement des demandes de contact et informations sur la navigation du site Mathias Gouvart Architecte.', body, 'legal', cta=False)


def write_search_files(root, public, paths):
    excluded = {'merci.html', 'projet.html', 'gestion.html'}
    urls = [public + ('' if name == 'index.html' else name) for name in paths if name not in excluded]
    sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    sitemap += ''.join(f'  <url><loc>{esc(url)}</loc></url>\n' for url in urls)
    sitemap += '</urlset>\n'
    (root / 'sitemap.xml').write_text(sitemap)
    (root / 'robots.txt').write_text('User-agent: *\nAllow: /\nDisallow: ' + urlsplit(public).path + 'gestion.html\nSitemap: ' + public + 'sitemap.xml\n')
