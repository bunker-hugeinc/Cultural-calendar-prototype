"use client";

import { useState } from "react";
import Link from "next/link";

interface MerchantMatch {
  id: string; name: string; category: string; relevanceScore: number; reason: string;
}

interface MerchantRec {
  name: string; category: string; rationale: string;
}

export function MerchantSearch() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<MerchantMatch[] | null>(null);
  const [recommendations, setRecommendations] = useState<MerchantRec[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) { setMatches(null); return; }
    setIsSearching(true);
    try {
      const res = await fetch("/api/merchants/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setMatches(data.matches ?? []);
      setRecommendations(data.recommendations ?? []);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleAddToCatalog(rec: MerchantRec, index: number) {
    setAddingIndex(index);
    try {
      await fetch("/api/merchants/search", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: rec.name, category: rec.category, rationale: rec.rationale }),
      });
      setAddedIndices(prev => new Set([...prev, index]));
    } finally {
      setAddingIndex(null);
    }
  }

  return (
    <div className="mb-8">
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search merchants with AI… e.g. 'fitness brands', 'travel partners', 'Gen Z retail'"
          className="flex-1 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
        >
          {isSearching ? "Searching…" : "Search with AI"}
        </button>
        {matches !== null && (
          <button
            type="button"
            onClick={() => { setMatches(null); setQuery(""); setRecommendations([]); setAddedIndices(new Set()); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </form>

      {matches !== null && (
        <div className="space-y-6">
          {/* Matching merchants */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
              {matches.length > 0 ? `${matches.length} Matching Merchants` : "No matching merchants found"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {matches.map((m) => (
                <Link key={m.id} href={`/merchants/${m.id}`} className="no-underline">
                  <div className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{m.name}</p>
                        <p className="text-xs text-gray-500">{m.category}</p>
                      </div>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full whitespace-nowrap">{m.relevanceScore}% match</span>
                    </div>
                    <p className="text-xs text-green-700 bg-green-50 rounded-lg p-2">{m.reason}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recommended new partners */}
          {recommendations.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Recommended Partners (not yet in catalog)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recommendations.map((rec, i) => (
                  <div key={i} className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{rec.name}</p>
                        <p className="text-xs text-gray-500">{rec.category}</p>
                      </div>
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Suggested</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">{rec.rationale}</p>
                    <button
                      onClick={() => handleAddToCatalog(rec, i)}
                      disabled={addingIndex === i || addedIndices.has(i)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-50 font-medium"
                    >
                      {addedIndices.has(i) ? "✓ Added" : addingIndex === i ? "Adding…" : "+ Add to Catalog"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
