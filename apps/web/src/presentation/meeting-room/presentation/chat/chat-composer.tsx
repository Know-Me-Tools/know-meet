// TJ-ARCH-MOB-001 compliant
// meet.html `#chat-form` with an explicit audience (WC-2, WC-3; wc04 spec case 1): a
// native "Send to" select (Everyone, then each person in the room; Everyone is shown
// and preselected), a line that says who will see the message, the message field and
// Send. The audience sent is built from the visible choice every time. If a chosen
// recipient leaves, the choice is kept and marked "(left)", Send is unavailable and the
// line says why, so a private message can never fall back to everyone by itself.
// Enter sends, Shift+Enter adds a line. On failure the text stays and the error is read
// out; on success the field clears and keeps focus. Scenario contract: km-chat-audience,
// km-chat-input, km-chat-send.
import type { ChatSendError } from "@know-meet/application";
import {
  type ChatMessage,
  MAX_CHAT_TEXT_LENGTH,
  type RemoteParticipant,
  type Result,
} from "@know-meet/domain";
import { Button } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { NativeSelect, NativeSelectOption } from "@know-meet/ui/components/native-select";
import { Textarea } from "@know-meet/ui/components/textarea";
import { type RefObject, useId, useState } from "react";
import {
  type AudienceChoice,
  audienceOptions,
  choiceFromValue,
  choiceValue,
  EVERYONE_CHOICE,
  isChoicePresent,
} from "../../domain/chat-audience";
import {
  CHAT_COPY,
  chatSendErrorText,
  inputPrivate,
  recipientLeft,
  scopePrivate,
} from "./chat-copy";

interface ChatComposerProps {
  readonly remotes: readonly RemoteParticipant[];
  readonly inputRef: RefObject<HTMLTextAreaElement | null>;
  readonly onSend: (
    text: string,
    choice: AudienceChoice,
  ) => Promise<Result<ChatMessage, ChatSendError>>;
}

function ScopeLine({
  id,
  choice,
  present,
}: {
  readonly id: string;
  readonly choice: AudienceChoice;
  readonly present: boolean;
}) {
  const text =
    choice.kind === "everyone"
      ? CHAT_COPY.scopeEveryone
      : present
        ? scopePrivate(choice.name)
        : recipientLeft(choice.name);
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm text-muted-foreground">
      <KmIcon name={choice.kind === "everyone" ? "users" : "lock"} className="mt-0.5 size-4" />
      <span>{text}</span>
    </p>
  );
}

export function ChatComposer({ remotes, inputRef, onSend }: ChatComposerProps) {
  const ids = useId();
  const [choice, setChoice] = useState<AudienceChoice>(EVERYONE_CHOICE);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const present = isChoicePresent(choice, remotes);
  const canSend = present && !sending && text.trim() !== "";
  const scopeId = `${ids}-scope`;
  const errorId = `${ids}-error`;

  const submit = () => {
    if (!canSend) return;
    const sentChoice = choice;
    setSending(true);
    void onSend(text, sentChoice).then((result) => {
      setSending(false);
      if (result.ok) {
        setText("");
        setError(null);
        inputRef.current?.focus({ preventScroll: true });
        return;
      }
      const name = sentChoice.kind === "private" ? sentChoice.name : null;
      setError(chatSendErrorText(result.error, text, name));
    });
  };

  return (
    <form
      noValidate
      aria-label={CHAT_COPY.title}
      className="grid gap-s2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-1.5">
        <label htmlFor={`${ids}-audience`} className="text-sm font-semibold">
          {CHAT_COPY.audienceLabel}
        </label>
        <NativeSelect
          id={`${ids}-audience`}
          data-testid="km-chat-audience"
          value={choiceValue(choice)}
          aria-describedby={scopeId}
          onChange={(event) => {
            const next = choiceFromValue(event.target.value, remotes);
            if (next === null) return;
            setChoice(next);
            setError(null);
          }}
        >
          {audienceOptions(choice, remotes).map((option) => (
            <NativeSelectOption key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <ScopeLine id={scopeId} choice={choice} present={present} />
      </div>
      <label htmlFor={`${ids}-input`} className="text-sm font-semibold">
        {choice.kind === "everyone" ? CHAT_COPY.inputEveryone : inputPrivate(choice.name)}
      </label>
      <div className="flex items-end gap-s2">
        <Textarea
          ref={inputRef}
          id={`${ids}-input`}
          data-testid="km-chat-input"
          rows={1}
          maxLength={MAX_CHAT_TEXT_LENGTH}
          value={text}
          aria-invalid={error === null ? undefined : true}
          aria-describedby={error === null ? scopeId : `${scopeId} ${errorId}`}
          className="max-h-40 min-h-size-control-h resize-none"
          onChange={(event) => {
            setText(event.target.value);
            if (error !== null) setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            submit();
          }}
        />
        <Button
          type="submit"
          size="icon"
          aria-label={CHAT_COPY.send}
          data-testid="km-chat-send"
          disabled={!canSend}
          aria-busy={sending ? true : undefined}
        >
          <KmIcon name="send" />
        </Button>
      </div>
      <p id={errorId} role="alert" className="text-sm text-red-text empty:hidden">
        {error}
      </p>
    </form>
  );
}
