#include "Trie.h"
#include <algorithm>
#include <cctype>

Trie::Trie() : root_(new Node()), nodeCount_(1) {}

Trie::~Trie() { destroy(root_); }

std::string Trie::normalize(const std::string& value) {
    std::string result;
    result.reserve(value.size());
    for (unsigned char ch : value) {
        if (std::isalnum(ch)) result.push_back(static_cast<char>(std::tolower(ch)));
    }
    return result;
}

void Trie::destroy(Node* node) {
    if (!node) return;
    for (auto& [_, child] : node->children) destroy(child);
    delete node;
}

void Trie::insert(const std::string& word) {
    const std::string value = normalize(word);
    if (value.empty()) return;

    Node* node = root_;
    for (char ch : value) {
        auto it = node->children.find(ch);
        if (it == node->children.end()) {
            auto* child = new Node();
            node->children[ch] = child;
            node = child;
            ++nodeCount_;
        } else {
            node = it->second;
        }
    }
    node->terminal = true;
}

const Trie::Node* Trie::find(const std::string& value) const {
    Node* node = root_;
    for (char ch : value) {
        auto it = node->children.find(ch);
        if (it == node->children.end()) return nullptr;
        node = it->second;
    }
    return node;
}

bool Trie::search(const std::string& word) const {
    const std::string value = normalize(word);
    const Node* node = find(value);
    return node && node->terminal;
}

bool Trie::startsWith(const std::string& prefix) const {
    const std::string value = normalize(prefix);
    if (value.empty()) return true;
    return find(value) != nullptr;
}

void Trie::collect(const Node* node, std::string& current, std::vector<std::string>& out, int limit) const {
    if (static_cast<int>(out.size()) >= limit) return;
    if (node->terminal) out.push_back(current);

    std::vector<char> keys;
    keys.reserve(node->children.size());
    for (const auto& [ch, _] : node->children) keys.push_back(ch);
    std::sort(keys.begin(), keys.end());

    for (char ch : keys) {
        current.push_back(ch);
        collect(node->children.at(ch), current, out, limit);
        current.pop_back();
        if (static_cast<int>(out.size()) >= limit) return;
    }
}

std::vector<std::string> Trie::autocomplete(const std::string& prefix, int limit) const {
    const std::string value = normalize(prefix);
    const Node* node = find(value);
    if (!node || limit <= 0) return {};

    std::vector<std::string> result;
    std::string current = value;
    collect(node, current, result, limit);
    return result;
}

int Trie::countPrefix(const std::string& prefix) const {
    const std::string value = normalize(prefix);
    const Node* node = find(value);
    if (!node) return 0;

    std::vector<std::string> matches;
    std::string current = value;
    collect(node, current, matches, 1000000);
    return static_cast<int>(matches.size());
}

bool Trie::remove(Node* node, const std::string& word, std::size_t depth) {
    if (depth == word.size()) {
        if (!node->terminal) return false;
        node->terminal = false;
        return true;
    }

    auto it = node->children.find(word[depth]);
    if (it == node->children.end()) return false;
    Node* child = it->second;

    if (!remove(child, word, depth + 1)) return false;

    if (!child->terminal && child->children.empty()) {
        delete child;
        node->children.erase(it);
        --nodeCount_;
    }
    return true;
}

bool Trie::remove(const std::string& word) {
    const std::string value = normalize(word);
    if (value.empty() || !search(value)) return false;
    return remove(root_, value, 0);
}

int Trie::nodeCount() const { return nodeCount_; }
