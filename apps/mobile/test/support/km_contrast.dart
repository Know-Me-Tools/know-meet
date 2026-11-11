// TJ-ARCH-MOB-001 compliant
import 'dart:math' as math;

import 'package:flutter/material.dart';

/// WCAG 2.2 relative luminance of an opaque colour.
double kmLuminance(Color c) {
  double ch(double v) => v <= 0.04045 ? v / 12.92 : math.pow((v + 0.055) / 1.055, 2.4).toDouble();
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}

/// WCAG contrast ratio of [a] over [b]; a translucent [a] is composited on
/// [b] first.
double kmContrast(Color a, Color b) {
  final Color top = a.a < 1 ? Color.alphaBlend(a, b) : a;
  final double l1 = kmLuminance(top), l2 = kmLuminance(b);
  return (math.max(l1, l2) + 0.05) / (math.min(l1, l2) + 0.05);
}

/// The fill colour a widget paints through a [BoxDecoration], or null.
Color? kmDecorationFill(Widget w) {
  final Decoration? d = switch (w) {
    DecoratedBox(:final Decoration decoration) => decoration,
    Container(:final Decoration? decoration) => decoration,
    AnimatedContainer(:final Decoration? decoration) => decoration,
    _ => null,
  };
  return d is BoxDecoration ? d.color : null;
}

/// Whether [w] draws a stroke: a [BoxDecoration] border, a [Divider], or a
/// shape with a visible side. Flat 2.0 (D-6) allows none of these.
String? kmStrokeOf(Widget w) {
  bool visible(BorderSide s) => s.style != BorderStyle.none && s.width > 0 && s.color.a > 0;
  final Decoration? d = switch (w) {
    DecoratedBox(:final Decoration decoration) => decoration,
    Container(:final Decoration? decoration) => decoration,
    AnimatedContainer(:final Decoration? decoration) => decoration,
    _ => null,
  };
  if (d is BoxDecoration && d.border != null) {
    final BoxBorder b = d.border!;
    if (b is Border && <BorderSide>[b.top, b.right, b.bottom, b.left].any(visible)) {
      return '${w.runtimeType} border';
    }
  }
  if (d is ShapeDecoration && d.shape is OutlinedBorder && visible((d.shape as OutlinedBorder).side)) {
    return '${w.runtimeType} shape side';
  }
  if (w is Divider || w is VerticalDivider) return '${w.runtimeType}';
  if (w is Material && w.shape is OutlinedBorder && visible((w.shape! as OutlinedBorder).side)) {
    return 'Material shape side';
  }
  return null;
}
