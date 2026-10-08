// ============================================================================
//  트로피 로드 보상 (2026-10-02) — 처음 올라선 등급에서만 받는다.
//  클라이언트 `Tier.reward`(Tier.swift)·`tools/parity/tier_rewards.json` 과 **리터럴 단위로 같아야 한다**
//  (check_server.mjs 가 대조한다).
//
//  지급은 `grant_tier_rewards(player, expected_best, new_best, gold, credit)` 한 번 — profiles.best_tier 가
//  아직 expected_best 일 때만 올리고 돈을 넣는다(비교 후 교환). 같은 판이 두 번 정산돼도 두 번 주지 않는다.
// ============================================================================

import { TIER_FLOORS } from "./rank_points.ts";

/** 등급 번호(0 = 브론즈 III … 15 = 마스터)별 보상. */
export const TIER_REWARDS: { gold: number; credit: number }[] = [
  { gold: 0, credit: 0 },       // 브론즈 III — 출발선
  { gold: 100, credit: 0 },
  { gold: 150, credit: 0 },
  { gold: 200, credit: 30 },    // 실버 III
  { gold: 250, credit: 0 },
  { gold: 300, credit: 0 },
  { gold: 400, credit: 60 },    // 골드 III
  { gold: 450, credit: 0 },
  { gold: 500, credit: 0 },
  { gold: 600, credit: 100 },   // 플래티넘 III
  { gold: 650, credit: 0 },
  { gold: 700, credit: 0 },
  { gold: 800, credit: 150 },   // 다이아몬드 III
  { gold: 900, credit: 0 },
  { gold: 1000, credit: 0 },
  { gold: 1500, credit: 300 },  // 마스터
];

/** RP 로 등급 번호를 찾는다. 클라이언트 `Tier.forRP(_:).rawValue`. */
export function tierIndex(rp: number): number {
  let i = 0;
  TIER_FLOORS.forEach((f, k) => { if (rp >= f) i = k; });
  return i;
}

/** 받은 적 있는 가장 높은 칸(best) 다음부터 to 까지의 보상 합. */
export function rewardsBetween(best: number, to: number): { gold: number; credit: number } {
  let gold = 0, credit = 0;
  for (let t = best + 1; t <= to && t < TIER_REWARDS.length; t++) {
    gold += TIER_REWARDS[t].gold; credit += TIER_REWARDS[t].credit;
  }
  return { gold, credit };
}

