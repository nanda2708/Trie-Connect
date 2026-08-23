#pragma once

#include <string>
#include <vector>
#include <unordered_map>

class Trie {
public:
    Trie();
    ~Trie();

    void insert(const std::string& word);
    bool search(const std::string& word) const;
    bool startsWith(const std::string& prefix) const;
    bool remove(const std::string& word);
    std::vector<std::string> autocomplete(const std::string& prefix, int limit) const;
    int countPrefix(const std::string& prefix) const;
    int nodeCount() const;

private:
    struct Node {
        std::unordered_map<char, Node*> children;
        bool terminal = false;
    };

    Node* root_;
    int nodeCount_;

    static std::string normalize(const std::string& value);
    static void destroy(Node* node);
    bool remove(Node* node, const std::string& word, std::size_t depth);
    const Node* find(const std::string& value) const;
    void collect(const Node* node, std::string& current, std::vector<std::string>& out, int limit) const;
};
