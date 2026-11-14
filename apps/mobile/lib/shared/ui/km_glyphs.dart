// TJ-ARCH-MOB-001 compliant
import 'package:flutter/widgets.dart';

/// Prototype outline icons (docs/design/prototype/assets/km.js `ICONS`) that
/// the shared navigation spec names: the same five glyphs on web and
/// Flutter (DESIGN.md, Destinations). 24 viewBox, 1.75 stroke, round caps
/// and joins, as km.css `.ic`. Glyph strokes are icon drawing, not the
/// borders Flat 2.0 removes.
enum KmGlyph {
  home(<String>['M3.5 11L12 4l8.5 7M6 9.5V20h12V9.5M10 20v-5h4v5']),
  calendar(<String>['M3.5 10h17M8 3v4M16 3v4'], rects: <KmGlyphRect>[KmGlyphRect(3.5, 5, 17, 15.5, 2)]),
  film(
    <String>['M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4'],
    rects: <KmGlyphRect>[KmGlyphRect(3, 4, 18, 16, 2)],
  ),
  agentAdd(
    <String>['M9 4v3M7 12h.01M11 12h.01M19 8v6M16 11h6'],
    rects: <KmGlyphRect>[KmGlyphRect(3, 7, 12, 11, 3)],
  ),
  settings(
    <String>[
      'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 '
          '1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3'
          'l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 '
          '0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 '
          '1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 '
          '0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 '
          '1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    ],
    circles: <(double, double, double)>[(12, 12, 3)],
  );

  const KmGlyph(this.paths, {this.rects = const <KmGlyphRect>[], this.circles = const <(double, double, double)>[]});

  final List<String> paths;
  final List<KmGlyphRect> rects;
  final List<(double, double, double)> circles;
}

/// A rounded rect element of a glyph (`<rect x y width height rx>`).
final class KmGlyphRect {
  const KmGlyphRect(this.x, this.y, this.w, this.h, this.r);

  final double x;
  final double y;
  final double w;
  final double h;
  final double r;
}

/// Paints a [KmGlyph] at [size] in [color] (default: the ambient
/// [IconTheme] colour). Decorative: the adjacent label names it.
class KmGlyphIcon extends StatelessWidget {
  const KmGlyphIcon(this.glyph, {super.key, this.size = 24, this.color});

  final KmGlyph glyph;
  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final Color? c = color ?? IconTheme.of(context).color ?? DefaultTextStyle.of(context).style.color;
    if (c == null) return SizedBox.square(dimension: size);
    return ExcludeSemantics(
      child: SizedBox.square(
        dimension: size,
        child: CustomPaint(painter: _GlyphPainter(glyph, c)),
      ),
    );
  }
}

class _GlyphPainter extends CustomPainter {
  _GlyphPainter(this.glyph, this.color);

  final KmGlyph glyph;
  final Color color;

  static final Map<KmGlyph, Path> _cache = <KmGlyph, Path>{};

  Path _build() {
    final Path path = Path();
    for (final String d in glyph.paths) {
      path.addPath(kmParseSvgPath(d), Offset.zero);
    }
    for (final KmGlyphRect r in glyph.rects) {
      path.addRRect(RRect.fromRectAndRadius(
        Rect.fromLTWH(r.x, r.y, r.w, r.h),
        Radius.circular(r.r),
      ));
    }
    for (final (double cx, double cy, double rad) in glyph.circles) {
      path.addOval(Rect.fromCircle(center: Offset(cx, cy), radius: rad));
    }
    return path;
  }

  @override
  void paint(Canvas canvas, Size size) {
    final Path path = _cache.putIfAbsent(glyph, _build);
    canvas.save();
    canvas.scale(size.width / 24, size.height / 24);
    canvas.drawPath(
      path,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.75
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_GlyphPainter old) => old.glyph != glyph || old.color != color;
}

final RegExp _token = RegExp(r'[MmLlHhVvCcAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?');

/// Parses the SVG path subset the prototype icons use (M L H V C A Z, in
/// absolute and relative forms, with implicit command repetition).
Path kmParseSvgPath(String d) {
  final List<String> t = _token.allMatches(d).map((Match m) => m.group(0)!).toList();
  final Path path = Path();
  double x = 0, y = 0, sx = 0, sy = 0;
  String cmd = 'M';
  int i = 0;
  bool isCmd(String s) => RegExp(r'^[A-Za-z]$').hasMatch(s);
  double n() => double.parse(t[i++]);
  while (i < t.length) {
    if (isCmd(t[i])) cmd = t[i++];
    final bool rel = cmd == cmd.toLowerCase();
    final double ox = rel ? x : 0, oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case 'M':
        x = ox + n();
        y = oy + n();
        sx = x;
        sy = y;
        path.moveTo(x, y);
        cmd = rel ? 'l' : 'L';
      case 'L':
        x = ox + n();
        y = oy + n();
        path.lineTo(x, y);
      case 'H':
        x = ox + n();
        path.lineTo(x, y);
      case 'V':
        y = oy + n();
        path.lineTo(x, y);
      case 'C':
        final double x1 = ox + n(), y1 = oy + n(), x2 = ox + n(), y2 = oy + n();
        x = ox + n();
        y = oy + n();
        path.cubicTo(x1, y1, x2, y2, x, y);
      case 'A':
        final double rx = n(), ry = n(), rot = n();
        final bool large = n() != 0, sweep = n() != 0;
        x = ox + n();
        y = oy + n();
        path.arcToPoint(
          Offset(x, y),
          radius: Radius.elliptical(rx, ry),
          rotation: rot,
          largeArc: large,
          clockwise: sweep,
        );
      case 'Z':
        path.close();
        x = sx;
        y = sy;
      default:
        throw FormatException('Unsupported SVG path command', cmd);
    }
  }
  return path;
}
