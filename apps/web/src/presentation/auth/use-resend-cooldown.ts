// TJ-ARCH-MOB-001 compliant
// auth.html `cooldownResend`: the resend button stays disabled for 30 seconds
// after each send, with a polite countdown line under it.
import { useEffect, useState } from "react";

const COOLDOWN_S = 30;
const TICK_MS = 1000;

export interface ResendCooldown {
  readonly canResend: boolean;
  readonly line: string;
  readonly restart: () => void;
}

export function useResendCooldown(): ResendCooldown {
  const [left, setLeft] = useState(COOLDOWN_S);
  useEffect(() => {
    if (left <= 0) return undefined;
    const timer = window.setTimeout(() => setLeft((value) => value - 1), TICK_MS);
    return () => window.clearTimeout(timer);
  }, [left]);
  return {
    canResend: left <= 0,
    line: left > 0 ? `You can resend in ${left}s.` : "Didn’t get it? You can send it again now.",
    restart: () => setLeft(COOLDOWN_S),
  };
}
