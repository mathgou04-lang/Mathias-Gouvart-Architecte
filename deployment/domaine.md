# Connecter www.mathiasgouvartarchitecte.be

Adresse souhaitée : **https://www.mathiasgouvartarchitecte.be/**.
Le domaine n’est pas encore acheté. Le site fonctionne actuellement à :
https://mathgou04-lang.github.io/Mathias-Gouvart-Architecte/

Le fichier `CNAME.example` est un modèle. Aucun fichier `CNAME` actif n’est publié à la racine : une redirection vers un domaine non configuré couperait l’accès au site actuel.

## Après l’achat du domaine

1. Dans les réglages DNS du fournisseur, créer un enregistrement **CNAME** : nom `www`, cible `mathgou04-lang.github.io` (sans `https://` et sans le nom du dépôt). Retirer uniquement les anciens enregistrements qui entrent en conflit pour `www` ; préserver les enregistrements de messagerie et les autres services.
2. Vérifier la propriété du domaine dans les paramètres GitHub Pages du compte, avec l’enregistrement TXT fourni par GitHub. La valeur est propre au compte ; ne pas en inventer une.
3. Une fois le DNS correct, ajouter `www.mathiasgouvartarchitecte.be` au domaine personnalisé du dépôt, dans **Settings → Pages**. Le contenu du modèle `CNAME.example` peut alors être placé dans un fichier `CNAME` à la racine de `gh-pages`.
4. Attendre la validation DNS et l’émission du certificat HTTPS, puis activer **Enforce HTTPS** lorsque GitHub le permet. Vérifier le site depuis un navigateur externe.
5. Passer `publicUrl` dans `content/site.json` à `https://www.mathiasgouvartarchitecte.be/`, exécuter `python3 build.py` et publier les sorties. Le générateur actualise les liens canoniques, le sitemap, les métadonnées de partage et le retour du formulaire après envoi.

Le nom de domaine s’écrit en minuscules dans les réglages ; cela désigne la même adresse que « www.MathiasGouvartArchitecte.BE ».

Pour que l’adresse sans `www` fonctionne également, configurer sa redirection vers `www` selon les possibilités du fournisseur et la documentation GitHub Pages en vigueur. Ne pas recopier le CNAME de `www` sur le domaine racine sans vérifier les règles du fournisseur.

## Vérifications finales

- `https://www.mathiasgouvartarchitecte.be/` affiche l’entrée 3D.
- « Entrer » ouvre `accueil.html`, et la navigation reste sur le domaine.
- Les images, polices, galeries et pages légales chargent en HTTPS.
- Le formulaire revient sur le nouveau domaine après envoi ; sa réception réelle doit être vérifiée par Mathias après activation de FormSubmit.

L’achat du domaine ne crée pas une boîte e-mail. Une adresse professionnelle associée demandera un service de messagerie et ses propres réglages DNS. L’adresse Gmail fournie reste utilisée tant qu’une nouvelle adresse n’est pas configurée et confirmée.
