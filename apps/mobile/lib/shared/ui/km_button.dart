// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:shadcn_flutter/shadcn_flutter.dart' as shad;

import 'km_palette_of.dart';

/// Prototype button variants (km.css `.btn`, `.btn-primary`, `.btn-ghost`,
/// `.btn-danger`).
enum KmButtonVariant { primary, secondary, ghost, danger }

/// `.btn` (44px) or `.btn-sm` (36px).
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
    final double minHeight = small ? 36 : 44;
    final double iconSize = small ? 16 : 20;
    final Widget button = shad.Button(
      style: KmButtonStyle(variant: variant, size: size, iconOnly: !showLabel),
      onPressed: onPressed,
      focusNode: focusNode,
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
        final KmPalette p = context.km;
        final bool hover = states.contains(WidgetState.hovered);
        final bool disabled = states.contains(WidgetState.disabled);
        final Color fill = switch (variant) {
          KmButtonVariant.primary => hover ? p.emberBtnHov : p.emberBtn,
          KmButtonVariant.secondary => hover ? p.cardHov : p.card,
          KmButtonVariant.ghost => hover ? p.cardHov : Colors.transparent,
          KmButtonVariant.danger => hover ? p.dangerBtnHov : p.dangerBtn,
        };
        return BoxDecoration(
          color: disabled ? fill.withValues(alpha: fill.a * 0.5) : fill,
          borderRadius: BorderRadius.circular(_small ? KmTokens.radius10 : KmTokens.radius),
          boxShadow: variant == KmButtonVariant.secondary ? p.shadowCard : null,
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

  Color _foreground(BuildContext context, Set<WidgetState> states) {
    final KmPalette p = context.km;
    final Color c = switch (variant) {
      KmButtonVariant.primary => p.onEmber,
      KmButtonVariant.danger => p.onDanger,
      KmButtonVariant.secondary || KmButtonVariant.ghost => p.fg,
    };
    return states.contains(WidgetState.disabled) ? c.withValues(alpha: 0.5) : c;
  }
}

/// `.icon-btn`: 44px square, transparent; [selected] mirrors
/// `aria-expanded="true"` / `aria-pressed="true"`.
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
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final bool active = (selected ?? false) || (expanded ?? false);
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
            style: _IconButtonStyle(active: active),
            onPressed: onPressed,
            focusNode: focusNode,
            alignment: Alignment.center,
            child: Icon(icon, size: 20, color: color ?? p.fg),
          ),
        ),
      ),
    );
  }
}

class _IconButtonStyle implements shad.AbstractButtonStyle {
  const _IconButtonStyle({required this.active});

  final bool active;

  @override
  shad.ButtonStateProperty<Decoration> get decoration =>
      (BuildContext context, Set<WidgetState> states) => BoxDecoration(
        color: active || states.contains(WidgetState.hovered)
            ? context.km.cardHov
            : Colors.transparent,
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
          IconThemeData(color: context.km.fg, size: 20);

  @override
  shad.ButtonStateProperty<EdgeInsetsGeometry> get margin =>
      (BuildContext context, Set<WidgetState> states) => EdgeInsets.zero;
}
