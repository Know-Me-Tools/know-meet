// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import 'km_font_axis.dart';
import 'km_palette_of.dart';

/// Named text roles from the prototype (km.css section 3), resolved from the
/// theme's TextTheme so sizes and families stay token-driven.
abstract final class KmText {
  /// `.display`
  static TextStyle display(BuildContext c) => _t(c).displayLarge!;

  /// `h1`
  static TextStyle h1(BuildContext c) => _t(c).headlineLarge!;

  /// `h2`
  static TextStyle h2(BuildContext c) => _t(c).headlineMedium!;

  /// `h3`
  static TextStyle h3(BuildContext c) => _t(c).titleLarge!;

  /// Body copy.
  static TextStyle body(BuildContext c) => _t(c).bodyLarge!;

  /// `.small`
  static TextStyle small(BuildContext c) => _t(c).bodyMedium!;

  /// `.xsmall`
  static TextStyle xsmall(BuildContext c) => _t(c).bodySmall!;

  /// `.sub` at body size.
  static TextStyle sub(BuildContext c) =>
      _t(c).bodyLarge!.copyWith(color: c.km.fgSub);

  /// `.small.sub`
  static TextStyle smallSub(BuildContext c) =>
      _t(c).bodyMedium!.copyWith(color: c.km.fgSub);

  /// `.lede`
  static TextStyle lede(BuildContext c) => _t(c).bodyLarge!.copyWith(
    fontSize: KmTokens.textLg,
    color: c.km.fgSub,
  );

  /// Field labels and strong small text (`.field label`).
  static TextStyle label(BuildContext c) => _t(c).bodyMedium!.copyWith(
    fontWeight: KmTokens.fontWeightSemibold,
  );

  /// `.mono`
  static TextStyle mono(BuildContext c) => _t(c).bodyMedium!.copyWith(
    fontFamily: KmTokens.fontMono,
    fontSize: KmTokens.text13,
    fontWeight: KmTokens.fontWeightMedium,
  );

  /// A display-family style at an explicit size and weight (stat numerals,
  /// brand word, card titles).
  static TextStyle displayAt(
    BuildContext c, {
    required double size,
    FontWeight weight = KmTokens.fontWeightSemibold,
    Color? color,
  }) => kmDisplayAxis(
    _t(c).titleLarge!.copyWith(
      fontSize: size,
      fontWeight: weight,
      color: color ?? c.km.fg,
      letterSpacing: KmTokens.trackingHeadingEm * size,
    ),
  );

  static TextTheme _t(BuildContext c) => Theme.of(c).textTheme;
}

/// `.eyebrow`: mono, uppercase, ember text.
class KmEyebrow extends StatelessWidget {
  const KmEyebrow(this.text, {super.key, this.muted = false});

  final String text;

  /// `.eyebrow-sub`
  final bool muted;

  @override
  Widget build(BuildContext context) {
    final TextStyle base = Theme.of(context).textTheme.labelSmall!;
    return Text(
      text.toUpperCase(),
      style: muted ? base.copyWith(color: context.km.fgSub) : base,
    );
  }
}
