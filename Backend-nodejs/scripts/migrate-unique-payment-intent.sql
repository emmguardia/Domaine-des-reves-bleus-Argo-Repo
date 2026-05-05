-- Migration : ajoute une contrainte UNIQUE sur payment_intent_id
-- Empêche la double-création de commande (race condition webhook + create-order)
-- À lancer UNE SEULE FOIS sur la base de production

-- Vérifier les doublons existants avant (si > 0, les supprimer manuellement)
SELECT payment_intent_id, COUNT(*) as nb
FROM orders
GROUP BY payment_intent_id
HAVING nb > 1;

-- Ajouter la contrainte UNIQUE
ALTER TABLE orders
  ADD CONSTRAINT unique_payment_intent UNIQUE (payment_intent_id);
