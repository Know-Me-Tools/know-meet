// TJ-ARCH-MOB-001 compliant
// VoiceOver finding F6 (decision log, 16.4): an invalid submit must move focus to,
// and so announce, the first invalid field. Validation runs on submit only (never
// mid-typing). Call after the error state has rendered, e.g. from a layout effect
// keyed on a submit counter, or after `flushSync`.
export function focusFirstError(form: HTMLFormElement | null): boolean {
  if (form === null) return false;
  const first = form.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (first === null) return false;
  first.focus();
  return true;
}
