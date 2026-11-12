// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import 'km_palette_of.dart';

/// `.card` (surface, 16px radius) or `.panel` (20px radius); [raised] is
/// `.card-raised`. Flat 2.0: separated by fill, never by a border.
class KmCard extends StatelessWidget {
  const KmCard({
    super.key,
    required this.child,
    this.raised = false,
    this.panel = false,
    this.padding,
    this.color,
  });

  final Widget child;
  final bool raised;
  final bool panel;
  final EdgeInsetsGeometry? padding;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final bool phone = MediaQuery.sizeOf(context).width <= KmTokens.bp767;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: color ?? (raised ? p.card : p.surface),
        borderRadius: BorderRadius.circular(
          panel ? KmTokens.radiusLg : KmTokens.radiusTile,
        ),
        boxShadow: p.shadowCard,
      ),
      child: Padding(
        padding: padding ?? EdgeInsets.all(phone ? KmTokens.s4 : KmTokens.s5),
        child: child,
      ),
    );
  }
}

/// Chip tones (km.css `.chip-*`).
enum KmChipTone { neutral, ember, cyan, green, amber, red }

/// `.chip`: status or tag pill. [pip] adds the coloured dot; status chips
/// always carry text, so colour is never the only signal.
class KmChip extends StatelessWidget {
  const KmChip(
    this.label, {
    super.key,
    this.tone = KmChipTone.neutral,
    this.icon,
    this.pip = false,
  });

  final String label;
  final KmChipTone tone;
  final IconData? icon;
  final bool pip;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final (Color bg, Color fg, Color dot) = switch (tone) {
      KmChipTone.neutral => (p.muted, p.fg, p.fg),
      KmChipTone.ember => (
        p.emberSoft,
        p.readable(p.emberText, <Color>[p.emberSoft]),
        p.emberText,
      ),
      KmChipTone.cyan => (
        p.cyanSoft,
        p.readable(p.cyanText, <Color>[p.cyanSoft]),
        p.cyanText,
      ),
      // Status pips use the pip-* roles (light: darker text hues, so they
      // pass on their soft chip).
      KmChipTone.green => (p.greenSoft, p.fg, p.pipGreen),
      KmChipTone.amber => (p.amberSoft, p.fg, p.pipAmber),
      KmChipTone.red => (p.redSoft, p.fg, p.pipRed),
    };
    return Container(
      constraints: const BoxConstraints(minHeight: 28),
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(KmTokens.radiusPill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          if (pip) ...<Widget>[
            Container(
              width: KmTokens.sizePip,
              height: KmTokens.sizePip,
              decoration: BoxDecoration(color: dot, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
          ],
          if (icon != null) ...<Widget>[
            Icon(icon, size: 14, color: fg),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            maxLines: 1,
            style: Theme.of(context).textTheme.labelMedium!.copyWith(color: fg),
          ),
        ],
      ),
    );
  }
}

/// `.lock-badge`
class KmLockBadge extends StatelessWidget {
  const KmLockBadge(this.label, {super.key, required this.icon});

  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Container(
      constraints: const BoxConstraints(minHeight: 24),
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        color: p.muted,
        borderRadius: BorderRadius.circular(KmTokens.radiusPill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(icon, size: 13, color: p.fgSub),
          const SizedBox(width: 6),
          Text(
            label,
            style: Theme.of(context).textTheme.labelMedium!.copyWith(
              fontSize: KmTokens.text11,
              color: p.fgSub,
            ),
          ),
        ],
      ),
    );
  }
}

/// `.divider` / `Separator` under Flat 2.0 (D-6): spacing, never a line.
/// Kept as a widget so group separation stays one decision in the kit.
class KmRule extends StatelessWidget {
  const KmRule({super.key, this.vertical = KmTokens.s4});

  /// Space above and below the (invisible) rule.
  final double vertical;

  @override
  Widget build(BuildContext context) => SizedBox(height: vertical * 2);
}
