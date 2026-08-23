# TrieConnect

TrieConnect is an interactive prefix-search project built to demonstrate data structures and algorithmic thinking rather than CRUD-heavy application development.

## Stack

- **React + TypeScript + Tailwind CSS** — interface and visualization
- **Node.js + Express** — small REST API
- **C++17** — actual Trie implementation
- **MongoDB** — optional persistence for stored words

## What the project demonstrates

The C++ engine implements:

- insert
- exact search
- prefix search
- autocomplete
- deletion with unused-node cleanup
- prefix counting
- node statistics

A request such as `prefix nan 8` walks the Trie character by character and then traverses only the matching subtree.

## Project structure

```text
cpp/
  Trie.h
  Trie.cpp
  main.cpp
  CMakeLists.txt

server/
  src/
    index.js
    trieEngine.js
    db.js

frontend/
  src/
    App.tsx
    api.ts
    index.css
    main.tsx
```

## Local setup

### 1. Requirements

- Node.js 20+
- npm 10+
- CMake 3.16+
- a C++17 compiler
- MongoDB is optional

### 2. Install dependencies

```bash
npm install
npm install --workspace frontend
npm install --workspace server
```

### 3. Build the C++ engine

```bash
npm run build:cpp
```

### 4. Optional MongoDB configuration

Create `server/.env`:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
MONGODB_DB=trie_connect
```

The app also works without `MONGODB_URI`; persistence is simply disabled.

### 5. Run

From the repository root:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

API: `http://localhost:5000`

## API

```text
GET    /api/health
GET    /api/trie/search?word=react
GET    /api/trie/prefix?prefix=rea&limit=8
GET    /api/trie/stats
POST   /api/trie/insert       { "word": "react" }
POST   /api/trie/load         { "words": ["react", "redis"] }
DELETE /api/trie/:word
```

## Complexity

For a word of length `L`:

| Operation | Complexity |
|---|---:|
| Insert | O(L) |
| Exact search | O(L) |
| Prefix lookup | O(L + K) |
| Delete | O(L) |

`K` is the number of matching results returned/traversed after the prefix node is found.

The important point is that prefix search does **not** scan every stored word.

## Why MongoDB is optional

The Trie is the in-memory algorithmic index. MongoDB is only responsible for persistence. This separation keeps the project honest: the database does not perform the prefix-search algorithm that the project is meant to demonstrate.
