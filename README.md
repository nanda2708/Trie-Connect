# TrieConnect

A contact search app where the search index is a trie I wrote in C++.

Type `sa` and you get everyone with a name word starting with "sa". Type `98765` and you get every number starting with those digits. On the right, the UI shows the path the query took through the trie: which node it's on at each step, how many entries sit below that node, and where it stops if nothing matches.

**Live:** [frontend](https://trie-connect-frontend.vercel.app/) · [API](https://trie-connect-api.onrender.com/api/health). It's on Render's free tier, so the first request can take ~30s while the server wakes up.

## How it fits together

```text
 React UI ──HTTP──▶ Express API ──stdin/stdout──▶ trie_engine (C++)
                         │                          the search index
                         ▼
                 MongoDB (or memory)
                 full contact records
```

- **`cpp/`**: the trie and a small engine process around it. This is the core of the project.
- **`server/`**: Express. It turns contacts into trie keys, forwards commands to the engine, and turns the ids it gets back into full records.
- **`frontend/`**: React + TypeScript. Search, the trie path view, contact editing, and the benchmark.

MongoDB only stores records. It never runs a search query. If `MONGODB_URI` isn't set, the API keeps records in memory and loads some sample contacts, so the whole thing runs with no database at all. If MongoDB is set but unreachable, the API logs it, falls back to memory, and `/api/health` includes a `warning`.

## The trie

`cpp/Trie.h` maps string keys to one or more string values:

```cpp
bool insert(const std::string& key, const std::string& value);
bool erase(const std::string& key, const std::string& value);
std::vector<std::string> valuesWithPrefix(const std::string& prefix, std::size_t limit) const;
std::vector<std::string> keysWithPrefix(const std::string& prefix, std::size_t limit) const;
int countPrefix(const std::string& prefix) const;
std::vector<Step> walk(const std::string& prefix) const;
```

Some decisions worth mentioning:

- **Keys hold several values.** Two people can both be called Rahul, so the node for `n:rahul` keeps a list of contact ids. An earlier version only stored an end-of-word flag. The API then had to query MongoDB by name to find out who matched, and check whether anyone else still used a name before removing it. With ids in the trie, both go away.
- **Children are a sorted `vector<pair<char, unique_ptr<Node>>>`,** not a hash map. Most nodes have one to three children, so a binary search over a tiny vector is cheap. Results also come out in alphabetical order, where the old `unordered_map` version sorted child keys at every node on every query. `unique_ptr` means no hand-written destructor. Memory is about the same as before (roughly 150–170 MB for 1M words, measured both ways).
- **Every node stores a subtree count.** `countPrefix` is O(L) instead of walking the whole subtree, and the UI gets its "N entries below" numbers for free.
- **Erase prunes.** Removing a key walks back up and deletes nodes that no longer lead anywhere, so the tree doesn't fill up with dead branches after edits. The tests check that the node count returns to 1 once everything is deleted.
- **`valuesWithPrefix` is an iterative DFS with a seen-set.** One contact is indexed under several words (`sai` and `saikiran`), so a prefix like `sa` can reach the same id twice.

| Operation | Cost |
|---|---|
| insert / erase / contains | O(L) |
| countPrefix | O(L) |
| keysWithPrefix / valuesWithPrefix | O(L + size of the matched subtree, stopped at `limit`) |

L is the length of the key or prefix. None of these depend on how many contacts exist.

### How contacts become keys

```text
"Priya Sharma", 9876543210, id c7   →   n:priya       → c7
                                        n:sharma      → c7
                                        p:9876543210  → c7
```

The `n:` / `p:` prefixes keep names and phone numbers apart in one tree. A query that starts with a digit searches `p:`, anything else searches `n:`.

A multi-word query like `rahul k` does one trie lookup per word and intersects the id lists. There's one more check after that, because both words could match the same name word (`rahul r` would otherwise match "Rahul Kumar" through "rahul"). That lives in `server/src/searchIndex.js`.

### The engine process

`trie_engine` reads one command per line and writes one JSON line back, in order:

```text
add n:priya c7            → {"changed":true}
find n:pr 50              → {"ids":["c7"],"entries":1,"micros":3.1}
walk n:prx                → {"matched":2,"steps":[...]}
bench 1000000 word999     → {"linearMs":4.9,"trieMs":0.03,...}
```

Node keeps one engine running and writes commands as they come in. Because replies come back in the same order, a plain FIFO of pending promises matches them up, and bulk loads get pipelined instead of waiting on each round trip. If the engine crashes, the API starts a new one and re-indexes from the store.

A native addon (N-API) would avoid the pipe, but a child process is easier to build on Render and keeps a crash in C++ from taking the API down with it.

## Benchmark

The engine generates `word0 … wordN`, builds a trie from it, then finds every word starting with `word999` two ways: walking the trie, and checking every string in a `vector`. Each number is the median of 7 runs. You can run the same thing from the UI.

Measured on a 4-core 2.1 GHz Xeon container:

| Words | Matches | Linear scan | Trie | Trie build |
|---:|---:|---:|---:|---:|
| 10,000 | 11 | 0.04 ms | 0.4 µs | 2.5 ms |
| 100,000 | 111 | 0.40 ms | 2.1 µs | 25 ms |
| 1,000,000 | 1,111 | ~5 ms | 0.03–0.14 ms | 0.3–0.6 s |

The scan grows with the dataset. The trie grows with the number of matches it has to return, and there are 10× more matches at each row here. With a prefix that matches only a handful of words the difference is starker: `word12345` at 1M words takes 0.4 µs in the trie and 5.9 ms scanning. Building the trie is the expensive part, and it only pays off because the index is built once and searched many times.

## Running it

Needs Node 20+, CMake 3.16+ and a C++17 compiler.

```bash
npm install
npm run build:cpp     # builds cpp/build/trie_engine
npm run dev           # API on :5000, UI on :5173
```

That runs with in-memory storage and sample contacts. To use MongoDB, copy `server/.env.example` to `server/.env` and set `MONGODB_URI`.

Tests:

```bash
npm test              # C++ unit tests, then API tests against the real engine
```

## API

```text
GET    /api/contacts?q=ra        search (empty q lists everyone)
POST   /api/contacts             { name, phone, email?, notes? }
PUT    /api/contacts/:id
DELETE /api/contacts/:id
GET    /api/trie/walk?q=ra       path through the trie, for the visualiser
GET    /api/stats                node / key / entry counts
GET    /api/benchmark?size=100000&prefix=word999
GET    /api/health
```

## Deployment

The API ships as a Docker image (see `Dockerfile` and `render.yaml`). The first stage compiles the engine and runs the C++ tests, so a broken trie fails the build. The second stage is just Node and the binary. The frontend is a static Vite build on Vercel with `VITE_API_URL` pointing at the API.

## Limitations

- Name search is prefix-only and ASCII after stripping accents. "José" is indexed as `jose`, but non-Latin scripts are dropped.
- One engine process handles every command in order, so a 1M benchmark run briefly delays searches. Fine for a demo, not for real traffic.
- The index lives in memory and is rebuilt from the store on start, which takes a moment with a large contact list.
