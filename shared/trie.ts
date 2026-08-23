export type IndexedContact = { id: number; name: string; phone?: string };

type TrieNode = { children: Map<string, TrieNode>; ids: Set<number> };

/** Reference implementation of the C++ prefix-index concept: each character is a branch. */
export class ContactTrie {
  private readonly nameRoot: TrieNode = { children: new Map(), ids: new Set() };
  private readonly phoneRoot: TrieNode = { children: new Map(), ids: new Set() };
  private readonly contacts = new Map<number, IndexedContact>();

  upsert(contact: IndexedContact) { this.remove(contact.id); this.contacts.set(contact.id, contact); this.add(this.nameRoot, contact.name.toLocaleLowerCase(), contact.id); this.add(this.phoneRoot, this.normalizePhone(contact.phone), contact.id); }
  remove(id: number) { const previous = this.contacts.get(id); if (!previous) return; this.removePath(this.nameRoot, previous.name.toLocaleLowerCase(), id); this.removePath(this.phoneRoot, this.normalizePhone(previous.phone), id); this.contacts.delete(id); }
  searchNamePrefix(prefix: string) { return this.collect(this.nameRoot, prefix.trim().toLocaleLowerCase()); }
  searchPhonePrefix(prefix: string) { return this.collect(this.phoneRoot, this.normalizePhone(prefix)); }

  private add(root: TrieNode, value: string, id: number) { let node = root; for (const char of value) { if (!node.children.has(char)) node.children.set(char, { children: new Map(), ids: new Set() }); node = node.children.get(char)!; node.ids.add(id); } }
  private removePath(root: TrieNode, value: string, id: number) { let node = root; for (const char of value) { const next = node.children.get(char); if (!next) return; next.ids.delete(id); node = next; } }
  private collect(root: TrieNode, prefix: string) { if (!prefix) return []; let node = root; for (const char of prefix) { node = node.children.get(char)!; if (!node) return []; } return Array.from(node.ids).map(id => this.contacts.get(id)!).filter(Boolean); }
  private normalizePhone(value = "") { return value.replace(/[^0-9+]/g, ""); }
}
