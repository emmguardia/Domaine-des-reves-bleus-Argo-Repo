FROM node:20-alpine

WORKDIR /app

ENV npm_config_update_notifier=false \
    npm_config_fund=false \
    npm_config_audit=false

# Mettre à jour npm pour patcher ses vulnérabilités bundlées (tar, glob, etc.)
RUN npm install -g npm@latest

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --omit=dev

# Copier le code source
COPY . .

# Créer le dossier uploads
RUN mkdir -p uploads

# Exposer le port
EXPOSE 8000

# Démarrer l'application
CMD ["node", "server.js"]
