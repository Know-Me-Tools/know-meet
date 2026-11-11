// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/recording.dart';

/// Callout kinds (recordings.html `.note-*`). Feature-local: the kit has no
/// note callout yet.
enum RecNoteKind { info, warn, ok, err }

/// `.note`: an icon and copy on a soft tone. Errors are announced as alerts
/// (live region), matching the prototype's `role="alert"`.
class RecNote extends StatelessWidget {
  const RecNote({super.key, required this.kind, required this.icon, required this.child});

  final RecNoteKind kind;
  final IconData icon;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final (Color bg, Color fg) = switch (kind) {
      RecNoteKind.info => (p.cyanSoft, p.cyanText),
      RecNoteKind.warn => (p.amberSoft, p.amberText),
      RecNoteKind.ok => (p.greenSoft, p.greenText),
      RecNoteKind.err => (p.redSoft, p.redText),
    };
    return Semantics(
      liveRegion: kind == RecNoteKind.err,
      container: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s3),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(KmTokens.radius),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.only(top: 1),
              child: ExcludeSemantics(child: Icon(icon, size: 20, color: fg)),
            ),
            const SizedBox(width: KmTokens.s3),
            Expanded(
              child: DefaultTextStyle.merge(
                style: KmText.small(context).copyWith(color: p.fg),
                child: child,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// `.meter`: a 10px track with a filled share. [semanticLabel] describes
/// the value in words (`role="img"` / progressbar in the prototype).
class RecMeter extends StatelessWidget {
  const RecMeter({super.key, required this.fraction, required this.semanticLabel});

  final double fraction;
  final String semanticLabel;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      label: semanticLabel,
      excludeSemantics: true,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(KmTokens.radiusPill),
        child: SizedBox(
          height: 10,
          child: ColoredBox(
            color: p.muted,
            child: Align(
              alignment: Alignment.centerLeft,
              child: FractionallySizedBox(
                widthFactor: fraction.clamp(0.0, 1.0),
                heightFactor: 1,
                child: ColoredBox(color: p.emberBtn),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The four status chips of a recording (`recChips`).
class RecordingChips extends StatelessWidget {
  const RecordingChips(this.recording, {super.key});

  final Recording recording;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: <Widget>[
        const KmChip('Transcript', tone: KmChipTone.cyan, icon: LucideIcons.captions),
        if (recording.summarySent)
          const KmChip('Summary sent', tone: KmChipTone.green, icon: LucideIcons.check)
        else
          const KmChip('Summary held', tone: KmChipTone.amber, icon: LucideIcons.clock),
        if (recording.isByo)
          const KmChip('Your bucket', icon: LucideIcons.database)
        else
          const KmChip('KnowMe-managed', icon: LucideIcons.cloud),
        const KmChip('IPFS pinned', icon: LucideIcons.globe),
      ],
    );
  }
}

/// Delivery status chip with a pip (`statusChip`); always text, never
/// colour alone.
class DeliveryStatusChip extends StatelessWidget {
  const DeliveryStatusChip(this.status, {super.key});

  final DeliveryStatus status;

  @override
  Widget build(BuildContext context) => switch (status) {
    DeliveryStatus.delivered => const KmChip('Delivered', tone: KmChipTone.green, pip: true),
    DeliveryStatus.opened => const KmChip('Opened', tone: KmChipTone.cyan, pip: true),
    DeliveryStatus.bounced => const KmChip('Bounced', tone: KmChipTone.red, pip: true),
    DeliveryStatus.heldForReview =>
      const KmChip('Held for review', tone: KmChipTone.amber, pip: true),
  };
}

/// An icon followed by text, small and muted (`.meta-line > span`).
class RecIconText extends StatelessWidget {
  const RecIconText(this.icon, this.text, {super.key});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        ExcludeSemantics(child: Icon(icon, size: 16, color: p.fgSub)),
        const SizedBox(width: 6),
        Text(text, style: KmText.smallSub(context)),
      ],
    );
  }
}

/// Opens a short message for actions that need a backend this phase does
/// not have (download, share, resend, delete, playback).
void showRecordingsUnavailable(BuildContext context, String what) {
  ScaffoldMessenger.maybeOf(context)?.showSnackBar(
    SnackBar(content: Text('$what is not available in this preview build.')),
  );
}
