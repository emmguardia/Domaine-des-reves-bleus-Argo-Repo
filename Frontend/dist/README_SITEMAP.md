# Guide de vérification du Sitemap

## Vérification que le sitemap est accessible

1. **Vérifier l'URL du sitemap** :
   - Ouvrez : `https://domainedesrevesbleus.eu/sitemap.xml`
   - Le fichier XML doit s'afficher correctement

2. **Vérifier le Content-Type** :
   - Le serveur doit renvoyer : `Content-Type: application/xml; charset=utf-8`
   - Vérifiez dans les outils de développement du navigateur (onglet Network)

3. **Tester avec Google Search Console** :
   - Allez dans Google Search Console
   - Section "Sitemaps"
   - Ajoutez : `https://domainedesrevesbleus.eu/sitemap.xml`
   - Cliquez sur "Tester"

## Problèmes courants et solutions

### Erreur : "Impossible de lire le sitemap"

**Causes possibles :**
1. Le fichier n'est pas accessible publiquement
2. Le Content-Type est incorrect
3. Le format XML est invalide
4. Le serveur renvoie une erreur 404 ou 500

**Solutions :**
1. Vérifiez que le fichier existe dans `Frontend/public/sitemap.xml`
2. Vérifiez que le build a bien copié le fichier dans `Frontend/dist/`
3. Vérifiez la configuration nginx (doit servir avec Content-Type: application/xml)
4. Testez l'URL directement dans le navigateur

### Vérification manuelle

```bash
# Tester l'accessibilité
curl -I https://domainedesrevesbleus.eu/sitemap.xml

# Devrait retourner :
# HTTP/1.1 200 OK
# Content-Type: application/xml; charset=utf-8
```

## Mise à jour du sitemap

Le sitemap est statique. Pour le mettre à jour :
1. Modifiez `Frontend/public/sitemap.xml`
2. Rebuild le frontend : `npm run build`
3. Le fichier sera copié dans `Frontend/dist/`
4. Redéployez le frontend

