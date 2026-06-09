// Rescores all moments with the v2 prompt (ecommerceScore, audienceFit, whiteSpaceScore, channelRecommendations)
// Run with: npx tsx scripts/rescore-v2.ts
// Requires: npm run dev running on port 3000

async function rescoreAllV2() {
  const data = await fetch("http://localhost:3000/api/moments").then(r => r.json());
  const momentList: { id: string; name: string }[] = Array.isArray(data) ? data : (data.moments ?? []);

  console.log(`Rescoring ${momentList.length} moments with v2 scoring...`);

  for (const m of momentList) {
    process.stdout.write(`  ${m.name}... `);
    try {
      const res = await fetch(`http://localhost:3000/api/moments/${m.id}/score`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) {
        console.log(`✗ ${d.error ?? res.status}`);
      } else {
        console.log(`✓ ${d.scored} pairings`);
      }
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.log(`✗ ${e}`);
    }
  }

  console.log("Done.");
}

rescoreAllV2();
