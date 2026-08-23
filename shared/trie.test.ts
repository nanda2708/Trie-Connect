import { describe, expect, it } from "vitest";
import { ContactTrie } from "./trie";

describe("ContactTrie", () => {
  it("finds names with case-insensitive prefixes", () => {
    const trie = new ContactTrie();
    trie.upsert({ id: 1, name: "Tushar Bansal" });
    trie.upsert({ id: 2, name: "Maya Chen" });
    expect(trie.searchNamePrefix("tUsH").map(contact => contact.id)).toEqual([1]);
    expect(trie.searchNamePrefix("")).toEqual([]);
  });

  it("normalizes phone prefixes and supports removal", () => {
    const trie = new ContactTrie();
    trie.upsert({ id: 1, name: "Maya Chen", phone: "+1 (646) 555-0137" });
    expect(trie.searchPhonePrefix("+1646")).toHaveLength(1);
    trie.remove(1);
    expect(trie.searchPhonePrefix("646")).toEqual([]);
  });
});
