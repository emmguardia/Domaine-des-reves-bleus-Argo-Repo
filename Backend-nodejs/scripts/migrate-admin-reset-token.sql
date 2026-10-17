-- Migration : lien de réinitialisation du mot de passe admin (usage unique)
-- Seul le SHA-256 du token est stocké. À lancer UNE SEULE FOIS sur la base DRB.
ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS reset_token_hash CHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS reset_token_expiry DATETIME NULL;
