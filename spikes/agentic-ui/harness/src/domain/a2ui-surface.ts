/**
 * A2UI golden surface file (corpus/a2ui/surfaces/*.json), shared by the web
 * prototypes (delivered over AG-UI) and the Flutter renderer (loaded directly).
 */

/** A user action on a rendered surface and the A2UI action message it must emit. */
export interface GoldenInteraction {
  readonly description: string;
  /** Component id -> text to type before clicking (TextField values). */
  readonly fill?: Readonly<Record<string, string>>;
  /** Component id to toggle before clicking (CheckBox). */
  readonly toggle?: readonly string[];
  /** Component id clicked (a Button). */
  readonly click: string;
  /**
   * Expected outbound A2UI v1.0 `action` (renderer -> agent). Absent means the
   * click must NOT emit an action (e.g. blocked by failing checks).
   */
  readonly expectAction?: {
    readonly name: string;
    readonly sourceComponentId: string;
    readonly context: Readonly<Record<string, unknown>>;
  };
  /** Validation messages that must be visible after the click (failing checks). */
  readonly expectVisibleText?: readonly string[];
}

export interface GoldenSurfaceExpectation {
  /** Component ids that must be rendered (web: [data-a2ui-id]; Flutter: Key('a2ui:<id>')). */
  readonly renderedComponentIds: readonly string[];
  /** Component ids that must use the unknown-component fallback. */
  readonly fallbackComponentIds: readonly string[];
  /** Text that must be visible once all messages are applied. */
  readonly visibleText: readonly string[];
  /** Media URLs that must NOT be requested (disallowed origins), after placeholder substitution. */
  readonly blockedMediaUrls: readonly string[];
  /** Final data model after all messages (deep-equal), when meaningful. */
  readonly dataModel?: unknown;
  /** Surface deleted at the end (deleteSurface). */
  readonly deleted?: boolean;
}

export type GoldenValidation =
  /** Passes @a2ui/web_core STRICT_VALIDATION with the basic catalog. */
  | { readonly mode: "strict-pass" }
  /** Must fail STRICT validation for exactly these reasons (the renderer must degrade, not crash). */
  | { readonly mode: "strict-fail-expected"; readonly errorIncludes: readonly string[] };

export interface GoldenSurfaceFile {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly corpusFormatVersion: number;
  readonly a2uiSpecVersion: string;
  readonly a2uiWebCorePackage: string;
  readonly catalogId: string;
  readonly surfaceId: string;
  /** A2UI agent-to-renderer messages in order (may contain {{ALLOWED_ORIGIN}}/{{EVIL_ORIGIN}}). */
  readonly messages: readonly Readonly<Record<string, unknown>>[];
  readonly validation: GoldenValidation;
  readonly interactions: readonly GoldenInteraction[];
  readonly expected: GoldenSurfaceExpectation;
  /** Notes for the Flutter (a2ui_flutter 0.1.0) parity run. */
  readonly flutterNotes: string;
}
