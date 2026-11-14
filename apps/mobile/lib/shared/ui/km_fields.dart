// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import 'km_palette_of.dart';
import 'km_states.dart';
import 'km_text.dart';

/// Fill of a text control (DESIGN.md, Flat 2.0 state table): focus, then
/// invalid, then hover, then rest. A read-only value sits on `surface`.
/// No border, outline or underline in any state.
WidgetStateColor kmFieldFill(KmPalette p, {bool invalid = false, bool readOnly = false}) =>
    WidgetStateColor.resolveWith((Set<WidgetState> s) {
      if (s.contains(WidgetState.focused)) return p.focus;
      if (invalid) return p.controlInvalid;
      if (readOnly) return p.surface;
      if (s.contains(WidgetState.hovered)) return p.controlHov;
      return p.control;
    });

/// Value and icon colour that pairs with [kmFieldFill].
WidgetStateColor kmFieldOn(KmPalette p, {bool invalid = false, bool readOnly = false}) =>
    WidgetStateColor.resolveWith((Set<WidgetState> s) {
      if (s.contains(WidgetState.focused)) return p.onFocus;
      if (invalid) return p.onControlInvalid;
      if (readOnly) return p.fg;
      return p.onControl;
    });

/// Placeholder colour that pairs with [kmFieldFill] (>= 4.5:1 in every
/// state; close in tone to the value, so placeholders are "e.g." examples).
WidgetStateColor kmFieldPlaceholder(KmPalette p, {bool invalid = false, bool readOnly = false}) =>
    WidgetStateColor.resolveWith((Set<WidgetState> s) {
      if (s.contains(WidgetState.focused)) return p.focusPlaceholder;
      if (invalid) return p.onControlInvalid;
      if (readOnly) return p.fgSub;
      return p.controlPlaceholder;
    });

/// The value text style for a kit text field, resolved per state so the
/// typed text always follows the fill. Pass to `TextField.style`.
TextStyle kmFieldStyle(
  BuildContext context, {
  bool mono = false,
  bool invalid = false,
  bool readOnly = false,
  bool dense = false,
}) {
  final KmPalette p = context.km;
  final TextStyle base = mono
      ? KmText.mono(context)
      : (dense ? KmText.small(context) : KmText.body(context));
  final WidgetStateColor on = kmFieldOn(p, invalid: invalid, readOnly: readOnly);
  return WidgetStateTextStyle.resolveWith(
    (Set<WidgetState> s) => base.copyWith(color: on.resolve(s)),
  );
}

/// The [InputDecoration] every kit text control uses. Features that need a
/// bare `TextField` (search boxes, composers) pass this, never their own
/// borders or fills.
InputDecoration kmFieldDecoration(
  BuildContext context, {
  String? placeholder,
  Widget? prefixIcon,
  Widget? suffixIcon,
  bool mono = false,
  bool invalid = false,
  bool readOnly = false,
  bool dense = false,
}) {
  final KmPalette p = context.km;
  final TextStyle base = mono
      ? KmText.mono(context)
      : (dense ? KmText.small(context) : KmText.body(context));
  final WidgetStateColor hint = kmFieldPlaceholder(p, invalid: invalid, readOnly: readOnly);
  final WidgetStateColor on = kmFieldOn(p, invalid: invalid, readOnly: readOnly);
  final OutlineInputBorder none = OutlineInputBorder(
    borderRadius: BorderRadius.circular(KmTokens.radius),
    borderSide: BorderSide.none,
  );
  return InputDecoration(
    hintText: placeholder,
    hintStyle: WidgetStateTextStyle.resolveWith(
      (Set<WidgetState> s) => base.copyWith(color: hint.resolve(s)),
    ),
    filled: true,
    fillColor: kmFieldFill(p, invalid: invalid, readOnly: readOnly),
    hoverColor: Colors.transparent,
    focusColor: Colors.transparent,
    prefixIcon: prefixIcon,
    prefixIconColor: on,
    suffixIcon: suffixIcon,
    suffixIconColor: on,
    isDense: dense,
    contentPadding: EdgeInsets.symmetric(
      horizontal: KmTokens.sizeInputPadX,
      vertical: dense ? KmTokens.s2 : KmTokens.sizeInputPadY,
    ),
    border: none,
    enabledBorder: none,
    focusedBorder: none,
    errorBorder: none,
    focusedErrorBorder: none,
    disabledBorder: none,
    constraints: BoxConstraints(
      minHeight: dense ? KmTokens.sizeTarget : KmTokens.sizeControlH,
    ),
  );
}

/// `.field`: label, control, optional hint and error. The label is the text
/// field's accessible name; [required] adds the ember asterisk the
/// prototype shows and announces "required". An [error] turns the fill to
/// `control-invalid` and adds the error line (icon + text): state is never
/// colour alone.
class KmTextField extends StatelessWidget {
  const KmTextField({
    super.key,
    required this.label,
    this.hint,
    this.placeholder,
    this.initialValue,
    this.error,
    this.required = false,
    this.obscure = false,
    this.readOnly = false,
    this.mono = false,
    this.keyboardType,
    this.trailing,
    this.labelTrailing,
    this.maxLines = 1,
    this.focusNode,
  });

  final String label;
  final String? hint;
  final String? placeholder;
  final String? initialValue;

  /// Shown under the field with an alert icon; marks the field invalid.
  final String? error;
  final bool required;
  final bool obscure;
  final bool readOnly;
  final bool mono;
  final TextInputType? keyboardType;

  /// Inside the input's end (reveal-password button, copy button). Its
  /// icon colour follows the field's fill.
  final Widget? trailing;

  /// Right of the label (e.g. "Forgot password?").
  final Widget? labelTrailing;
  final int maxLines;
  final FocusNode? focusNode;

  @override
  Widget build(BuildContext context) {
    final bool invalid = error != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(child: KmFieldLabel(label, required: required)),
            ?labelTrailing,
          ],
        ),
        const SizedBox(height: 6),
        Semantics(
          label: required ? '$label, required' : label,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: maxLines > 1 ? KmTokens.sizeTextareaMinH : 0,
            ),
            child: TextFormField(
              initialValue: initialValue,
              obscureText: obscure,
              readOnly: readOnly,
              keyboardType: keyboardType,
              focusNode: focusNode,
              maxLines: obscure ? 1 : maxLines,
              minLines: maxLines > 1 ? maxLines : null,
              style: kmFieldStyle(context, mono: mono, invalid: invalid, readOnly: readOnly),
              decoration: kmFieldDecoration(
                context,
                placeholder: placeholder,
                suffixIcon: trailing,
                mono: mono,
                invalid: invalid,
                readOnly: readOnly,
              ),
            ),
          ),
        ),
        if (hint != null) ...<Widget>[
          const SizedBox(height: 6),
          Text(hint!, style: KmText.smallSub(context)),
        ],
        if (error != null) ...<Widget>[
          const SizedBox(height: 6),
          KmFieldError(error!),
        ],
      ],
    );
  }
}

/// A field label: semibold small, ember asterisk when required, muted
/// "(optional)" when optional. Excluded from semantics; the control carries
/// the name.
class KmFieldLabel extends StatelessWidget {
  const KmFieldLabel(this.text, {super.key, this.required = false, this.optional = false});

  final String text;
  final bool required;
  final bool optional;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return ExcludeSemantics(
      child: Text.rich(
        TextSpan(
          text: text,
          style: KmText.label(context),
          children: <InlineSpan>[
            if (required) TextSpan(text: ' *', style: TextStyle(color: p.emberText)),
            if (optional)
              TextSpan(
                text: ' (optional)',
                style: TextStyle(color: p.fgSub, fontWeight: KmTokens.fontWeightRegular),
              ),
          ],
        ),
      ),
    );
  }
}

/// The error line under an invalid field: alert icon plus text, announced
/// as a live region.
class KmFieldError extends StatelessWidget {
  const KmFieldError(this.message, {super.key});

  final String message;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      liveRegion: true,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(Icons.error_outline, size: 18, color: p.redText),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              message,
              style: KmText.small(context).copyWith(fontWeight: KmTokens.fontWeightMedium),
            ),
          ),
        ],
      ),
    );
  }
}

/// `select.input` on the `control` fill: a button that opens a menu of
/// [options]. Focus is the `focus` fill; the chevron and value follow it.
/// The accessible name is [label] plus the current value.
class KmSelect<T> extends StatelessWidget {
  const KmSelect({
    super.key,
    required this.label,
    required this.value,
    required this.options,
    required this.onChanged,
    this.dense = false,
  });

  final String label;
  final T value;
  final List<(T, String)> options;
  final ValueChanged<T>? onChanged;

  /// `.ctrl-row select.input`: small text (target stays >= 44px).
  final bool dense;

  String get _current {
    for (final (T v, String l) in options) {
      if (v == value) return l;
    }
    return '';
  }

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final TextStyle text = dense ? KmText.small(context) : KmText.body(context);
    return MenuAnchor(
      style: MenuStyle(
        backgroundColor: WidgetStatePropertyAll<Color>(p.bg2),
        elevation: const WidgetStatePropertyAll<double>(0),
        shadowColor: const WidgetStatePropertyAll<Color>(Colors.transparent),
        side: const WidgetStatePropertyAll<BorderSide>(BorderSide.none),
        shape: WidgetStatePropertyAll<OutlinedBorder>(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(KmTokens.radius)),
        ),
      ),
      menuChildren: <Widget>[
        for (final (T v, String l) in options)
          KmMenuItem(
            label: l,
            selected: v == value,
            onTap: onChanged == null ? null : () => onChanged!(v),
          ),
      ],
      builder: (BuildContext context, MenuController menu, Widget? _) => Semantics(
        button: true,
        label: label,
        value: _current,
        excludeSemantics: true,
        onTap: onChanged == null ? null : () => menu.isOpen ? menu.close() : menu.open(),
        child: KmInteractive(
          onTap: onChanged == null ? null : () => menu.isOpen ? menu.close() : menu.open(),
          builder: (BuildContext context, Set<WidgetState> s) {
            final KmStateColors c = KmStateColors.control(p, s);
            return KmFillBox(
              colors: c,
              disabled: onChanged == null,
              constraints: BoxConstraints(
                minHeight: dense ? KmTokens.sizeTarget : KmTokens.sizeControlH,
              ),
              padding: const EdgeInsetsDirectional.only(
                start: KmTokens.sizeInputPadX,
                end: KmTokens.s3,
              ),
              // Fills a bounded parent; sizes to its value in an unbounded
              // one (a Row or Wrap that gives it no width).
              child: LayoutBuilder(
                builder: (BuildContext context, BoxConstraints box) {
                  final Widget value = Text(
                    _current,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: text.copyWith(color: c.on),
                  );
                  return Row(
                    mainAxisSize: box.hasBoundedWidth ? MainAxisSize.max : MainAxisSize.min,
                    children: <Widget>[
                      if (box.hasBoundedWidth) Expanded(child: value) else value,
                      const SizedBox(width: KmTokens.s2),
                      Icon(Icons.keyboard_arrow_down, size: 20, color: c.on),
                    ],
                  );
                },
              ),
            );
          },
        ),
      ),
    );
  }
}

/// One menu row (`.menu-item`): quiet at rest, `card-hov` on hover, `focus`
/// fill on keyboard focus; [selected] adds a leading check.
class KmMenuItem extends StatelessWidget {
  const KmMenuItem({
    super.key,
    required this.label,
    required this.onTap,
    this.icon,
    this.selected = false,
    this.autofocus = false,
  });

  final String label;
  final VoidCallback? onTap;
  final IconData? icon;
  final bool selected;
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      excludeSemantics: true,
      onTap: onTap,
      child: KmInteractive(
        onTap: onTap,
        autofocus: autofocus,
        builder: (BuildContext context, Set<WidgetState> s) {
          final KmStateColors c = KmStateColors.resolve(
            p,
            s.difference(<WidgetState>{WidgetState.selected}),
            rest: Colors.transparent,
            restOn: p.fg,
            hover: p.cardHov,
          );
          return KmFillBox(
            colors: c,
            radius: KmTokens.radius10,
            constraints: const BoxConstraints(minHeight: KmTokens.sizeTarget, minWidth: 180),
            padding: const EdgeInsets.symmetric(horizontal: KmTokens.s3),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                if (icon != null || selected) ...<Widget>[
                  Icon(selected ? Icons.check : icon, size: 20, color: c.on),
                  const SizedBox(width: KmTokens.s2),
                ],
                Flexible(
                  child: Text(
                    label,
                    style: KmText.small(context).copyWith(
                      color: c.on,
                      fontWeight: KmTokens.fontWeightMedium,
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
