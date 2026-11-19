// TJ-ARCH-MOB-001 compliant
// Device-local screens (DESIGN.md "Hosted build navigation (operator 2026-11-18)"):
// /history in both builds, and the hosted build's /recordings (recordings saved in
// this browser). wc09 and wc10 fill the screens; the routes stay as they are.
import { HistoryScreen } from "../../presentation/local-history/presentation/history-screen";
import { LocalRecordingsScreen } from "../../presentation/local-recordings/presentation/local-recordings-screen";

export function HistoryRoute() {
  return <HistoryScreen />;
}

export function LocalRecordingsRoute() {
  return <LocalRecordingsScreen />;
}
