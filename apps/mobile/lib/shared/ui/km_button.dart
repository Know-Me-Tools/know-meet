// TJ-ARCH-MOB-001 compliant
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shadcn_flutter/shadcn_flutter.dart' as shad;

import 'km_palette_of.dart';
import 'km_states.dart';

/// DESIGN.md (Safe areas and targets): 36px `sm` buttons only where the
/// pointer is fine. Flutter has no `pointer` media query, so the desktop
/// targets stand in for it; touch platforms always get the 44px target.
bool kmFinePointer() => switch (defaultTargetPlatform) {
  TargetPlatform.macOS || TargetPlatform.windows || TargetPlatform.linux => true,
  _ => false,
};

/// Prototype button variants (km.css `.btn`, `.btn-primary`, `.btn-ghost`,
/// `.btn-danger`).
enum KmButtonVariant { primary, secondary, ghost, danger }

/// `.btn` (44px) or `.btn-sm` (36px with a fine pointer, else 44px).
enum KmButtonSize { normal, small }

/// A shadcn_flutter [shad.Button] styled from the Know Meet palette.
///
/// [label] is required and becomes the accessible name, so no button can
/// ship without one. When [showLabel] is false the button is icon-only
/// (prototype `.btn-start` at phone width) and the label is announced only.
class KmButton extends StatelessWidget {
  const KmButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = KmButtonVariant.secondary,
    this.size = KmButtonSize.normal,
    this.icon,
    this.trailingIcon,
    this.block = false,
    this.showLabel = true,
    this.focusNode,
  });

  final String label;
  final VoidCallback? onPressed;
  final KmButtonVariant variant;
  final KmButtonSize size;
  final IconData? icon;
  final IconData? trailingIcon;

  /// `.btn-block`: fills the available width.
  final bool block;
  final bool showLabel;
  final FocusNode? focusNode;

  @override
  Widget build(BuildContext context) {
    final bool small = size == KmButtonSize.small;
    final double minHeight =
        small && kmFinePointer() ? KmTokens.sizeControlHSm : KmTokens.sizeTarget;
    final double iconSize = small ? 16 : 20;
    final Widget button = shad.Button(
      // shadcn animates a padding change over a fixed 150ms that ignores the
      // platform's reduced-motion setting. Under reduced motion a different
      // padding shape (icon-only vs labelled, size) remounts the button
      // instead, so the change is instant.
      key: context.kmReduceMotion
          ? ValueKey<String>(
              'km-button-$showLabel-${size.name}-${icon != null}',
            )
          : null,
      style: KmButtonStyle(variant: variant, size: size, iconOnly: !showLabel),
      onPressed: onPressed,
      focusNode: focusNode,
      // D-6: focus is the `focus` fill (decoration below), never a ring.
      disableFocusOutline: true,
      alignment: Alignment.center,
      leading: icon == null ? null : Icon(icon, size: iconSize),
      trailing: trailingIcon == null
          ? null
          : Icon(trailingIcon, size: iconSize),
      child: showLabel
          ? Text(label, maxLines: 1, overflow: TextOverflow.ellipsis)
          : const SizedBox.shrink(),
    );
    return Semantics(
      container: true,
      button: true,
      enabled: onPressed != null,
      label: label,
      onTap: onPressed,
      child: ExcludeSemantics(
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minHeight: minHeight,
            minWidth: showLabel ? 0 : minHeight,
          ),
          child: block ? SizedBox(width: double.infinity, child: button) : button,
        ),
      ),
    );
  }
}

/// [shad.AbstractButtonStyle] for [KmButton]: every value from [KmPalette]
/// and [KmTokens].
class KmButtonStyle implements shad.AbstractButtonStyle {
  const KmButtonStyle({
    required this.variant,
    this.size = KmButtonSize.normal,
    this.iconOnly = false,
  });

  final KmButtonVariant variant;
  final KmButtonSize size;
  final bool iconOnly;

  bool get _small => size == KmButtonSize.small;

  @override
  shad.ButtonStateProperty<Decoration> get decoration =>
      (BuildContext context, Set<WidgetState> states) {
        final KmStateColors c = _colors(context.km, states);
        final bool disabled = states.contains(WidgetState.disabled);
        return BoxDecoration(
          color: disabled ? c.fill.withValues(alpha: c.fill.a * 0.5) : c.fill,
          borderRadius: BorderRadius.circular(_small ? KmTokens.radius10 : KmTokens.radius),
        );
      };

  @override
  shad.ButtonStateProperty<MouseCursor> get mouseCursor =>
      (BuildContext context, Set<WidgetState> states) =>
          states.contains(WidgetState.disabled)
          ? SystemMouseCursors.forbidden
          : SystemMouseCursors.click;

  @override
  shad.ButtonStateProperty<EdgeInsetsGeometry> get padding =>
      (BuildContext context, Set<WidgetState> states) => iconOnly
      ? EdgeInsets.all(_small ? 8 : 12)
      : EdgeInsets.symmetric(
          horizontal: _small ? KmTokens.s3 : KmTokens.s4,
          vertical: _small ? 8 : 12,
        );

  @override
  shad.ButtonStateProperty<TextStyle> get textStyle =>
      (BuildContext context, Set<WidgetState> states) =>
          Theme.of(context).textTheme.labelLarge!.copyWith(
            color: _foreground(context, states),
            fontSize: _small ? KmTokens.textSm : KmTokens.text15,
          );

  @override
  shad.ButtonStateProperty<IconThemeData> get iconTheme =>
      (BuildContext context, Set<WidgetState> states) => IconThemeData(
        color: _foreground(context, states),
        size: _small ? 16 : 20,
      );

  @override
  shad.ButtonStateProperty<EdgeInsetsGeometry> get margin =>
      (BuildContext context, Set<WidgetState> states) => EdgeInsets.zero;

  /// DESIGN.md state table rows for the four button variants; focus wins.
  KmStateColors _colors(KmPalette p, Set<WidgetState> states) => switch (variant) {
    KmButtonVariant.primary => KmStateColors.resolve(p, states,
        rest: p.emberBtn, restOn: p.onEmber, hover: p.emberBtnHov),
    KmButtonVariant.secondary => KmStateColors.resolve(p, states,
        rest: p.card, restOn: p.fg, hover: p.cardHov),
    KmButtonVariant.ghost => KmStateColors.resolve(p, states,
        rest: Colors.transparent, restOn: p.fg, hover: p.cardHov),
    KmButtonVariant.danger => KmStateColors.resolve(p, states,
        rest: p.dangerBtn, restOn: p.onDanger, hover: p.dangerBtnHov),
  };

  Color _foreground(BuildContext context, Set<WidgetState> states) {
    final Color c = _colors(context.km, states).on;
    return states.contains(WidgetState.disabled) ? c.withValues(alpha: 0.5) : c;
  }
}

/// `.icon-btn`: 44px square, transparent. [selected] (`aria-pressed`) is the
/// `selected` fill; [expanded] (`aria-expanded`) is `card-hov`; keyboard
/// focus is the `focus` fill with an `on-focus` icon.
class KmIconButton extends StatelessWidget {
  const KmIconButton({
    super.key,
    required this.icon,
    required this.label,
    required this.onPressed,
    this.selected,
    this.expanded,
    this.size = 44,
    this.focusNode,
    this.color,
  });

  final IconData icon;

  /// Accessible name (`aria-label`).
  final String label;
  final VoidCallback? onPressed;

  /// Toggle state, announced as selected/not selected when non-null.
  final bool? selected;

  /// Disclosure state, announced as expanded/collapsed when non-null.
  final bool? expanded;
  final double size;
  final FocusNode? focusNode;

  /// Resting icon colour. Defaults to the ambient [IconTheme] colour, so an
  /// icon button inside a field or fill pairs with that fill's `on-*` role.
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final Color rest = color ?? IconTheme.of(context).color ?? context.km.fg;
    return Semantics(
      container: true,
      button: true,
      enabled: onPressed != null,
      toggled: selected,
      expanded: expanded,
      label: label,
      onTap: onPressed,
      child: ExcludeSemantics(
        child: SizedBox.square(
          dimension: size,
          child: shad.Button(
            style: _IconButtonStyle(
              pressed: selected ?? false,
              expanded: expanded ?? false,
              color: rest,
            ),
            onPressed: onPressed,
            focusNode: focusNode,
            disableFocusOutline: true,
            alignment: Alignment.center,
            child: Icon(icon, size: 20),
          ),
        ),
      ),
    );
  }
}

class _IconButtonStyle implements shad.AbstractButtonStyle {
  const _IconButtonStyle({required this.pressed, required this.expanded, required this.color});

  final bool pressed;
  final bool expanded;

  /// Resting icon colour.
  final Color color;

  KmStateColors _colors(BuildContext context, Set<WidgetState> states) {
    final KmPalette p = context.km;
    return KmStateColors.resolve(
      p,
      <WidgetState>{...states, if (pressed) WidgetState.selected},
      rest: expanded ? p.cardHov : Colors.transparent,
      restOn: color,
      hover: p.cardHov,
      hoverOn: p.fg,
    );
  }

  @override
  shad.ButtonStateProperty<Decoration> get decoration =>
      (BuildContext context, Set<WidgetState> states) => BoxDecoration(
        color: _colors(context, states).fill,
        borderRadius: BorderRadius.circular(KmTokens.radius),
      );

  @override
  shad.ButtonStateProperty<MouseCursor> get mouseCursor =>
      (BuildContext context, Set<WidgetState> states) => SystemMouseCursors.click;

  @override
  shad.ButtonStateProperty<EdgeInsetsGeometry> get padding =>
      (BuildContext context, Set<WidgetState> states) => EdgeInsets.zero;

  @override
  shad.ButtonStateProperty<TextStyle> get textStyle =>
      (BuildContext context, Set<WidgetState> states) =>
          Theme.of(context).textTheme.labelLarge!;

  @override
  shad.ButtonStateProperty<IconThemeData> get iconTheme =>
      (BuildContext context, Set<WidgetState> states) =>
          IconThemeData(color: _colors(context, states).on, size: 20);

  @override
  shad.ButtonStateProperty<EdgeInsetsGeometry> get margin =>
      (BuildContext context, Set<WidgetState> states) => EdgeInsets.zero;
}
