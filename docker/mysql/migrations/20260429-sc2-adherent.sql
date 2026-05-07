USE cineclub;

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

INSERT IGNORE INTO adherent (nom, prenom, email, telephone, actif) VALUES
  ('Payet',  'Lea',   'lea.payet@example.re',   '0692000001', 1),
  ('Hoarau', 'Noah',  'noah.hoarau@example.re', '0692000002', 1),
  ('Morel',  'Sarah', 'sarah.morel@example.re', NULL,         1);
