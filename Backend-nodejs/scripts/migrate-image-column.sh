#!/bin/sh
# Migration : products.image -> MEDIUMTEXT
# À exécuter une fois depuis Backend-nodejs : ./scripts/migrate-image-column.sh
# Ou : sh scripts/migrate-image-column.sh
cd "$(dirname "$0")/.." && node scripts/migrate-image-column.js
