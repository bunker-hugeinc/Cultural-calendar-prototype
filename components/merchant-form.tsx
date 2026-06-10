"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const MERCHANT_CATEGORIES = [
  "Floral", "Beauty", "Apparel & Footwear", "Apparel", "Activewear",
  "Sneakers & Apparel", "Footwear", "Retail", "Electronics",
  "Food Delivery", "Grocery Delivery", "Dining", "Coffee & Dining",
  "Travel", "Travel & Lodging", "Rides", "Entertainment",
  "Sports Betting", "Sports Merch", "Home & Furniture",
  "Home Improvement", "Toys & Entertainment", "Social/Media",
  "Gifts & Marketplace",
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
  const [name, setName] = useState(defaultValues.name ?? "");
  const [seasonalNotes, setSeasonalNotes] = useState(defaultValues.seasonalNotes ?? "");
  const [notes, setNotes] = useState(defaultValues.notes ?? "");
  const [customCat, setCustomCat] = useState("");

  // Parse existing category as comma-separated list
  const initialCats = defaultValues.category
    ? defaultValues.category.split(",").map(c => c.trim()).filter(Boolean)
    : [];
  const [selectedCats, setSelectedCats] = useState<string[]>(initialCats);

  function toggleCat(cat: string) {
    setSelectedCats(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      name,
      category: selectedCats.join(", ") || MERCHANT_CATEGORIES[0],
      seasonalNotes: seasonalNotes || null,
      notes: notes || null,
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
        <input
          name="name"
          required
          value={name}
          onChange={e => setName(e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Category" required>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {MERCHANT_CATEGORIES.map(cat => {
            const on = selectedCats.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCat(cat)}
                style={{
                  fontSize: "0.78rem", fontWeight: on ? 600 : 400,
                  padding: "4px 12px", borderRadius: 20, cursor: "pointer",
                  border: on ? "1.5px solid #1d1d1f" : "1.5px solid #d2d2d7",
                  background: on ? "#1d1d1f" : "#fff",
                  color: on ? "#fff" : "#1d1d1f",
                  transition: "all 0.12s",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          placeholder="+ Add custom category (press Enter)"
          value={customCat}
          onChange={e => setCustomCat(e.target.value)}
          className={inputCls}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const val = customCat.trim();
              if (val) { toggleCat(val); setCustomCat(""); }
            }
          }}
        />
        {selectedCats.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">Selected: {selectedCats.join(", ")}</p>
        )}
      </Field>

      <Field label="Seasonal Notes">
        <textarea
          name="seasonalNotes"
          rows={3}
          value={seasonalNotes}
          onChange={e => setSeasonalNotes(e.target.value)}
          placeholder="e.g. Peak: Mother's Day, Valentine's Day"
          className={inputCls}
        />
      </Field>

      <Field label="Notes">
        <textarea
          name="notes"
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className={inputCls}
        />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary-apple disabled:opacity-50">
          {saving ? "Saving…" : mode === "create" ? "Create Merchant" : "Save Changes"}
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
