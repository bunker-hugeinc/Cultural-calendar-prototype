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
      {/* Pairings section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Merchant Pairings
          <span className="ml-2 text-sm font-normal text-muted-foreground">({pairings.length})</span>
        </h2>

        <div className="mb-4">
          <ScoreButton
            momentId={momentId}
            hasPairings={pairings.length > 0}
            onScored={(ap, _count) => handleScored(ap)}
          />
        </div>

        {pairings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pairings yet — click "Score Against Merchants" to generate them.</p>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Merchant</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Score</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Campaign Angle</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
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
      <div className="rounded-xl border bg-white p-6 mt-8">
        <InfluencerPanel momentId={momentId} hasPairings={pairings.length > 0} />
      </div>
    </>
  );
}
