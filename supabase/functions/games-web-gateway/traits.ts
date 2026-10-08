// ============================================================================
//  캐릭터 패시브 (199) — 클라이언트 `CharacterKind.trait`(CharacterRoster.swift / .kt)와 **리터럴 단위로 같아야 한다.**
//  서버가 이걸 모르면 연필(빨리 답하면 ×1.15)을 쓰는 사람의 서버 점수가 클라이언트보다 늘 낮아 "점수 불일치"로
//  찍히고, 순위(봇 점수는 패시브 포함)에서도 손해를 본다. tools/parity/trait_cases.json으로 셋을 대조한다.
// ============================================================================
export interface Trait {
  fastAnswerMultiplier: number;   // 감쇠 계수 0.8 초과(빠른 답)에만 곱한다
  slowDecayRelief: number;        // 0…1. 감쇠를 이만큼 되돌린다
  wrongPenaltyMultiplier: number; // 오답 감점 배수
  streakBonusMultiplier: number;  // 연속 보너스 배수
  clutchBonus: number;            // 남은 3초 안에 맞히면 추가점
  categoryBoost: Record<string, number>;
  maxScoreMultiplier: number;
}

const base = (o: Partial<Trait> = {}): Trait => ({
  fastAnswerMultiplier: 1.0, slowDecayRelief: 0.0, wrongPenaltyMultiplier: 1.0, streakBonusMultiplier: 1.0,
  clutchBonus: 0, categoryBoost: {}, maxScoreMultiplier: 1.0, ...o,
});

export const NEUTRAL: Trait = base();

export const TRAITS: Record<string, Trait> = {
  pencil:     base({ fastAnswerMultiplier: 1.15, wrongPenaltyMultiplier: 1.10 }),
  question:   base({ categoryBoost: { nonsense: 1.25, certification: 0.90 } }),
  bulb:       base({ slowDecayRelief: 0.35, maxScoreMultiplier: 0.92 }),
  book:       base({ slowDecayRelief: 0.12, categoryBoost: { language: 1.20, high: 1.20, nonsense: 0.90 } }),
  calculator: base({ streakBonusMultiplier: 2.0 }),
  hourglass:  base({ fastAnswerMultiplier: 0.92, clutchBonus: 80 }),
  globe:      base({ categoryBoost: { general: 1.20, middle: 1.15 } }),
  trophy:     base({ fastAnswerMultiplier: 1.05, streakBonusMultiplier: 1.30 }),
};

export function traitFor(kind: string | null | undefined): Trait {
  return (kind && TRAITS[kind]) || NEUTRAL;
}

