"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CATEGORIES = [
  "Floral", "Beauty", "Apparel & Footwear", "Apparel", "Activewear",
  "Sneakers & Apparel", "Footwear", "Retail", "Electronics",
  "Food Delivery", "Grocery Delivery", "Dining", "Coffee & Dining",
  "Travel", "Travel & Lodging", "Rides", "Entertainment",
  "Sports Betting", "Sports Merch", "Home & Furniture", "Home Improvement",
  "Toys & Entertainment", "Social/Media", "Gifts & Marketplace",
];

interface MerchantFormProps {
  defaultValues?: {
    id?: string;
    name?: string;
    category?: string;
    seasonalNotes?: string | null;
    notes?: string | null;
  };
  mode: "create" | "edit";
}

export function MerchantForm({ defaultValues = {}, mode }: MerchantFormProps) {
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
      category: fd.get("category"),
      seasonalNotes: fd.get("seasonalNotes") || null,
      notes: fd.get("notes") || null,
    };

    try {
      const res =
        mode === "create"
          ? await fetch("/api/merchants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
          : await fetch(`/api/merchants/${defaultValues.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      router.push(`/merchants/${data.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this merchant? This cannot be undone.")) return;
    await fetch(`/api/merchants/${defaultValues.id}`, { method: "DELETE" });
    router.push("/merchants");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Field label="Name" required>
        <input name="name" required defaultValue={defaultValues.name ?? ""} className={inputCls} />
      </Field>

      <Field label="Category" required>
        <select name="category" required defaultValue={defaultValues.category ?? CATEGORIES[0]} className={inputCls}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>

      <Field label="Seasonal Notes">
        <textarea name="seasonalNotes" rows={3} defaultValue={defaultValues.seasonalNotes ?? ""} placeholder="e.g. Peak: Mother's Day, Valentine's Day" className={inputCls} />
      </Field>

      <Field label="Notes">
        <textarea name="notes" rows={2} defaultValue={defaultValues.notes ?? ""} className={inputCls} />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving} className="rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:bg-foreground/80 disabled:opacity-50 transition-colors">
          {saving ? "Saving…" : mode === "create" ? "Create Merchant" : "Save Changes"}
        </button>
        <button type="button" onClick={() => router.back()} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
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
