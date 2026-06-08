"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const QUARTERS = ["FQ1 2026","FQ2 2026","FQ3 2026","FQ4 2026","FQ1 2027","FQ2 2027","FQ3 2027","FQ4 2027","FQ1 2028"];
const CATEGORIES = ["gather","improve","excite"];

interface Attachment { name: string; url: string; type: string; }

interface FormState {
  name: string;
  startDate: string;
  endDate: string;
  category: string;
  description: string;
  hook: string;
  campaignName: string;
  targetQuarter: string;
  notes: string;
  uniqueHook: string;
  officialSponsors: string;
  attachments: Attachment[];
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#1d1d1f", marginBottom: 6 }}>{label}</label>
      {hint && <p style={{ fontSize: "0.75rem", color: "#86868b", marginBottom: 6, marginTop: -2 }}>{hint}</p>}
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid #d2d2d7", fontSize: "0.875rem", color: "#1d1d1f",
  background: "#fff", outline: "none", boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle, minHeight: 100, resize: "vertical", lineHeight: 1.5,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: "pointer",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1d1d1f", marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid #e8e8ed" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function EditMomentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "", startDate: "", endDate: "", category: "gather",
    description: "", hook: "", campaignName: "", targetQuarter: "",
    notes: "", uniqueHook: "", officialSponsors: "", attachments: [],
  });
  const [momentName, setMomentName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/moments/${id}`)
      .then(r => r.json())
      .then(data => {
        const m = data.moment ?? data;
        setMomentName(m.name ?? "");
        let attachments: Attachment[] = [];
        try { attachments = JSON.parse(m.attachments ?? "[]"); } catch { /* ignore */ }
        setForm({
          name: m.name ?? "",
          startDate: m.startDate ?? "",
          endDate: m.endDate ?? "",
          category: m.category ?? "gather",
          description: m.description ?? "",
          hook: m.hook ?? "",
          campaignName: m.campaignName ?? "",
          targetQuarter: m.targetQuarter ?? "",
          notes: m.notes ?? "",
          uniqueHook: "",
          officialSponsors: "",
          attachments,
        });
      });
  }, [id]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploads = await Promise.all(files.map(async file => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        return res.json() as Promise<Attachment>;
      }));
      setForm(prev => ({ ...prev, attachments: [...prev.attachments, ...uploads] }));
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment(idx: number) {
    setForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/moments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          startDate: form.startDate,
          endDate: form.endDate || null,
          category: form.category,
          description: form.description,
          hook: form.hook,
          campaignName: form.campaignName,
          targetQuarter: form.targetQuarter,
          notes: form.notes,
          attachments: JSON.stringify(form.attachments),
        }),
      });
      if (res.ok) {
        setToast("Changes saved");
        setTimeout(() => {
          setToast(null);
          router.push(`/moments/${id}`);
        }, 1000);
      } else {
        setToast("Failed to save");
        setTimeout(() => setToast(null), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
      <a href={`/moments/${id}`} style={{ fontSize: "0.85rem", color: "#86868b", textDecoration: "none" }}>
        ← {momentName || "Back"}
      </a>

      <h1 style={{ marginTop: 16, marginBottom: 32 }}>{momentName || "Edit Moment"}</h1>

      <Section title="Moment details">
        <Field label="Name">
          <input style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Start date">
            <input type="date" style={inputStyle} value={form.startDate} onChange={e => set("startDate", e.target.value)} />
          </Field>
          <Field label="End date">
            <input type="date" style={inputStyle} value={form.endDate ?? ""} onChange={e => set("endDate", e.target.value)} />
          </Field>
        </div>
        <Field label="Category">
          <select style={selectStyle} value={form.category} onChange={e => set("category", e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </Field>
        <Field label="Description">
          <textarea style={textareaStyle} value={form.description} onChange={e => set("description", e.target.value)} />
        </Field>
        <Field label="Hook type">
          <input style={inputStyle} value={form.hook ?? ""} onChange={e => set("hook", e.target.value)} placeholder="e.g. Gifting, Cultural Moment, Bundle" />
        </Field>
      </Section>

      <Section title="Campaign context">
        <Field label="Campaign name">
          <input style={inputStyle} value={form.campaignName} onChange={e => set("campaignName", e.target.value)} placeholder="What would we call this internally?" />
        </Field>
        <Field label="Target quarter">
          <select style={selectStyle} value={form.targetQuarter} onChange={e => set("targetQuarter", e.target.value)}>
            <option value="">— Select quarter —</option>
            {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
        </Field>
        <Field label="Attachments" hint="Upload previous campaign decks, reference materials, or screenshots (PDF, PPTX, KEY, PNG, JPG)">
          <input
            type="file"
            accept=".pdf,.pptx,.key,.png,.jpg,.jpeg"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            style={{ fontSize: "0.85rem", color: "#1d1d1f" }}
          />
          {uploading && <p style={{ fontSize: "0.78rem", color: "#86868b", marginTop: 4 }}>Uploading…</p>}
          {form.attachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {form.attachments.map((a, i) => (
                <div key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", borderRadius: 20,
                  background: "#f0f0f5", border: "1px solid #d2d2d7",
                  fontSize: "0.78rem", color: "#1d1d1f",
                }}>
                  <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: "#0071e3", textDecoration: "none" }}>
                    {a.name}
                  </a>
                  <button
                    onClick={() => removeAttachment(i)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#86868b", fontSize: "1rem", lineHeight: 1, padding: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </Field>
        <Field label="Notes">
          <textarea style={textareaStyle} value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} placeholder="Any additional context for the team…" />
        </Field>
      </Section>

      <Section title="AI scoring inputs">
        <Field label="Unique hook" hint="What makes this moment special for Apple Pay?">
          <input style={inputStyle} value={form.uniqueHook} onChange={e => set("uniqueHook", e.target.value)} placeholder="e.g. First major UK spending moment after January pay cheques" />
        </Field>
        <Field label="Official sponsors" hint="Known brand sponsors of this event">
          <input style={inputStyle} value={form.officialSponsors} onChange={e => set("officialSponsors", e.target.value)} placeholder="e.g. Barclays, Visa, Mastercard" />
        </Field>
      </Section>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <a href={`/moments/${id}`} className="btn btn-outline" style={{ textDecoration: "none" }}>
          Cancel
        </a>
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
          background: "#1d1d1f", color: "#fff", padding: "10px 18px", borderRadius: 8,
          fontSize: "0.85rem", fontWeight: 500, zIndex: 200,
          boxShadow: "0 4px 20px rgba(0,0,0,.2)",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
