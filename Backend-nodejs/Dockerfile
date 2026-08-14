# syntax=docker/dockerfile:1.7
#
# Build multi-stage : on installe les deps dans un stage build, on ne garde dans
# l'image finale que node + node_modules + le code. npm/npx/corepack sont retirés
# du runtime car non nécessaires (on lance "node server.js"), ce qui élimine d'un
# coup toutes les CVEs récurrentes des paquets bundlés par npm (tar, cross-spawn,
# glob, minimatch, etc.). Plus de patches manuels à maintenir.
#
# Node 20 -> 26 : Node 20 est en fin de vie depuis avril 2026 et ne reçoit plus
# de correctifs. Trivy ne le signalait pas parce que `--ignore-unfixed` masque
# précisément les CVE sans correctif disponible — un socle non maintenu passait
# donc les scans en vert.

# ── Stage 1 : install des dépendances prod ───────────────────────────────────
FROM node:26-alpine AS deps

ENV NODE_ENV=production \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH

# Maj des paquets Alpine (correctifs sécurité système)
RUN apk update && apk upgrade --no-cache

# Chaîne de compilation pour les modules natifs : bcrypt ne publie pas toujours
# de binaire prébuild pour musl et retombe alors sur node-gyp. Ces paquets
# restent dans ce stage et n'atterrissent jamais dans l'image finale.
RUN apk add --no-cache python3 make g++

# Installe pnpm épinglé. On n'utilise pas corepack ici car il a été retiré du
# bundle Node à partir de Node 25/26. npm install -g fonctionne sur toutes les
# versions de Node et nous donne le même contrôle sur la version installée.
# npm sera de toute façon retiré du runtime stage final.
RUN npm install -g pnpm@10.33.4 --no-audit --no-fund

WORKDIR /app

# Copie des manifestes uniquement pour bénéficier du cache Docker tant qu'ils ne
# changent pas. .npmrc embarque ignore-scripts=true : seuls les paquets listés
# dans pnpm.onlyBuiltDependencies (ici bcrypt) ont le droit de builder.
COPY package.json pnpm-lock.yaml .npmrc ./

RUN pnpm install --prod --frozen-lockfile \
    && pnpm store prune 2>/dev/null || true

# ── Stage 2 : image runtime minimale ─────────────────────────────────────────
FROM node:26-alpine AS runtime

ENV NODE_ENV=production

# Maj sécu Alpine
RUN apk update && apk upgrade --no-cache

# HARDENING SUPPLY-CHAIN : on retire npm, npx, corepack et leurs deps bundlées
# (tar, cross-spawn, glob, minimatch, etc.) car le runtime n'en a pas besoin.
# Toutes les CVEs habituelles sur ces paquets disparaissent automatiquement.
# Le binaire node est conservé tel quel.
RUN rm -rf \
      /usr/local/lib/node_modules/npm \
      /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm \
      /usr/local/bin/npx \
      /usr/local/bin/corepack \
      /opt/yarn-* \
      /usr/local/bin/yarn \
      /usr/local/bin/yarnpkg \
    && rm -rf /root/.npm /root/.cache 2>/dev/null || true

WORKDIR /app

# L'utilisateur `node` (uid 1000) est déjà fourni par l'image officielle.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./

# Code applicatif
COPY --chown=node:node server.js ./
COPY --chown=node:node config/ ./config/
COPY --chown=node:node middleware/ ./middleware/
COPY --chown=node:node routes/ ./routes/
COPY --chown=node:node utils/ ./utils/

# Dossier d'upload inscriptible par l'application
RUN mkdir -p uploads && chown -R node:node /app/uploads

VOLUME ["/app/uploads"]

USER node

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const http=require('http');http.get('http://localhost:8000/api',(r)=>{process.exit(r.statusCode<500?0:1)}).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
