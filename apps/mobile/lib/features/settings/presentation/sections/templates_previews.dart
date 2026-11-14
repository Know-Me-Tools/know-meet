// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/sms_stats.dart';

/// `.email-card`: an email preview with its From / To / Subject header.
/// Announced as one named preview; its fake buttons are decorative.
class EmailPreview extends StatelessWidget {
  const EmailPreview({
    super.key,
    required this.semanticLabel,
    required this.from,
    required this.to,
    required this.subject,
    required this.body,
  });

  final String semanticLabel;
  final String from;
  final String to;
  final String subject;
  final List<Widget> body;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    Widget meta(String k, Widget v) => Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          SizedBox(width: 64, child: Text(k, style: KmText.smallSub(context))),
          const SizedBox(width: KmTokens.s2),
          Expanded(child: DefaultTextStyle.merge(style: KmText.small(context), child: v)),
        ],
      ),
    );
    return Semantics(
      container: true,
      label: semanticLabel,
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: p.card,
          borderRadius: BorderRadius.circular(KmTokens.radiusTile),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            ColoredBox(
              color: p.bg2,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s3),
                child: Column(
                  children: <Widget>[
                    meta('From', Text(from)),
                    meta('To', Text(to)),
                    meta(
                      'Subject',
                      Text(subject, style: const TextStyle(fontWeight: KmTokens.fontWeightSemibold)),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s5),
              child: DefaultTextStyle.merge(
                style: KmText.small(context),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    for (int i = 0; i < body.length; i++) ...<Widget>[
                      if (i > 0) const SizedBox(height: KmTokens.s3),
                      body[i],
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// `.email-body h4`: mono uppercase sub-heading.
class EmailSubhead extends StatelessWidget {
  const EmailSubhead(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text.toUpperCase(),
    style: TextStyle(
      fontFamily: KmTokens.fontMono,
      fontSize: KmTokens.text11,
      letterSpacing: KmTokens.trackingTableEm * KmTokens.text11,
      color: context.km.fgSub,
    ),
  );
}

/// A non-interactive button look inside a preview (`aria-hidden` in the
/// prototype): excluded from semantics so it is not mistaken for a control.
class PreviewButton extends StatelessWidget {
  const PreviewButton(this.label, {super.key, this.primary = false});

  final String label;
  final bool primary;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return ExcludeSemantics(
      child: Container(
        constraints: const BoxConstraints(minHeight: 36),
        padding: const EdgeInsets.symmetric(horizontal: KmTokens.s3, vertical: 8),
        decoration: BoxDecoration(
          color: primary ? p.emberBtn : p.card,
          borderRadius: BorderRadius.circular(KmTokens.radius10),
        ),
        child: Text(
          label,
          style: KmText.label(context).copyWith(color: primary ? p.onEmber : p.fg),
        ),
      ),
    );
  }
}

/// `.phone-frame`: an SMS bubble from [from].
class SmsPreview extends StatelessWidget {
  const SmsPreview({super.key, required this.from, required this.text});

  final String from;
  final String text;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      container: true,
      label: 'Text message preview from $from',
      child: Container(
        constraints: const BoxConstraints(maxWidth: 340),
        padding: const EdgeInsets.all(KmTokens.s4),
        decoration: BoxDecoration(
          color: p.bg2,
          borderRadius: BorderRadius.circular(KmTokens.radius28),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text(
              'Text message · from $from',
              textAlign: TextAlign.center,
              style: KmText.xsmall(context).copyWith(color: p.fgSub),
            ),
            const SizedBox(height: KmTokens.s2),
            FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: 0.88,
              child: Align(
                alignment: Alignment.centerLeft,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: p.muted,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(KmTokens.radius18),
                      topRight: Radius.circular(KmTokens.radius18),
                      bottomRight: Radius.circular(KmTokens.radius18),
                      bottomLeft: Radius.circular(KmTokens.radius6),
                    ),
                  ),
                  child: Text(
                    text,
                    style: KmText.small(context).copyWith(height: KmTokens.leading145),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// `.counter`: `101 / 160 characters` and the segment chip (red over 2).
class SmsCounter extends StatelessWidget {
  const SmsCounter(this.stats, {super.key});

  final SmsStats stats;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      label: '${stats.length} of ${stats.limit} characters, ${stats.segmentLabel}',
      excludeSemantics: true,
      child: Wrap(
        spacing: KmTokens.s2,
        runSpacing: KmTokens.s2,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: <Widget>[
          Text('${stats.length} / ${stats.limit}', style: KmText.mono(context)),
          Text('characters', style: KmText.smallSub(context)),
          KmChip(
            stats.segmentLabel,
            tone: stats.segments > 2 ? KmChipTone.red : KmChipTone.green,
            pip: true,
          ),
        ],
      ),
    );
  }
}
