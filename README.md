# 🎬 CinéClub Réunion — Back-end (CP8 SC1 + SC2)

Back-end Node.js / TypeScript qui héberge la **DAL (Data Access Layer)** du projet CinéClub Réunion.
Il expose deux connexions d'infrastructure :

- **MySQL** (SGBD relationnel) — données transactionnelles : films, séances, réservations, utilisateurs.
- **MongoDB** (SGBD NoSQL) — données documentaires : avis, logs, contenus riches, sessions.

---

## 📁 Arborescence

```
cineclub-backend/
├── package.json
├── tsconfig.json           # strict: true
├── docker-compose.yml      # MySQL + phpMyAdmin + MongoDB + Mongo Express
├── docker/
│   ├── mysql/init/         # Scripts SQL exécutés au 1er démarrage
│   └── mongo/init/         # Script JS exécuté au 1er démarrage
├── .env.example            # modèle à copier en .env
├── .gitignore
├── README.md
└── src/
    ├── infra/              # Accès bas-niveau aux SGBD
    │   ├── mysql.ts        # Pool mysql2 + testConnection()
    │   └── mongodb.ts      # connectMongo() + listeners
    ├── entities/           # Types métier
    ├── models/             # Modèles Mongoose
    ├── schemas/            # Schémas Zod d'entrée
    ├── dtos/               # DTO de sortie API
    ├── repositories/       # CRUD SQL + NoSQL (CP8 SC2)
    └── index.ts            # Bootstrap : 2 connexions avant Express
```

---

## 🐳 Démarrage avec Docker (recommandé)

Plutôt que d'installer MySQL et MongoDB sur ta machine, lance toute la stack
avec Docker Compose :

```bash
# 1. Copier les variables d'environnement
cp .env.example .env

# 2. Lancer MySQL + phpMyAdmin + MongoDB + Mongo Express
docker compose up -d

# 3. Vérifier que tout est up et healthy
docker compose ps
```

### Services disponibles

| Service         | URL / Port                              | Identifiants par défaut               |
|-----------------|-----------------------------------------|---------------------------------------|
| MySQL           | `localhost:3306`                        | `cineclub_app` / `Cin3club!App2026`   |
| phpMyAdmin      | http://localhost:8080                   | saisir `cineclub_app` ou `root`       |
| MongoDB         | `localhost:27017`                       | `cineclub_app` / `Cin3club!App2026`   |
| Mongo Express   | http://localhost:8081                   | `admin` / `admin` (basic auth IHM)    |

### Commandes utiles

```bash
docker compose logs -f mysql          # suivre les logs MySQL
docker compose logs -f mongodb        # suivre les logs Mongo
docker compose ps                      # état des conteneurs
docker compose restart mysql           # redémarrer un service
docker compose down                    # arrêter (données conservées)
docker compose down -v                 # arrêter + SUPPRIMER les volumes (reset)
docker compose exec mysql mysql -ucineclub_app -p cineclub
docker compose exec mongodb mongosh -u cineclub_app -p --authenticationDatabase cineclub
```

### Ce que font les scripts d'init

Au **premier démarrage seulement** (volume vide), Docker exécute :

- **`docker/mysql/init/01-init-cineclub.sql`** :
  - Révoque les privilèges par défaut de `cineclub_app`
  - Ré-accorde uniquement `SELECT, INSERT, UPDATE, DELETE` (moindre privilège)
  - Crée les tables `film`, `salle`, `seance` + jeu de données démo
- **`docker/mongo/init/01-init-cineclub.js`** :
  - Crée `cineclub_app` avec rôle `readWrite` sur la base `cineclub`
  - Crée la collection `reviews` avec un `$jsonSchema` validator + index
  - Insère 2 documents de démo

> ⚠️ Pour que les scripts soient ré-exécutés, il faut repartir d'un volume
> vide : `docker compose down -v && docker compose up -d`.

---

---

## ⚙️ Installation

```bash
# 1. Dépendances
npm install

# 2. Variables d'environnement
cp .env.example .env
# puis éditer les mots de passe

# 3. Lancer en dev
npm run dev

# 4. Build + run en prod
npm run build && npm start
```

---

## 🐬 Étape 2 — Connexion MySQL

### Création du compte SGBD `cineclub_app`

Se connecter en **root** (ou DBA) et exécuter :

```sql
-- 1. Base de données (si pas encore créée)
CREATE DATABASE IF NOT EXISTS cineclub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 2. Compte applicatif (hôte local uniquement — à adapter en prod)
CREATE USER 'cineclub_app'@'localhost'
  IDENTIFIED BY 'Cin3club!App2026';

-- 3. Privilèges STRICTEMENT nécessaires (principe du moindre privilège)
GRANT SELECT, INSERT, UPDATE, DELETE
  ON cineclub.*
  TO 'cineclub_app'@'localhost';

-- Pas de CREATE / ALTER / DROP / GRANT : les migrations se font
-- avec un autre compte DBA dédié.

FLUSH PRIVILEGES;

-- 4. Vérification
SHOW GRANTS FOR 'cineclub_app'@'localhost';
```

### Test manuel

```bash
mysql -u cineclub_app -p cineclub
> SELECT 1;
```

---

## 🍃 Étape 3 — Connexion MongoDB

### Installation

**Option A — MongoDB local (Linux / macOS) :**
```bash
# macOS
brew tap mongodb/brew && brew install mongodb-community@7.0
brew services start mongodb-community@7.0

# Ubuntu / Debian
sudo apt install mongodb
sudo systemctl start mongod
```

**Option B — MongoDB Atlas** (cloud gratuit) : créer un cluster M0 sur
https://www.mongodb.com/atlas et récupérer l'URI.

### Création du compte `cineclub_app`

Se connecter avec `mongosh` en admin :

```js
use cineclub;

db.createUser({
  user: "cineclub_app",
  pwd:  "Cin3club!App2026",
  roles: [
    { role: "readWrite", db: "cineclub" }
  ]
});

// Vérification
db.getUsers();
```

### Test manuel

```bash
mongosh "mongodb://cineclub_app:Cin3club!App2026@localhost:27017/cineclub?authSource=cineclub"
> db.runCommand({ ping: 1 });
```

---

## 🚀 Bootstrap

Le fichier `src/index.ts` enchaîne, **dans l'ordre** :

1. `dotenv/config` — charge `.env`
2. `testMySQL()` — `SELECT 1` sur le pool MySQL
3. `connectMongo()` + `pingMongo()` — handshake MongoDB
4. `app.listen(PORT)` — Express ne démarre que si 1 + 2 + 3 OK
5. Écoute de `SIGINT` / `SIGTERM` pour un shutdown gracieux

---

## 🔐 SC2 — CRUD sécurisé SQL + NoSQL

Routes ajoutées :

| Méthode | Route              | Rôle |
|---------|--------------------|------|
| GET     | `/adherents`       | Liste les adhérents MySQL |
| GET     | `/adherents/:id`   | Lit un adhérent |
| POST    | `/adherents`       | Crée un adhérent avec validation Zod |
| PUT     | `/adherents/:id`   | Met à jour un adhérent |
| DELETE  | `/adherents/:id`   | Supprime un adhérent |
| GET     | `/films/:id/avis`  | Liste les avis publiés d'un film |
| POST    | `/films/:id/avis`  | Crée un avis MongoDB |
| GET     | `/avis/:id`        | Lit un avis |
| PUT     | `/avis/:id`        | Met à jour un avis avec `runValidators: true` |
| DELETE  | `/avis/:id`        | Supprime un avis |

Tests rapides :

```bash
npm run build
npm run dev

curl -i http://localhost:3000/health
curl -i http://localhost:3000/adherents

curl -i -X POST http://localhost:3000/adherents \
  -H 'Content-Type: application/json' \
  -d '{"nom":"Test","prenom":"SC2","email":"test.sc2@example.re","telephone":"0692123456"}'

curl -i -X POST http://localhost:3000/adherents \
  -H 'Content-Type: application/json' \
  -d '{"nom":"Bad","prenom":"Email","email":"pas-un-email"}'

curl -i -X POST http://localhost:3000/films/1/avis \
  -H 'Content-Type: application/json' \
  -d '{"adherentId":1,"note":4,"commentaire":"Avis de test","tags":["test"],"photos":[]}'

curl -i -X POST http://localhost:3000/films/1/avis \
  -H 'Content-Type: application/json' \
  -d '{"adherentId":1,"note":{"$ne":null},"commentaire":"attaque"}'
```

> Si tes volumes Docker datent de la SC1, les scripts d'init ne seront pas
> rejoués automatiquement. Applique les migrations non destructives :
>
> ```bash
> docker exec -i cineclub-mysql mysql -uroot -pR00t!Cin3club2026 cineclub \
>   < docker/mysql/migrations/20260429-sc2-adherent.sql
>
> docker cp docker/mongo/migrations/20260429-sc2-avis.js cineclub-mongo:/tmp/sc2-avis.js
> docker exec cineclub-mongo mongosh \
>   "mongodb://root:R00t!Cin3club2026@localhost:27017/admin" \
>   --quiet /tmp/sc2-avis.js
> ```
>
> Si tu n'as aucune donnée à conserver, l'autre option est un reset complet :
> `docker compose down -v && docker compose up -d`.

---

## ✅ Livrable

```bash
git add .
git commit -m "feat: CP8 SC2 CRUD sécurisé SQL + NoSQL"
git push
```

---

## 🎓 Questions que le jury peut poser — et leurs réponses

### 🏗️ Architecture générale

**Q1. Pourquoi sépares-tu `infra/` et `repositories/` ?**
> Pour respecter le principe de **séparation des responsabilités** (SoC) et l'inversion de dépendance (D de SOLID). `infra/` contient le « comment » (driver mysql2, mongoose, pools, listeners). `repositories/` contient le « quoi » (FilmRepository.findById, ReservationRepository.create). Les repositories dépendent d'**abstractions** (interfaces) et non du driver. Demain, si je passe de MySQL à PostgreSQL, je ne touche qu'à `infra/` : la couche métier reste intacte.

**Q2. Pourquoi Node.js + TypeScript ?**
> Node.js pour la concurrence non-bloquante (event loop) parfaite pour une API I/O-bound (beaucoup de requêtes DB). TypeScript parce que `strict: true` détecte au build 80 % des bugs typiques JS (undefined, mauvais types), améliore la maintenabilité et sert de **documentation vivante** des contrats d'API.

**Q3. Pourquoi deux SGBD ? Ce n'est pas de la sur-ingénierie ?**
> Non, c'est du **polyglot persistence**. MySQL pour tout ce qui exige **transactions ACID** (réservation d'un siège = débit billet + écriture réservation atomique) et **intégrité relationnelle** (clés étrangères Film/Séance/Salle). MongoDB pour les **documents hétérogènes** (avis avec photos / notes / commentaires imbriqués) où le schéma relationnel serait rigide et coûteux en JOIN. On joue chaque SGBD sur son terrain.

---

### 🔐 Sécurité

**Q4. Pourquoi créer un compte `cineclub_app` au lieu d'utiliser `root` ?**
> **Principe du moindre privilège** (OWASP A01). Si un jour une injection SQL passe ou qu'un attaquant récupère le `.env`, il ne pourra pas faire `DROP TABLE`, créer d'utilisateurs, ou lire d'autres bases. Le compte applicatif ne peut que `SELECT/INSERT/UPDATE/DELETE` sur `cineclub.*`. Les migrations de schéma se font avec un autre compte DBA dédié, exécuté manuellement ou via CI.

**Q5. Pourquoi `multipleStatements: false` dans le pool MySQL ?**
> Par défaut mysql2 refuse les multi-statements, mais je l'explicite. Ça empêche une attaque type `SELECT * FROM films WHERE id=1; DROP TABLE users;--` si un paramètre non échappé était concaténé. Associé aux **requêtes préparées** (placeholders `?`) côté repository, c'est une double protection contre l'injection SID.

**Q6. Comment protèges-tu les secrets (mot de passe DB) ?**
> 1) Ils sont dans `.env`, qui est listé dans `.gitignore` (jamais commit). 2) Je fournis `.env.example` sans valeurs réelles comme modèle. 3) En production, les secrets viennent d'un gestionnaire (AWS Secrets Manager, Vault, GitHub Actions secrets). 4) `requireEnv()` lève une erreur au démarrage si une variable manque → pas de démarrage silencieux avec config partielle.

**Q7. Que se passe-t-il si quelqu'un lit ton code source ? Peut-il attaquer la DB ?**
> Non : le code contient uniquement la logique (noms de variables d'env). Les credentials sont dans `.env` côté serveur, non versionné. Sans accès au serveur ou aux secrets, il n'a rien.

---

### 🧱 MySQL — choix techniques

**Q8. Pourquoi un `pool` au lieu d'une `connection` unique ?**
> Une API HTTP traite **N requêtes concurrentes**. Avec une seule connexion, elles seraient sérialisées → énorme goulot d'étranglement. Le pool maintient jusqu'à `connectionLimit` (ici 10) sockets TCP ouverts, qu'il réutilise. Chaque handler HTTP fait `pool.getConnection()` → `query()` → `release()`. Le handshake TCP+auth n'a lieu qu'à la 1re requête, pas à chaque appel.

**Q9. Pourquoi `mysql2/promise` et pas `mysql2` classique ?**
> Pour écrire du code `async/await` propre. Le callback hell de l'API classique est illisible et gère mal les erreurs. Avec `/promise`, j'ai un `try/catch` standard et les erreurs remontent naturellement.

**Q10. Que fait exactement `SELECT 1` ?**
> C'est un **healthcheck**. La requête est triviale (pas besoin de table), mais elle vérifie : (1) le serveur MySQL écoute, (2) le DNS résout l'host, (3) le port est ouvert, (4) les credentials sont bons, (5) la base `cineclub` est sélectionnable. Si l'un de ces 5 échoue, je fail-fast au démarrage.

**Q11. Pourquoi `timezone: 'Z'` ?**
> Pour forcer UTC côté driver. Sinon mysql2 applique la timezone du serveur Node, La Réunion est à UTC+4, et on se retrouve avec des décalages de 4 h entre `NOW()` MySQL et `new Date()` JS. En UTC partout, on convertit uniquement à l'affichage côté front.

---

### 🍃 MongoDB — choix techniques

**Q12. Pourquoi Mongoose plutôt que le driver natif `mongodb` ?**
> Mongoose apporte : (a) **schémas + validation** (je définis `reviewSchema` avec types, obligatoires, regex — defense in depth avec Zod), (b) **hooks** (`pre('save')` pour hasher un mot de passe), (c) **populate** pour les références, (d) gestion de reconnexion auto. Le driver natif est plus rapide mais m'oblige à tout ré-écrire.

**Q13. Pourquoi attacher les listeners `connected` / `disconnected` / `error` ?**
> Observabilité. En production je dois savoir **immédiatement** si la DB tombe. Ces événements peuvent être branchés sur un logger (Winston/Pino) + alerting (Datadog, Sentry). Sans listeners, une déconnexion silencieuse produit des requêtes qui échouent sans cause claire.

**Q14. `serverSelectionTimeoutMS: 5000`, pourquoi ?**
> Par défaut Mongoose attend 30 s avant d'abandonner. Si Mongo est down au démarrage, mon app mettrait 30 s à fail. 5 s c'est suffisant pour détecter un vrai problème réseau sans bloquer le bootstrap inutilement.

**Q15. `bufferCommands: false`, qu'est-ce que ça change ?**
> Par défaut Mongoose **met en file d'attente** les requêtes si la connexion n'est pas prête. Problème : en cas de Mongo down, les requêtes s'accumulent silencieusement puis timeout une par une. Avec `false`, elles échouent immédiatement → je détecte le problème plus vite.

---

### 🚦 Bootstrap & résilience

**Q16. Pourquoi tester les deux connexions **avant** `app.listen()` ?**
> **Fail-fast.** Si je démarrais Express d'abord, il accepterait des requêtes HTTP qui plantent toutes sur la DAL → 500 pour les utilisateurs. En vérifiant avant, soit tout est OK et on répond, soit on quitte avec `exit(1)` et Docker/PM2/systemd redémarre le conteneur. C'est le pattern de **readiness probe** Kubernetes.

**Q17. Que fait ton `SIGTERM` handler ?**
> Shutdown gracieux. Quand Docker envoie `SIGTERM` (par défaut 10 s avant `SIGKILL`), je : (1) `server.close()` pour refuser les nouvelles connexions HTTP, (2) attends la fin des requêtes en cours, (3) ferme le pool MySQL, (4) ferme Mongoose, (5) `exit(0)`. Sans ça, je laisse des sockets à demi-ouvertes côté DB.

**Q18. Que se passe-t-il si MongoDB tombe PENDANT l'exécution ?**
> Mongoose tente la reconnexion automatique en arrière-plan (listener `reconnected`). Avec `bufferCommands: false`, les requêtes échouent immédiatement et remontent au controller → 503 Service Unavailable. Dès que Mongo revient, les requêtes suivantes passent. Pas besoin de redémarrer l'app.

---

### 📐 Qualité, TypeScript & tests

**Q19. Pourquoi `strict: true` dans `tsconfig.json` ?**
> Active 8 checks stricts d'un coup : `noImplicitAny`, `strictNullChecks` (le gros), `strictFunctionTypes`, etc. `strictNullChecks` m'oblige à gérer explicitement `undefined`/`null`, ce qui élimine la famille de bugs la plus fréquente en JS (`Cannot read property 'x' of undefined`).

**Q20. Pourquoi `zod` dans les dépendances si tu ne l'utilises pas encore ?**
> Zod sera utilisé en CP8 SC2 pour **valider les payloads entrants** (body Express) avant de toucher la DAL. Defense in depth : TypeScript valide à la compilation, Zod valide à l'exécution (les données réseau ne sont typées que par convention, pas par contrat).

**Q21. Comment testerais-tu ton module `mysql.ts` ?**
> (a) **Test unitaire** : mocker `mysql2/promise` avec Jest et vérifier que `testConnection()` appelle `getConnection()` puis `release()` même en cas d'erreur (bloc `finally`). (b) **Test d'intégration** : Docker Compose avec un MySQL éphémère, run `testConnection()` pour de vrai, assert pas d'exception. (c) **Test e2e** : lancer `index.ts` et curl `/health`.

**Q22. Comment gères-tu les erreurs dans un handler Express ?**
> Un middleware d'erreur centralisé `(err, req, res, next) => ...` qui : logge avec niveau selon le type d'erreur, cache la stack en prod (sécurité — pas de divulgation d'infos), renvoie un JSON `{ error: { code, message } }` standardisé. Les erreurs métier → 400/404/409, les erreurs DAL → 503.

---

### 🧪 Questions pièges fréquentes

**Q23. C'est quoi la différence entre `db.close()` et `pool.end()` ?**
> `pool.end()` attend la fin des requêtes en cours, ferme toutes les connexions du pool, puis résout la promise. `destroy()` fermerait immédiatement (brutal). Pour un shutdown propre → `end()`.

**Q24. Et si tu devais stocker les tickets dans MongoDB ?**
> Je ne le ferais pas. Un ticket exige une transaction ACID : décrémenter les places dispo **ET** insérer la réservation doivent être atomiques. Mongo fait les transactions depuis la 4.0 mais avec un coût et seulement sur replica set. MySQL fait ça nativement et simplement. **Règle** : les entités avec invariants transactionnels → SQL ; les données documentaires — avis, logs, contenus riches — → NoSQL.

**Q25. Quel est le cycle de vie d'une requête dans ton archi ?**
> HTTP → Express router → middleware validation (Zod) → controller → service métier → repository (interface) → implémentation MySQL ou Mongo → pool/driver → SGBD. La réponse remonte inverse. Chaque couche a une responsabilité unique et est testable isolément.

**Q26. Qu'est-ce qu'une injection SQL et comment tu la préviens ici ?**
> Un attaquant injecte du SQL dans un paramètre (`' OR 1=1--`) qui s'exécute tel quel si la requête est concaténée. Protection : **requêtes préparées** avec placeholders `?` (mysql2) ou `$1` (pg). Le driver envoie requête + paramètres **séparément** au serveur, qui ne les mélange jamais. Zéro interpolation de chaîne dans mon code = immunité.

---

### 🐳 Docker — choix d'infrastructure

**Q27. Pourquoi Docker Compose plutôt que d'installer MySQL et Mongo en local ?**
> Trois raisons : (1) **Reproductibilité** — tout le monde dans l'équipe a exactement la même version de MySQL 8 et Mongo 7, pas de « ça marche chez moi ». (2) **Isolation** — je peux avoir plusieurs projets avec des versions différentes sans conflit de ports ou de config système. (3) **Onboarding** — un nouveau dev clone le repo, fait `docker compose up -d` et il est prêt en 2 minutes, contre parfois une journée pour installer/configurer correctement les SGBD.

**Q28. Que fait concrètement `docker compose up -d` chez toi ?**
> Docker Compose lit `docker-compose.yml`, télécharge les images si absentes (`mysql:8.0`, `phpmyadmin:latest`, `mongo:7`, `mongo-express:latest`), crée le réseau `cineclub-net`, les volumes nommés `cineclub_mysql_data` et `cineclub_mongo_data`, puis démarre les 4 conteneurs en arrière-plan (`-d`). Au 1er démarrage, les scripts dans `docker-entrypoint-initdb.d` s'exécutent automatiquement : ils créent la base + le compte `cineclub_app`.

**Q29. Pourquoi des volumes nommés ? Que se passe-t-il sans ?**
> Les volumes nommés (`mysql_data`, `mongo_data`) **persistent en dehors du conteneur**. Sans eux, les données vivraient dans la couche scriptable du conteneur et disparaîtraient au `docker compose down`. Avec les volumes, je peux recréer le conteneur (upgrade de version, bug) sans perdre les données. Pour un reset total volontaire : `docker compose down -v`.

**Q30. `depends_on: condition: service_healthy`, à quoi ça sert ?**
> Sans ça, `depends_on` attend juste que le **processus** MySQL démarre, pas que MySQL soit **prêt à accepter des connexions**. Résultat : phpMyAdmin démarrerait avant que MySQL ait fini son init et planterait. Avec `service_healthy` + un `healthcheck` (`mysqladmin ping`), phpMyAdmin n'est lancé qu'une fois MySQL réellement opérationnel. C'est le même principe qu'une **readiness probe** Kubernetes.

**Q31. Pourquoi les scripts d'init sont-ils exécutés une seule fois ?**
> Les images officielles `mysql` et `mongo` exécutent les scripts de `/docker-entrypoint-initdb.d/` **uniquement si le dossier de données est vide**. C'est volontaire : on ne veut pas ré-insérer le jeu de démo ou ré-créer les users à chaque restart (ce qui ferait échouer le conteneur car le user existerait déjà). Pour relancer : `docker compose down -v` (supprime les volumes) puis `up -d`.

**Q32. Le compte root MySQL est dans `.env`. C'est sécurisé ?**
> En **dev local**, oui : le conteneur n'est exposé que sur `localhost` et le `.env` est git-ignoré. En **production**, non : les secrets doivent venir d'un gestionnaire dédié (AWS Secrets Manager, HashiCorp Vault, Docker Swarm secrets, Kubernetes Secrets), pas d'un fichier `.env` commit-able par erreur. L'image MySQL supporte `MYSQL_ROOT_PASSWORD_FILE=/run/secrets/mysql_root` pour lire depuis un mount sécurisé.

**Q33. Si l'app Node tourne aussi dans Docker, comment se connecter à MySQL ?**
> Je mets l'app sur le même réseau `cineclub-net` et je remplace `MYSQL_HOST=localhost` par `MYSQL_HOST=mysql` dans `.env` (le nom du service = hostname interne Docker). Docker Compose résout automatiquement `mysql` → l'IP du conteneur. Pas besoin d'exposer les ports vers l'hôte si seul le back-end les utilise.

**Q34. Pourquoi phpMyAdmin et Mongo Express ? Un jury peut te reprocher des outils « trop visuels » ?**
> Je les utilise **uniquement en dev** pour inspecter rapidement les données sans écrire de SQL/mongosh. En prod, ils seraient désactivés ou protégés par VPN. Ils ne remplacent pas la ligne de commande : pour un debug rapide ou un test de permissions, je reste sur `mysql -u cineclub_app -p` et `mongosh`. L'avantage dev reste réel (consulter un schéma, lancer une requête ad-hoc) et ça fait gagner du temps lors de la démo au jury.

**Q35. Comment prouverais-tu au jury que `cineclub_app` est bien limité à CRUD ?**
> Je me connecterais via phpMyAdmin ou CLI en tant que `cineclub_app` et j'essaierais un `CREATE TABLE test (id INT);` : MySQL répondrait `ERROR 1142 (42000): CREATE command denied to user 'cineclub_app'@'%' for table 'test'`. Même preuve côté Mongo : `db.createUser(...)` en tant que `cineclub_app` retournerait `not authorized`. C'est la validation concrète du principe du moindre privilège.

---

## 🧭 Suite (CP8 SC2)

- Implémenter `src/repositories/FilmRepository.ts` (MySQL) et `ReviewRepository.ts` (Mongo)
- Valider les payloads Express avec **zod**
- Routes REST `/films`, `/reservations`, `/reviews`
- Tests d'intégration avec `supertest` + DB éphémère

---

**Livrable :** dépôt Git, commit `feat: CP8 SC1 connexions SQL+NoSQL`.
