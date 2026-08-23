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

    const int nodesBeforeDelete = trie.nodeCount();
    assert(trie.remove("react"));
    assert(!trie.search("react"));
    assert(trie.search("reactjs"));
    assert(trie.nodeCount() < nodesBeforeDelete);
    assert(!trie.remove("missing"));

    // Normalization should make lookup case-insensitive and ignore punctuation.
    trie.insert("Trie-Connect");
    assert(trie.search("TRIE CONNECT"));
    assert(trie.startsWith("trie"));

    return 0;
}
