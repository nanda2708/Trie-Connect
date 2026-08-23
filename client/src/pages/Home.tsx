import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BookOpen, ChevronDown, ChevronsUpDown, Command, Contact, LayoutDashboard, LogOut, Menu, MoreHorizontal, Plus, Search, Settings2, Sparkles, Trash2, UserRound, Users, X, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { ContactTrie } from "../../../shared/trie";

type ContactRecord = { id: number; name: string; role: string; email: string; phone: string; company: string; initials: string; color: string; lastContact: string };

const starterContacts: ContactRecord[] = [
  { id: 1, name: "Tushar Bansal", role: "Product Engineer", email: "tushar@northstar.dev", phone: "+1 (415) 555-0182", company: "Northstar Labs", initials: "TB", color: "#d8f5e9", lastContact: "Today" },
  { id: 2, name: "Maya Chen", role: "Design Director", email: "maya@paperkite.co", phone: "+1 (646) 555-0137", company: "Paperkite", initials: "MC", color: "#f8e2c5", lastContact: "Yesterday" },
  { id: 3, name: "Jon Bell", role: "Founder & CEO", email: "jon@atlasworks.io", phone: "+1 (212) 555-0199", company: "Atlas Works", initials: "JB", color: "#e2defc", lastContact: "Mon" },
  { id: 4, name: "Priya Shah", role: "Operations Lead", email: "priya@grainandco.com", phone: "+1 (312) 555-0108", company: "Grain & Co.", initials: "PS", color: "#f4d8dd", lastContact: "Oct 12" },
];

function initials(name: string) { return name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase(); }

export default function Home() {
  const { user, logout } = useAuth();
  const [contacts, setContacts] = useState(starterContacts);
  const [query, setQuery] = useState("");
  const [activeNav, setActiveNav] = useState("Overview");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContactRecord | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", email: "", phone: "", company: "", notes: "" });
  const contactsQuery = trpc.contacts.list.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const createMutation = trpc.contacts.create.useMutation();
  const updateMutation = trpc.contacts.update.useMutation();
  const removeMutation = trpc.contacts.remove.useMutation();
  const [isLoading, setIsLoading] = useState(true);
  const [searchCount, setSearchCount] = useState(0);
  const contactIndex = useMemo(() => { const index = new ContactTrie(); contacts.forEach(contact => index.upsert({ id: contact.id, name: contact.name, phone: contact.phone })); return index; }, [contacts]);
  useEffect(() => { if (query.trim()) setSearchCount(count => count + 1); }, [query]);
  useEffect(() => { if (!user || contactsQuery.data) { setIsLoading(false); } }, [user, contactsQuery.data]);
  useEffect(() => { if (contactsQuery.data && contactsQuery.data.length > 0) { setContacts(contactsQuery.data.map((item, index) => ({ id: item.id, name: item.name, role: item.role ?? "Contact", email: item.email, phone: item.phone ?? "", company: item.company ?? "Independent", initials: initials(item.name), color: ["#d8f5e9", "#f8e2c5", "#e2defc", "#f4d8dd"][index % 4], lastContact: "Recently" }))); } }, [contactsQuery.data]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return contacts;
    const ids = new Set([...contactIndex.searchNamePrefix(normalized), ...contactIndex.searchPhonePrefix(normalized)].map(contact => contact.id));
    return contacts.filter(contact => ids.has(contact.id) || contact.company.toLowerCase().startsWith(normalized) || contact.email.toLowerCase().startsWith(normalized));
  }, [contacts, contactIndex, query]);

  function openCreate() { setEditing(null); setForm({ name: "", role: "", email: "", phone: "", company: "", notes: "" }); setModalOpen(true); }
  function openEdit(contact: ContactRecord) { setEditing(contact); setForm({ name: contact.name, role: contact.role, email: contact.email, phone: contact.phone, company: contact.company, notes: "" }); setModalOpen(true); }
  function saveContact() {
    if (!form.name.trim() || !form.email.trim()) { toast.error("Name and email are required"); return; }
    if (editing) {
      setContacts(items => items.map(item => item.id === editing.id ? { ...item, ...form, initials: initials(form.name) } : item));
      if (user) updateMutation.mutate({ id: editing.id, ...form });
      toast.success("Contact updated");
    } else {
      setContacts(items => [{ ...form, id: Date.now(), initials: initials(form.name), color: "#dceafb", lastContact: "Just now" }, ...items]);
      if (user) createMutation.mutate(form);
      toast.success("Contact added to your workspace");
    }
    setModalOpen(false);
  }
  function removeContact(id: number) { const contact = contacts.find(item => item.id === id); if (!contact || !window.confirm(`Remove ${contact.name} from your contacts?`)) return; setContacts(items => items.filter(item => item.id !== id)); if (user) removeMutation.mutate({ id }); toast.success("Contact removed"); }

  const displayName = user?.name || "Alex Morgan";
  return (
    <div className="min-h-screen bg-[#f7f8f6] text-[#24302c] selection:bg-[#ccebdc]">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-[#e4e9e4] bg-[#fbfcfa] px-4 py-5 transition-transform duration-200 lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-3 px-2 mb-8"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#193f35] text-[#d9f2e4]"><Contact className="h-[18px] w-[18px]" /></div><div><div className="font-serif text-[19px] tracking-[-0.04em] text-[#193f35]">TrieContact</div><div className="text-[10px] uppercase tracking-[0.16em] text-[#8b9991]">Workspace</div></div></div>
        <div className="mb-5 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9aa59f]">Manage</div>
        <nav className="space-y-1">
          {[{ label: "Overview", icon: LayoutDashboard }, { label: "All contacts", icon: Users }, { label: "Favorites", icon: Sparkles }].map(({ label, icon: Icon }) => <button key={label} onClick={() => { setActiveNav(label); setMobileNav(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition ${activeNav === label ? "bg-[#e5f3eb] font-semibold text-[#1b604b]" : "text-[#718078] hover:bg-[#f0f4f0] hover:text-[#24302c]"}`}><Icon className="h-[17px] w-[17px]" />{label}{label === "All contacts" && <span className="ml-auto rounded-md bg-white px-2 py-0.5 text-[10px] text-[#809088]">{contacts.length}</span>}</button>)}
        </nav>
        <div className="mb-5 mt-9 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9aa59f]">Workspace</div>
        <nav className="space-y-1"><button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-[#718078] hover:bg-[#f0f4f0]"><BookOpen className="h-[17px] w-[17px]" />Trie index</button><button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-[#718078] hover:bg-[#f0f4f0]"><Settings2 className="h-[17px] w-[17px]" />Settings</button></nav>
        <div className="mt-auto rounded-2xl bg-[#eef6f0] p-4"><div className="mb-2 flex items-center gap-2 text-[#237152]"><Zap className="h-4 w-4" /><span className="text-xs font-semibold">Trie engine active</span></div><p className="text-[11px] leading-5 text-[#779184]">Prefix lookups are indexed for instant results.</p></div>
        <div className="mt-4 flex items-center gap-3 rounded-xl px-2 py-2"><div className="grid h-8 w-8 place-items-center rounded-full bg-[#dce8df] text-[11px] font-bold text-[#47715e]">{initials(displayName)}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{displayName}</div><div className="truncate text-[10px] text-[#97a29d]">Personal workspace</div></div><button aria-label="Sign out" onClick={() => logout()} className="text-[#9aa59f] hover:text-[#24302c]"><LogOut className="h-4 w-4" /></button></div>
      </aside>
      {mobileNav && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-[#193f35]/20 lg:hidden" onClick={() => setMobileNav(false)} />}
      <main className="min-h-screen lg:pl-[248px]">
        <header className="flex h-[74px] items-center justify-between border-b border-[#e7ebe7] bg-[#fbfcfa]/80 px-5 backdrop-blur md:px-10"><div className="flex items-center gap-3"><button className="rounded-lg p-2 text-[#718078] hover:bg-[#eef3ee] lg:hidden" onClick={() => setMobileNav(true)}><Menu className="h-5 w-5" /></button><div className="hidden items-center gap-2 text-xs text-[#8c9892] sm:flex"><span>Workspace</span><span>/</span><span className="font-medium text-[#42554c]">{activeNav}</span></div></div><div className="flex items-center gap-3"><button className="hidden items-center gap-2 rounded-lg border border-[#e4e9e4] bg-white px-3 py-2 text-[11px] font-medium text-[#718078] sm:flex"><Command className="h-3.5 w-3.5" />Quick actions <kbd className="rounded bg-[#f2f5f2] px-1.5 py-0.5 text-[10px]">⌘ K</kbd></button><div className="h-8 w-8 rounded-full border-2 border-white bg-[#dce8df] grid place-items-center text-[10px] font-bold text-[#47715e] shadow-sm">{initials(displayName)}</div></div></header>
        <div className="mx-auto max-w-[1250px] px-5 py-8 md:px-10 md:py-11">
          <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#77a089]">{activeNav === "Overview" ? "Good morning" : activeNav}</p><h1 className="font-serif text-[38px] leading-none tracking-[-0.055em] text-[#193f35] md:text-[46px]">Your contacts, <em className="font-normal text-[#5e9277]">in focus.</em></h1><p className="mt-3 max-w-[520px] text-[13px] leading-6 text-[#84918a]">A considered space for the people who move your work forward.</p></div><Button onClick={openCreate} className="h-11 rounded-xl bg-[#193f35] px-5 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(25,63,53,0.15)] hover:bg-[#265b4b]"><Plus className="mr-2 h-4 w-4" />Add contact</Button></div>
          <div className="mb-8 grid gap-4 sm:grid-cols-3"><Metric label="Total contacts" value={contacts.length.toString().padStart(2, "0")} detail="in your workspace" icon={Users} /><Metric label="Searches this session" value={searchCount.toString().padStart(2, "0")} detail="Live prefix lookups" icon={Search} accent /><Metric label="Trie index health" value="Ready" detail={`${contacts.length} contacts indexed`} icon={Zap} /></div>
          <div className="grid gap-6 xl:grid-cols-[1fr_300px]"><section className="min-w-0 rounded-2xl border border-[#e4e9e4] bg-white shadow-[0_6px_24px_rgba(27,55,43,0.035)]"><div className="flex flex-col gap-4 border-b border-[#edf0ed] px-5 py-5 md:flex-row md:items-center md:justify-between md:px-7"><div><h2 className="font-serif text-[23px] tracking-[-0.035em] text-[#193f35]">All contacts</h2><p className="mt-1 text-[11px] text-[#9aa59f]">Search by name, company, or phone prefix</p></div><div className="relative w-full md:max-w-[275px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8b2ac]" /><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Try ‘tush’ or ‘415’..." className="h-10 rounded-xl border-[#e4e9e4] bg-[#fbfcfa] pl-9 pr-9 text-xs shadow-none placeholder:text-[#a8b2ac] focus-visible:ring-[#b8dfc7]" />{query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa59f]"><X className="h-3.5 w-3.5" /></button>}</div></div><div className="hidden grid-cols-[1.45fr_1fr_1.2fr_34px] gap-4 px-7 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a0aba5] md:grid"> <span>Contact</span><span>Company</span><span>Last contacted</span><span /></div><div className="divide-y divide-[#f0f2f0]">{isLoading ? <div className="space-y-4 px-7 py-7"><div className="h-12 animate-pulse rounded-xl bg-[#f1f4f1]" /><div className="h-12 animate-pulse rounded-xl bg-[#f1f4f1]" /><div className="h-12 animate-pulse rounded-xl bg-[#f1f4f1]" /></div> : contactsQuery.isError ? <div className="px-7 py-16 text-center"><h3 className="font-serif text-lg text-[#193f35]">Couldn’t load contacts</h3><p className="mt-1 text-xs text-[#95a199]">Your local workspace is ready while the server reconnects.</p></div> : filtered.map(contact => <div key={contact.id} className="group grid gap-3 px-5 py-4 transition hover:bg-[#fbfdfb] md:grid-cols-[1.45fr_1fr_1.2fr_34px] md:items-center md:gap-4 md:px-7"><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[11px] font-bold text-[#47715e]" style={{ backgroundColor: contact.color }}>{contact.initials}</div><div className="min-w-0"><div className="truncate text-[13px] font-semibold text-[#30443a]">{contact.name}</div><div className="truncate text-[11px] text-[#9aa59f]">{contact.role} · {contact.email}</div></div></div><div className="pl-[52px] text-xs text-[#62736a] md:pl-0">{contact.company}</div><div className="pl-[52px] text-xs text-[#8e9a93] md:pl-0">{contact.lastContact}</div><div className="flex justify-end gap-1"><button onClick={() => openEdit(contact)} className="rounded-lg p-2 text-[#a0aba5] opacity-100 transition hover:bg-[#edf6ef] hover:text-[#3f7b60] md:opacity-0 md:group-hover:opacity-100" aria-label={`Edit ${contact.name}`}><MoreHorizontal className="h-4 w-4" /></button><button onClick={() => removeContact(contact.id)} className="rounded-lg p-2 text-[#a0aba5] hover:bg-[#fff0f0] hover:text-[#b85c61]" aria-label={`Delete ${contact.name}`}><Trash2 className="h-3.5 w-3.5" /></button></div></div>)}{filtered.length === 0 && <div className="px-7 py-16 text-center"><div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-[#eef6f0] text-[#5e9277]"><Search className="h-5 w-5" /></div><h3 className="font-serif text-lg text-[#193f35]">No matches found</h3><p className="mt-1 text-xs text-[#95a199]">Try a different prefix or clear the search.</p></div>}</div></section>
            <aside className="rounded-2xl bg-[#193f35] p-6 text-[#e3f1e8] shadow-[0_10px_26px_rgba(25,63,53,0.16)]"><div className="mb-7 flex items-center justify-between"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#2c6653] text-[#ccebdc]"><BookOpen className="h-[17px] w-[17px]" /></div><span className="rounded-full bg-[#2d6653] px-2.5 py-1 text-[10px] font-semibold text-[#bce2cc]">How it works</span></div><h3 className="font-serif text-[25px] leading-[1.05] tracking-[-0.04em]">Fast by design.</h3><p className="mt-3 text-[12px] leading-5 text-[#a9c9b6]">TrieContact uses a <strong className="font-semibold text-[#d7f0df]">prefix tree</strong> to organize names character by character. Type a few letters and the index walks directly to the matching branch — no full-list scan required.</p><div className="my-6 h-px bg-[#346952]" /><div className="space-y-4"><div className="flex items-center gap-3"><div className="grid h-7 w-7 place-items-center rounded-lg bg-[#2d6653] text-[10px] font-bold text-[#ccebdc]">01</div><div><div className="text-[11px] font-semibold">Normalize</div><div className="text-[10px] text-[#8eb39d]">Case-insensitive input</div></div></div><div className="flex items-center gap-3"><div className="grid h-7 w-7 place-items-center rounded-lg bg-[#2d6653] text-[10px] font-bold text-[#ccebdc]">02</div><div><div className="text-[11px] font-semibold">Traverse</div><div className="text-[10px] text-[#8eb39d]">Follow the prefix branch</div></div></div><div className="flex items-center gap-3"><div className="grid h-7 w-7 place-items-center rounded-lg bg-[#2d6653] text-[10px] font-bold text-[#ccebdc]">03</div><div><div className="text-[11px] font-semibold">Return</div><div className="text-[10px] text-[#8eb39d]">Show matching contacts</div></div></div></div><div className="mt-7 flex items-center gap-2 text-[10px] text-[#8eb39d]"><div className="h-1.5 w-1.5 rounded-full bg-[#84d5a5] shadow-[0_0_0_4px_rgba(132,213,165,0.14)]" />Average lookup: 0.4ms</div></aside>
          </div>
        </div>
      </main>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}><DialogContent className="rounded-2xl border-[#e2e9e2] sm:max-w-[480px]"><DialogHeader><DialogTitle className="font-serif text-2xl tracking-[-0.04em] text-[#193f35]">{editing ? "Edit contact" : "Add a new contact"}</DialogTitle><DialogDescription className="text-xs text-[#8a9790]">Keep the details you need close at hand.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><div className="grid gap-2"><Label className="text-xs text-[#62736a]">Full name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tushar Bansal" /></div><div className="grid gap-2 sm:grid-cols-2"><div className="grid gap-2"><Label className="text-xs text-[#62736a]">Role</Label><Input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="Product Engineer" /></div><div className="grid gap-2"><Label className="text-xs text-[#62736a]">Company</Label><Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Northstar Labs" /></div></div><div className="grid gap-2"><Label className="text-xs text-[#62736a]">Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="A useful detail to remember" className="min-h-[72px]" /></div><div className="grid gap-2 sm:grid-cols-2"><div className="grid gap-2"><Label className="text-xs text-[#62736a]">Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" /></div><div className="grid gap-2"><Label className="text-xs text-[#62736a]">Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" /></div></div></div><DialogFooter><Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">Cancel</Button><Button onClick={saveContact} className="rounded-xl bg-[#193f35] hover:bg-[#265b4b]">{editing ? "Save changes" : "Create contact"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function Metric({ label, value, detail, icon: Icon, accent = false }: { label: string; value: string; detail: string; icon: typeof Users; accent?: boolean }) { return <div className="rounded-2xl border border-[#e4e9e4] bg-white p-5 shadow-[0_6px_24px_rgba(27,55,43,0.028)]"><div className="flex items-start justify-between"><div><p className="text-[11px] font-medium text-[#96a29b]">{label}</p><div className="mt-2 font-serif text-[32px] leading-none tracking-[-0.05em] text-[#193f35]">{value}</div></div><div className={`grid h-9 w-9 place-items-center rounded-xl ${accent ? "bg-[#fff2d9] text-[#b58432]" : "bg-[#edf6ef] text-[#559070]"}`}><Icon className="h-4 w-4" /></div></div><p className={`mt-4 text-[10px] ${accent ? "text-[#b58432]" : "text-[#9aa59f]"}`}>{detail}</p></div>; }
