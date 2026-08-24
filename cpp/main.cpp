#include "Trie.h"
#include <algorithm>
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

template <typename Function>
static double medianLookupMs(Function lookup) {
    std::vector<double> samples;
    samples.reserve(5);

    for (int i = 0; i < 5; ++i) {
        const auto start = std::chrono::steady_clock::now();
        lookup();
        const auto end = std::chrono::steady_clock::now();
        samples.push_back(std::chrono::duration<double, std::milli>(end - start).count());
    }

    std::sort(samples.begin(), samples.end());
    return samples[samples.size() / 2];
}

static void runBenchmark(int size, const std::string& prefix) {
    const auto words = makeDataset(size);
    Trie trie;
    for (const auto& word : words) trie.insert(word);

    // Warm up both paths before taking measurements.
    volatile int linearWarmup = linearPrefixCount(words, prefix);
    volatile int trieWarmup = trie.countPrefix(prefix);
    (void)linearWarmup;
    (void)trieWarmup;

    int linearMatches = 0;
    const double linearMs = medianLookupMs([&]() {
        linearMatches = linearPrefixCount(words, prefix);
    });

    int trieMatches = 0;
    const double trieMs = medianLookupMs([&]() {
        trieMatches = trie.countPrefix(prefix);
    });

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
            std::string prefix = "word999";
            input >> size >> prefix;
            size = std::max(100, std::min(size, 1000000));
            runBenchmark(size, prefix);
        } else {
            std::cout << "{\"error\":\"unknown command\"}\n";
        }
    }
}
