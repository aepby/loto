docker-compose up -d --build


Va dans le panneau DNS de ton registrar (OVH, Cloudflare, Gandi, etc.) :

Créer un enregistrement :

Type	Nom	Cible
A	    @	IP publique de ton serveur
AAAA	@	(facultatif si IPv6)

Ensuite attends 5–10 minutes.