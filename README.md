# Mathias Gouvart Architecte

Site français à plusieurs pages, sans dépendance à installer. HTML, CSS et JavaScript natifs ; Python 3 génère les pages statiques initiales.

## Développer

Depuis `/workspace/Mathias-Gouvart-Architecte` :

```bash
python3 build.py
python3 -m http.server 8000 --bind 0.0.0.0
```

Le serveur est nécessaire pour charger les contenus JSON. Une ouverture directe en `file://` conserve les pages statiques mais ne permet pas le rafraîchissement des projets ni l’éditeur. Les processus doivent être relancés dans une nouvelle tâche cloud. Utiliser le checkout existant ; ne pas créer de worktree sans demande explicite.

`build.py` utilise uniquement la bibliothèque standard. Il régénère 11 pages et les versions des ressources CSS/JS. Les images et les polices Manrope et Cormorant Garamond sont auto-hébergées, avec leurs licences SIL OFL. La navigation du site ne requiert aucun service externe ; l’envoi du formulaire utilise FormSubmit.

## Identité visuelle

Palette pierre et sable, cuivre profond et touches dorées du logo. Les dégradés chauds sont plus présents dans l’accueil, les titres de pages, le bandeau contact et les formulaires. Cette direction remplace la palette monochrome de la version6 ; la navigation centrée, la taille compacte des images et les animations sont conservées. Le logo complet corrigé est dans `assets/logo-mathias-gouvart.webp` : lignes et textes noirs, MG et barres dorés, fond transparent. Il est utilisé dans les en-têtes, pieds de page et le panneau du bureau en attente du portrait. Le favicon PNG en dérive. L’ancienne variante carrée lumineuse n’est plus utilisée. Le fichier web a été préparé depuis la dernière image jointe avec l’outil de retouche ; si un original vectoriel/PNG source est fourni, le préférer pour une reproduction exacte.

La navigation Accueil / Projets / Le bureau / Contact est visible et centrée à toutes les largeurs, sans menu hamburger. L’accueil est un portfolio compact avec trois vignettes de hauteur voisine de 240 px à 1440 px ; la couverture d’une fiche est limitée à 400 px de haut. Les photos peuvent être agrandies volontairement dans la galerie. Les grands slogans, le hero plein écran et le diaporama de l’ancienne présentation ont été retirés.

Les références n-co.be, Grolaux et bureau2g ont été demandées, mais aucune n’a pu être consultée depuis cet environnement : boucle301 pour n-co, refus403 du tunnel proxy pour les deux autres après ajout des domaines au brouillon et nouvelle tentative. Ne pas attribuer une observation visuelle de ces sites à ce travail.

## Pages et contenus

- `index.html` : présentation compacte du bureau et trois projets sélectionnés.
- `bureau.html` : présentation et emplacement du portrait.
- `projets.html`, `projets-neufs.html`, `projets-renovations.html` : sélection et deux catégories.
- `projet-*.html` : fiches statiques des trois exemples ; `projet.html?id=identifiant` accueille les nouveaux projets.
- `contact.html`, `merci.html` : formulaire et retour après envoi.
- `gestion.html` : outil de préparation des projets, destiné au propriétaire.
- `content/projects.json` : projets, catégories, images et descriptions.
- `content/site.json` : coordonnées, présentation et chemin du portrait.
- `build.py` : gabarits communs et génération des pages.

Les visuels des trois projets initiaux sont des images d’ambiance générées. Les projets sont fictifs et explicitement signalés. Aucune réalisation, qualification, localisation ou expérience non fournie par Mathias n’est revendiquée. La biographie est une proposition à affiner. Le portrait reste à fournir : ajouter sa photographie dans `assets/`, renseigner `portrait` dans `content/site.json`, puis régénérer.

## Ajouter ses projets

Ouvrir `gestion.html` depuis le serveur ou le site public. Créer/modifier un projet, choisir sa catégorie, ses textes, ses photographies et sa couverture. Cocher la mise en avant pour l’accueil ; décocher « Projet de démonstration » pour une véritable réalisation.

L’outil travaille localement dans le navigateur, sans sauvegarde automatique et sans publication directe. Exporter le ZIP avant de fermer ou d’actualiser la page. L’archive contient `content/projects.json` et les nouvelles images utilisées, sous `assets/projets/`. Les images existantes ne sont pas recopiées. Décompresser puis déposer les dossiers sur la branche `gh-pages` en conservant leurs chemins ; les instructions figurent dans l’outil.

Les listes et fiches relisent le JSON, sans reconstruction nécessaire pour un ajout de projet en ligne. Les nouvelles fiches utilisent la route générique. Une régénération avec Python actualise aussi les versions statiques et les contenus visibles sans JavaScript. Avant une publication depuis ce checkout, récupérer tout changement distant fait par le propriétaire, en particulier le JSON, pour ne pas l’écraser.

## Contact : activation requise

Le formulaire réalise un POST natif vers `https://formsubmit.co/Mathias.Gouvart.Architecte@gmail.com`, avec nom, adresse de réponse, type de projet et demande. JavaScript ajoute la validation française accessible et la protection contre les doubles clics ; sans JavaScript, la validation HTML reste active. Aucun envoi n’est simulé par l’application. Le captcha du prestataire et le champ piège sont conservés.

FormSubmit demande au propriétaire d’activer son adresse au premier envoi. Mathias devra soumettre une demande puis confirmer le message d’activation reçu sur son adresse Gmail. Vérifier ensuite la réception d’une véritable demande avant de considérer l’acheminement opérationnel. Aucun e-mail réel n’a été envoyé par les contrôles automatisés ; les POST de test ont été interceptés dans Chromium. L’accès réseau du cloud aux pages du prestataire reste bloqué par le proxy, même après ajout du domaine au brouillon de configuration ; cela ne prouve pas l’accessibilité depuis le navigateur d’un visiteur.

## Mouvement et accessibilité

Titres révélés mot par mot avec nom accessible conservé, masques d’images avec dézoom, révélations au défilement, microparallaxe au pointeur et au défilement sur ordinateur, transitions entre pages et galeries natives. Les animations restent présentes sur mobile ; les mouvements liés au pointeur y sont désactivés. Sous-menu et galerie gèrent le clavier et le retour de focus. `prefers-reduced-motion` arrête immédiatement les effets, y compris lors d’un changement de préférence. Le défilement reste natif et le contenu reste visible sans les API d’animation. Les nouveaux projets chargés depuis le JSON sont inscrits dans les animations sans rejouer les éléments déjà vus.

Les catégories ont des pages distinctes. Les premières fiches et leurs images restent consultables sans JavaScript ; les projets ajoutés après génération nécessitent JavaScript jusqu’à une nouvelle génération.

## Vérifier

```bash
python3 -m py_compile build.py
python3 build.py
node --check script.js
node --check motion.js
node --check project-data.js
node --check contact.js
node --check editor.js
```

Vérifier également dans Chromium les vraies navigations, les catégories, une fiche avec galerie et clavier, les largeurs 320/390/768/1024/1440/1920, le menu mobile, le retour navigateur et la réduction des mouvements. Pour le formulaire, intercepter le domaine d’envoi dans les tests : ne pas envoyer de courrier réel sans demande explicite. Pour l’éditeur, vérifier un ajout avec photos et l’intégrité du ZIP téléchargé, pas seulement son bouton.

## Publication et environnement

Site public : https://mathgou04-lang.github.io/Mathias-Gouvart-Architecte/

GitHub Pages sert `gh-pages`, dossier racine. `main` est conservée. `.nojekyll` active le service des fichiers statiques. Publier les pages, CSS, JS, `content/`, `assets/`, licences et le générateur/documentation ; ne jamais publier des identifiants. Les captures publiques sont sous `apercus/`.

Les aides de publication et le journal sans secrets sont dans `/workspace/scratch/`. Préserver les fichiers distants inconnus et vérifier les changements concurrents avant toute mise à jour ; ne jamais forcer la branche. Après déploiement, vérifier les pages et les empreintes des ressources à l’adresse publique.

Les instructions cloud enregistrées dans `start_skill` préparent le développement. Leur sauvegarde ne publie ni l’environnement ni le site. Les processus et identifiants temporaires ne doivent pas être supposés persistants.
