#include "Trie.h"

#include <algorithm>
#include <unordered_set>

namespace {

template <typename Children>
auto edge(Children& children, char ch) {
    return std::lower_bound(children.begin(), children.end(), ch,
                            [](const auto& entry, char c) { return entry.first < c; });
}

}  // namespace

Trie::Node* Trie::Node::child(char ch) const {
    auto it = edge(children, ch);
    return it != children.end() && it->first == ch ? it->second.get() : nullptr;
}

Trie::Node& Trie::Node::childOrCreate(char ch, std::size_t& created) {
    auto it = edge(children, ch);
    if (it == children.end() || it->first != ch) {
        it = children.emplace(it, ch, std::make_unique<Node>());
        ++created;
    }
    return *it->second;
}

const Trie::Node* Trie::find(const std::string& key) const {
    const Node* node = &root_;
    for (char ch : key) {
        node = node->child(ch);
        if (!node) return nullptr;
    }
    return node;
}

bool Trie::insert(const std::string& key, const std::string& value) {
    if (key.empty()) return false;

    // Check first so a duplicate insert doesn't bump the counts on the path.
    if (const Node* existing = find(key)) {
        const auto& values = existing->values;
        if (std::find(values.begin(), values.end(), value) != values.end()) return false;
    }

    Node* node = &root_;
    node->count++;
    for (char ch : key) {
        node = &node->childOrCreate(ch, nodes_);
        node->count++;
    }
    if (node->values.empty()) keys_++;
    node->values.push_back(value);
    return true;
}

bool Trie::erase(const std::string& key, const std::string& value) {
    if (key.empty()) return false;

    std::vector<Node*> path{&root_};
    for (char ch : key) {
        Node* next = path.back()->child(ch);
        if (!next) return false;
        path.push_back(next);
    }

    auto& values = path.back()->values;
    auto it = std::find(values.begin(), values.end(), value);
    if (it == values.end()) return false;
    values.erase(it);
    if (values.empty()) keys_--;

    for (Node* node : path) node->count--;

    // Walk back up and drop nodes that no longer lead anywhere.
    for (std::size_t depth = key.size(); depth > 0; --depth) {
        Node* node = path[depth];
        if (!node->values.empty() || !node->children.empty()) break;
        auto& siblings = path[depth - 1]->children;
        siblings.erase(edge(siblings, key[depth - 1]));
        nodes_--;
    }
    return true;
}

bool Trie::contains(const std::string& key) const {
    const Node* node = find(key);
    return node && !node->values.empty();
}

bool Trie::hasPrefix(const std::string& prefix) const {
    const Node* node = find(prefix);
    return node && node->count > 0;
}

int Trie::countPrefix(const std::string& prefix) const {
    const Node* node = find(prefix);
    return node ? node->count : 0;
}

bool Trie::collectKeys(const Node& node, std::string& key, std::vector<std::string>& out, std::size_t limit) {
    if (out.size() >= limit) return false;
    if (!node.values.empty()) out.push_back(key);

    for (const auto& [ch, child] : node.children) {
        key.push_back(ch);
        const bool more = collectKeys(*child, key, out, limit);
        key.pop_back();
        if (!more) return false;
    }
    return out.size() < limit;
}

std::vector<std::string> Trie::keysWithPrefix(const std::string& prefix, std::size_t limit) const {
    std::vector<std::string> out;
    const Node* node = find(prefix);
    if (!node || limit == 0) return out;

    std::string key = prefix;
    collectKeys(*node, key, out, limit);
    return out;
}

std::vector<std::string> Trie::valuesWithPrefix(const std::string& prefix, std::size_t limit) const {
    std::vector<std::string> out;
    const Node* start = find(prefix);
    if (!start || limit == 0) return out;

    std::unordered_set<std::string> seen;
    std::vector<const Node*> stack{start};

    // Iterative preorder DFS. Children are pushed in reverse so the smallest
    // character is visited first and results come out alphabetically.
    while (!stack.empty() && out.size() < limit) {
        const Node* node = stack.back();
        stack.pop_back();

        for (const auto& value : node->values) {
            if (seen.insert(value).second) {
                out.push_back(value);
                if (out.size() == limit) break;
            }
        }
        for (auto it = node->children.rbegin(); it != node->children.rend(); ++it) {
            stack.push_back(it->second.get());
        }
    }
    return out;
}

std::vector<Trie::Step> Trie::walk(const std::string& prefix) const {
    auto describe = [](const Node& node, char ch) {
        Step step{ch, node.count, {}};
        step.next.reserve(node.children.size());
        for (const auto& [c, _] : node.children) step.next.push_back(c);
        return step;
    };

    std::vector<Step> steps{describe(root_, '\0')};
    const Node* node = &root_;
    for (char ch : prefix) {
        node = node->child(ch);
        if (!node) break;
        steps.push_back(describe(*node, ch));
    }
    return steps;
}
