"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CATEGORIES = ["gather", "improve", "excite"] as const;

interface MomentFormProps {
  defaultValues?: {
    id?: string;
    name?: string;
    startDate?: string;
    endDate?: string | null;
    category?: string;
    description?: string;
    hook?: string | null;
    score?: number | null;
    notes?: string | null;
  };
  mode: "create" | "edit";
}

export function MomentForm({ defaultValues = {}, mode }: MomentFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"),
      startDate: fd.get("startDate"),
      endDate: fd.get("endDate") || null,
      category: fd.get("category"),
      description: fd.get("description"),
      hook: fd.get("hook") || null,
      score: fd.get("score") ? Number(fd.get("score")) : null,
      notes: fd.get("notes") || null,
    };

    try {
      const res =
        mode === "create"
          ? await fetch("/api/moments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
          : await fetch(`/api/moments/${defaultValues.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      router.push(`/moments/${data.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this moment? This cannot be undone.")) return;
    await fetch(`/api/moments/${defaultValues.id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Field label="Name" required>
        <input name="name" required defaultValue={defaultValues.name ?? ""} className={inputCls} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start Date" required>
          <input name="startDate" type="date" required defaultValue={defaultValues.startDate ?? ""} className={inputCls} />
        </Field>
        <Field label="End Date">
          <input name="endDate" type="date" defaultValue={defaultValues.endDate ?? ""} className={inputCls} />
        </Field>
      </div>

      <Field label="Category" required>
        <select name="category" required defaultValue={defaultValues.category ?? "gather"} className={inputCls}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </Field>

      <Field label="Description" required>
        <textarea name="description" required rows={4} defaultValue={defaultValues.description ?? ""} className={inputCls} />
      </Field>

      <Field label="Hook">
        <input name="hook" defaultValue={defaultValues.hook ?? ""} placeholder="e.g. Bundle, Values highlight" className={inputCls} />
      </Field>

      <Field label="V1 Signal Score (0–5)">
        <input name="score" type="number" step="0.1" min="0" max="5" defaultValue={defaultValues.score ?? ""} className={inputCls} />
      </Field>

      <Field label="Notes">
        <textarea name="notes" rows={2} defaultValue={defaultValues.notes ?? ""} className={inputCls} />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary-apple disabled:opacity-50">
          {saving ? "Saving…" : mode === "create" ? "Create Moment" : "Save Changes"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-outline-apple">
          Cancel
        </button>
        {mode === "edit" && (
          <button type="button" onClick={handleDelete} className="ml-auto rounded-lg border border-red-200 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50 transition-colors">
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

const inputCls = "w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
