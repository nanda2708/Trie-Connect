// trie_engine: a long-running process that owns the search index.
//
// The Node API writes one command per line on stdin and reads exactly one
// JSON object per line from stdout, in the same order. Keys and ids never
// contain whitespace (the API normalises them before sending).
//
//   add <key> <id>          attach id to key
//   remove <key> <id>       detach id from key
//   find <prefix> <limit>   ids stored under prefix
//   complete <prefix> <n>   keys under prefix
//   walk <prefix>           nodes visited while following prefix
//   stats                   node / key / entry counts
//   bench <size> <prefix>   Trie vs linear scan on a generated dataset

#include "Trie.h"

#include <algorithm>
#include <chrono>
#include <cstdio>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

namespace {

using Clock = std::chrono::steady_clock;

double microsSince(Clock::time_point start) {
    return std::chrono::duration<double, std::micro>(Clock::now() - start).count();
}

std::string quote(const std::string& value) {
    std::string out = "\"";
    for (char ch : value) {
        if (ch == '"' || ch == '\\') {
            out += '\\';
            out += ch;
        } else if (static_cast<unsigned char>(ch) < 0x20) {
            char buf[8];
            std::snprintf(buf, sizeof buf, "\\u%04x", ch);
            out += buf;
        } else {
            out += ch;
        }
    }
    return out + "\"";
}

std::string array(const std::vector<std::string>& items) {
    std::string out = "[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i) out += ',';
        out += quote(items[i]);
    }
    return out + "]";
}

std::size_t clampLimit(long long limit) {
    return static_cast<std::size_t>(std::clamp(limit, 1LL, 1000LL));
}

// Median of a few runs so one scheduler hiccup doesn't decide the result.
template <typename F>
double medianMs(F&& run) {
    std::vector<double> samples;
    for (int i = 0; i < 7; ++i) {
        const auto start = Clock::now();
        run();
        samples.push_back(microsSince(start) / 1000.0);
    }
    std::sort(samples.begin(), samples.end());
    return samples[samples.size() / 2];
}

std::string bench(int size, const std::string& prefix) {
    std::vector<std::string> words;
    words.reserve(size);
    for (int i = 0; i < size; ++i) words.push_back("word" + std::to_string(i));

    Trie trie;
    const auto buildStart = Clock::now();
    for (const auto& word : words) trie.insert(word, "");
    const double buildMs = microsSince(buildStart) / 1000.0;

    // Both sides do the same job: return every word that starts with prefix.
    std::vector<std::string> linearHits;
    const double linearMs = medianMs([&] {
        linearHits.clear();
        for (const auto& word : words) {
            if (word.compare(0, prefix.size(), prefix) == 0) linearHits.push_back(word);
        }
    });

    std::vector<std::string> trieHits;
    const double trieMs = medianMs([&] { trieHits = trie.keysWithPrefix(prefix, words.size()); });

    std::ostringstream out;
    out << "{\"size\":" << size << ",\"prefix\":" << quote(prefix)
        << ",\"linearMs\":" << linearMs << ",\"trieMs\":" << trieMs
        << ",\"buildMs\":" << buildMs << ",\"nodes\":" << trie.nodeCount()
        << ",\"linearMatches\":" << linearHits.size()
        << ",\"trieMatches\":" << trieHits.size() << "}";
    return out.str();
}

std::string handle(Trie& trie, const std::string& line) {
    std::istringstream in(line);
    std::string cmd;
    in >> cmd;

    if (cmd == "add" || cmd == "remove") {
        std::string key, id;
        in >> key >> id;
        if (key.empty() || id.empty()) return R"({"error":"usage: add|remove <key> <id>"})";
        const bool changed = cmd == "add" ? trie.insert(key, id) : trie.erase(key, id);
        return std::string("{\"changed\":") + (changed ? "true" : "false") + "}";
    }

    if (cmd == "find") {
        std::string prefix;
        long long limit = 50;
        in >> prefix >> limit;
        const auto start = Clock::now();
        const auto ids = trie.valuesWithPrefix(prefix, clampLimit(limit));
        const double micros = microsSince(start);
        std::ostringstream out;
        out << "{\"ids\":" << array(ids) << ",\"entries\":" << trie.countPrefix(prefix)
            << ",\"micros\":" << micros << "}";
        return out.str();
    }

    if (cmd == "complete") {
        std::string prefix;
        long long limit = 10;
        in >> prefix >> limit;
        return "{\"keys\":" + array(trie.keysWithPrefix(prefix, clampLimit(limit))) + "}";
    }

    if (cmd == "walk") {
        std::string prefix;
        in >> prefix;
        const auto steps = trie.walk(prefix);
        std::ostringstream out;
        out << "{\"matched\":" << steps.size() - 1 << ",\"steps\":[";
        for (std::size_t i = 0; i < steps.size(); ++i) {
            if (i) out << ',';
            const auto& s = steps[i];
            out << "{\"ch\":" << quote(s.ch ? std::string(1, s.ch) : "")
                << ",\"count\":" << s.count
                << ",\"next\":" << quote(std::string(s.next.begin(), s.next.end())) << "}";
        }
        out << "]}";
        return out.str();
    }

    if (cmd == "stats") {
        std::ostringstream out;
        out << "{\"nodes\":" << trie.nodeCount() << ",\"keys\":" << trie.keyCount()
            << ",\"entries\":" << trie.entryCount() << "}";
        return out.str();
    }

    if (cmd == "bench") {
        int size = 10000;
        std::string prefix = "word999";
        in >> size >> prefix;
        return bench(std::clamp(size, 100, 1000000), prefix);
    }

    return R"({"error":"unknown command"})";
}

}  // namespace

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    Trie trie;
    std::string line;
    while (std::getline(std::cin, line)) {
        // stdout is a pipe, so flush explicitly or Node waits on a full buffer.
        std::cout << handle(trie, line) << '\n' << std::flush;
    }
}
