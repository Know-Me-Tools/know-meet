// TJ-ARCH-MOB-001 compliant
// recordings.html `openShare`: the recording link (read-only, copy), who can open
// it (sign-in required; participants already have access) and the people list.
import { Badge } from "@know-meet/ui/components/badge";
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
import { Input } from "@know-meet/ui/components/input";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { copyText } from "../../shared/copy-text";
import { initialsOf } from "../../workspace/application/format";
import type { Recording } from "../../workspace/domain/workspace";
import { detailHash } from "../application/recordings-route";
import { Note } from "./recording-parts";

interface ShareDialogProps {
  readonly recording: Recording;
  readonly host: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ recording, host, open, onOpenChange }: ShareDialogProps) {
  const link = `${window.location.origin}${window.location.pathname}#${detailHash(recording.id)}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share recording</DialogTitle>
          <DialogDescription>{recording.title}</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-s4">
          <div className="grid gap-1.5">
            <label htmlFor="share-link" className="text-sm font-semibold">
              Recording link
            </label>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-s2">
              <Input id="share-link" readOnly value={link} className="font-mono text-13" />
              <Button variant="secondary" onClick={() => void copyText(link)}>
                <KmIcon name="copy" />
                <span>Copy</span>
              </Button>
            </div>
          </div>
          <Note kind="info" icon="lock">
            People need to sign in to open this link. Participants already have access; anyone else
            you share with gets view-only access to the recording, transcript and summary.
          </Note>
          <div className="grid gap-1.5">
            <span className="text-sm font-semibold">People with access</span>
            <ul className="grid gap-s2">
              {recording.participants.map((name) => (
                <li
                  key={name}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-s3 rounded-base bg-surface px-s4 py-s3 shadow-(--shadow-card)"
                >
                  <span
                    aria-hidden="true"
                    className="inline-grid size-8 place-items-center rounded-round bg-muted font-display text-xs leading-none font-semibold uppercase"
                  >
                    {initialsOf(name)}
                  </span>
                  <span className="min-w-0 font-semibold [overflow-wrap:anywhere]">{name}</span>
                  <Badge>{name === host ? "Host" : "Participant"}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button />}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
