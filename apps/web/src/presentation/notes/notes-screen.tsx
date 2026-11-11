// TJ-ARCH-MOB-001 compliant
// Generator baseline (knowme-builder notes demo), moved unchanged in behaviour from
// apps/web and apps/web/baselines/desktop in c06. Not a Know Meet screen; unstyled.
import { useNotes } from "./use-notes";

export function NotesScreen() {
  const notes = useNotes();
  return (
    <section aria-labelledby="notes-heading">
      <header>
        <h1 id="notes-heading">Your notes</h1>
        <p>A small place for things worth keeping.</p>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void notes.save();
        }}
      >
        <label htmlFor="note">New note</label>
        <div className="compose">
          <input
            id="note"
            data-testid="note-input"
            autoComplete="off"
            value={notes.draft}
            onChange={(event) => notes.setDraft(event.target.value)}
            placeholder="Write something to remember"
          />
          <button type="submit" data-testid="save-note" disabled={notes.saving}>
            {notes.saving ? "Saving…" : "Save note"}
          </button>
        </div>
      </form>
      {notes.error ? <p role="alert">{notes.error}</p> : null}
      <section data-testid="saved-notes" aria-label="Saved notes" aria-busy={notes.loading}>
        {notes.loading ? (
          <p role="status">Loading notes…</p>
        ) : notes.items.length === 0 ? (
          <p className="empty">Your saved notes will appear here.</p>
        ) : (
          <ul>
            {notes.items.map((note) => (
              <li key={note.id}>{note.title}</li>
            ))}
          </ul>
        )}
      </section>
      {notes.capabilityError ? <p role="alert">{notes.capabilityError}</p> : null}
      {notes.capabilities.length > 0 ? (
        <aside aria-label="Available capabilities">
          <h2>Available capabilities</h2>
          <ul>
            {notes.capabilities.map((capability) => (
              <li key={capability.id}>
                {capability.name} <small>({capability.kind})</small>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
      <footer>Saved notes stay available when you reopen the app.</footer>
    </section>
  );
}
