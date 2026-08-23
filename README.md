# TrieConnect

TrieConnect is an interactive prefix-search engine built to demonstrate data structures, algorithms, and systems design rather than CRUD-heavy application development.

The central data structure is a **Trie implemented in C++17**. React provides the visualization, Node.js/Express provides the API boundary, and MongoDB is used only for persistence.

## Stack

- **React + TypeScript + Tailwind CSS** — interface, traversal visualization, and benchmark UI
- **Node.js + Express** — REST API and C++ process bridge
- **C++17** — Trie implementation and benchmark engine
- **MongoDB** — persistence for stored words
- **CMake + CTest** — native build and tests
- **GitHub Actions** — automated C++ and frontend checks

## Architecture

```text
React + TypeScript + Tailwind
             │
             │ REST
             ▼
       Node.js + Express
             │
             ├──────────────► MongoDB
             │                 persistence
             │
             ▼
       persistent C++ process
             │
             ▼
          Trie index
```

MongoDB never performs the prefix search. Words are persisted there and loaded into the in-memory C++ Trie when the server starts.

## What the Trie demonstrates

The C++ engine implements:

- insertion
- exact search
- prefix existence checks
- autocomplete
- prefix counting
- deletion with unused-node cleanup
- node statistics
- live Trie vs linear-search benchmarking

For a prefix `nan`, the engine first walks `n → a → n`, then traverses only the subtree below that node to collect matches.

## Live benchmark

The benchmark command generates the same dataset for both algorithms and measures the lookup phase:

```text
GET /api/benchmark?size=100000&prefix=word
```

The response contains actual timings from the C++ process:

```json
{
  "size": 100000,
  "prefix": "word",
  "linearMs": 12.34,
  "trieMs": 0.08,
  "linearMatches": 100000,
  "trieMatches": 100000
}
```

The UI runs benchmarks at 1K, 10K, 100K and 1M records and displays the returned measurements. These are not hard-coded performance claims.

## Project structure

```text
cpp/
  Trie.h
  Trie.cpp
  main.cpp
  CMakeLists.txt
  test.cpp

server/
  src/
    index.js
    trieEngine.js
    db.js

frontend/
  src/
    App.tsx
    api.ts
    components/
      TrieVisualizer.tsx
      BenchmarkPanel.tsx
    index.css
    main.tsx

.github/
  workflows/
    ci.yml
```

## Local setup

### Requirements

- Node.js 20+
- npm 10+
- CMake 3.16+
- a C++17 compiler
- MongoDB Atlas or local MongoDB

### Install dependencies

```bash
npm install --workspaces
```

### Build and test the C++ engine

```bash
npm run build:cpp
npm run test:cpp
```

### Configure MongoDB

Create `server/.env` locally:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
MONGODB_DB=trie_connect
```

**Never commit `server/.env` or a real MongoDB credential.**

If `MONGODB_URI` is not configured, the application can still run as an in-memory Trie; persistence is disabled.

### Run

```bash
npm run dev
```

Frontend: `http://localhost:5173`

API: `http://localhost:5000`

### Production build

```bash
npm run build
npm start
```

## API

```text
GET    /api/health
GET    /api/trie/search?word=react
GET    /api/trie/prefix?prefix=rea&limit=8
GET    /api/trie/stats
GET    /api/benchmark?size=100000&prefix=word
POST   /api/trie/insert       { "word": "react" }
POST   /api/trie/load         { "words": ["react", "redis"] }
DELETE /api/trie/:word
```

## Complexity

For a word/prefix of length `L` and `K` matching words returned:

| Operation | Complexity |
|---|---:|
| Insert | O(L) |
| Exact search | O(L) |
| Prefix existence | O(L) |
| Prefix lookup | O(L + K) |
| Delete | O(L) |

A linear prefix search scans all `N` stored words, so its lookup cost is approximately **O(N × L)** in the worst case. The Trie avoids that full scan by using the characters of the prefix to navigate directly to the relevant subtree.

## Persistence model

MongoDB stores normalized words in the `words` collection. Inserts, deletes, and bulk loads update MongoDB when it is configured. On server startup, persisted words are read back into the C++ Trie so the algorithmic index is rebuilt from durable data.

This separation is intentional: **MongoDB is storage; C++ Trie is the algorithm.**
