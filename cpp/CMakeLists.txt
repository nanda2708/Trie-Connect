cmake_minimum_required(VERSION 3.16)
project(trie_engine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(trie_engine main.cpp Trie.cpp)

include(CTest)
enable_testing()
add_executable(trie_tests test.cpp Trie.cpp)
add_test(NAME trie_tests COMMAND trie_tests)
