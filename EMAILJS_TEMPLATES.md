# Templates EmailJS pour Le Domaine des Rêves Bleus

## Template 1 : Mot de passe oublié (FORGOT_PASSWORD)

**Variables utilisées :**
- `{{to_name}}` - Nom de l'utilisateur
- `{{to_email}}` - Email de l'utilisateur
- `{{reset_link}}` - Lien de réinitialisation

**Template texte :**

```
Bonjour {{to_name}},

Vous avez demandé à réinitialiser votre mot de passe.

Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte. Pour procéder, veuillez cliquer sur le lien ci-dessous pour créer un nouveau mot de passe :

{{reset_link}}

Ce lien est valide pendant 24 heures.

Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email ou nous contacter immédiatement. Votre compte reste sécurisé.

Cordialement,
L'équipe du Domaine des Rêves Bleus
```

---

## Template 2 : Confirmation de commande (ORDER_CONFIRMATION)

**Variables utilisées :**
- `{{to_name}}` - Nom du client
- `{{to_email}}` - Email du client
- `{{order_number}}` - Numéro de commande
- `{{order_items}}` - Liste des articles
- `{{order_total}}` - Montant total
- `{{shipping_address}}` - Adresse de livraison
- `{{phone_number}}` - Numéro de téléphone

**Template texte :**

```
Bonjour {{to_name}},

Merci pour votre commande !

Nous avons bien reçu votre paiement et votre commande est en cours de préparation.

Détails de votre commande :

Numéro de commande : {{order_number}}

Articles commandés :
{{order_items}}

Adresse de livraison :
{{shipping_address}}

Numéro de téléphone : {{phone_number}}

Montant total : {{order_total}} €

Vous recevrez un email de confirmation lorsque votre commande sera expédiée.

Cordialement,
L'équipe du Domaine des Rêves Bleus
```

---

## Template 3 : Contact (CONTACT)

**Variables utilisées :**
- `{{from_name}}` - Nom de l'expéditeur
- `{{from_email}}` - Email de l'expéditeur
- `{{message}}` - Message

**Template texte :**

```
Nouveau message de contact

Vous avez reçu un nouveau message depuis le formulaire de contact du site.

Nom : {{from_name}}
Email : {{from_email}}

Message :
{{message}}

Pour répondre, utilisez l'adresse email : {{from_email}}

---
Le Domaine des Rêves Bleus - Toilettage Canin
```

---

## Instructions d'utilisation

1. Connectez-vous à votre compte EmailJS
2. Allez dans "Email Templates"
3. Créez un nouveau template pour chaque type d'email
4. Dans l'onglet "Content", sélectionnez "Plain text" ou "Rich text"
5. Copiez-collez le template texte correspondant
6. Les variables {{variable_name}} seront automatiquement remplacées
7. Testez l'envoi avec des données de test
8. Notez l'ID du template et utilisez-le dans vos variables d'environnement :
   - VITE_EMAILJS_TEMPLATE_ID_FORGOT_PASSWORD
   - VITE_EMAILJS_TEMPLATE_ID_ORDER_CONFIRMATION
   - VITE_EMAILJS_TEMPLATE_ID_CONTACT
