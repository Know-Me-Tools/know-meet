// TJ-ARCH-MOB-001 compliant
// settings.html `addNumberDialog()`: search local numbers by area code (static
// results; 555 and 999 return none), pick one, add it. Kit dialog: focus moves
// in on open and returns to the trigger on close; Escape closes.
import { Button } from "@know-meet/ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@know-meet/ui/components/dialog";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { RadioGroup, RadioGroupItem } from "@know-meet/ui/components/radio-group";
import { useLayoutEffect, useRef, useState } from "react";
import { checkField, validateAreaCode } from "../application/validators";
import { InputGroup, TextField } from "./settings-fields";
import { BusyContent, Note, Stack } from "./settings-parts";
import { useBusyAction } from "./use-static-delay";

const RULE = { label: "Area code", required: true, validate: validateAreaCode } as const;

type Results =
  | { readonly kind: "none"; readonly area: string }
  | { readonly kind: "list"; readonly numbers: readonly string[] };

function NumberResults({
  results,
  picked,
  onPick,
}: {
  readonly results: Results;
  readonly picked: string;
  readonly onPick: (value: string) => void;
}) {
  if (results.kind === "none") {
    return (
      <Note kind="warn" icon="alert">
        No numbers are available in area code {results.area} right now. Try a nearby area code.
      </Note>
    );
  }
  return (
    <div className="grid gap-1.5">
      <span id="num-results-legend" className="text-sm font-semibold">
        {results.numbers.length} numbers available
      </span>
      <RadioGroup
        aria-labelledby="num-results-legend"
        value={picked}
        onValueChange={(value) => onPick(String(value))}
        className="gap-s2"
      >
        {results.numbers.map((n, i) => (
          <label
            key={n}
            htmlFor={`num-${i}`}
            className="flex min-h-size-target cursor-pointer items-center gap-s3 rounded-base bg-bg-2 px-s3"
          >
            <RadioGroupItem id={`num-${i}`} value={n} />
            <span className="font-mono text-13">{n}</span>
            <span className="text-sm text-muted-foreground">Local · voice</span>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}

export function AddNumberDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onAdd: (number: string) => void;
}) {
  const [area, setArea] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [results, setResults] = useState<Results | null>(null);
  const [picked, setPicked] = useState("");
  const searching = useBusyAction();
  const bodyRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (attempt > 0) bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [attempt]);

  const search = () => {
    const message = checkField(RULE, area);
    setError(message);
    if (message !== null) {
      setAttempt((n) => n + 1);
      return;
    }
    const code = area.trim();
    setPicked("");
    setResults(null);
    searching.start(1000, () =>
      setResults(
        code === "999" || code === "555"
          ? { kind: "none", area: code }
          : { kind: "list", numbers: ["0131", "0148", "0186"].map((s) => `+1 (${code}) 555-${s}`) },
      ),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a dial-in number</DialogTitle>
          <DialogDescription>
            Numbers are bought on your Telnyx account and routed to LiveKit SIP.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Stack ref={bodyRef}>
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                search();
              }}
            >
              <InputGroup className="items-end">
                <TextField
                  id="add-num-area"
                  label="Area code"
                  required
                  inputMode="numeric"
                  maxLength={3}
                  placeholder="415"
                  hint="Search US and Canada local numbers."
                  value={area}
                  error={error}
                  onValueChange={(value) => {
                    setArea(value);
                    if (error !== null && checkField(RULE, value) === null) setError(null);
                  }}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={searching.busy}
                  aria-busy={searching.busy || undefined}
                >
                  <BusyContent busy={searching.busy} busyLabel="Searching…" icon="search">
                    Search
                  </BusyContent>
                </Button>
              </InputGroup>
            </form>
            <div aria-live="polite">
              {results === null ? null : (
                <NumberResults results={results} picked={picked} onPick={setPicked} />
              )}
            </div>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
          <Button
            disabled={picked === ""}
            onClick={() => {
              onOpenChange(false);
              onAdd(picked);
            }}
          >
            <KmIcon name="plus" />
            <span>Add number</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
