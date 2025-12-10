# Configuration EmailJS - Guide

## Problème : "The recipients address is empty"

Cette erreur signifie que le champ "To Email" dans votre template EmailJS n'est pas configuré correctement.

## Solution : Configuration du template EmailJS

### Pour chaque template (FORGOT_PASSWORD, ORDER_CONFIRMATION, CONTACT) :

1. **Allez dans EmailJS → Email Templates → Votre template**

2. **Dans la section "Content"**, vérifiez le champ **"To Email"** :
   - Il doit être configuré pour utiliser une variable
   - Utilisez : `{{to_email}}` ou `{{user_email}}` ou `{{email}}`

3. **Configuration recommandée pour chaque template :**

#### Template FORGOT_PASSWORD :
- **To Email** : `{{to_email}}`
- **From Name** : Le Domaine des Rêves Bleus
- **Reply To** : (optionnel) votre email
- **Subject** : Réinitialisation de votre mot de passe
- **Variables disponibles** : `{{to_name}}`, `{{to_email}}`, `{{reset_link}}`

#### Template ORDER_CONFIRMATION :
- **To Email** : `{{to_email}}`
- **From Name** : Le Domaine des Rêves Bleus
- **Reply To** : (optionnel) votre email
- **Subject** : Confirmation de votre commande {{order_number}}
- **Variables disponibles** : `{{to_name}}`, `{{to_email}}`, `{{order_number}}`, `{{order_items}}`, `{{order_total}}`, `{{shipping_address}}`

#### Template CONTACT :
- **To Email** : Votre adresse email (celle qui reçoit les messages)
- **From Name** : `{{from_name}}`
- **Reply To** : `{{from_email}}` (important pour pouvoir répondre)
- **Subject** : Nouveau message de contact de {{from_name}}
- **Variables disponibles** : `{{from_name}}`, `{{from_email}}`, `{{message}}`

## Vérification dans EmailJS

1. Ouvrez votre template
2. Cliquez sur "Settings" ou "Settings" en haut
3. Vérifiez que "To Email" contient bien `{{to_email}}` (ou la variable appropriée)
4. Sauvegardez

## Test

Après configuration, testez depuis votre application et vérifiez la console du navigateur pour voir les logs de débogage.

