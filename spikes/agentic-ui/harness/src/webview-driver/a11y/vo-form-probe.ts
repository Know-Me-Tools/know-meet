/**
 * Gate 16.4 VoiceOver supplement: keyboard-only A2UI form-validation with pauses so the
 * VoiceOver poller (measurements/16-4/vo-poll.js) can hear (a) a failed submit with an invalid
 * email and (b) what follows a valid submit. Trusted keys only after the prompt.
 *
 *   KM_HARNESS_URL=http://127.0.0.1:4327 node src/webview-driver/a11y/vo-form-probe.ts <binary> <prototype>
 *
 * Prints timestamped markers (epoch ms) for merging with the VoiceOver phrase log.
 */
import { A11ySession, HARNESS, KEY, describe, sleep } from "./a11y-session.ts";

const mark = (text: string): void => {
  process.stdout.write(`${Date.now()} MARK ${text}\n`);
};

async function actionCount(s: A11ySession): Promise<number> {
  return (await s.sessionSummary())?.a2uiActions.length ?? 0;
}

async function main(): Promise<void> {
  const [binary, prototype] = process.argv.slice(2);
  if (binary === undefined || prototype === undefined) throw new Error("usage: vo-form-probe.ts <binary> <prototype>");
  const s = A11ySession.create(binary, prototype, "a2ui-keyboard", "a2ui/form-validation", "form-validation", false);
  process.stdout.write(`${Date.now()} vo-form: ${s.config.runId} (harness ${HARNESS})\n`);
  try {
    await s.launch();
    await s.submitPrompt(s.ready?.prompt ?? "");
    await s.waitSettled(60_000);
    await sleep(1_500);
    s.click(await s.target("km-composer-input"), "composer");
    await sleep(400);
    const goTo = async (id: string, mods = ""): Promise<boolean> => {
      const steps = await s.tabUntil(mods, 14, (a) => a.a2uiId === id);
      await sleep(500);
      return steps.at(-1)?.active.a2uiId === id;
    };
    mark("tab to name_field, type Ana");
    if (await goTo("name_field")) s.type("Ana");
    await sleep(600);
    mark("tab to email_field, type not-an-email");
    if (await goTo("email_field")) s.type("not-an-email");
    await sleep(1_200);
    mark("tab to submit_btn (invalid form)");
    await goTo("submit_btn");
    const before = await actionCount(s);
    mark("Enter on submit_btn with invalid email");
    s.key(KEY.enter);
    await sleep(3_000);
    const afterInvalid = await s.state();
    mark(`after invalid submit: active=${describe(afterInvalid.active)}; actions sent=${(await actionCount(s)) - before}; "Enter a valid email" visible=${String(afterInvalid.visibleText["Enter a valid email"] ?? "n/a")}`);
    mark("shift+tab back to email_field, replace with ana@know-me.tools");
    if (await goTo("email_field", "shift")) {
      s.key(KEY.a, "cmd");
      await sleep(200);
      s.type("ana@know-me.tools");
    }
    await sleep(1_200);
    mark("tab to agree_box, Space");
    if (await goTo("agree_box")) s.key(KEY.space);
    await sleep(1_000);
    mark("tab to submit_btn (valid form)");
    await goTo("submit_btn");
    const beforeValid = await actionCount(s);
    mark("Enter on submit_btn with valid form");
    s.key(KEY.enter);
    await sleep(5_000);
    const afterValid = await s.state();
    mark(`after valid submit: active=${describe(afterValid.active)}; actions sent=${(await actionCount(s)) - beforeValid}`);
    const final = await s.final();
    mark(`live-region log (last 4): ${JSON.stringify(final.live.slice(-4))}`);
    mark(`keys trusted=${final.keys.every((k) => k.trusted)} (${final.keys.length}); untrusted clicks=${final.clicks.filter((c) => !c.trusted).length}; warnings=${JSON.stringify(s.warnings)}`);
  } finally {
    s.stop();
  }
}

main().catch((error: unknown) => {
  process.stdout.write(`${Date.now()} ERROR ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
