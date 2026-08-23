#include "Trie.h"
#include <chrono>
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
    std::cout << "]";
}

static std::vector<std::string> makeDataset(int size) {
    std::vector<std::string> words;
    words.reserve(size);
    for (int i = 0; i < size; ++i) {
        words.push_back("word" + std::to_string(i));
    }
    return words;
}

static int linearPrefixCount(const std::vector<std::string>& words, const std::string& prefix) {
    int count = 0;
    for (const auto& word : words) {
        if (word.rfind(prefix, 0) == 0) ++count;
    }
    return count;
}

static void runBenchmark(int size, const std::string& prefix) {
    const auto words = makeDataset(size);
    Trie trie;

    for (const auto& word : words) trie.insert(word);

    // Warm up once so the measurement focuses on the lookup itself.
    trie.autocomplete(prefix, size);
    linearPrefixCount(words, prefix);

    const auto linearStart = std::chrono::steady_clock::now();
    const int linearMatches = linearPrefixCount(words, prefix);
    const auto linearEnd = std::chrono::steady_clock::now();

    const auto trieStart = std::chrono::steady_clock::now();
    const int trieMatches = trie.countPrefix(prefix);
    const auto trieEnd = std::chrono::steady_clock::now();

    const double linearMs = std::chrono::duration<double, std::milli>(linearEnd - linearStart).count();
    const double trieMs = std::chrono::duration<double, std::milli>(trieEnd - trieStart).count();

    std::cout << "{\"size\":" << size
              << ",\"prefix\":\"" << jsonEscape(prefix)
              << "\",\"linearMs\":" << linearMs
              << ",\"trieMs\":" << trieMs
              << ",\"linearMatches\":" << linearMatches
              << ",\"trieMatches\":" << trieMatches
              << "}\n";
}

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    Trie trie;
    std::string line;

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
            std::cout << "}\n";
        } else if (command == "remove") {
            std::string word;
            input >> word;
            std::cout << "{\"removed\":" << (trie.remove(word) ? "true" : "false") << "}\n";
        } else if (command == "stats") {
            std::cout << "{\"nodes\":" << trie.nodeCount() << "}\n";
        } else if (command == "benchmark") {
            int size = 10000;
            std::string prefix = "word";
            input >> size >> prefix;
            size = std::max(100, std::min(size, 1000000));
            runBenchmark(size, prefix);
        } else {
            std::cout << "{\"error\":\"unknown command\"}\n";
        }
    }
}
