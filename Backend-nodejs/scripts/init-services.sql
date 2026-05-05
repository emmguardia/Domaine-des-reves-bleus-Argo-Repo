-- Exécuter dans MariaDB (une seule fois)
-- Option 1 : mysql -u root -p DRB < scripts/init-services.sql
-- Option 2 : Copier-coller dans phpMyAdmin / Adminer / DBeaver

CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price VARCHAR(50) DEFAULT '',
  duration VARCHAR(50) DEFAULT '',
  details LONGTEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insérer les 4 services (à exécuter uniquement si la table est vide)
INSERT INTO services (name, description, price, duration, details, sort_order) VALUES
('Épilation Cocker', 'Épilation spécialisée pour cocker anglais avec soins adaptés.', '90€', '2h - 3h', '["Épilation complète du corps","Bain avec shampooing adapté","Séchage et brushing professionnel","Coupe des griffes","Nettoyage des oreilles"]', 1),
('1ère Épilation Cocker', 'Première épilation pour cocker avec soins particuliers.', '110€', '3h - 4h', '["Épilation complète première fois","Soins particuliers pour adaptation","Bain et séchage professionnel","Conseils d''entretien","Suivi personnalisé"]', 2),
('Tonte', 'Tonte adaptée selon vos souhaits et la race de votre chien.', '70€', '1h30 - 2h', '["Tonte personnalisée","Finitions aux ciseaux","Brossage complet","Coupe des griffes"]', 3),
('Supplément Démêlage', 'Démêlage supplémentaire selon l''état du pelage de votre chien.', '15€ - 30€', '30min - 1h', '["Évaluation de l''état du pelage","Démêlage progressif et doux","Soins hydratants","Brossage final"]', 4);
