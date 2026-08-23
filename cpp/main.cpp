#include "Trie.h"
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

static std::string jsonEscape(const std::string& value) {
    std::string out;
    for (char ch : value) {
        if (ch == '\\' || ch == '"') out += '\\';
        out += ch;
    }
    return out;
}

static void printWords(const std::vector<std::string>& words) {
    std::cout << "[";
    for (std::size_t i = 0; i < words.size(); ++i) {
        if (i) std::cout << ",";
        std::cout << "\"" << jsonEscape(words[i]) << "\"";
    }
    std::cout << "]\n";
}

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    Trie trie;
    std::string line;

    // One JSON-like command per line keeps the bridge deliberately small.
    while (std::getline(std::cin, line)) {
        std::istringstream input(line);
        std::string command;
        input >> command;

        if (command == "insert") {
            std::string word;
            input >> word;
            trie.insert(word);
            std::cout << "{\"ok\":true}\n";
        } else if (command == "search") {
            std::string word;
            input >> word;
            std::cout << "{\"found\":" << (trie.search(word) ? "true" : "false") << "}\n";
        } else if (command == "prefix") {
            std::string prefix;
            int limit = 10;
            input >> prefix >> limit;
            std::cout << "{\"count\":" << trie.countPrefix(prefix) << ",\"words\":";
            printWords(trie.autocomplete(prefix, limit));
        } else if (command == "remove") {
            std::string word;
            input >> word;
            std::cout << "{\"removed\":" << (trie.remove(word) ? "true" : "false") << "}\n";
        } else if (command == "stats") {
            std::cout << "{\"nodes\":" << trie.nodeCount() << "}\n";
        } else if (command == "clear") {
            trie = Trie();
            std::cout << "{\"ok\":true}\n";
        } else {
            std::cout << "{\"error\":\"unknown command\"}\n";
        }
    }
}
