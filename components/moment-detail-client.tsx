"use client";

import { useState } from "react";
import { ScoreButton } from "./score-button";
import { InfluencerPanel } from "./influencer-panel";
import { PairingRow } from "./pairing-row";
import { BriefExport } from "./brief-export";

interface Pairing {
  id: string;
  merchantId: string;
  merchantName: string;
  merchantCategory: string;
  relevanceScore: number;
  campaignAngle: string;
  rationale: string | null;
  status: string;
}

interface AIPairing {
  merchantName: string;
  relevanceScore: number;
  campaignAngle: string;
  rationale: string;
}

interface Props {
  momentId: string;
  merchantCount: number;
  initialPairings: Pairing[];
}

export function MomentDetailClient({ momentId, merchantCount, initialPairings }: Props) {
  const [pairings, setPairings] = useState<Pairing[]>(initialPairings);

  function handleScored(_aiPairings: AIPairing[]) {
    fetch(`/api/moments/${momentId}`)
      .then(r => r.json())
      .then(data => { if (data.pairings) setPairings(data.pairings); })
      .catch(() => console.warn("Could not refresh pairings"));
  }

  return (
    <>
      {/* AI Actions CTA — shown when moment has not been scored yet */}
      {pairings.length === 0 && (
        <div style={{
          background: "rgba(0,113,227,0.04)", border: "1px solid rgba(0,113,227,0.15)",
          borderRadius: 16, padding: 20, marginBottom: 20,
        }}>
          <p className="eyebrow" style={{ marginBottom: 8, color: "#0071e3" }}>AI READY</p>
          <h3 style={{ marginBottom: 6 }}>Score this moment against the merchant catalog</h3>
          <p style={{ fontSize: "0.85rem", color: "#86868b", marginBottom: 16 }}>
            Claude will evaluate all {merchantCount} merchants and score their fit for this moment — giving you differentiated campaign angles for each.
          </p>
          <ScoreButton
            momentId={momentId}
            hasPairings={false}
            onScored={(ap, _count) => handleScored(ap)}
          />
        </div>
      )}

      {/* Merchant Pairings */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="eyebrow mb-0.5">Merchant Pairings</p>
            <p className="text-xs text-apple-gray-400">{pairings.length} partner{pairings.length !== 1 ? "s" : ""} scored</p>
          </div>
          {pairings.length > 0 && (
            <ScoreButton
              momentId={momentId}
              hasPairings={true}
              onScored={(ap, _count) => handleScored(ap)}
            />
          )}
        </div>

        {pairings.length > 0 && (
          <div className="card-apple overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-apple-gray-100 bg-apple-gray-50">
                  <th className="py-3 px-4 text-left eyebrow">Merchant</th>
                  <th className="py-3 px-4 text-left eyebrow">Category</th>
                  <th className="py-3 px-4 text-left eyebrow">Score</th>
                  <th className="py-3 px-4 text-left eyebrow">Campaign Angle</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {pairings.map((p) => (
                  <PairingRow
                    key={p.id}
                    id={p.id}
                    merchantId={p.merchantId}
                    merchantName={p.merchantName}
                    merchantCategory={p.merchantCategory}
                    relevanceScore={p.relevanceScore}
                    campaignAngle={p.campaignAngle}
                    rationale={p.rationale}
                    status={p.status as "draft" | "in_review" | "approved" | "live"}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Generate Brief nudge — shown after scoring */}
        {pairings.length > 0 && (
          <div style={{ marginTop: 16, padding: "14px 16px", background: "#f5f5f7", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <p style={{ fontSize: "0.85rem", fontWeight: 600, margin: 0, color: "#1d1d1f" }}>Ready to brief this moment?</p>
              <p style={{ fontSize: "0.78rem", color: "#86868b", margin: 0 }}>Claude will generate a full Apple Pay Partner Marketing brief using this moment&apos;s data.</p>
            </div>
            <BriefExport momentId={momentId} />
          </div>
        )}
      </div>

      {/* Influencer personas */}
      <div className="card-apple p-6">
        <InfluencerPanel momentId={momentId} hasPairings={pairings.length > 0} />
      </div>
    </>
  );
}
