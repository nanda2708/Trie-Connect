FROM node:22-bookworm

WORKDIR /app

# Install the native toolchain required to build the C++ Trie engine.
RUN apt-get update \
    && apt-get install -y --no-install-recommends cmake g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests first so dependency installation can be cached.
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY server/package.json ./server/package.json

RUN npm ci

# Copy the application source.
COPY cpp ./cpp
COPY server ./server
COPY frontend ./frontend

# Build the C++ Trie engine used by the Express API.
RUN npm run build:cpp

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["npm", "run", "start", "--workspace", "server"]
