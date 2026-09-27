#include "Trie.h"

#include <cstdlib>
#include <iostream>
#include <string>
#include <vector>

namespace {

int failures = 0;

void check(bool ok, const char* expr, int line) {
    if (!ok) {
        std::cerr << "test.cpp:" << line << ": check failed: " << expr << '\n';
        ++failures;
    }
}

#define CHECK(expr) check((expr), #expr, __LINE__)

using Strings = std::vector<std::string>;

void basicLookup() {
    Trie t;
    CHECK(t.insert("react", "1"));
    CHECK(t.insert("reactjs", "2"));
    CHECK(t.insert("redis", "3"));
    CHECK(t.insert("rust", "4"));

    CHECK(t.contains("react"));
    CHECK(!t.contains("rea"));
    CHECK(t.hasPrefix("rea"));
    CHECK(!t.hasPrefix("rx"));
    CHECK(t.countPrefix("re") == 3);
    CHECK(t.countPrefix("") == 4);
    CHECK(t.keyCount() == 4);
}

void resultsAreSortedAndLimited() {
    Trie t;
    for (const char* w : {"sam", "sara", "sai", "saanvi", "sahil"}) t.insert(w, w);

    CHECK((t.keysWithPrefix("sa", 10) == Strings{"saanvi", "sahil", "sai", "sam", "sara"}));
    CHECK((t.keysWithPrefix("sa", 2) == Strings{"saanvi", "sahil"}));
    CHECK(t.keysWithPrefix("x", 10).empty());
    CHECK((t.valuesWithPrefix("sa", 3) == Strings{"saanvi", "sahil", "sai"}));
}

void keysCanHoldSeveralValues() {
    Trie t;
    CHECK(t.insert("n:rahul", "a"));
    CHECK(t.insert("n:rahul", "b"));
    CHECK(!t.insert("n:rahul", "a"));  // duplicate pair is ignored
    CHECK(t.keyCount() == 1);
    CHECK(t.entryCount() == 2);
    CHECK(t.countPrefix("n:ra") == 2);
}

void valuesAreDeduplicated() {
    // One contact indexed under two tokens that share a prefix.
    Trie t;
    t.insert("n:sai", "c1");
    t.insert("n:saikiran", "c1");
    t.insert("n:sanjay", "c2");
    CHECK((t.valuesWithPrefix("n:sa", 10) == Strings{"c1", "c2"}));
    CHECK(t.countPrefix("n:sa") == 3);  // counts entries, not distinct ids
}

void namespacesStaySeparate() {
    Trie t;
    t.insert("n:9lives", "x");
    t.insert("p:9876543210", "y");
    t.insert("p:9876500000", "z");
    CHECK((t.valuesWithPrefix("p:98765", 10) == Strings{"z", "y"}));
    CHECK((t.valuesWithPrefix("n:9", 10) == Strings{"x"}));
}

void eraseCleansUpNodes() {
    Trie t;
    t.insert("react", "1");
    t.insert("reactjs", "2");
    const auto before = t.nodeCount();

    CHECK(t.insert("rust", "3"));
    CHECK(t.erase("rust", "3"));
    CHECK(t.nodeCount() == before);  // r-u-s-t branch removed, "r" kept
    CHECK(!t.hasPrefix("ru"));

    // Removing the shorter key must keep the longer one intact.
    CHECK(t.erase("react", "1"));
    CHECK(!t.contains("react"));
    CHECK(t.contains("reactjs"));
    CHECK(t.nodeCount() == before);

    CHECK(t.erase("reactjs", "2"));
    CHECK(t.nodeCount() == 1);
    CHECK(t.entryCount() == 0);
    CHECK(t.keyCount() == 0);
}

void eraseOnlyTouchesMatchingValue() {
    Trie t;
    t.insert("n:rahul", "a");
    t.insert("n:rahul", "b");
    CHECK(!t.erase("n:rahul", "zzz"));
    CHECK(!t.erase("n:rah", "a"));
    CHECK(!t.erase("missing", "a"));
    CHECK(t.countPrefix("n:") == 2);

    CHECK(t.erase("n:rahul", "a"));
    CHECK((t.valuesWithPrefix("n:rahul", 10) == Strings{"b"}));
    CHECK(t.countPrefix("n:") == 1);
    CHECK(t.keyCount() == 1);
}

void walkFollowsThePrefix() {
    Trie t;
    t.insert("cat", "1");
    t.insert("car", "2");
    t.insert("dog", "3");

    auto steps = t.walk("cax");
    CHECK(steps.size() == 3);  // root, c, a  -- 'x' is not in the tree
    CHECK(steps[0].count == 3);
    CHECK((steps[0].next == std::vector<char>{'c', 'd'}));
    CHECK(steps[2].ch == 'a');
    CHECK(steps[2].count == 2);
    CHECK((steps[2].next == std::vector<char>{'r', 't'}));
}

}  // namespace

int main() {
    basicLookup();
    resultsAreSortedAndLimited();
    keysCanHoldSeveralValues();
    valuesAreDeduplicated();
    namespacesStaySeparate();
    eraseCleansUpNodes();
    eraseOnlyTouchesMatchingValue();
    walkFollowsThePrefix();

    if (failures) {
        std::cerr << failures << " check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "all trie tests passed\n";
    return EXIT_SUCCESS;
}
