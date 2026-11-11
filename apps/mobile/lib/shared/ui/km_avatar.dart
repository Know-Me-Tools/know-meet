// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import 'km_palette_of.dart';
import 'km_text.dart';

/// Avatar tones (`.avatar`, `.avatar-ember`, `.avatar-cyan`).
enum KmAvatarTone { neutral, onSurface, ember, cyan }

/// `.avatar`: initials in a circle. Decorative by default: the person's name
/// is always in adjacent text, so the initials are excluded from semantics.
class KmAvatar extends StatelessWidget {
  const KmAvatar(
    this.initials, {
    super.key,
    this.size = 40,
    this.tone = KmAvatarTone.neutral,
  });

  final String initials;
  final double size;
  final KmAvatarTone tone;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final (Color bg, Color fg) = switch (tone) {
      KmAvatarTone.neutral => (p.card, p.fg),
      KmAvatarTone.onSurface => (p.muted, p.fg),
      KmAvatarTone.ember => (p.emberSoft, p.emberText),
      KmAvatarTone.cyan => (p.cyanSoft, p.cyanText),
    };
    final double font = size >= 64 ? 22 : (size <= 32 ? 12 : (size <= 36 ? 13 : 15));
    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
        child: Text(
          initials.toUpperCase(),
          style: KmText.displayAt(context, size: font, color: fg).copyWith(height: 1),
        ),
      ),
    );
  }
}

/// `.agent-glyph`: a registered agent's two-letter mark.
class KmAgentGlyph extends StatelessWidget {
  const KmAgentGlyph(
    this.letters, {
    super.key,
    this.size = 56,
    this.system = false,
  });

  final String letters;
  final double size;

  /// `.is-system` (the Concierge): ember instead of cyan.
  final bool system;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final bool small = size <= 40;
    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: system ? p.emberSoft : p.cyanSoft,
          borderRadius: BorderRadius.circular(small ? 10 : 20),
        ),
        child: Text(
          letters.toUpperCase(),
          style: TextStyle(
            fontFamily: KmTokens.fontMono,
            fontWeight: KmTokens.fontWeightSemibold,
            fontSize: small ? 13 : KmTokens.textGlyph(MediaQuery.sizeOf(context).width),
            color: system ? p.emberText : p.cyanText,
          ),
        ),
      ),
    );
  }
}
