cmake_minimum_required(VERSION 3.16)
project(trie_engine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  set(CMAKE_BUILD_TYPE Release)
endif()

if(MSVC)
  add_compile_options(/W4)
else()
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

add_library(trie STATIC Trie.cpp)
target_include_directories(trie PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})

add_executable(trie_engine main.cpp)
target_link_libraries(trie_engine PRIVATE trie)

enable_testing()
add_executable(trie_tests test.cpp)
target_link_libraries(trie_tests PRIVATE trie)
add_test(NAME trie_tests COMMAND trie_tests)
