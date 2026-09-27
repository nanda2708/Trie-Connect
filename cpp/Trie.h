#pragma once

#include <cstddef>
#include <memory>
#include <string>
#include <utility>
#include <vector>

// A prefix tree that maps string keys to one or more string values.
//
// TrieConnect uses it as a search index: keys are name tokens and phone
// numbers, values are contact ids. The same key can point at several ids
// (two people called "Rahul"), and one id can sit under several keys.
//
// Every node also stores how many (key, value) entries live below it, so
// counting matches for a prefix is O(L) instead of a subtree walk.
class Trie {
public:
    struct Step {
        char ch;                  // character consumed to reach this node ('\0' for root)
        int count;                // entries in this node's subtree
        std::vector<char> next;   // outgoing edges, sorted
    };

    bool insert(const std::string& key, const std::string& value);
    bool erase(const std::string& key, const std::string& value);

    bool contains(const std::string& key) const;
    bool hasPrefix(const std::string& prefix) const;
    int countPrefix(const std::string& prefix) const;

    // Keys under `prefix` in lexicographic order.
    std::vector<std::string> keysWithPrefix(const std::string& prefix, std::size_t limit) const;
    // Distinct values under `prefix`, ordered by the key they were found under.
    std::vector<std::string> valuesWithPrefix(const std::string& prefix, std::size_t limit) const;
    // Nodes visited while walking `prefix`, starting at the root. Stops early
    // if the prefix leaves the tree.
    std::vector<Step> walk(const std::string& prefix) const;

    std::size_t nodeCount() const { return nodes_; }
    std::size_t keyCount() const { return keys_; }
    std::size_t entryCount() const { return root_.count; }

private:
    struct Node {
        // Sorted by character. A small sorted vector is cheaper than a hash map
        // for the handful of children a node usually has, and it gives
        // alphabetical traversal without sorting at query time.
        std::vector<std::pair<char, std::unique_ptr<Node>>> children;
        std::vector<std::string> values;
        int count = 0;

        Node* child(char ch) const;
        Node& childOrCreate(char ch, std::size_t& created);
    };

    Node root_;
    std::size_t nodes_ = 1;
    std::size_t keys_ = 0;

    const Node* find(const std::string& key) const;
    static bool collectKeys(const Node& node, std::string& key, std::vector<std::string>& out, std::size_t limit);
};
