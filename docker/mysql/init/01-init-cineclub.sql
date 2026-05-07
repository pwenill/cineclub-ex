-- =============================================================================
-- docker/mysql/init/01-init-cineclub.sql
-- -----------------------------------------------------------------------------
-- Script exécuté AUTOMATIQUEMENT par l'image officielle mysql:8.0
-- au PREMIER démarrage du conteneur (quand /var/lib/mysql est vide).
--
-- L'image MySQL crée déjà :
--   - la base MYSQL_DATABASE (cineclub)
--   - le user MYSQL_USER (cineclub_app) avec tous les privilèges sur cette base
--
-- Ce script DURCIT la config en appliquant le PRINCIPE DU MOINDRE PRIVILÈGE :
--   - on révoque les privilèges par défaut (ALL PRIVILEGES)
--   - on ne ré-accorde que SELECT / INSERT / UPDATE / DELETE
--   - pas de CREATE, ALTER, DROP, GRANT, INDEX
-- Les migrations de schéma se feront avec le compte root (DBA) uniquement.
-- =============================================================================

-- S'assurer que la base est bien là (déjà créée par MYSQL_DATABASE mais sécurise).
CREATE DATABASE IF NOT EXISTS cineclub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Compte applicatif — accessible depuis N'IMPORTE QUEL host interne Docker
-- (nécessaire car l'app Node tournera dans un autre conteneur / sur l'hôte).
-- -----------------------------------------------------------------------------

-- Révocation des privilèges accordés par défaut par l'image MySQL
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'cineclub_app'@'%';

-- Privilèges STRICTEMENT nécessaires pour une DAL de lecture/écriture standard
GRANT SELECT, INSERT, UPDATE, DELETE
  ON cineclub.*
  TO 'cineclub_app'@'%';

-- Prise en compte immédiate
FLUSH PRIVILEGES;

-- -----------------------------------------------------------------------------
-- Schéma minimal de démonstration (à supprimer / remplacer par tes migrations)
-- -----------------------------------------------------------------------------

USE cineclub;

CREATE TABLE IF NOT EXISTS film (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titre         VARCHAR(255) NOT NULL,
  realisateur   VARCHAR(255) NOT NULL,
  annee         SMALLINT UNSIGNED NOT NULL,
  duree_minutes SMALLINT UNSIGNED NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_film_titre (titre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS salle (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom       VARCHAR(64) NOT NULL UNIQUE,
  capacite  SMALLINT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS adherent (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom              VARCHAR(80) NOT NULL,
  prenom           VARCHAR(80) NOT NULL,
  email            VARCHAR(160) NOT NULL UNIQUE,
  telephone        VARCHAR(10) NULL,
  actif            TINYINT(1) NOT NULL DEFAULT 1,
  date_inscription DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_adherent_nom_prenom (nom, prenom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seance (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  film_id     INT UNSIGNED NOT NULL,
  salle_id    INT UNSIGNED NOT NULL,
  debut_at    DATETIME NOT NULL,
  prix_ttc    DECIMAL(6,2) NOT NULL,
  CONSTRAINT fk_seance_film  FOREIGN KEY (film_id)  REFERENCES film(id)  ON DELETE RESTRICT,
  CONSTRAINT fk_seance_salle FOREIGN KEY (salle_id) REFERENCES salle(id) ON DELETE RESTRICT,
  INDEX idx_seance_debut (debut_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Jeu de données minimal
INSERT INTO film (titre, realisateur, annee, duree_minutes) VALUES
  ('Le Fabuleux Destin d''Amélie Poulain', 'Jean-Pierre Jeunet', 2001, 122),
  ('Parasite',                             'Bong Joon-ho',      2019, 132),
  ('Interstellar',                         'Christopher Nolan', 2014, 169);

INSERT INTO salle (nom, capacite) VALUES
  ('Salle 1 — Piton',  120),
  ('Salle 2 — Cilaos', 80),
  ('Salle 3 — Mafate', 60);

INSERT INTO adherent (nom, prenom, email, telephone, actif) VALUES
  ('Payet',  'Lea',   'lea.payet@example.re',   '0692000001', 1),
  ('Hoarau', 'Noah',  'noah.hoarau@example.re', '0692000002', 1),
  ('Morel',  'Sarah', 'sarah.morel@example.re', NULL,         1);

-- Message de fin pour logs Docker
SELECT '✅ Init cineclub terminée : base + schéma SC2 + compte cineclub_app (SELECT/INSERT/UPDATE/DELETE)' AS status;
