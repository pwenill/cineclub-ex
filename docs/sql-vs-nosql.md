# SQL vs NoSQL - CinéClub Réunion

| Entité / besoin | Choix technique | Argument principal |
|---|---|---|
| Adhérents | MySQL | Le schéma est stable et les contraintes d'unicité sur l'email doivent être garanties par la base. |
| Films | MySQL + miroir MongoDB minimal | MySQL reste la source structurée, le miroir MongoDB `films` sert uniquement aux lectures `populate()` et `$lookup` des avis. |
| Séances | MySQL | Les séances dépendent de clés étrangères vers `film` et `salle`, avec des places restantes modifiées dans des transactions. |
| Réservations | MySQL | La réservation doit être ACID : décrément de place, insertion de réservation et paiement initial doivent réussir ou échouer ensemble. |
| Avis | MongoDB | Les avis ont un contenu flexible : tags, photos imbriquées, statut de modération et agrégations par film. |
| Top films | MongoDB + Redis | MongoDB calcule le classement avec `$group` et `$lookup`, Redis garde le résultat 5 minutes pour éviter de recalculer à chaque requête. |
| Sessions | Redis | Les sessions ont besoin d'un TTL automatique et de lectures très fréquentes en moins d'une milliseconde. |
| Rate limiting | Redis | Un Sorted Set permet une fenêtre glissante précise sans transactions SQL lourdes. |
| Audit paiements | MySQL | Les triggers MySQL capturent les changements de paiement dans la même base transactionnelle que les paiements. |
