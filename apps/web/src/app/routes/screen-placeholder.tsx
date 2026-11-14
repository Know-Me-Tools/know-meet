// TJ-ARCH-MOB-001 compliant
// Route placeholders until c10 (home, sign-in, join) and c11 (dashboard, agents,
// recordings, settings, room) compose the designed screens from the kit. Each
// renders the page heading so the frame, landmarks and focus order are testable.
export function ScreenPlaceholder({ title }: { readonly title: string }) {
  return (
    <section
      aria-labelledby="screen-heading"
      className="mx-auto w-full max-w-page-max px-s5 pt-s6 pb-s8 max-bp768:px-s4"
    >
      <h1 id="screen-heading" className="text-2xl">
        {title}
      </h1>
    </section>
  );
}
