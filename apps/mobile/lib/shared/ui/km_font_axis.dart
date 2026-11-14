// TJ-ARCH-MOB-001 compliant
import 'package:flutter/painting.dart';

import '../../theme/generated/tokens.g.dart';

/// Returns [style] with a `wght` variation equal to its weight when it uses
/// the display family (Space Grotesk, one variable file); other families are
/// returned unchanged. Flutter does not map `fontWeight` onto a variable
/// font's `wght` axis by itself.
TextStyle kmDisplayAxis(TextStyle style) {
  if (style.fontFamily != KmTokens.fontDisplay) return style;
  final FontWeight weight = style.fontWeight ?? FontWeight.w400;
  return style.copyWith(
    fontVariations: <FontVariation>[
      FontVariation('wght', weight.value.toDouble()),
    ],
  );
}
