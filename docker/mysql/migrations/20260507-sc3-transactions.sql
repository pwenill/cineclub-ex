USE cineclub;

DELIMITER //

DROP PROCEDURE IF EXISTS sc3_add_column_if_missing //

CREATE PROCEDURE sc3_add_column_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_column_name VARCHAR(64),
  IN p_column_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = p_table_name
       AND COLUMN_NAME = p_column_name
  ) THEN
    SET @sc3_ddl = CONCAT('ALTER TABLE `', p_table_name, '` ADD COLUMN ', p_column_definition);
    PREPARE sc3_stmt FROM @sc3_ddl;
    EXECUTE sc3_stmt;
    DEALLOCATE PREPARE sc3_stmt;
  END IF;
END //

DELIMITER ;

CALL sc3_add_column_if_missing(
  'seance',
  'places_restantes',
  '`places_restantes` SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER `prix_ttc`'
);

CALL sc3_add_column_if_missing(
  'seance',
  'archived_at',
  '`archived_at` DATETIME NULL AFTER `places_restantes`'
);

DROP PROCEDURE IF EXISTS sc3_add_column_if_missing;

UPDATE seance se
JOIN salle s ON s.id = se.salle_id
   SET se.places_restantes = s.capacite
 WHERE se.places_restantes = 0;

INSERT INTO seance (film_id, salle_id, debut_at, prix_ttc, places_restantes)
SELECT 1, 1, '2026-05-20 18:30:00', 12.00, 120
 WHERE EXISTS (SELECT 1 FROM film WHERE id = 1)
   AND EXISTS (SELECT 1 FROM salle WHERE id = 1)
   AND NOT EXISTS (
     SELECT 1 FROM seance
      WHERE film_id = 1
        AND salle_id = 1
        AND debut_at = '2026-05-20 18:30:00'
   );

INSERT INTO seance (film_id, salle_id, debut_at, prix_ttc, places_restantes)
SELECT 2, 2, '2026-05-21 20:00:00', 12.00, 80
 WHERE EXISTS (SELECT 1 FROM film WHERE id = 2)
   AND EXISTS (SELECT 1 FROM salle WHERE id = 2)
   AND NOT EXISTS (
     SELECT 1 FROM seance
      WHERE film_id = 2
        AND salle_id = 2
        AND debut_at = '2026-05-21 20:00:00'
   );

INSERT INTO seance (film_id, salle_id, debut_at, prix_ttc, places_restantes)
SELECT 3, 3, '2026-05-22 20:30:00', 14.00, 60
 WHERE EXISTS (SELECT 1 FROM film WHERE id = 3)
   AND EXISTS (SELECT 1 FROM salle WHERE id = 3)
   AND NOT EXISTS (
     SELECT 1 FROM seance
      WHERE film_id = 3
        AND salle_id = 3
        AND debut_at = '2026-05-22 20:30:00'
   );

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

GRANT EXECUTE ON PROCEDURE cineclub.sp_archive_old_seances TO 'cineclub_app'@'%';
FLUSH PRIVILEGES;
