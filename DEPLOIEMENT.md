# Guide de déploiement sur VPS

Ce document explique ce qui a changé dans le projet et comment le mettre en ligne
sur un serveur, de zéro. Il est autonome : il n'y a rien à savoir du déploiement
précédent pour le suivre.

---

## 1. En résumé

L'application tournait sur **Vercel**, avec une base **PostgreSQL hébergée chez
Supabase**. Elle tourne désormais entièrement sur **un seul serveur**, en trois
conteneurs Docker :

| Conteneur | Rôle |
| --- | --- |
| `app` | L'application Next.js |
| `db` | La base de données MariaDB, avec ses données dans un volume Docker |
| `caddy` | *(optionnel)* Reverse proxy HTTPS, avec certificat Let's Encrypt automatique |

Plus aucun service externe n'est nécessaire. Le déploiement complet tient en
trois commandes, détaillées à la section 4.

---

## 2. Ce qui a été modifié dans le projet

### Base de données : PostgreSQL/Supabase → MariaDB

L'application n'utilisait pas le SDK Supabase, uniquement l'ORM **Prisma** branché
sur du PostgreSQL. Le changement s'est donc limité au pilote de base de données :

- `lib/db.ts` utilise maintenant `@prisma/adapter-mariadb` au lieu de
  `@prisma/adapter-pg`
- `prisma/schema.prisma` déclare `provider = "mysql"` (le dialecte commun à MySQL
  et MariaDB) au lieu de `postgresql`
- Le contournement `NODE_TLS_REJECT_UNAUTHORIZED = "0"`, qui désactivait la
  vérification des certificats TLS pour Supabase, a été supprimé : il n'a plus de
  raison d'être et affaiblissait la sécurité
- Nouveau fichier `lib/db-config.ts` : il traduit l'URL de connexion en options
  pour le pilote MariaDB. C'est nécessaire parce que les outils Prisma exigent une
  URL en `mysql://` alors que le pilote MariaDB n'accepte que `mariadb://` ; ce
  fichier permet de n'avoir **qu'une seule variable** `DATABASE_URL` pour les deux.

Le schéma des données est inchangé : une seule table `User`. Les grilles de loto
ne sont pas concernées, elles restent stockées dans le navigateur.

### Migrations de base de données

Auparavant, la commande de build lançait `prisma db push` puis le seed. C'était
incompatible avec Docker : pendant la construction d'une image, aucune base n'est
joignable.

Désormais :

- une **migration versionnée** est présente dans `prisma/migrations/`
- elle est appliquée **au démarrage du conteneur**, par `docker/entrypoint.sh`
- le script attend que la base réponde (30 tentatives, environ une minute) avant
  d'abandonner, ce qui évite les échecs au tout premier lancement

### Compte administrateur

Le mot de passe de l'administrateur était **écrit en clair dans le code source**
(`prisma/seed.mts`). Il est maintenant lu depuis les variables `ADMIN_USERNAME` et
`ADMIN_PASSWORD` du fichier `.env`.

Le compte est créé **uniquement s'il n'existe pas déjà** : un mot de passe modifié
depuis l'interface d'administration n'est jamais réinitialisé par un redémarrage.

> ⚠️ L'ancien mot de passe reste visible dans l'historique Git du projet. Il doit
> être considéré comme compromis : n'utilisez pas le même sur le nouveau serveur.

### Fichiers ajoutés

| Fichier | Rôle |
| --- | --- |
| `Dockerfile` | Construction de l'image de l'application (Node 24 LTS, exécution sans privilèges root) |
| `compose.yaml` | Description des services `app`, `db` et `caddy` |
| `.env.example` | Modèle de configuration à copier en `.env` |
| `.dockerignore` | Empêche les secrets et fichiers inutiles d'entrer dans l'image |
| `docker/entrypoint.sh` | Migrations + création de l'admin au démarrage |
| `docker/Caddyfile` | Configuration du reverse proxy HTTPS |
| `scripts/migrate-supabase-to-mariadb.ts` | Reprise des comptes depuis l'ancienne base Supabase |
| `prisma/migrations/` | Migration initiale de la base |

L'ancien `app/Dockerfile` a été supprimé : il était basé sur Node 18 (obsolète) et
son build ne pouvait pas aboutir sans base de données accessible.

---

## 3. Prérequis sur le serveur

- Une machine sous Linux (Debian ou Ubuntu récent recommandé), avec un accès SSH
- Environ 5 Go d'espace disque libre
- 2 Go de RAM au minimum

### Installer Docker

Si Docker n'est pas déjà présent :

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Déconnectez-vous puis reconnectez-vous pour que l'ajout au groupe `docker` prenne
effet, et vérifiez :

```bash
docker --version
docker compose version
```

Les deux commandes doivent répondre. `docker compose` (en deux mots) est la version
actuelle ; l'ancienne commande `docker-compose` n'est pas utilisée ici.

### Ouvrir les ports

Si un pare-feu est actif (`ufw`) :

```bash
# Avec le reverse proxy HTTPS (recommandé)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Sans reverse proxy, pour joindre l'application directement
sudo ufw allow 3000/tcp
```

Le port de la base de données n'est **jamais** à ouvrir : elle n'est accessible que
depuis le réseau interne de Docker.

---

## 4. Déploiement

### Étape 1 — Récupérer le projet

```bash
git clone https://github.com/aepby/loto.git
cd loto
git checkout home
```

### Étape 2 — Créer le fichier de configuration

```bash
cp .env.example .env
```

Générez les trois secrets nécessaires :

```bash
openssl rand -hex 32   # pour JWT_SECRET
openssl rand -hex 24   # pour MARIADB_PASSWORD
openssl rand -hex 24   # pour MARIADB_ROOT_PASSWORD
```

Ouvrez ensuite `.env` (`nano .env`) et remplacez **toutes** les valeurs contenant
`change_me` :

```ini
MARIADB_DATABASE=loto
MARIADB_USER=loto
MARIADB_PASSWORD=<le premier openssl rand -hex 24>
MARIADB_ROOT_PASSWORD=<le second openssl rand -hex 24>

JWT_SECRET=<le openssl rand -hex 32>

ADMIN_USERNAME=thomas
ADMIN_PASSWORD=<un mot de passe solide, différent de l'ancien>

APP_PORT=3000
```

Deux points d'attention :

- **Les mots de passe de base de données ne doivent contenir que des lettres et
  des chiffres.** Ils sont insérés dans une URL de connexion, et un caractère comme
  `@`, `:`, `/` ou `#` la casserait. C'est pour cela que `openssl rand -hex` est
  recommandé : il ne produit que des caractères sûrs.
- Il n'y a **pas** de `DATABASE_URL` à renseigner : Docker Compose la construit
  tout seul à partir des variables ci-dessus.

### Étape 3 — Lancer

```bash
docker compose up -d --build
```

La première exécution prend plusieurs minutes (construction de l'image). Elle
enchaîne automatiquement : démarrage de MariaDB, attente que la base soit prête,
création des tables, création du compte administrateur, puis démarrage de
l'application.

L'application répond alors sur `http://<ip-du-serveur>:3000`.

---

## 5. Vérifier que tout fonctionne

```bash
# Les deux services doivent être "Up", la base marquée "healthy"
docker compose ps

# Doit afficher : migration appliquée, admin créé, puis "Ready"
docker compose logs app
```

Sortie attendue au premier démarrage :

```
Applying migration `20260728123354_init`
All migrations have been successfully applied.
Admin user 'thomas' seeded successfully.
✓ Ready in 185ms
```

Testez ensuite la connexion depuis un navigateur avec les identifiants
`ADMIN_USERNAME` / `ADMIN_PASSWORD` définis dans `.env`.

---

## 6. Mettre en HTTPS avec un nom de domaine

### Configurer le DNS

Chez le registrar du domaine (OVH, Cloudflare, Gandi…), créez :

| Type | Nom | Cible |
| --- | --- | --- |
| `A` | `@` ou un sous-domaine | Adresse IPv4 publique du serveur |
| `AAAA` | idem | Adresse IPv6 (facultatif) |

Attendez la propagation, 5 à 10 minutes en général. Pour vérifier :

```bash
dig +short loto.mondomaine.fr
```

L'IP du serveur doit s'afficher.

### Activer le proxy

Complétez `.env` :

```ini
DOMAIN=loto.mondomaine.fr
ACME_EMAIL=votre.adresse@exemple.fr
APP_PORT=127.0.0.1:3000
```

`APP_PORT=127.0.0.1:3000` restreint l'accès direct à l'application : seul le proxy
pourra la joindre, et tout le trafic passera par HTTPS.

Puis :

```bash
docker compose --profile proxy up -d --build
```

Caddy obtient le certificat Let's Encrypt automatiquement et le renouvelle seul.
Le site est accessible en `https://loto.mondomaine.fr`, et les visiteurs arrivant
en `http://` sont redirigés.

> Le certificat ne peut être délivré que si le domaine pointe déjà vers le serveur
> et que les ports 80 et 443 sont libres et ouverts.

---

## 7. Récupérer les comptes de l'ancienne base Supabase

À faire **une seule fois**, si des comptes utilisateurs doivent être conservés.
Cette étape est inutile si les comptes sont recréés à la main.

Le script préserve les identifiants et les mots de passe (déjà chiffrés), et ignore
les comptes déjà présents dans la nouvelle base.

Il s'exécute depuis une machine ayant Node.js et un accès aux deux bases — le plus
simple est de le lancer depuis le serveur lui-même :

1. Ouvrir temporairement le port de la base, en décommentant dans `compose.yaml` :

   ```yaml
       ports:
         - "127.0.0.1:3306:3306"
   ```

   puis appliquer : `docker compose up -d db`

2. Installer les dépendances et lancer le script :

   ```bash
   npm install

   SUPABASE_DATABASE_URL="postgresql://postgres:<mot-de-passe>@<hôte-supabase>:5432/postgres?sslmode=require" \
   DATABASE_URL="mysql://loto:<MARIADB_PASSWORD>@127.0.0.1:3306/loto" \
   npx tsx scripts/migrate-supabase-to-mariadb.ts
   ```

   Sortie attendue :

   ```
   Read 3 user(s) from Supabase.
     'thomas' already exists, left unchanged.
   Done: 2 inserted, 1 skipped.
   ```

3. **Recommenter la section `ports`** dans `compose.yaml`, puis
   `docker compose up -d db` pour refermer l'accès.

Si la connexion à Supabase est refusée pour un motif de certificat, remplacez
`sslmode=require` par `sslmode=no-verify` dans l'URL.

---

## 8. Au quotidien

```bash
# Consulter les journaux en direct
docker compose logs -f app

# Redémarrer l'application seule
docker compose restart app

# Tout arrêter (les données sont conservées)
docker compose down

# Tout relancer
docker compose up -d
```

### Déployer une nouvelle version du code

```bash
git pull
docker compose up -d --build
```

Les éventuelles nouvelles migrations de base sont appliquées automatiquement au
redémarrage.

### Sauvegarder la base

À faire régulièrement, idéalement via une tâche `cron` :

```bash
docker compose exec db sh -c \
  'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction "$MARIADB_DATABASE"' \
  > backup-$(date +%F).sql
```

### Restaurer une sauvegarde

```bash
docker compose exec -T db sh -c \
  'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' < backup-2026-07-28.sql
```

### Ouvrir une console SQL

```bash
docker compose exec db mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" loto
```

---

## 9. Dépannage

| Symptôme | Cause et solution |
| --- | --- |
| `required variable MARIADB_DATABASE is missing a value` | Le fichier `.env` est absent ou incomplet. Repartir de `cp .env.example .env` |
| Le conteneur `app` redémarre en boucle au premier lancement | La base met du temps à s'initialiser. L'entrypoint réessaie pendant une minute. Si l'erreur persiste : `docker compose logs db` |
| `Access denied for user` | Un mot de passe de `.env` a été modifié **après** le premier démarrage. MariaDB ne lit ces variables qu'à la création initiale du volume. Soit remettre l'ancien mot de passe, soit repartir de zéro avec `docker compose down -v` (⚠️ **efface toutes les données**) |
| Le certificat HTTPS n'est pas délivré | Le domaine ne pointe pas encore vers le serveur, ou les ports 80/443 sont occupés (`sudo ss -tlnp | grep -E ':80|:443'`) |
| Déconnexion de tous les utilisateurs après un déploiement | `JWT_SECRET` a changé, ce qui invalide les sessions. Il suffit de se reconnecter |
| `DATABASE_URL is not set` lors d'un `npm run build` hors Docker | Normal : l'application a besoin de cette variable même pour compiler. Elle est fournie automatiquement dans Docker |

---

## 10. Sécurité — à ne pas négliger

- Le fichier `.env` contient tous les secrets. Il est exclu de Git (`.gitignore`)
  et ne doit **jamais** être commité ni transmis par messagerie.
- L'ancien mot de passe administrateur figure dans l'historique Git : il est à
  considérer comme public. Un mot de passe différent doit être utilisé.
- La base de données n'est joignable que depuis le réseau interne de Docker. Éviter
  de laisser la section `ports` du service `db` décommentée après une opération de
  maintenance.
- Les sauvegardes contiennent les mots de passe chiffrés des comptes : les stocker
  dans un emplacement à accès restreint.
- Prévoir de tenir le serveur à jour (`sudo apt update && sudo apt upgrade`) et de
  reconstruire l'image de temps en temps pour récupérer les correctifs de sécurité
  des images de base.
