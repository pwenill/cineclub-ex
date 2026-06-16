# Veille technologique - CineClub / Node.js + TypeScript

## Source 1 : Node Weekly

- **URL** : https://nodeweekly.com/
- **Frequence** : Hebdomadaire, le jeudi.
- **Categorie** : Newsletter technique Node.js.
- **Actualite recente** : Issue #617 du 26 mars 2026. La newsletter signale les security releases Node.js du 24 mars 2026, avec des correctifs sur TLS, HTTP/HTTP2, le Permission Model, HMAC, URL et V8 hashing. Pour CineClub, cela rappelle qu'une API Express doit suivre les versions LTS de Node.js et tester les montées de version avant production.

## Source 2 : CVE / MITRE

- **URL** : https://www.cve.org/
- **Frequence** : Hebdomadaire, et immediatement lors d'une alerte critique.
- **Categorie** : Catalogue public des vulnerabilites.
- **Actualite recente** : CVE-2026-21710, publiee le 30 mars 2026, documente un deni de service sur les serveurs HTTP Node.js via un header `__proto__` et `req.headersDistinct`. Pour CineClub, c'est un signal direct : ne jamais manipuler les headers/proprietes d'entree sans garde, garder Node.js a jour, et conserver les tests de payloads malveillants.

## Source 3 : Snyk Vulnerability DB

- **URL** : https://security.snyk.io/
- **Frequence** : Hebdomadaire, puis a chaque modification de `package-lock.json`.
- **Categorie** : Base de vulnerabilites npm et dependances open source.
- **Actualite recente** : Le 27 mai 2026, Snyk liste une vulnerabilite de type CSV Injection dans `json-2-csv`. Meme si CineClub ne depend pas de ce paquet, le cas est utile : un export CSV futur devra echapper les cellules commencant par `=`, `+`, `-` ou `@` pour eviter l'execution de formules dans un tableur.

## Source 4 : Express Security Updates

- **URL** : https://expressjs.com/en/blog/
- **Frequence** : Hebdomadaire, avec verification apres chaque ajout de middleware.
- **Categorie** : Securite Express et middlewares HTTP.
- **Actualite recente** : Le 31 mai 2026, Express annonce des correctifs `multiparty` 4.3.0 pour trois vulnerabilites DoS high severity liees au parsing multipart. CineClub n'a pas encore d'upload, mais si une route d'affiche ou de photo est ajoutee, il faudra auditer le parseur multipart et limiter taille, type MIME et temps de traitement.

## Source 5 : Node.js Blog

- **URL** : https://nodejs.org/en/blog/
- **Frequence** : Hebdomadaire, plus verification avant chaque upgrade de runtime.
- **Categorie** : Releases officielles Node.js, LTS et vulnerabilites.
- **Actualite recente** : Le blog Node.js publie Node.js 26.3.0 le 1er juin 2026 et Node.js 24.16.0 LTS le 21 mai 2026. Pour CineClub, la cible stable reste la ligne LTS ; les versions Current servent a anticiper les changements, pas a deployer sans validation.
