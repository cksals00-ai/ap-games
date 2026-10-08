// ============================================================================
//  채점 — 순수 함수. index.ts(Deno.serve)에서 쓰고, tools/parity/check_server.mjs가
//  같은 함수를 node로 돌려 iOS·Android와 같은 숫자가 나오는지 검사한다.
//
//  **아래 상수는 클라이언트(Scoring.swift / Scoring.kt)와 리터럴 단위로 같아야 한다.**
//  6회차에서 실제로 어긋나 있었다: 공개 구간 2.0(→4.0), 난이도 배수 없음.
//  이 파일이 순수 함수인 이유가 그것이다 — Deno 없이도 검사할 수 있게.
// ============================================================================

import { type Trait, NEUTRAL } from "./traits.ts";

export const BASE: Record<string, number> = {
  warmup: 100, buzzer: 300, main: 150, survival: 120, betting: 200, ox: 60, flash: 180, elimination: 160,
};
/**
 * 오답 감점 — **배점에 비례한다** (330). 클라이언트 `Scoring.penalty` 와 정수 연산까지 동일.
 *
 * 328까지 -60 고정이었다. 배점은 난이도로 0.7·1.0·1.4배가 되는데 감점이 안 따라가서
 * 배점이 높은 문항에서는 모르고 찍는 쪽이 이득이었다 — 본게임 어려움(210점)의 4지선다
 * 기댓값이 0.25x210 - 0.75x60 = **+7.5점**. 본게임은 뒤로 갈수록 어려우므로(187)
 * 마지막 두세 문항은 답을 몰라도 누르는 게 최적이었다.
 *
 *     감점 = 배점 / (보기수 - 1) x 여유, 10점 단위 올림
 *
 * 여유(6/5)는 **부저 라운드에만** 얹는다. 부저 라운드에서 모르고 먼저 누르면 25% 확률로
 * 정답이 나와 남은 다섯 명의 기회를 빼앗으므로, 기댓값 0이면 그 강탈이 공짜다.
 * OX는 각자 답하니 빼앗을 것이 없어 정확히 0으로 둔다 — 감점이 배점을 넘기면(보통 80 > 60)
 * 모르는 문항은 답하지 않는 쪽이 최적이 되고 20문항 속사가 눈치 게임이 된다.
 *
 * 정수만 쓴다: `points * 0.4` 는 150 -> 60.000000000000007 이라 10점 올림이 70으로 튄다.
 */
export function questionPoints(kind: string, difficulty: number, multiplier = 1.0): number {
  const base = (BASE[kind] ?? 150) * difficultyMultiplier(difficulty) * multiplier;
  return roundHalfAway(base / 10) * 10;
}

/** 보기 수 — 찍기 기댓값 계산에만 쓴다. OX만 둘. 클라이언트 `Scoring.choiceCount`와 동일. */
export function choiceCount(kind: string): number {
  return kind === "ox" ? 2 : 4;
}

/** OX와 스피드(warmup)는 부저가 없다 — 모두 동시에 답한다 (261, 2026-10-02). 클라이언트 `RoundKind.usesBuzzer`와 동일. */
export function usesBuzzer(kind: string): boolean {
  return kind !== "ox" && kind !== "warmup";
}

export function penalty(kind: string, difficulty = 0.5): number {
  if (kind === "betting") return 0;             // 베팅은 판돈을 잃는다
  const points = questionPoints(kind, difficulty);
  // (2026-10-01) 부저 라운드는 틀리면 배점을 통째로 잃는다 — 보기를 가리고 투시로만 엿본다.
  // 모르고 찍으면 기댓값 -0.5P, 손익분기 50%. 클라이언트 Scoring.penalty 주석 참고.
  if (usesBuzzer(kind)) return Math.ceil(points / 10) * 10;
  const num = points * 5;
  const den = 5 * (choiceCount(kind) - 1);
  const raw = Math.ceil(num / den);
  return Math.ceil(raw / 10) * 10;
}
/** 버저 라운드의 채점 창. 잡은 순간부터 5초 — 클라이언트가 보내는 elapsedMs도 잡은 뒤 기준이다. */
export const BUZZER_ANSWER_SECONDS = 2.5;   // (2026-10-02) 잡으면 바로 고른다 — 5초 → 3초 → (오후) 2.5초
/** (328) 321부터 모든 라운드가 부저제 — 채점 창은 라운드마다 다르다. 클라이언트 `RoundKind.buzzerAnswerSeconds`와 리터럴 동일. */
export function buzzerAnswerSeconds(kind: string): number {
  switch (kind) {
    case "ox": return 2.0;
    case "flash": case "elimination": return 3.5;
    case "warmup": return 2.0;
    case "betting": return 3.0;
    default: return BUZZER_ANSWER_SECONDS;   // buzzer · main · survival
  }
}
/** 채점 시계를 **부저를 잡은 순간부터** 재는가.
 *
 *  소거(`elimination`)만 예외다. 「2초마다 오답이 하나 사라진다 — 기다리면 쉽지만 싸다」의
 *  "싸다"를 만드는 게 시간 감쇠뿐인데, 잡은 순간부터 재면 오답이 다 사라질 때까지 보고 나서
 *  잡아 즉시 답하는 것이 최적이 되어 규칙이 사라진다. 소거는 문항이 뜬 순간부터 잰다.
 *  클라이언트 `RoundKind.scoresFromBuzzerClaim` 과 같아야 한다. */
/**
 * **10점 단위로 자른다. 1단위는 버린다.** (대표 지시 2026-09-29)
 *
 * 배점·감점은 원래 10점 단위인데 시간 감쇠·패시브 배수·난이도가 곱해지면서
 * 1단위가 다시 생겼다. 화면에 「210점」이라 적어 놓고 137점이 들어오면
 * 적어 놓은 쪽이 거짓말이 된다.
 *
 * 0 쪽으로 자른다: 137 → 130, −66 → −60. 클라이언트 `Scoring.trim10` 과
 * 정수 연산까지 같아야 한다 — `Math.trunc` 이 Swift/Kotlin 의 정수 나눗셈과 같은 방향이다.
 */
export function trim10(v: number): number {
  return Math.trunc(v / 10) * 10;
}

export function scoresFromBuzzerClaim(kind: string): boolean {
  // OX 는 부저를 쓰지 않는다 (2026-09-26). 4초짜리 문항에서 부저는 「읽고 판단」이 아니라
  // 「먼저 누르기」만 남기고, 열리자마자 누르는 사람이 스무 문항을 전부 독식했다.
  // 여섯 명이 각자 4초 안에 답하므로 시계는 **문항이 뜬 순간부터** 돈다.
  // 클라이언트 `RoundKind.usesBuzzer` / `scoresFromBuzzerClaim` 과 같아야 한다.
  return usesBuzzer(kind) && kind !== "elimination";   // (2026-10-02) 스피드도 문항이 뜬 순간부터
}

/** 이 라운드의 채점 창. 클라이언트 `applyAnswer` 의 `limit` 과 같아야 한다. */
export function scoringLimit(kind: string, secondsPerQuestion: number): number {
  return scoresFromBuzzerClaim(kind)
    ? buzzerAnswerSeconds(kind)
    : Math.max(0.5, secondsPerQuestion - revealSeconds(kind));
}

/** 공개 시간은 라운드마다 다르다 — RoundKind.revealSeconds와 같아야 한다. */
export function revealSeconds(kind: string): number {
  if (kind === "ox") return 2.5;                       // (210) OX 1.5 → 2.5
  if (kind === "main" || kind === "betting") return 7.0;   // (328) 해설 화면 — 클라이언트 RoundKind.revealSeconds
  return 3.0;
}

export function difficultyMultiplier(d: number): number {
  if (d < 0.35) return 0.7;
  if (d < 0.6) return 1.0;
  return 1.4;
}

export function timeFactor(elapsed: number, limit: number): number {
  if (limit <= 0) return 1.0;
  return 1.0 - 0.6 * Math.min(1, Math.max(0, elapsed / limit));
}

/** 연속 보너스 — 3연속 +30 … 상한 150, 그리고 **그 라운드의 기본 배점을 넘지 않는다** (189, 클라이언트와 동일). */
export function streakBonus(streak: number, kind: string = "main"): number {
  if (streak < 3) return 0;
  return Math.min(BASE[kind] ?? 150, Math.min(150, (streak - 2) * 30));
}

/** Swift `.rounded()`·Kotlin `roundToInt()`와 같은 반올림(0.5는 0에서 먼 쪽). JS Math.round는 -0.5→-0라 다르다. */
export function roundHalfAway(x: number): number {
  return Math.sign(x) * Math.floor(Math.abs(x) + 0.5);
}

/**
 * 판돈 상한 (196) — 클라이언트 `Scoring.maxWager`와 같다: **그 문항에 들어갈 때 점수의 절반**, 음수·소수 불가.
 * 서버가 이걸 안 하면 조작된 클라이언트가 wager 999999를 보내 RP를 훔친다. 채점의 권위는 서버에 있으니 상한도 서버가 건다.
 */
export function clampWager(wager: number | null | undefined, scoreBefore: number): number {
  const w = Math.floor(Number(wager ?? 0));
  if (!Number.isFinite(w) || w <= 0) return 0;
  return Math.min(w, Math.max(0, Math.floor(scoreBefore / 2)));
}

/** 서바이벌 라운드 끝까지 살아남은 사람의 보너스 — 클라이언트 `Scoring.survivalBonus`와 같다. (199) */
export const SURVIVAL_BONUS = 250;

/**
 * 한 문항의 점수 변화. `streakAfter`는 이 문항까지 포함한 연속 정답 수(정답일 때).
 * (199) `trait`·`category`가 붙었다 — 클라이언트 `Scoring.score`/`bettingScore`와 같은 식. 없으면 중립 패시브.
 */
export function questionDelta(p: {
  kind: string; difficulty: number; elapsedSeconds: number; limitSeconds: number;
  streakAfter: number; isCorrect: boolean; wager?: number; trait?: Trait; category?: string;
}): number {
  const t = p.trait ?? NEUTRAL;
  const wager = p.wager ?? 0;
  const decay = timeFactor(p.elapsedSeconds, p.limitSeconds);
  const relieved = decay + (1.0 - decay) * t.slowDecayRelief;
  if (p.kind === "betting") {
    if (!p.isCorrect) return trim10(-wager);
    return trim10(roundHalfAway(BASE.betting * relieved * t.maxScoreMultiplier) + wager);   // (201) 판돈만큼
  }
  if (!p.isCorrect) return trim10(-roundHalfAway(penalty(p.kind, p.difficulty) * t.wrongPenaltyMultiplier));
  let base = BASE[p.kind] * difficultyMultiplier(p.difficulty) * relieved;
  base *= t.maxScoreMultiplier;
  base *= p.category ? (t.categoryBoost[p.category] ?? 1.0) : 1.0;
  if (decay > 0.8) base *= t.fastAnswerMultiplier;
  const streak = roundHalfAway(streakBonus(p.streakAfter, p.kind) * t.streakBonusMultiplier);
  const clutch = (p.limitSeconds - p.elapsedSeconds) <= 3.0 ? t.clutchBonus : 0;
  return trim10(roundHalfAway(base) + streak + clutch);
}

// ── 정산 본체 (224) — 순수 함수. index.ts가 DB에서 정답·난이도·패시브를 모아 넘기고, check_server.mjs가 클라이언트 엔진이
// 만든 기록(settle_cases.json)으로 같은 점수가 나오는지 검사한다. 여기가 곧 "서버 점수 = 클라이언트 점수"의 증거다.
export interface SettleRecord {
  questionID: string; roundIndex: number; choiceIndex: number | null; elapsedMs: number;
  wager?: number | null; multiplier?: number | null;
  /** 「감점 막기」를 이 문항에 썼는가 (아이템). 옛 클라이언트는 이 키를 안 보낸다. */
  shield?: boolean | null;
  /** 이 문항에 쓴 **캐릭터 액티브 능력**. 점수에 닿는 넷만 온다. */
  ability?: string | null;
  /** 그때의 숙련 단계. **그대로 믿지 않는다** — 서버가 센 판 수로 다시 정하고 상한으로 자른다. */
  abilityTier?: number | null;
}

// ── 캐릭터 액티브 능력 (2026-09-30)
//
// 점수에 닿는 넷만 여기 있다. 나머지(보기 흐리기·핵심어·훔쳐보기·기억)는 앱 화면에서만
// 일어나고 남의 점수에 닿지 않으므로 서버가 알 필요가 없다.
//
// 세기 표는 앱 `CharacterAbility.magnitude(tier:)` 와 **리터럴 단위로 같아야 한다** —
// 기준 파일 `tools/parity/ability_cases.json`(제3의 파이썬 구현이 굽는다)을 둘이 같이 통과한다.
// 어긋나면 화면 점수와 정산 점수가 갈리고, 그건 유저 눈에 부정행위로 보인다.
const ABILITY_TABLES: Record<string, number[]> = {
  moreTime:    [2, 3, 3, 4, 5],
  bonus:       [120, 130, 140, 150, 160],
  keepStreak:  [1, 1, 1, 2, 2],
  autoCorrect: [30, 45, 60, 80, 100],
};
export const MASTERY_MAX_TIER = 5;
/** 각 숙련 단계의 최소 판 수 — 앱 `CharacterMastery.thresholds`. */
export const MASTERY_THRESHOLDS = [0, 5, 15, 30, 60];

export function masteryTier(plays: number): number {
  let t = 1;
  for (let i = 0; i < MASTERY_THRESHOLDS.length; i++) if (plays >= MASTERY_THRESHOLDS[i]) t = i + 1;
  return Math.min(MASTERY_MAX_TIER, t);
}

export function abilityMagnitude(ability: string, tier: number): number {
  const table = ABILITY_TABLES[ability];
  if (!table) return 0;
  const t = Math.max(1, Math.min(MASTERY_MAX_TIER, Math.floor(tier)));
  return table[t - 1];
}

/** 캐릭터 → 능력. 앱 `CharacterKind.ability` 와 같아야 한다.
 *  저장 키는 옛 소품 이름 그대로다 (토끼가 연필을 꽂고 있다). */
export const ABILITY_OF: Record<string, string> = {
  pencil: "dimOne", book: "keyword", question: "peek", globe: "recall",
  bulb: "moreTime", calculator: "bonus", trophy: "keepStreak", hourglass: "autoCorrect",
};

/** 「덮친다」를 쓸 수 있는 문항 수 (앞에서 이만큼까지, 0-based 상한).
 *  앱 `MatchEngine.autoCorrectLimit` 와 같아야 한다 — 다르면 앱이 쓴 능력을 서버가 부정으로 본다. */
export function autoCorrectLimit(questionCount: number, magnitude: number): number {
  return Math.max(1, Math.floor(questionCount * magnitude / 100));
}
export interface SettleRound { kind: string; questionCount: number; secondsPerQuestion: number; introSeconds: number }
export const ALLOWED_MULTIPLIERS = [0.8, 1.0, 1.3, 2.0];

/** 「감점 막기」를 한 판에 몇 번까지 인정하는가. 앱 `MatchItem.maxUsesPerMatch` 와 같은 수.
 *
 *  **이 상수가 그 아이템의 상한을 지키는 유일한 곳이다.** 재고는 기기에 있어서 조작될 수 있고,
 *  조작해서 얻을 수 있는 최대치를 여기서 긋는다 — 한 판에 감점 한 번. */
export const MAX_SHIELDS_PER_MATCH = 1;

export function settleRecords(p: {
  records: SettleRecord[]; rounds: SettleRound[]; trait: Trait;
  answerOf: (id: string) => number | undefined; difficultyOf: (id: string) => number;
  /** (축 개편) **문항마다의 주제.** 예전엔 판 전체에 방 주제 하나(`category: string`)를 썼다.
   *  방이 형식이 되면서 한 판에 여러 주제가 섞이므로, 패시브 주제 보정은 문항에서 와야 한다 —
   *  클라이언트 `MatchEngine`이 `script.questions[i].category`를 쓰는 것과 같은 값이다.
   *  모르는 문항이면 undefined → 보정 1.0 (서버가 전에 하던 것과 같은 폴백). */
  categoryOf: (id: string) => string | undefined;
  /** 이 사람의 캐릭터(`CharacterKind.rawValue`). 액티브 능력이 **그 캐릭터의 것인지** 확인한다 —
   *  기록이 아무 능력을 적어 보내도 캐릭터가 아니면 무시한다. */
  characterKind?: string | null;
  /** 서버가 센 **그 캐릭터로 한 판 수**. 능력의 세기를 이 값으로 정한다 —
   *  기록이 실어 보낸 `abilityTier` 는 참고만 하고 여기를 정본으로 쓴다. */
  characterPlays?: number | null;
}): { score: number; correct: number; wagers: Map<string, number>; suspiciousElapsed: number; ordered: SettleRecord[] } {
  // 문항당 기록 하나 (181): 답이 있는 쪽을 남기고, 둘 다 답이면 나중 것.
  const byQuestion = new Map<string, SettleRecord>();
  for (const r of p.records) {
    const prev = byQuestion.get(r.questionID);
    if (!prev || prev.choiceIndex === null || prev.choiceIndex === undefined) byQuestion.set(r.questionID, r);
  }
  // 라운드 순서대로 (196) — 판돈 상한이 "그 문항에 들어갈 때 점수"에 걸린다.
  const ordered = [...byQuestion.values()].sort((a, b) => a.roundIndex - b.roundIndex);

  let score = 0, correct = 0, streak = 0, suspicious = 0;
  let shieldsUsed = 0;

  // ── 이 사람이 쓸 수 있는 액티브 능력과 그 세기 (2026-09-30)
  //
  // **기록이 주장하는 tier 를 쓰지 않는다.** 숙련도는 기기에 있어 조작될 수 있으니
  // 서버가 센 판 수(`characterPlays`)로 단계를 정한다. 새 기능이라 모두 0판에서 시작하므로
  // 앱과 서버가 처음부터 같은 값을 본다 — 옮길 과거가 없다.
  const myAbility = p.characterKind ? ABILITY_OF[p.characterKind] : undefined;
  const myTier = masteryTier(Math.max(0, Math.floor(p.characterPlays ?? 0)));
  /** 이 기록의 능력이 유효한가 — **그 캐릭터의 것이고, 점수에 닿는 것**이어야 한다. */
  const abilityOf = (r: SettleRecord): string | undefined => {
    const a = r.ability ?? undefined;
    if (!a || !myAbility || a !== myAbility) return undefined;
    return ABILITY_TABLES[a] ? a : undefined;
  };
  // **판에 한 번.** 「버틴다」만 여러 문항에 걸쳐 효과가 나므로 횟수로 센다.
  let abilityUsed = false;
  let streakShieldLeft = 0;
  const wagers = new Map<string, number>();
  // (199) 서바이벌: 틀리거나 안 내면 탈락, 라운드 끝까지 살면 +250.
  let eliminatedInRound: number | null = null;
  let lastRound = -1;
  const settleSurvival = (upTo: number) => {
    for (let ri = lastRound; ri >= 0 && ri < upTo; ri++) {
      if (p.rounds[ri]?.kind === "survival" && eliminatedInRound !== ri) score += SURVIVAL_BONUS;
    }
  };
  for (const r of ordered) {
    const spec = p.rounds[r.roundIndex];
    if (!spec) continue;
    if (r.roundIndex !== lastRound) { settleSurvival(r.roundIndex); lastRound = r.roundIndex; }
    if (spec.kind === "survival" && eliminatedInRound === r.roundIndex) continue;
    // (328) 전 라운드 부저제 — 클라이언트 `applyAnswer`가 쓰는 limit과 같은 값.
    // elapsedMs 는 잡은 뒤 기준이고, 소거만 문항이 뜬 순간 기준이다 (`scoresFromBuzzerClaim`).
    let limit = scoringLimit(spec.kind, spec.secondsPerQuestion);
    // 「느긋하게」 — 채점 창을 늘린다. 앱 `applyAnswer` 의 같은 줄과 값이 같아야 한다.
    const recAbility = abilityOf(r);
    if (recAbility === "moreTime" && !abilityUsed) {
      abilityUsed = true;
      limit += abilityMagnitude("moreTime", myTier);
    }
    let isCorrect = r.choiceIndex !== null && r.choiceIndex !== undefined && r.choiceIndex >= 0 && r.choiceIndex === p.answerOf(r.questionID);
    const answered = r.choiceIndex !== null && r.choiceIndex !== undefined;

    // 「덮친다」(자동 정답) — **쓸 수 있는 자리였는지 서버가 확인한다.**
    // 숙련 단계가 판의 앞쪽 몇 할까지 허용하는지 정하고, 뒤로 갈수록 배점이 오른다.
    // 허용 범위를 넘겨 보냈으면 그 능력은 없던 것으로 보고 **정답도 인정하지 않는다** —
    // 자동 정답을 조작으로 얻는 유일한 경로가 이 줄이다.
    if ((r.ability ?? undefined) === "autoCorrect") {
      const limitIdx = autoCorrectLimit(ordered.length, abilityMagnitude("autoCorrect", myTier));
      const position = ordered.indexOf(r);
      if (myAbility !== "autoCorrect" || abilityUsed || position >= limitIdx) {
        isCorrect = false;
      } else {
        abilityUsed = true;
      }
    }
    if (r.elapsedMs < 120) suspicious++;
    // 연속은 **답을 내고 틀렸을 때만** 끊긴다 — 안 낸 문항(버저를 못 잡음·시간 초과)은 엔진에서 applyAnswer가 돌지 않아
    // 연속이 그대로다. (224: 45판 대조에서 잡음 — 버저 못 잡은 뒤 정답이 서버에서 90점 낮았다.)
    // 「버틴다」 — 틀려도 연속이 끊기지 않는다. 처음 만난 기록에서 보호 횟수를 채우고,
    // 그 뒤 틀린 문항마다 하나씩 쓴다. **감점은 그대로다** — 지키는 건 연속이지 점수가 아니다.
    if (recAbility === "keepStreak" && !abilityUsed) {
      abilityUsed = true;
      streakShieldLeft = abilityMagnitude("keepStreak", myTier);
    }
    if (isCorrect) { correct++; streak++; }
    else if (answered) {
      if (streakShieldLeft > 0 && recAbility === "keepStreak") streakShieldLeft--;
      else streak = 0;
    }
    if (spec.kind === "survival" && !isCorrect) eliminatedInRound = r.roundIndex;
    const wager = spec.kind === "betting" ? clampWager(r.wager, score) : 0;
    wagers.set(r.questionID, wager);
    if (answered) {
      let delta = questionDelta({
        kind: spec.kind, difficulty: p.difficultyOf(r.questionID), elapsedSeconds: r.elapsedMs / 1000, limitSeconds: limit,
        streakAfter: streak, isCorrect, wager, trait: p.trait, category: p.categoryOf(r.questionID),
      });
      const m = ALLOWED_MULTIPLIERS.includes(Number(r.multiplier ?? 1.0)) ? Number(r.multiplier ?? 1.0) : 1.0;
      // (233) 판돈은 배수 밖 — 곱하는 건 문항 기본점뿐 (엔진 applyAnswer와 같다).
      // 배수를 곱하면 1단위가 다시 생긴다 — 곱한 뒤에도 자른다.
      if (delta > 0 && m !== 1.0) delta = trim10(Math.floor((delta - wager) * m + 0.5) + wager);
      // **감점 막기** (아이템). 앱 `MatchEngine.applyAnswer` 와 같은 줄이다 —
      // 여기서만 막으면 화면의 점수와 정산된 점수가 달라진다.
      //
      // 세 가지를 지킨다:
      //  1. **깎이는 값일 때만** 쓴다 — 정답 점수를 0으로 만들지 않는다.
      //  2. **파이널(베팅)에서는 무시한다** — 판돈 손실까지 막으면 한 번의 아이템이
      //     수백 점을 되돌린다. 앱도 버튼을 잠그지만, 둘 중 하나만으로는 규칙이 아니다.
      //  3. **한 판에 한 번.** 표시를 여럿 붙여 보내도 두 번째부터는 무시된다.
      //     기기의 재고는 못 믿으니 경계는 여기서 긋는다.
      // 「집중」 — 얻은 점수에만 배수. 앱 `applyAnswer` 와 같은 자리·같은 순서다
      // (룰렛 배수 뒤, 감점 막기 앞). 곱한 뒤 10점 단위로 자른다.
      if (recAbility === "bonus" && !abilityUsed && delta > 0) {
        abilityUsed = true;
        delta = trim10(Math.floor(delta * abilityMagnitude("bonus", myTier) / 100 + 0.5));
      }
      if (r.shield === true && spec.kind !== "betting" && delta < 0
          && shieldsUsed < MAX_SHIELDS_PER_MATCH) {
        shieldsUsed++;
        delta = 0;
      }
      score += delta;
    }
    // (329) 바닥 없음 — 감점은 0 아래로 내려간다 (클라이언트 applyAnswer와 동일).
  }
  settleSurvival(p.rounds.length);
  return { score, correct, wagers, suspiciousElapsed: suspicious, ordered };
}

