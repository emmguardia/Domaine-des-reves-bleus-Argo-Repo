FROM node:26-alpine

WORKDIR /app

ENV npm_config_update_notifier=false \
    npm_config_fund=false \
    npm_config_audit=false

# Version épinglée pour des builds reproductibles (évite les surprises supply-chain)
RUN npm install -g npm@11.14.0

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm ci --omit=dev

# Copier le code source
COPY . .

# Créer le dossier uploads avec les bonnes permissions pour l'utilisateur node
RUN mkdir -p uploads && chown -R node:node /app

# Basculer sur l'utilisateur node (uid 1000) — sans privilèges root
USER node

# Exposer le port
EXPOSE 8000

# Démarrer l'application
CMD ["node", "server.js"]
