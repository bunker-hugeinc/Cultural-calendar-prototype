"use client";

import { useState } from "react";
import { ScoreButton } from "./score-button";
import { InfluencerPanel } from "./influencer-panel";
import { PairingRow } from "./pairing-row";

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
  initialPairings: Pairing[];
}

export function MomentDetailClient({ momentId, initialPairings }: Props) {
  const [pairings, setPairings] = useState<Pairing[]>(initialPairings);

  function handleScored(_aiPairings: AIPairing[]) {
    fetch(`/api/moments/${momentId}`)
      .then(r => r.json())
      .then(data => { if (data.pairings) setPairings(data.pairings); })
      .catch(() => console.warn("Could not refresh pairings"));
  }

  return (
    <>
      {/* Merchant Pairings */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="eyebrow mb-0.5">Merchant Pairings</p>
            <p className="text-xs text-apple-gray-400">{pairings.length} partner{pairings.length !== 1 ? "s" : ""} scored</p>
          </div>
          <ScoreButton
            momentId={momentId}
            hasPairings={pairings.length > 0}
            onScored={(ap, _count) => handleScored(ap)}
          />
        </div>

        {pairings.length === 0 ? (
          <div className="card-apple p-8 text-center">
            <p className="text-sm text-apple-gray-400">No pairings yet — click "Score Against Merchants" to generate them.</p>
          </div>
        ) : (
          <div className="card-apple overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-apple-gray-100 bg-apple-gray-50">
                  <th className="py-3 px-4 text-left eyebrow">Merchant</th>
                  <th className="py-3 px-4 text-left eyebrow">Category</th>
                  <th className="py-3 px-4 text-left eyebrow">Score</th>
                  <th className="py-3 px-4 text-left eyebrow">Campaign Angle</th>
                  <th className="py-3 px-4 text-left eyebrow">Status</th>
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
      </div>

      {/* Influencer personas */}
      <div className="card-apple p-6">
        <InfluencerPanel momentId={momentId} hasPairings={pairings.length > 0} />
      </div>
    </>
  );
}
