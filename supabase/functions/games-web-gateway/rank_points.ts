// ============================================================================
//  RP(등급 점수) — 순수 함수. 클라이언트 `RankPoints`(Tier.swift / Tier.kt)와 **리터럴 단위로 같아야 한다.**
//  tools/parity/rank_cases.json을 세 곳이 같이 통과한다 (check_server.mjs가 node로 돌린다).
//
//  154 이전에는 RP가 클라이언트 로컬에만 있었다 — 기기를 바꾸면 사라지고, 순위표는 아무 근거가 없었다.
//  서버는 클라이언트가 **주장한 순위**(claimedRank·claimedPlayerCount)로 같은 식을 돌려 profiles.rp에
//  적는다. 순위 자체는 아직 클라이언트 주장이다(봇의 점수를 서버가 모른다 — 부채). 대신 식과 상·하한은
//  서버 것이라, 거짓말해도 한 판 +120이 최대다.
// ============================================================================

export const TIER_FLOORS = [0, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2650, 2900, 3200];
export const MIN_DELTA = -30;   // (2026-10-02 트로피 로드) −40 → −30
export const MAX_DELTA = 150;   // 120 → 150 (맞힌 만큼 더 오른다)
/** 골드 III(1200) 아래 — 브론즈·실버 — 에서는 잃지 않는다. 클라이언트 `RankPoints.safeBelowRP` 와 같다. */
export const SAFE_BELOW_RP = 1200;

/** (2026-10-02) **푼 만큼 오른다** — 맞힌 문항 하나에 +3, 한 판 +30 까지. 클라이언트 `RankPoints.solveBonus`. */
export function solveBonus(correct: number): number {
  return Math.min(30, Math.max(0, correct) * 3);
}

export function tierFloor(rp: number): number {
  let f = 0;
  for (const t of TIER_FLOORS) if (rp >= t) f = t;
  return f;
}

/** Swift `.rounded()` / Kotlin `roundToInt()` — 0.5는 0에서 먼 쪽. */
function roundHalfAway(x: number): number {
  return Math.sign(x) * Math.floor(Math.abs(x) + 0.5);
}

/** 6인 기준 1등 +100, 2등 +68, 3등 +36, 4등 +10, 5등 −10, 꼴찌 −30. */
export function placementPoints(rank: number, playerCount: number): number {
  if (playerCount <= 1) return 0;
  const p = 1.0 - 2.0 * ((rank - 1) / (playerCount - 1));
  const v = p >= 0 ? 20 + 80 * p : 20 + 50 * p;
  return roundHalfAway(v);
}

/** **인원 보정** — 2인 0.5 → 6인 1.0. (2026-09-29)
 *
 *  실전에서 봇이 빠지기 전에는 판이 늘 여섯 명이었다. 이제 2~6으로 움직이는데
 *  `placementPoints` 는 1등이면 인원과 무관하게 +100 이라, 절반 시간에 끝나는 1:1 이
 *  등급을 올리는 가장 싼 길이 된다. 바닥 0.5 의 근거는 시간이다(1:1 2분 20초 : 6인 5분).
 *  클라이언트 `RankPoints.fieldFactor` 와 같아야 한다. */
export function fieldFactor(playerCount: number): number {
  return Math.min(1.0, Math.max(0.5, 0.5 + 0.5 * (playerCount - 2) / 4));
}

export function rankDelta(rank: number, playerCount: number, accuracy: number, currentRP: number, correct = 0): number {
  if (playerCount <= 1) return 0;
  let value = placementPoints(rank, playerCount);
  value += (accuracy - 0.5) * 40.0;
  value += solveBonus(correct);
  // 합계에 곱한다 — 순위 점수에만 곱하면 1:1 에서 「잘 풀고 지면 RP 가 오르는」 구멍이 생긴다.
  value *= fieldFactor(playerCount);
  value = Math.max(MIN_DELTA, Math.min(MAX_DELTA, value));
  const delta = roundHalfAway(value);
  if (delta < 0 && currentRP < SAFE_BELOW_RP) return 0;   // 트로피 로드: 브론즈·실버는 안 깎인다
  const floor = tierFloor(currentRP);
  if (delta < 0 && currentRP + delta < floor) return floor - currentRP;
  return delta;
}

/**
 * 순위 (158·175). 나보다 높은 사람(서버 재채점값) + 나보다 높은 봇 + 1. 동점은 먼저 정산한 쪽이 앞 —
 * 클라이언트 엔진(`ranked`: 점수, 그다음 정답 수)과 완전히 같진 않지만 동점은 드물고, 여기 값이 정본이다.
 */
export function rankAmong(myScore: number, humanScores: number[], botScores: number[]): number {
  return 1 + humanScores.filter((s) => s > myScore).length + botScores.filter((b) => b > myScore).length;
}

