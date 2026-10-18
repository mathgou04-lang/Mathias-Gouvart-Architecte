# Mathias Gouvart Architecte

Site français statique à plusieurs pages, sans dépendance applicative à installer. Python3 et sa bibliothèque standard génèrent le HTML ; CSS et JavaScript sont natifs. Images et polices sont auto-hébergées.

## Développer et reprendre le site

Utiliser le checkout existant `/workspace/Mathias-Gouvart-Architecte`, sans créer de worktree. Lire les éventuels AGENTS.md et préserver les modifications locales. Les sources complètes sont publiées sur `gh-pages` ; `main` conserve son historique initial. Si une nouvelle instance ne contient que LICENSE, examiner ses refs puis reprendre les sources de `origin/gh-pages` dans une branche locale, sans écraser de travail existant.

```bash
python3 build.py
python3 -m http.server 8000 --bind 0.0.0.0
```

Le serveur est nécessaire au chargement JSON et à l’éditeur. Les processus doivent être relancés après une reprise cloud. Si le port est occupé, vérifier le service existant avant toute action ; ne pas arrêter un service inconnu. Un socket et Chromium peuvent nécessiter les permissions de la plateforme. Ne pas partager localhost avec Mathias : utiliser le vrai lien public.

Le générateur déterministe produit **14 pages HTML**, plus `sitemap.xml` et `robots.txt`, et actualise les empreintes des CSS/JS. L’outil indépendant `gestion.html` reçoit également les empreintes actuelles.

## Parcours et identité visuelle

- `index.html` : perspective 3D immersive avec **Entrer** au centre exact de l’écran, sans cartouche ni bouton en forme de carte. Fondu vers `accueil.html`. Les liens fonctionnent sans JavaScript et avec réduction des animations. Retour navigateur sans voile bloquant ; aucun cookie de visite ni redirection automatique. Partager l’URL racine pour ouvrir ce point d’entrée.
- `accueil.html` : interface intérieure avec ouverture typographique, premier projet, sélection complémentaire, deux catégories et présentation du bureau. Le lien de navigation Accueil y retourne. Les logos et « Revoir l’entrée » ouvrent `index.html` ; aucune redirection ne bloque les liens directs vers une page.
- `bureau.html` : présentation et informations confirmées par Mathias : Mons et alentours, rayon de 50 km, conception jusqu’à la réalisation, permis et régularisation.
- `projets.html`, `projets-neufs.html`, `projets-renovations.html` : toutes les études/projets et les deux catégories seulement.
- `projet-*.html` : fiches initiales ; `projet.html?id=identifiant` : nouvelles fiches JSON.
- `contact.html`, `merci.html` : formulaire et retour du service d’envoi.
- `mentions-legales.html`, `confidentialite.html` : informations de l’éditeur, des contenus et du formulaire.
- `gestion.html` : préparation locale des projets par le propriétaire, hors indexation.
- `apercu-iphone.html` : aperçu interactif dans un cadre iPhone, hors indexation. Le vrai site se charge dans une iframe de 390 × 712 px, avec défilement, navigation et commandes Safari. Le cadre s’adapte à la fenêtre sans changer la largeur intérieure ; il simule le format d’écran et ne remplace pas un test dans Safari sur un appareil réel.

Direction actuelle : une composition de revue d’architecture, avec Archivo pour les titres et les textes et Bodoni Moda en italique pour « Architecte », « Mons » et l’invitation « Entrer ». Les figures gardent des proportions variées et des légendes hors des photos. Les cartes arrondies, les panneaux pastel et les bandeaux d’action répétés de la version précédente sont retirés. La couleur reste présente par des accents bleu encre et bordeaux, sans recolorer les photographies ni modifier le logo noir et doré. Pas de vert ni d’ancienne palette cuivre/sable.

Les catégories deviennent des liens typographiques ouverts, le bureau est évoqué par ses informations réelles plutôt que par une image d’ambiance supplémentaire. La sélection conserve des photos contenues et des décalages maîtrisés. Les invitations au contact utilisent la typographie et les coordonnées, sans gros bandeaux répétés. Menu Accueil / Projets / Le bureau / Contact visible et centré sur ordinateur comme sur téléphone. Pas de flèches décoratives répétées ; seules les commandes de galerie et le chevron de catégories restent présentes. La perspective plein écran concerne seulement l’entrée.

Logo complet corrigé : `assets/logo-mathias-gouvart.webp` (lignes/textes noirs, MG et barres dorés, fond transparent). Le favicon PNG en dérive. Ne pas remplacer le logo par une nouvelle création. Le fichier a été préparé depuis l’image fournie ; préférer un original vectoriel si Mathias le transmet. Archivo et Bodoni Moda sont auto-hébergées avec leurs licences SIL OFL. Les anciennes polices restent disponibles pour les outils existants.

`transitions.css` et `transitions.js` apportent les transitions entre documents : dévoilement diagonal et passage de la photographie d’une vignette vers la couverture du projet, y compris au retour vers la sélection. Ces transitions utilisent les View Transitions du navigateur lorsqu’elles sont disponibles, sans transformer le site en application ni remplacer ses liens natifs. Les autres navigateurs ont un court rideau animé avec navigation de secours ; l’entrée conserve son propre repli. Aucun historique artificiel ni stockage de visite. Les liens avec modificateur, téléchargements, ancres et coordonnées gardent leur comportement natif.

Dans une iframe, les transitions utilisent également le rideau et le fondu d’entrée, car les transitions natives entre documents concernent la fenêtre principale. Les commandes de l’aperçu gardent leur historique dans le cadre ; « Ouvrir le site » ouvre la page courante dans un nouvel onglet. Le générateur actualise les empreintes des ressources des deux outils indépendants, gestion et aperçu iPhone.

`motion.js` orchestre les titres mot par mot avec un léger retour souple, le dévoilement oblique des images, leur zoom qui se pose et l’apparition séquencée des légendes, catégories et liens. Le parallax et le zoom au survol utilisent un ressort amorti sur ordinateur ; la boucle de rendu s’arrête au repos. L’entrée conserve son centre exact, avec une approche de la perspective et un survol de son libellé. Les mouvements réduits, l’absence de JavaScript/WAAPI, les erreurs d’animation et le retour navigateur doivent laisser tous les contenus et liens disponibles.

La perspective `assets/entree-perspective-3d.webp` est une image d’ambiance générée, 1672 × 941 px, environ 204 Ko, sans script 3D lourd. Les trois dossiers initiaux sont des **études fictives** avec six images d’ambiance générées, explicitement signalées. Ils ne revendiquent aucune réalisation effective. Ne pas inventer de chantier, de plans, de lieu, de diplôme ou de portrait. Le portrait réel et le parcours restent à fournir ; le logo occupe actuellement la place visuelle du bureau sans message de chantier éditorial.

La composition a été étudiée auparavant à partir de Bureau2G (accueil, projets et fiche réellement consultés). Aucun visuel, logo ou texte concurrent n’a été repris. N-Co et Grolaux n’ont pas pu être observés à cause de leurs redirections.

## Contenus et dossiers de projets

`content/site.json` contient identité, coordonnées, biographie, secteur, missions, portrait éventuel, URL publique courante et domaine souhaité. Le champ `legal` accepte adresse professionnelle, numéro d’entreprise et inscription professionnelle ; ces informations n’ont pas été fournies et sont omises des pages. Les compléter avant de présenter les informations légales comme exhaustives.

`content/projects.json` conserve le format version 1. Chaque projet possède titre, catégorie, résumé, paragraphes `description`, couverture, galerie et options `featured`/`sample`. Les champs facultatifs `context`, `approach`, `details` accueillent Contexte / Parti architectural / Matières et détails. `location`, `year`, `mission`, `stage` alimentent les métadonnées. Les champs absents restent compatibles avec les anciens fichiers et les rubriques vides sont masquées. Le rendu dynamique utilise des nœuds texte sûrs.

La sélection d’accueil affiche le premier projet mis en avant dans l’entrée photographique, puis les suivants sans doublon (jusqu’à 3 cartes complémentaires). Le titre de sélection distingue les études fictives d’une sélection contenant de vrais projets. Sans mise en avant, les projets d’accueil sont masqués et les catégories restent accessibles.

### Préparer ses projets

Depuis `gestion.html`, créer/modifier un projet, choisir ses images, textes et rubriques. Décocher « Étude fictive / images d’ambiance » pour une véritable réalisation. Ne renseigner mission, stade, lieu et année qu’avec des informations réelles.

L’outil travaille uniquement dans le navigateur : **aucune sauvegarde automatique, aucune publication directe**. Exporter le ZIP avant fermeture ou actualisation. L’archive contient `content/projects.json` et les nouvelles images utilisées dans `assets/projets/` ; les images déjà publiées ne sont pas recopiées. Décompresser et déposer les fichiers sur `gh-pages`, avec leurs chemins. Les nouvelles fiches génériques se chargent sans reconstruction ; une régénération actualise les pages statiques initiales. Synchroniser tout changement distant du propriétaire avant une nouvelle publication depuis le checkout.

## Contact

Adresse réelle fournie : `Mathias.Gouvart.Architecte@gmail.com`, téléphone `0499455615`. Le formulaire effectue un POST natif vers FormSubmit. Nom, e-mail, type et demande sont requis ; téléphone et lieu sont facultatifs. L’option Permis / Régularisation complète les deux types de projets. Le premier échange et la définition de la mission sont expliqués, sans délai de réponse inventé.

`contact.js` ajoute la validation française accessible et la protection contre les doubles clics. Le captcha du prestataire et le champ piège sont conservés. **L’activation par Mathias et la réception d’une véritable demande restent à confirmer.** Les tests interceptent les POST ; aucun e-mail réel n’est envoyé par les outils. Ne pas prétendre que l’acheminement fonctionne après un simple contrôle de formulaire. Aucun secret applicatif n’est requis.

## Domaine souhaité

Adresse prévue : **www.mathiasgouvartarchitecte.be**. Mathias a confirmé que le domaine n’est pas encore acheté. Le site reste sur :

https://mathgou04-lang.github.io/Mathias-Gouvart-Architecte/

`deployment/domaine.md` fournit les étapes DNS, vérification de propriété, GitHub Pages et HTTPS. `deployment/CNAME.example` est un modèle inactif ; **ne pas publier un CNAME racine avant configuration DNS**, pour préserver le lien actuel. Le champ `publicUrl` reste sur GitHub Pages jusqu’à la connexion effective. Le changer puis régénérer actualise canonical, partage, sitemap et retour FormSubmit. Une adresse e-mail sur le domaine nécessite un service de messagerie distinct ; Gmail reste en place jusque-là.

## Vérifications et publication

```bash
python3 -m py_compile build.py site_extras.py
python3 build.py
node --check entree.js
node --check transitions.js
node --check project-data.js
node --check editor.js
node --check script.js
node --check motion.js
node --check contact.js
```

Vérifier les vrais parcours dans Chromium : Entrer clic/clavier, retour navigateur, absence de JavaScript/WAAPI, réduction des mouvements avant et pendant la visite, navigation vers Accueil sans réafficher l’entrée, catégories, galerie et focus. Vérifier 320/390/768/1024/1440/1920 px et les pages Bureau/Contact/Légal/Gestion. Tester un export ZIP puis import lorsque le modèle de projets change. Pour le formulaire, intercepter l’envoi et ne jamais transmettre de courrier réel sans instruction explicite.

GitHub Pages sert `gh-pages`, racine, mode legacy et `.nojekyll`. Publier uniquement les fichiers relus, générateur et documentation compris ; jamais d’identifiants. Préserver les fichiers distants inconnus et les modifications concurrentes. Une mise à jour de branche doit être un fast-forward, sans force. Un commit ou un build GitHub réussi ne confirme pas la mise en ligne : contrôler HTTP200, ressources exactes et parcours dans le navigateur public. Pages peut prendre plusieurs minutes.

Les captures `apercus/` facilitent la revue mais ne remplacent pas le contrôle du site public. Les instructions cloud enregistrées préparent les reprises ; leur sauvegarde ne publie ni l’environnement ni le site. Les processus et l’authentification temporaires ne doivent pas être supposés persistants.
