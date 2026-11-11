// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';

/// `.feat`: one bento card of "What happens in a KnowMe meeting": an icon
/// tile or eyebrow, an h3 (announced as a heading), copy, optional extra
/// content and a footer of chips and links.
class FeatureCard extends StatelessWidget {
  const FeatureCard({
    super.key,
    required this.title,
    required this.body,
    this.icon,
    this.eyebrow,
    this.extra,
    this.footer = const <Widget>[],
    this.after,
  });

  final String title;
  final String body;
  final IconData? icon;
  final String? eyebrow;
  final Widget? extra;
  final List<Widget> footer;

  /// Content after the footer (the invite card's channel list).
  final Widget? after;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Padding(
      padding: const EdgeInsets.only(bottom: KmTokens.s3),
      child: KmCard(
        panel: true,
        padding: const EdgeInsets.all(KmTokens.s5),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            if (icon != null) ...<Widget>[
              Align(
                alignment: Alignment.centerLeft,
                child: KmLeadIcon(icon!, background: p.muted),
              ),
              const SizedBox(height: KmTokens.s4),
            ],
            if (eyebrow != null) ...<Widget>[
              KmEyebrow(eyebrow!),
              const SizedBox(height: KmTokens.s3),
            ],
            Semantics(
              header: true,
              child: Text(
                title,
                style: KmText.displayAt(
                  context,
                  size: eyebrow != null ? KmTokens.text22 : KmTokens.textLg,
                ),
              ),
            ),
            const SizedBox(height: KmTokens.s3),
            Text(body, style: KmText.sub(context).copyWith(fontSize: KmTokens.text15)),
            if (extra != null) ...<Widget>[
              const SizedBox(height: KmTokens.s3),
              extra!,
            ],
            if (footer.isNotEmpty) ...<Widget>[
              const SizedBox(height: KmTokens.s3),
              Wrap(
                spacing: KmTokens.s2,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: footer,
              ),
            ],
            if (after != null) ...<Widget>[
              const SizedBox(height: KmTokens.s3),
              after!,
            ],
          ],
        ),
      ),
    );
  }
}

/// The "Sign-in" lock chip on feature footers.
class SignInChip extends StatelessWidget {
  const SignInChip({super.key, this.label = 'Sign-in'});

  final String label;

  @override
  Widget build(BuildContext context) =>
      KmChip(label, icon: LucideIcons.lock);
}

/// A row with a leading coloured icon in a card fill (delivery list,
/// invite channels).
class IconLine extends StatelessWidget {
  const IconLine({super.key, required this.icon, required this.label, this.tile = false});

  final IconData icon;
  final String label;

  /// `.channels li`: a padded card-fill row with ember icon.
  final bool tile;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final Widget row = Row(
      children: <Widget>[
        Icon(icon, size: tile ? 20 : 16, color: tile ? p.emberText : p.fgSub),
        const SizedBox(width: KmTokens.s3),
        Expanded(
          child: Text(
            label,
            style: tile
                ? KmText.label(context)
                : KmText.small(context),
          ),
        ),
      ],
    );
    if (!tile) {
      return Padding(padding: const EdgeInsets.only(bottom: KmTokens.s2), child: row);
    }
    return Container(
      margin: const EdgeInsets.only(bottom: KmTokens.s2),
      padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: 14),
      decoration: BoxDecoration(
        color: p.card,
        borderRadius: BorderRadius.circular(KmTokens.radius),
      ),
      child: row,
    );
  }
}
