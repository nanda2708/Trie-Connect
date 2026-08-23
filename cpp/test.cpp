#include "Trie.h"
#include <cassert>

int main() {
    Trie trie;

    trie.insert("react");
    trie.insert("reactjs");
    trie.insert("redis");
    trie.insert("rust");

    assert(trie.search("react"));
    assert(!trie.search("rea"));
    assert(trie.startsWith("rea"));
    assert(trie.countPrefix("rea") == 2);
    assert(trie.autocomplete("re", 3).size() == 3);

    assert(trie.remove("react"));
    assert(!trie.search("react"));
    assert(trie.search("reactjs"));
    assert(!trie.remove("missing"));

    return 0;
}
