// Run with: npx tsx scripts/rescore-all.ts
// Rescores every moment via the running Next.js app's score API.
// Make sure `npm run dev` is running on port 3000 before executing.

async function rescoreAll() {
  const momentsRes = await fetch("http://localhost:3000/api/moments");
  const moments: { id: string; name: string }[] = await momentsRes.json();

  console.log(`Rescoring ${moments.length} moments...`);

  let ok = 0;
  let failed = 0;

  for (const moment of moments) {
    process.stdout.write(`  Scoring: ${moment.name}... `);
    try {
      const res = await fetch(`http://localhost:3000/api/moments/${moment.id}/score`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        console.log(`✗ ${data.error ?? res.status}`);
        failed++;
      } else {
        console.log(`✓ ${data.scored} pairings`);
        ok++;
      }
      // Delay to avoid Groq rate limiting
      await new Promise(r => setTimeout(r, 1200));
    } catch (err) {
      console.log(`✗ failed: ${err}`);
      failed++;
    }
  }

  console.log(`\nDone. ${ok} rescored, ${failed} failed.`);
}

rescoreAll();
