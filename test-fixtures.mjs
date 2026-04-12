// Test the buildBalancedSchedule function for a box of 4 players
// Players: 1=Alice, 2=Bob, 3=Carol, 4=Dave

const playerIds = [1, 2, 3, 4];
const names = { 1: "Alice", 2: "Bob", 3: "Carol", 4: "Dave" };

function buildBalancedSchedule(playerIds) {
  const n = playerIds.length;
  if (n < 4) return [];

  const target = 5; // target matches per player (fixed at 5 for all box sizes)

  const allCombos = [];
  for (let a = 0; a < n; a++)
  for (let b = a + 1; b < n; b++)
  for (let c = b + 1; c < n; c++)
  for (let d = c + 1; d < n; d++) {
    const four = [playerIds[a], playerIds[b], playerIds[c], playerIds[d]];
    allCombos.push({ teamA: [four[0], four[1]], teamB: [four[2], four[3]] });
    allCombos.push({ teamA: [four[0], four[2]], teamB: [four[1], four[3]] });
    allCombos.push({ teamA: [four[0], four[3]], teamB: [four[1], four[2]] });
  }

  const matchCount = {};
  const partnerCount = {};
  const opponentCount = {};
  playerIds.forEach((p) => (matchCount[p] = 0));

  const pk = (x, y) => `${Math.min(x, y)}-${Math.max(x, y)}`;
  const getP = (a, b) => partnerCount[pk(a, b)] ?? 0;
  const getO = (a, b) => opponentCount[pk(a, b)] ?? 0;

  const scoreFixture = (f) => {
    const [a, b] = f.teamA;
    const [c, d] = f.teamB;
    const partnerPenalty = (getP(a, b) + getP(c, d)) * 10;
    const oppPenalty = getO(a, c) + getO(a, d) + getO(b, c) + getO(b, d);
    return partnerPenalty + oppPenalty;
  };

  const updateCounts = (f) => {
    const [a, b] = f.teamA;
    const [c, d] = f.teamB;
    matchCount[a]++; matchCount[b]++; matchCount[c]++; matchCount[d]++;
    partnerCount[pk(a, b)] = (partnerCount[pk(a, b)] ?? 0) + 1;
    partnerCount[pk(c, d)] = (partnerCount[pk(c, d)] ?? 0) + 1;
    opponentCount[pk(a, c)] = (opponentCount[pk(a, c)] ?? 0) + 1;
    opponentCount[pk(a, d)] = (opponentCount[pk(a, d)] ?? 0) + 1;
    opponentCount[pk(b, c)] = (opponentCount[pk(b, c)] ?? 0) + 1;
    opponentCount[pk(b, d)] = (opponentCount[pk(b, d)] ?? 0) + 1;
  };

  const scheduled = [];
  const usedIndices = new Set();
  let round = 1;

  // Phase 1
  while (true) {
    if (playerIds.every((p) => matchCount[p] >= target)) break;

    const inRound = new Set();
    let addedInRound = false;

    const candidates = allCombos
      .map((f, i) => ({ f, i, score: scoreFixture(f), matchSum: [...f.teamA, ...f.teamB].reduce((s, p) => s + matchCount[p], 0) }))
      .filter(({ i }) => !usedIndices.has(i))
      .sort((a, b) => a.score - b.score || a.matchSum - b.matchSum);

    for (const { f, i } of candidates) {
      const involved = [...f.teamA, ...f.teamB];
      if (involved.some((p) => inRound.has(p))) continue;
      if (involved.every((p) => matchCount[p] >= target)) continue;

      involved.forEach((p) => inRound.add(p));
      scheduled.push({ ...f, round, isBalancer: false, balancerEligiblePlayers: [] });
      usedIndices.add(i);
      updateCounts(f);
      addedInRound = true;
    }

    if (!addedInRound) break;
    round++;
  }

  // Phase 2: balancer pass
  let safetyLimit = 100;
  while (safetyLimit-- > 0) {
    const counts = Object.values(matchCount);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    if (maxCount === minCount) break;

    const needMore = playerIds.filter((p) => matchCount[p] < maxCount);
    if (needMore.length === 0) break;

    const allFour = allCombos
      .map((f, i) => ({ f, i, score: scoreFixture(f) }))
      .filter(({ f }) => [...f.teamA, ...f.teamB].every((p) => needMore.includes(p)))
      .sort((a, b) => a.score - b.score);

    const someFour = allCombos
      .map((f, i) => ({ f, i, score: scoreFixture(f) }))
      .filter(({ f }) => [...f.teamA, ...f.teamB].some((p) => needMore.includes(p)))
      .sort((a, b) => a.score - b.score);

    const chosen = (allFour.length > 0 ? allFour : someFour)[0];
    if (!chosen) break;

    const involved = [...chosen.f.teamA, ...chosen.f.teamB];
    const eligiblePlayers = involved.filter((p) => matchCount[p] < maxCount);

    scheduled.push({ ...chosen.f, round, isBalancer: true, balancerEligiblePlayers: eligiblePlayers });
    updateCounts(chosen.f);
    round++;
  }

  return scheduled;
}

const fixtures = buildBalancedSchedule(playerIds);

console.log(`\n=== Box of 4 Players — ${fixtures.length} Fixtures ===\n`);
console.log(`Players: 1=Alice, 2=Bob, 3=Carol, 4=Dave\n`);

fixtures.forEach((f, idx) => {
  const a1 = names[f.teamA[0]], a2 = names[f.teamA[1]];
  const b1 = names[f.teamB[0]], b2 = names[f.teamB[1]];
  const tag = f.isBalancer ? " [REPEAT]" : "";
  console.log(`Match ${idx + 1} (Round ${f.round})${tag}: ${a1} & ${a2}  vs  ${b1} & ${b2}`);
});

// Summary per player
console.log("\n=== Per-Player Summary ===\n");
const matchesPlayed = { Alice: 0, Bob: 0, Carol: 0, Dave: 0 };
const partners = { Alice: [], Bob: [], Carol: [], Dave: [] };

fixtures.forEach((f) => {
  const a1 = names[f.teamA[0]], a2 = names[f.teamA[1]];
  const b1 = names[f.teamB[0]], b2 = names[f.teamB[1]];
  matchesPlayed[a1]++; matchesPlayed[a2]++; matchesPlayed[b1]++; matchesPlayed[b2]++;
  partners[a1].push(a2); partners[a2].push(a1);
  partners[b1].push(b2); partners[b2].push(b1);
});

for (const [player, count] of Object.entries(matchesPlayed)) {
  const partnerList = partners[player].join(", ");
  console.log(`${player}: ${count} matches | Partners: ${partnerList}`);
}
