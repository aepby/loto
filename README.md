# Loto

## Déploiement (Docker)

Aucun fichier `.env` n'est nécessaire : toute la configuration est dans `docker-compose.yml`.

1. Ouvre `docker-compose.yml` et modifie les valeurs marquées `CHANGE ME` :
   - le mot de passe Postgres, **identique aux 3 endroits** (1) (2) (3) ;
   - `JWT_SECRET`, une chaîne aléatoire d'au moins 32 caractères (`openssl rand -base64 32`).
2. Lance :

```bash
docker compose up -d --build
```

Le site est ensuite accessible sur le port 3000. Au premier démarrage, le schéma de la base est créé et le compte admin est ajouté automatiquement.

Pour changer le mot de passe Postgres après le premier démarrage, il faut réinitialiser le volume (`docker compose down -v`) puis relancer.

## DNS

Va dans le panneau DNS de ton registrar (OVH, Cloudflare, Gandi, etc.) :

Créer un enregistrement :

Type	Nom	Cible
A	    @	IP publique de ton serveur
AAAA	@	(facultatif si IPv6)

Ensuite attends 5–10 minutes.
