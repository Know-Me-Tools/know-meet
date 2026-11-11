// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import 'km_motion.dart';
import 'km_palette_of.dart';

/// Builds a control from its current interaction states.
typedef KmStateBuilder = Widget Function(BuildContext context, Set<WidgetState> states);

/// The kit's one interaction primitive (DESIGN.md, Flat 2.0 controls).
///
/// Tracks keyboard focus (`:focus-visible`: only while the focus highlight is
/// shown, never after a tap), pointer hover and press, and hands the state
/// set to [builder] so the control can swap its *fill*. Nothing here paints a
/// ring, outline or ink splash: the fill change is the feedback.
///
/// Enter and Space activate through the app's default shortcuts
/// ([ActivateIntent]). Semantics are the caller's: wrap this in the
/// `Semantics(button/link/selected …)` that names the control.
class KmInteractive extends StatefulWidget {
  const KmInteractive({
    super.key,
    required this.builder,
    this.onTap,
    this.focusNode,
    this.autofocus = false,
    this.selected = false,
    this.invalid = false,
    this.onFocusChange,
    this.mouseCursor,
  });

  final KmStateBuilder builder;

  /// Null disables the control (adds [WidgetState.disabled], no focus).
  final VoidCallback? onTap;
  final FocusNode? focusNode;
  final bool autofocus;

  /// Adds [WidgetState.selected] (checked, pressed, current).
  final bool selected;

  /// Adds [WidgetState.error].
  final bool invalid;
  final ValueChanged<bool>? onFocusChange;
  final MouseCursor? mouseCursor;

  @override
  State<KmInteractive> createState() => _KmInteractiveState();
}

class _KmInteractiveState extends State<KmInteractive> {
  bool _focused = false;
  bool _hovered = false;
  bool _pressed = false;

  bool get _enabled => widget.onTap != null;

  Set<WidgetState> get _states => <WidgetState>{
    if (!_enabled) WidgetState.disabled,
    if (_enabled && _focused) WidgetState.focused,
    if (_enabled && _hovered) WidgetState.hovered,
    if (_enabled && _pressed) WidgetState.pressed,
    if (widget.selected) WidgetState.selected,
    if (widget.invalid) WidgetState.error,
  };

  @override
  Widget build(BuildContext context) {
    return FocusableActionDetector(
      enabled: _enabled,
      focusNode: widget.focusNode,
      autofocus: widget.autofocus,
      mouseCursor: widget.mouseCursor ??
          (_enabled ? SystemMouseCursors.click : SystemMouseCursors.basic),
      onFocusChange: widget.onFocusChange,
      onShowFocusHighlight: (bool v) => setState(() => _focused = v),
      onShowHoverHighlight: (bool v) => setState(() => _hovered = v),
      actions: <Type, Action<Intent>>{
        ActivateIntent: CallbackAction<ActivateIntent>(
          onInvoke: (ActivateIntent _) {
            widget.onTap?.call();
            return null;
          },
        ),
      },
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.onTap,
        onTapDown: _enabled ? (_) => setState(() => _pressed = true) : null,
        onTapUp: _enabled ? (_) => setState(() => _pressed = false) : null,
        onTapCancel: _enabled ? () => setState(() => _pressed = false) : null,
        child: widget.builder(context, _states),
      ),
    );
  }
}

/// The fill-and-foreground pair for one state set, resolved in the DESIGN.md
/// order: **focus, then invalid, then selected, then hover, then rest.**
/// Disabled keeps the resting look (the caller dims it to 50%).
final class KmStateColors {
  const KmStateColors(this.fill, this.on);

  final Color fill;
  final Color on;

  /// [rest]/[restOn] and [hover] come from the component's row in the
  /// DESIGN.md state table; focus, selected and invalid are the shared roles.
  factory KmStateColors.resolve(
    KmPalette p,
    Set<WidgetState> s, {
    required Color rest,
    required Color restOn,
    Color? hover,
    Color? hoverOn,
    Color? selected,
    Color? selectedOn,
  }) {
    final bool enabled = !s.contains(WidgetState.disabled);
    if (enabled && s.contains(WidgetState.focused)) {
      return KmStateColors(p.focus, p.onFocus);
    }
    if (s.contains(WidgetState.error)) {
      return KmStateColors(p.controlInvalid, p.onControlInvalid);
    }
    if (s.contains(WidgetState.selected)) {
      return KmStateColors(selected ?? p.selected, selectedOn ?? p.onSelected);
    }
    if (enabled && s.contains(WidgetState.hovered) && hover != null) {
      return KmStateColors(hover, hoverOn ?? restOn);
    }
    return KmStateColors(rest, restOn);
  }

  /// A control whose boundary must be seen (`control` fill).
  factory KmStateColors.control(KmPalette p, Set<WidgetState> s) =>
      KmStateColors.resolve(
        p,
        s,
        rest: p.control,
        restOn: p.onControl,
        hover: p.controlHov,
      );

  /// A text-identified control on the surface ladder (nav item, tab, list
  /// row, ghost button): transparent at rest, `card-hov` on hover.
  factory KmStateColors.quiet(
    KmPalette p,
    Set<WidgetState> s, {
    Color rest = Colors.transparent,
    Color? restOn,
  }) =>
      KmStateColors.resolve(
        p,
        s,
        rest: rest,
        restOn: restOn ?? p.fgSub,
        hover: p.cardHov,
        hoverOn: p.fg,
      );
}

/// A rounded fill that follows [colors] with the `dur-fast` focus
/// transition (instant under reduced motion). Sets the icon and text colour
/// of its subtree to `colors.on` so content always pairs with its fill.
class KmFillBox extends StatelessWidget {
  const KmFillBox({
    super.key,
    required this.colors,
    required this.child,
    this.radius = KmTokens.radius,
    this.shape = BoxShape.rectangle,
    this.padding,
    this.constraints,
    this.alignment,
    this.width,
    this.height,
    this.disabled = false,
  });

  final KmStateColors colors;
  final Widget child;
  final double radius;
  final BoxShape shape;
  final EdgeInsetsGeometry? padding;
  final BoxConstraints? constraints;
  final AlignmentGeometry? alignment;
  final double? width;
  final double? height;

  /// DESIGN.md: disabled is opacity 0.5 on the resting look.
  final bool disabled;

  @override
  Widget build(BuildContext context) {
    final Widget box = AnimatedContainer(
      duration: KmMotion.of(context, KmTokens.durFast),
      curve: KmTokens.easeStandard,
      width: width,
      height: height,
      padding: padding,
      constraints: constraints,
      decoration: BoxDecoration(
        color: colors.fill,
        shape: shape,
        borderRadius: shape == BoxShape.circle ? null : BorderRadius.circular(radius),
      ),
      child: IconTheme.merge(
        data: IconThemeData(color: colors.on),
        child: DefaultTextStyle.merge(
          style: TextStyle(color: colors.on),
          // Align with factors of 1 centres without growing to the parent's
          // max width (a Wrap or Row must not stretch a pill).
          child: alignment == null
              ? child
              : Align(alignment: alignment!, widthFactor: 1, heightFactor: 1, child: child),
        ),
      ),
    );
    return disabled ? Opacity(opacity: 0.5, child: box) : box;
  }
}
