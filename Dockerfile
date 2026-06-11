# =============================================
#  Rhythm Icons — production image
#  Node app + EPS conversion toolchain
#  (ghostscript for EPS→PNG, pstoedit for EPS→SVG)
# =============================================

FROM node:22-slim

# EPS conversion tools (~150MB). Inkscape deliberately NOT installed
# (≈1GB); add it here only if pstoedit SVG fidelity proves insufficient.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ghostscript pstoedit \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (better layer caching).
# --ignore-scripts: the postinstall hook runs webpack, which needs the
# source files that aren't copied yet — the explicit build below covers it.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and build frontend bundle
COPY . .
RUN npm run build

ENV NODE_ENV=production

# Railway injects PORT
CMD ["npm", "start"]
