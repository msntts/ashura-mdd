/**
 * 乖離ライフサイクル(domain/ashura.model.ashura 文脈「測量」集約「乖離」の実装)。
 * 状態: 検出 -> 裁定待ち -> 解消。裁定待ちが7日を超えたらエスカレーション。
 * 検出 -> 解消 の直接遷移は禁止(裁定なしの自動解消はしない)。
 */

export type DivergenceState = '検出' | '裁定待ち' | '解消';
export type Verdict = 'コードを直す' | 'モデルを直す';

export interface Divergence {
  readonly id: string;
  readonly state: DivergenceState;
  readonly detectedAt: number;
  readonly waitingSince?: number;
  readonly verdict?: Verdict;
  readonly resolvedAt?: number;
  readonly escalated: boolean;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function detect(id: string, now: number): Divergence {
  return { id, state: '検出', detectedAt: now, escalated: false };
}

export function enterWaitingForVerdict(divergence: Divergence, now: number): Divergence {
  if (divergence.state !== '検出') {
    throw new Error(`検出状態からのみ裁定待ちへ遷移できます(現在: ${divergence.state})`);
  }
  return { ...divergence, state: '裁定待ち', waitingSince: now };
}

export function resolve(divergence: Divergence, verdict: Verdict, now: number): Divergence {
  if (divergence.state !== '裁定待ち') {
    throw new Error(
      `裁定待ち状態からのみ解消へ遷移できます(現在: ${divergence.state})。検出からの直接解消は禁止されています`,
    );
  }
  return { ...divergence, state: '解消', verdict, resolvedAt: now };
}

/** 裁定待ちが7日を超えていればエスカレーション済みとしてマークする。それ以外は変更なしで返す。 */
export function checkEscalation(divergence: Divergence, now: number): Divergence {
  if (divergence.state !== '裁定待ち' || divergence.waitingSince === undefined || divergence.escalated) {
    return divergence;
  }
  const elapsed = now - divergence.waitingSince;
  if (elapsed > SEVEN_DAYS_MS) {
    return { ...divergence, escalated: true };
  }
  return divergence;
}
