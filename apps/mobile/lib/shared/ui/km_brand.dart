// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import 'km_palette_of.dart';
import 'km_text.dart';

/// The Know Meet mark, "Gathering" (km.js `KM_MARK`, viewBox 64): an ember
/// core with five participants around it, one of them a cyan agent.
/// Decorative: the brand link around it carries the accessible name.
class KmBrandMark extends StatelessWidget {
  const KmBrandMark({super.key, this.size = 28, this.color});

  final double size;

  /// Overrides the foreground participants (e.g. `on-focus` on a focus fill).
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return ExcludeSemantics(
      child: CustomPaint(
        size: Size.square(size),
        painter: _MarkPainter(ember: p.ember, cyan: p.cyan, fg: color ?? p.fg),
      ),
    );
  }
}

class _MarkPainter extends CustomPainter {
  const _MarkPainter({required this.ember, required this.cyan, required this.fg});

  final Color ember;
  final Color cyan;
  final Color fg;

  // (cx, cy, r, role) in the 64-unit viewBox; role 0 = fg, 1 = cyan, 2 = ember.
  static const List<(double, double, double, int)> _dots = <(double, double, double, int)>[
    (32, 32, 11, 2),
    (32.00, 11.00, 6, 0),
    (51.97, 25.51, 6, 1),
    (44.34, 48.99, 6, 0),
    (19.66, 48.99, 6, 0),
    (12.03, 25.51, 6, 0),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final double k = size.width / 64;
    for (final (double cx, double cy, double r, int role) in _dots) {
      final Paint paint = Paint()
        ..color = switch (role) {
          1 => cyan,
          2 => ember,
          _ => fg,
        };
      canvas.drawCircle(Offset(cx * k, cy * k), r * k, paint);
    }
  }

  @override
  bool shouldRepaint(_MarkPainter old) =>
      old.ember != ember || old.cyan != cyan || old.fg != fg;
}

/// `.brand-word`: "Know" in the foreground colour, "Meet" in ember text.
class KmBrandWord extends StatelessWidget {
  const KmBrandWord({super.key, this.size = 18, this.color});

  final double size;

  /// One colour for both words (e.g. `on-focus` on a focus fill, where the
  /// ember "Meet" would not meet 4.5:1).
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final TextStyle base = KmText.displayAt(
      context,
      size: size,
      weight: KmTokens.fontWeightBold,
      color: color,
    );
    return ExcludeSemantics(
      child: Text.rich(
        TextSpan(
          text: 'Know ',
          style: base,
          children: <InlineSpan>[
            TextSpan(text: 'Meet', style: base.copyWith(color: color ?? context.km.emberText)),
          ],
        ),
        maxLines: 1,
      ),
    );
  }
}
