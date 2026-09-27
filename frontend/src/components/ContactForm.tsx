import { useState, type FormEvent } from "react";
import type { Contact, ContactFields } from "../api";

type Props = {
  editing: Contact | null;
  onSave: (fields: ContactFields) => Promise<void>;
  onCancel: () => void;
};

const blank: ContactFields = { name: "", phone: "", email: "", notes: "" };

export default function ContactForm({ editing, onSave, onCancel }: Props) {
  const [fields, setFields] = useState<ContactFields>(editing ?? blank);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key: keyof ContactFields) => (value: string) => setFields(f => ({ ...f, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{10}$/.test(fields.phone)) {
      setError("Phone number should be 10 digits.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : "couldn't save");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Name" value={fields.name} onChange={set("name")} required autoFocus />
        <Input
          label="Phone"
          value={fields.phone}
          onChange={v => set("phone")(v.replace(/\D/g, "").slice(0, 10))}
          inputMode="numeric"
          required
        />
        <Input label="Email" value={fields.email} onChange={set("email")} type="email" />
        <Input label="Notes" value={fields.notes} onChange={set("notes")} />
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button
          disabled={saving}
          className="h-9 rounded-md bg-emerald-800 px-4 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-50"
        >
          {saving ? "Saving…" : editing ? "Save" : "Add"}
        </button>
        <button type="button" onClick={onCancel} className="h-9 rounded-md px-3 text-sm text-stone-600 hover:bg-stone-100">
          Cancel
        </button>
      </div>
    </form>
  );
}

type InputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoFocus?: boolean;
  type?: string;
  inputMode?: "numeric";
};

function Input({ label, onChange, ...rest }: InputProps) {
  return (
    <label className="block text-xs font-medium text-stone-600">
      {label}
      <input
        {...rest}
        onChange={e => onChange(e.target.value)}
        className="mt-1 h-9 w-full rounded-md border border-stone-300 px-2.5 text-sm font-normal text-stone-900 outline-none focus:border-emerald-700"
      />
    </label>
  );
}
