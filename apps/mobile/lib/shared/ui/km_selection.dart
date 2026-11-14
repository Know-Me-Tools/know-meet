// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import 'km_motion.dart';
import 'km_palette_of.dart';
import 'km_states.dart';
import 'km_text.dart';

/// Which selection indicator a row shows.
enum KmIndicatorKind { checkbox, radio }

/// The fill-only checkbox or radio glyph (DESIGN.md state table). No ring in
/// any state: rest is a `control` box/disc, checked is `selected` with an
/// `on-selected` tick (checkbox) or 8px dot (radio), focus is the `focus`
/// fill (the tick or dot turns `on-focus`). Size `size-check` (20).
class KmIndicator extends StatelessWidget {
  const KmIndicator({
    super.key,
    required this.kind,
    required this.checked,
    required this.states,
  });

  final KmIndicatorKind kind;
  final bool checked;

  /// The owning control's states ([KmInteractive]).
  final Set<WidgetState> states;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final KmStateColors c = KmStateColors.control(p, <WidgetState>{
      ...states.difference(<WidgetState>{WidgetState.selected}),
      if (checked) WidgetState.selected,
    });
    final bool radio = kind == KmIndicatorKind.radio;
    return KmFillBox(
      colors: c,
      width: KmTokens.sizeCheck,
      height: KmTokens.sizeCheck,
      radius: KmTokens.radius4,
      shape: radio ? BoxShape.circle : BoxShape.rectangle,
      alignment: Alignment.center,
      child: !checked
          ? const SizedBox.shrink()
          : radio
          ? Container(
              width: KmTokens.sizePip,
              height: KmTokens.sizePip,
              decoration: BoxDecoration(color: c.on, shape: BoxShape.circle),
            )
          : Icon(Icons.check, size: 16, color: c.on),
    );
  }
}

/// A standalone checkbox: the 20px [KmIndicator] centred in a 44px target.
/// Name it with [label] (announced, not shown).
class KmCheckbox extends StatelessWidget {
  const KmCheckbox({super.key, required this.value, required this.onChanged, required this.label});

  final bool value;
  final ValueChanged<bool>? onChanged;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      checked: value,
      label: label,
      excludeSemantics: true,
      onTap: onChanged == null ? null : () => onChanged!(!value),
      child: KmInteractive(
        onTap: onChanged == null ? null : () => onChanged!(!value),
        builder: (BuildContext context, Set<WidgetState> s) => SizedBox.square(
          dimension: KmTokens.sizeTarget,
          child: Center(
            child: Opacity(
              opacity: onChanged == null ? 0.5 : 1,
              child: KmIndicator(kind: KmIndicatorKind.checkbox, checked: value, states: s),
            ),
          ),
        ),
      ),
    );
  }
}

/// The fill-only radio (design-lead request): a `control` disc, `selected`
/// with an 8px `on-selected` dot when chosen, `focus` fill on keyboard
/// focus. Standalone in a 44px target; use [KmChoiceRow] for a labelled row.
class KmRadio<T> extends StatelessWidget {
  const KmRadio({
    super.key,
    required this.value,
    required this.groupValue,
    required this.onChanged,
    required this.label,
  });

  final T value;
  final T? groupValue;
  final ValueChanged<T>? onChanged;
  final String label;

  @override
  Widget build(BuildContext context) {
    final bool checked = value == groupValue;
    return Semantics(
      inMutuallyExclusiveGroup: true,
      checked: checked,
      label: label,
      excludeSemantics: true,
      onTap: onChanged == null ? null : () => onChanged!(value),
      child: KmInteractive(
        onTap: onChanged == null ? null : () => onChanged!(value),
        builder: (BuildContext context, Set<WidgetState> s) => SizedBox.square(
          dimension: KmTokens.sizeTarget,
          child: Center(
            child: Opacity(
              opacity: onChanged == null ? 0.5 : 1,
              child: KmIndicator(kind: KmIndicatorKind.radio, checked: checked, states: s),
            ),
          ),
        ),
      ),
    );
  }
}

/// `.check-row` / `.radio-row`: indicator plus label (and optional
/// description) as one tappable, named control at least 44px tall. Keyboard
/// focus fills the indicator with `focus`.
class KmChoiceRow extends StatelessWidget {
  const KmChoiceRow({
    super.key,
    required this.kind,
    required this.label,
    required this.checked,
    required this.onTap,
    this.description,
  });

  final KmIndicatorKind kind;
  final String label;
  final String? description;
  final bool checked;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      checked: checked,
      inMutuallyExclusiveGroup: kind == KmIndicatorKind.radio,
      label: description == null ? label : '$label. $description',
      excludeSemantics: true,
      onTap: onTap,
      child: KmInteractive(
        onTap: onTap,
        builder: (BuildContext context, Set<WidgetState> s) => Opacity(
          opacity: onTap == null ? 0.5 : 1,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: KmTokens.sizeTarget),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: KmIndicator(kind: kind, checked: checked, states: s),
                ),
                const SizedBox(width: KmTokens.s3),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 10, bottom: 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(label, style: KmText.body(context)),
                        if (description != null)
                          Text(description!, style: KmText.smallSub(context)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// `.check-row`: a checkbox with its label as one control.
class KmCheckRow extends StatelessWidget {
  const KmCheckRow({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.description,
  });

  final String label;
  final String? description;
  final bool value;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) => KmChoiceRow(
    kind: KmIndicatorKind.checkbox,
    label: label,
    description: description,
    checked: value,
    onTap: onChanged == null ? null : () => onChanged!(!value),
  );
}

/// `.switch`: 48x28 track, 22px thumb inset 3, travel 20 (size tokens).
/// Off: `switch-track` / `switch-thumb`. On: `ember-btn` track,
/// `switch-thumb-on` thumb moved +20 (state is the position too, never
/// colour alone). Focus: `focus` track, `on-focus` thumb.
class KmSwitch extends StatelessWidget {
  const KmSwitch({super.key, required this.value, required this.onChanged, required this.label});

  final bool value;
  final ValueChanged<bool>? onChanged;

  /// Accessible name.
  final String label;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      toggled: value,
      label: label,
      excludeSemantics: true,
      onTap: onChanged == null ? null : () => onChanged!(!value),
      child: KmInteractive(
        onTap: onChanged == null ? null : () => onChanged!(!value),
        builder: (BuildContext context, Set<WidgetState> s) => SizedBox(
          height: KmTokens.sizeTarget,
          width: KmTokens.sizeSwitchW,
          child: Center(child: KmSwitchTrack(on: value, states: s)),
        ),
      ),
    );
  }
}

/// The painted switch (no semantics, no input): used by [KmSwitch] and by
/// rows whose whole surface is the control.
class KmSwitchTrack extends StatelessWidget {
  const KmSwitchTrack({super.key, required this.on, required this.states});

  final bool on;
  final Set<WidgetState> states;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final bool disabled = states.contains(WidgetState.disabled);
    final bool focused = !disabled && states.contains(WidgetState.focused);
    final bool hovered = !disabled && states.contains(WidgetState.hovered);
    final Color track = focused
        ? p.focus
        : on
        ? p.emberBtn
        : (hovered ? p.controlHov : p.switchTrack);
    final Color thumb = focused ? p.onFocus : (on ? p.switchThumbOn : p.switchThumb);
    final Duration d = KmMotion.of(context, KmTokens.durFast);
    return Opacity(
      opacity: disabled ? 0.5 : 1,
      child: AnimatedContainer(
        duration: d,
        width: KmTokens.sizeSwitchW,
        height: KmTokens.sizeSwitchH,
        padding: const EdgeInsets.all(KmTokens.sizeSwitchThumbInset),
        decoration: BoxDecoration(
          color: track,
          borderRadius: BorderRadius.circular(KmTokens.radiusPill),
        ),
        child: AnimatedAlign(
          duration: d,
          curve: KmTokens.easeOut,
          alignment: on ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
          child: AnimatedContainer(
            duration: d,
            width: KmTokens.sizeSwitchThumb,
            height: KmTokens.sizeSwitchThumb,
            decoration: BoxDecoration(
              color: thumb,
              shape: BoxShape.circle,
              boxShadow: p.switchThumbShadow,
            ),
          ),
        ),
      ),
    );
  }
}

/// `.switch-row`: title + description with a switch; the whole row is the
/// control, named by [title].
class KmSwitchRow extends StatelessWidget {
  const KmSwitchRow({
    super.key,
    required this.title,
    this.description,
    required this.value,
    required this.onChanged,
  });

  final String title;
  final String? description;
  final bool value;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    final VoidCallback? tap = onChanged == null ? null : () => onChanged!(!value);
    return Semantics(
      toggled: value,
      label: description == null ? title : '$title. $description',
      excludeSemantics: true,
      onTap: tap,
      child: KmInteractive(
        onTap: tap,
        builder: (BuildContext context, Set<WidgetState> s) => Padding(
          padding: const EdgeInsets.symmetric(vertical: KmTokens.s3),
          child: Row(
            children: <Widget>[
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(title, style: KmText.label(context)),
                    if (description != null) ...<Widget>[
                      const SizedBox(height: 2),
                      Text(description!, style: KmText.smallSub(context)),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: KmTokens.s4),
              KmSwitchTrack(on: value, states: s),
            ],
          ),
        ),
      ),
    );
  }
}

/// Toggle chip: `control` at rest, `selected` plus a leading check when on,
/// `focus` fill on keyboard focus. Announced as a toggle.
class KmToggleChip extends StatelessWidget {
  const KmToggleChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onChanged,
    this.icon,
  });

  final String label;
  final bool selected;
  final ValueChanged<bool>? onChanged;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final VoidCallback? tap = onChanged == null ? null : () => onChanged!(!selected);
    return Semantics(
      button: true,
      toggled: selected,
      label: label,
      excludeSemantics: true,
      onTap: tap,
      child: KmInteractive(
        onTap: tap,
        selected: selected,
        builder: (BuildContext context, Set<WidgetState> s) {
          final KmStateColors c = KmStateColors.control(p, s);
          final IconData? lead = selected ? Icons.check : icon;
          return KmFillBox(
            colors: c,
            disabled: tap == null,
            radius: KmTokens.radiusPill,
            constraints: const BoxConstraints(minHeight: KmTokens.sizeTarget),
            padding: const EdgeInsets.symmetric(horizontal: KmTokens.s3),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                if (lead != null) ...<Widget>[
                  Icon(lead, size: 16, color: c.on),
                  const SizedBox(width: 6),
                ],
                Text(label, style: KmText.label(context).copyWith(color: c.on)),
              ],
            ),
          );
        },
      ),
    );
  }
}
