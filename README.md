# Loto

Application Next.js d'affichage de tirages de loto/bingo, avec authentification et
panneau d'administration des comptes.

Stack : Next.js 16 · React 19 · Prisma 7 · MariaDB 12.3 · Docker Compose.

L'application est entièrement auto-hébergée : aucun service externe n'est requis
(elle tournait auparavant sur Vercel + Supabase).

> Pour un premier déploiement sur un serveur, suivre **[DEPLOIEMENT.md](DEPLOIEMENT.md)** :
> guide pas à pas, de l'installation de Docker à la mise en HTTPS.

---

## 1. Prérequis sur le VPS

- Docker Engine et le plugin Docker Compose (`docker compose version` doit répondre)
- Les ports 80 et 443 libres si vous utilisez le reverse proxy HTTPS intégré
- Un nom de domaine pointant vers le serveur (voir la section HTTPS)

## 2. Déploiement

```bash
git clone <url-du-repo> loto
cd loto

# 1. Créer le fichier de configuration
cp .env.example .env

# 2. Générer les secrets
openssl rand -hex 32   # -> JWT_SECRET
openssl rand -hex 24   # -> MARIADB_PASSWORD
openssl rand -hex 24   # -> MARIADB_ROOT_PASSWORD

# 3. Éditer .env et remplacer toutes les valeurs "change_me"
nano .env

# 4. Démarrer
docker compose up -d --build
```

L'application est disponible sur `http://<ip-du-serveur>:3000`.

Au premier démarrage, le conteneur applique automatiquement les migrations de
base de données puis crée le compte administrateur défini par `ADMIN_USERNAME` /
`ADMIN_PASSWORD`. Les démarrages suivants ne modifient jamais un compte existant :
un mot de passe changé depuis l'interface est conservé.

Vérifier que tout tourne :

```bash
docker compose ps
docker compose logs -f app
```

## 3. Variables d'environnement

Tout est décrit dans `.env.example`. En résumé :

| Variable | Rôle |
| --- | --- |
| `MARIADB_DATABASE`, `MARIADB_USER`, `MARIADB_PASSWORD` | Base et compte applicatif créés par le conteneur MariaDB |
| `MARIADB_ROOT_PASSWORD` | Compte root de MariaDB (sauvegardes, maintenance) |
| `JWT_SECRET` | Clé de signature des cookies de session. La changer déconnecte tout le monde |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Administrateur créé au premier démarrage uniquement |
| `APP_PORT` | Port d'écoute sur l'hôte (défaut `3000`) |
| `DOMAIN`, `ACME_EMAIL` | Utilisés uniquement par le profil `proxy` (HTTPS) |

`DATABASE_URL` n'est **pas** à renseigner pour un déploiement Docker : Compose la
construit à partir des variables `MARIADB_*`. Les mots de passe étant injectés dans
une URL de connexion, utilisez uniquement des lettres et des chiffres — un `@`, `:`
ou `/` casserait l'URL.

## 4. HTTPS avec un nom de domaine

Chez votre registrar (OVH, Cloudflare, Gandi…), créez un enregistrement DNS :

| Type | Nom | Cible |
| --- | --- | --- |
| `A` | `@` (ou un sous-domaine) | IP publique du serveur |
| `AAAA` | `@` | IPv6 du serveur (facultatif) |

Attendez la propagation (5 à 10 minutes), renseignez `DOMAIN` et `ACME_EMAIL` dans
`.env`, puis démarrez avec le profil `proxy` :

```bash
docker compose --profile proxy up -d --build
```

Caddy obtient et renouvelle automatiquement le certificat Let's Encrypt.

Dans ce cas, l'application n'a plus besoin d'être exposée directement : mettez
`APP_PORT=127.0.0.1:3000` dans `.env` pour ne la rendre accessible qu'au proxy.

## 5. Reprise des données Supabase

Si des comptes existent encore sur l'ancienne base Supabase, un script les recopie
dans MariaDB. Il préserve les identifiants et ignore les comptes déjà présents.

Sur une machine disposant de Node.js et d'un accès aux deux bases :

```bash
npm install

# Ouvrir temporairement le port MariaDB : décommenter la section `ports`
# du service `db` dans compose.yaml, puis `docker compose up -d db`

SUPABASE_DATABASE_URL="postgresql://postgres:<mot-de-passe>@<hote-supabase>:5432/postgres?sslmode=require" \
DATABASE_URL="mysql://loto:<MARIADB_PASSWORD>@127.0.0.1:3306/loto" \
npx tsx scripts/migrate-supabase-to-mariadb.ts
```

Refermez le port de la base ensuite. Si Supabase refuse la connexion TLS, remplacez
`sslmode=require` par `sslmode=no-verify`.

## 6. Exploitation

```bash
# Logs
docker compose logs -f app
docker compose logs -f db

# Redémarrer / arrêter
docker compose restart app
docker compose down

# Mettre à jour après un git pull
git pull && docker compose up -d --build
```

**Sauvegarde de la base** (le volume `mariadb_data` survit à `docker compose down`,
mais pas à `down -v`) :

```bash
docker compose exec db sh -c \
  'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction "$MARIADB_DATABASE"' \
  > backup-$(date +%F).sql
```

**Restauration** :

```bash
docker compose exec -T db sh -c \
  'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' < backup-2026-07-28.sql
```

**Accès direct à la base** :

```bash
docker compose exec db mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" loto
```

## 7. Développement local

Sans Docker, il faut une instance MariaDB accessible et un fichier `.env` contenant
au minimum `DATABASE_URL` et `JWT_SECRET` :

```bash
npm install
npx prisma migrate deploy   # applique le schéma
npm run db:seed             # crée l'administrateur
npm run dev
```

Une base jetable peut être lancée en une commande :

```bash
docker run -d --name loto-db -p 3306:3306 \
  -e MARIADB_ROOT_PASSWORD=root -e MARIADB_DATABASE=loto \
  -e MARIADB_USER=loto -e MARIADB_PASSWORD=loto mariadb:12.3
```

Scripts disponibles : `npm run dev`, `npm run build`, `npm run start`,
`npm run db:migrate`, `npm run db:seed`, `npm run db:studio`.

Après toute modification de `prisma/schema.prisma`, générer la migration
correspondante et la versionner :

```bash
npx prisma migrate dev --name description_du_changement
```

## 8. Dépannage

| Symptôme | Cause probable |
| --- | --- |
| `DATABASE_URL is not set` au build | Normal hors Docker : l'application a besoin de cette variable, même pour `npm run build` |
| L'app redémarre en boucle au premier lancement | La base n'est pas encore prête ; l'entrypoint réessaie 30 fois (1 min) avant d'abandonner. Vérifier `docker compose logs db` |
| `Access denied for user` | `.env` modifié après la création du volume : MariaDB ne rejoue les identifiants qu'à la première initialisation. Supprimer le volume (`docker compose down -v`, **efface les données**) ou changer le mot de passe manuellement |
| Certificat HTTPS non délivré | Le DNS ne pointe pas encore vers le serveur, ou les ports 80/443 sont occupés |
| Impossible de se connecter après un redéploiement | `JWT_SECRET` a changé : les sessions existantes sont invalidées, il suffit de se reconnecter |
