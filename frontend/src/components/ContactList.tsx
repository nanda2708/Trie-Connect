import type { Contact } from "../api";

type Props = {
  contacts: Contact[];
  query: string;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
};

function tokenize(text: string) {
  return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

// Bolds the part of each name word (or the phone number) the query matched.
function Highlight({ text, prefixes }: { text: string; prefixes: string[] }) {
  if (!prefixes.length) return <>{text}</>;
  return (
    <>
      {text.split(/(\s+)/).map((word, i) => {
        const plain = tokenize(word).join("");
        const hit = prefixes.filter(p => plain.startsWith(p)).sort((a, b) => b.length - a.length)[0];
        if (!hit) return <span key={i}>{word}</span>;
        return (
          <span key={i}>
            <mark className="bg-transparent font-semibold text-emerald-800">{word.slice(0, hit.length)}</mark>
            {word.slice(hit.length)}
          </span>
        );
      })}
    </>
  );
}

export default function ContactList({ contacts, query, onEdit, onDelete }: Props) {
  const phoneSearch = /^\+?\d/.test(query.trim());
  const namePrefixes = phoneSearch ? [] : tokenize(query);
  const digits = phoneSearch ? query.replace(/\D/g, "") : "";

  return (
    <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
      {contacts.map(contact => (
        <li key={contact.id} className="group flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-stone-900">
              <Highlight text={contact.name} prefixes={namePrefixes} />
            </p>
            <p className="mt-0.5 truncate text-xs text-stone-500">
              <span className="font-mono">
                {digits ? (
                  <>
                    <b className="font-semibold text-emerald-800">{contact.phone.slice(0, digits.length)}</b>
                    {contact.phone.slice(digits.length)}
                  </>
                ) : (
                  contact.phone
                )}
              </span>
              {contact.email && <> · {contact.email}</>}
              {contact.notes && <> · {contact.notes}</>}
            </p>
          </div>
          <div className="flex shrink-0 gap-1 text-xs opacity-60 group-hover:opacity-100">
            <button onClick={() => onEdit(contact)} className="rounded px-2 py-1 text-stone-600 hover:bg-stone-100">
              Edit
            </button>
            <button onClick={() => onDelete(contact)} className="rounded px-2 py-1 text-red-700 hover:bg-red-50">
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
