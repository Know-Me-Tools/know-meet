// TJ-ARCH-MOB-001 compliant
// Who a chat message goes to, as the composer offers it, and how every message names
// its audience (WC-2, WC-3). Pure functions over domain types; no framework imports.
// The composer shows Everyone first and preselects it, but the audience it sends is
// always built here from the visible choice, never left to a default downstream.
import {
  type ChatAudience,
  type ChatMessage,
  EVERYONE,
  type ParticipantIdentity,
  privateTo,
  type RemoteParticipant,
} from "@know-meet/domain";

export const AUDIENCE_EVERYONE_LABEL = "Everyone";

/** The composer's choice. A private choice keeps the name it was made with. */
export type AudienceChoice =
  | { readonly kind: "everyone" }
  | { readonly kind: "private"; readonly to: ParticipantIdentity; readonly name: string };

export const EVERYONE_CHOICE: AudienceChoice = { kind: "everyone" };

const EVERYONE_VALUE = "everyone";
const PRIVATE_PREFIX = "private:";

export interface AudienceOption {
  readonly value: string;
  readonly label: string;
  /** A recipient who left: still shown while chosen, so the choice is never silently replaced. */
  readonly disabled: boolean;
}

export function choiceValue(choice: AudienceChoice): string {
  return choice.kind === "everyone" ? EVERYONE_VALUE : `${PRIVATE_PREFIX}${choice.to}`;
}

/** True while a private recipient is still in the room (Everyone always is). */
export function isChoicePresent(
  choice: AudienceChoice,
  remotes: readonly RemoteParticipant[],
): boolean {
  if (choice.kind === "everyone") return true;
  return remotes.some((remote) => remote.identity === choice.to);
}

/** Everyone, then one option per remote participant by name, plus a chosen recipient who left. */
export function audienceOptions(
  choice: AudienceChoice,
  remotes: readonly RemoteParticipant[],
): readonly AudienceOption[] {
  const options: AudienceOption[] = [
    { value: EVERYONE_VALUE, label: AUDIENCE_EVERYONE_LABEL, disabled: false },
  ];
  for (const remote of remotes) {
    options.push({
      value: `${PRIVATE_PREFIX}${remote.identity}`,
      label: remote.displayName,
      disabled: false,
    });
  }
  if (choice.kind === "private" && !isChoicePresent(choice, remotes)) {
    options.push({ value: choiceValue(choice), label: `${choice.name} (left)`, disabled: true });
  }
  return options;
}

/** The choice a select value stands for, or null when it names nobody in the room. */
export function choiceFromValue(
  value: string,
  remotes: readonly RemoteParticipant[],
): AudienceChoice | null {
  if (value === EVERYONE_VALUE) return EVERYONE_CHOICE;
  if (!value.startsWith(PRIVATE_PREFIX)) return null;
  const identity = value.slice(PRIVATE_PREFIX.length);
  const remote = remotes.find((candidate) => candidate.identity === identity);
  return remote === undefined
    ? null
    : { kind: "private", to: remote.identity, name: remote.displayName };
}

export function toChatAudience(choice: AudienceChoice): ChatAudience {
  return choice.kind === "everyone" ? EVERYONE : privateTo(choice.to);
}

/**
 * The audience line on a message: "Everyone", "Private to <name>" for one this client
 * sent, "Private to you" for one it received. `recipientName` is the name the message
 * was sent to (kept at send time, since the recipient may have left since).
 */
export function messageAudienceLabel(message: ChatMessage, recipientName: string | null): string {
  if (message.audience.kind === "everyone") return AUDIENCE_EVERYONE_LABEL;
  if (message.direction === "received") return "Private to you";
  return `Private to ${recipientName ?? "someone who left"}`;
}

/** Name of the participant a sent private message went to, from the room as it is now. */
export function currentRecipientName(
  message: ChatMessage,
  remotes: readonly RemoteParticipant[],
): string | null {
  const { audience } = message;
  if (audience.kind !== "private") return null;
  return remotes.find((remote) => remote.identity === audience.to)?.displayName ?? null;
}
