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

    // Removing a leaf word should remove its now-unused nodes.
    const int nodesBeforeDelete = trie.nodeCount();
    assert(trie.remove("rust"));
    assert(!trie.search("rust"));
    assert(trie.search("react"));
    assert(trie.search("reactjs"));
    assert(trie.nodeCount() < nodesBeforeDelete);
    assert(!trie.remove("missing"));

    // Removing a word that shares a prefix must preserve the shared branch.
    assert(trie.remove("react"));
    assert(!trie.search("react"));
    assert(trie.search("reactjs"));

    // Normalization should make lookup case-insensitive and ignore punctuation.
    trie.insert("Trie-Connect");
    assert(trie.search("TRIE CONNECT"));
    assert(trie.startsWith("trie"));

    // Contact indexes use ':' as an internal namespace separator.
    trie.insert("n:sai");
    trie.insert("n:sainath");
    trie.insert("p:9999999999");
    trie.insert("p:9998887777");
    assert(trie.search("n:sai"));
    assert(trie.search("p:9999999999"));
    assert(trie.countPrefix("n:sai") == 2);
    assert(trie.countPrefix("p:999") == 2);
    assert(trie.autocomplete("p:999", 10).size() == 2);

    return 0;
}
