import { Injectable } from '@nestjs/common';
import { RiskLevel, SignalType, UrlSignal } from '../contracts/analysis.enums';

const weights: Record<SignalType, number> = {
  [SignalType.CREDENTIAL_REQUEST]: 85,
  [SignalType.MONEY_REQUEST]: 55,
  [SignalType.IMPERSONATION]: 50,
  [SignalType.SUSPICIOUS_URL]: 45,
  [SignalType.URGENCY]: 45,
  [SignalType.THREAT]: 50,
  [SignalType.TOO_GOOD_TO_BE_TRUE]: 45,
  [SignalType.OTHER]: 15,
};

const elevatedUrlSignals = new Set([UrlSignal.IP_HOST, UrlSignal.USERINFO_AT, UrlSignal.MISLEADING_SUBDOMAIN]);

export function toRiskLevel(score: number | null): RiskLevel {
  if (score === null) return RiskLevel.UNABLE_TO_ASSESS;
  if (score >= 75) return RiskLevel.DANGER;
  return score >= 40 ? RiskLevel.SUSPICIOUS : RiskLevel.SAFE;
}

@Injectable()
export class RiskService {
  assess(signals: readonly SignalType[], canAssess = true, urlSignals: readonly UrlSignal[] = []): {
    risk_score: number | null; risk_level: RiskLevel;
  } {
    const behaviors = new Set<SignalType>(signals.filter((signal) => signal !== SignalType.SUSPICIOUS_URL));
    const urlWeight = urlSignals.some((signal) => elevatedUrlSignals.has(signal))
      ? weights[SignalType.SUSPICIOUS_URL] : urlSignals.length ? 25 : 0;
    const base = Math.max(0, urlWeight, ...[...behaviors].map((signal) => weights[signal]));
    const credentialRequest = behaviors.has(SignalType.CREDENTIAL_REQUEST);
    const activeRequest = credentialRequest || behaviors.has(SignalType.MONEY_REQUEST);
    const corroborated = urlWeight === weights[SignalType.SUSPICIOUS_URL] ||
      (credentialRequest && behaviors.has(SignalType.URGENCY)) ||
      [SignalType.IMPERSONATION, SignalType.THREAT, SignalType.TOO_GOOD_TO_BE_TRUE]
        .some((signal) => behaviors.has(signal));
    const risk_score = canAssess ? Math.min(100, Math.max(0, base + (activeRequest && corroborated ? 20 : 0))) : null;
    return { risk_score, risk_level: toRiskLevel(risk_score) };
  }
}
