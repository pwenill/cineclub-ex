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

-- Les privileges applicatifs sont accordes table par table en fin de script,
-- apres creation du schema.

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
  places_restantes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  archived_at DATETIME NULL,
  version     INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_seance_film  FOREIGN KEY (film_id)  REFERENCES film(id)  ON DELETE RESTRICT,
  CONSTRAINT fk_seance_salle FOREIGN KEY (salle_id) REFERENCES salle(id) ON DELETE RESTRICT,
  INDEX idx_seance_debut (debut_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservation (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  adherent_id INT UNSIGNED NOT NULL,
  seance_id   INT UNSIGNED NOT NULL,
  statut      ENUM('CONFIRMEE','ANNULEE') NOT NULL DEFAULT 'CONFIRMEE',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reservation_adherent FOREIGN KEY (adherent_id) REFERENCES adherent(id) ON DELETE RESTRICT,
  CONSTRAINT fk_reservation_seance FOREIGN KEY (seance_id) REFERENCES seance(id) ON DELETE RESTRICT,
  UNIQUE KEY ux_reservation_adherent_seance (adherent_id, seance_id),
  INDEX idx_reservation_adherent (adherent_id),
  INDEX idx_reservation_seance (seance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS paiement (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reservation_id BIGINT UNSIGNED NOT NULL,
  montant_cents  INT NOT NULL,
  statut         ENUM('EN_ATTENTE','PAYE','REFUSE','REMBOURSE') NOT NULL DEFAULT 'EN_ATTENTE',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_paiement_reservation FOREIGN KEY (reservation_id) REFERENCES reservation(id) ON DELETE RESTRICT,
  CONSTRAINT chk_paiement_montant_positif CHECK (montant_cents > 0),
  UNIQUE KEY ux_paiement_reservation (reservation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  table_name VARCHAR(64) NOT NULL,
  row_id     BIGINT UNSIGNED NOT NULL,
  action     ENUM('UPDATE','DELETE') NOT NULL,
  changed_by VARCHAR(120) NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  old_value  JSON NULL,
  new_value  JSON NULL,
  INDEX idx_table_row (table_name, row_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS sp_archive_old_seances;

DELIMITER //

CREATE PROCEDURE sp_archive_old_seances(IN p_avant DATE, OUT p_nb INT)
SQL SECURITY DEFINER
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  UPDATE seance
     SET archived_at = CURRENT_TIMESTAMP
   WHERE debut_at < p_avant
     AND archived_at IS NULL;

  SET p_nb = ROW_COUNT();

  COMMIT;
END //

DROP TRIGGER IF EXISTS trg_paiement_audit_update //

CREATE TRIGGER trg_paiement_audit_update
AFTER UPDATE ON paiement
FOR EACH ROW
BEGIN
  IF OLD.montant_cents <> NEW.montant_cents
     OR OLD.statut <> NEW.statut THEN
    INSERT INTO audit_log
      (table_name, row_id, action, changed_by, old_value, new_value)
    VALUES (
      'paiement',
      NEW.id,
      'UPDATE',
      COALESCE(CAST(@app_user AS CHAR), CURRENT_USER()),
      JSON_OBJECT(
        'montant_cents', OLD.montant_cents,
        'statut', OLD.statut
      ),
      JSON_OBJECT(
        'montant_cents', NEW.montant_cents,
        'statut', NEW.statut
      )
    );
  END IF;
END //

DELIMITER ;

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

INSERT INTO seance (film_id, salle_id, debut_at, prix_ttc, places_restantes) VALUES
  (1, 1, '2026-05-20 18:30:00', 12.00, 120),
  (2, 2, '2026-05-21 20:00:00', 12.00, 80),
  (3, 3, '2026-05-22 20:30:00', 14.00, 60);

GRANT SELECT ON cineclub.film TO 'cineclub_app'@'%';
GRANT SELECT ON cineclub.salle TO 'cineclub_app'@'%';
GRANT SELECT, UPDATE ON cineclub.seance TO 'cineclub_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON cineclub.adherent TO 'cineclub_app'@'%';
GRANT SELECT, INSERT ON cineclub.reservation TO 'cineclub_app'@'%';
GRANT SELECT, INSERT, UPDATE ON cineclub.paiement TO 'cineclub_app'@'%';
GRANT SELECT ON cineclub.audit_log TO 'cineclub_app'@'%';
GRANT EXECUTE ON PROCEDURE cineclub.sp_archive_old_seances TO 'cineclub_app'@'%';

FLUSH PRIVILEGES;

-- Message de fin pour logs Docker
SELECT '✅ Init cineclub terminee : schema SC3 + compte cineclub_app a moindre privilege' AS status;
