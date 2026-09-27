# Build and test the C++ engine
FROM debian:bookworm-slim AS engine
RUN apt-get update \
    && apt-get install -y --no-install-recommends cmake make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY cpp ./cpp
RUN cmake -S cpp -B cpp/build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build cpp/build \
    && ctest --test-dir cpp/build --output-on-failure

# API image: Node plus the compiled engine, nothing else
FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY frontend/package.json ./frontend/
RUN npm ci --workspace server --omit=dev
COPY server ./server
COPY --from=engine /src/cpp/build/trie_engine ./cpp/build/trie_engine

ENV NODE_ENV=production PORT=10000
EXPOSE 10000
CMD ["node", "server/src/index.js"]
