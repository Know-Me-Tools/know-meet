// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import 'km_motion.dart';
import 'km_palette_of.dart';
import 'km_text.dart';

/// One option of a [KmSegmented] or [KmTabs].
class KmOption<T> {
  const KmOption(this.value, this.label, {this.icon, this.count});

  final T value;
  final String label;
  final IconData? icon;

  /// `.tabs .count` badge.
  final int? count;
}

/// `.seg`: segmented control (`button[aria-pressed]`). Each option is a
/// toggle button announced with its selected state.
class KmSegmented<T> extends StatelessWidget {
  const KmSegmented({
    super.key,
    required this.options,
    required this.selected,
    required this.onChanged,
    this.label,
  });

  final List<KmOption<T>> options;
  final T selected;
  final ValueChanged<T> onChanged;

  /// Group name announced before the options.
  final String? label;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      label: label,
      container: label != null,
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: p.muted,
          borderRadius: BorderRadius.circular(KmTokens.radius),
        ),
        child: Wrap(
          spacing: 4,
          runSpacing: 4,
          children: <Widget>[
            for (final KmOption<T> o in options)
              _SegButton(
                option: o,
                pressed: o.value == selected,
                onTap: () => onChanged(o.value),
              ),
          ],
        ),
      ),
    );
  }
}

class _SegButton extends StatelessWidget {
  const _SegButton({required this.option, required this.pressed, required this.onTap});

  final KmOption<Object?> option;
  final bool pressed;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final Color fg = pressed ? p.fg : p.fgSub;
    return Semantics(
      button: true,
      toggled: pressed,
      label: option.label,
      excludeSemantics: true,
      onTap: onTap,
      child: Material(
        color: pressed ? p.card : Colors.transparent,
        borderRadius: BorderRadius.circular(KmTokens.radius9),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(KmTokens.radius9),
          child: Container(
            constraints: const BoxConstraints(minHeight: 36),
            padding: const EdgeInsets.symmetric(horizontal: KmTokens.s3),
            decoration: pressed
                ? BoxDecoration(
                    borderRadius: BorderRadius.circular(KmTokens.radius9),
                    boxShadow: p.segPressedShadow,
                  )
                : null,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                if (option.icon != null) ...<Widget>[
                  Icon(option.icon, size: 16, color: fg),
                  const SizedBox(width: 6),
                ],
                Text(option.label, style: KmText.label(context).copyWith(color: fg)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// `.tabs[role=tablist]`: horizontally scrolling tabs with an ember
/// underline on the selected tab; each tab is announced as selected or not.
class KmTabs<T> extends StatelessWidget {
  const KmTabs({
    super.key,
    required this.tabs,
    required this.selected,
    required this.onChanged,
  });

  final List<KmOption<T>> tabs;
  final T selected;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: p.muted)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: <Widget>[
            for (final KmOption<T> t in tabs)
              _Tab(
                option: t,
                selected: t.value == selected,
                onTap: () => onChanged(t.value),
              ),
          ],
        ),
      ),
    );
  }
}

class _Tab extends StatelessWidget {
  const _Tab({required this.option, required this.selected, required this.onTap});

  final KmOption<Object?> option;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final Color fg = selected ? p.fg : p.fgSub;
    final String name = option.count == null ? option.label : '${option.label}, ${option.count}';
    return Semantics(
      button: true,
      selected: selected,
      label: name,
      excludeSemantics: true,
      onTap: onTap,
      child: InkWell(
        onTap: onTap,
        child: AnimatedContainer(
          duration: KmMotion.of(context, KmTokens.durFast),
          constraints: const BoxConstraints(minHeight: 44),
          padding: const EdgeInsets.symmetric(horizontal: KmTokens.s3),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: selected ? p.ember : Colors.transparent,
                width: 2,
              ),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              if (option.icon != null) ...<Widget>[
                Icon(option.icon, size: 16, color: fg),
                const SizedBox(width: 6),
              ],
              Text(option.label, style: KmText.label(context).copyWith(color: fg)),
              if (option.count != null) ...<Widget>[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: p.muted,
                    borderRadius: BorderRadius.circular(KmTokens.radiusPill),
                  ),
                  child: Text(
                    '${option.count}',
                    style: TextStyle(
                      fontFamily: KmTokens.fontMono,
                      fontSize: KmTokens.text11,
                      color: p.fgSub,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// `.steps`: wizard stepper. Steps before [current] are done.
class KmSteps extends StatelessWidget {
  const KmSteps({super.key, required this.labels, required this.current});

  final List<String> labels;

  /// Zero-based index of the current step.
  final int current;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Wrap(
      spacing: KmTokens.s2,
      runSpacing: KmTokens.s2,
      children: <Widget>[
        for (int i = 0; i < labels.length; i++)
          Semantics(
            label: 'Step ${i + 1} of ${labels.length}: ${labels[i]}'
                '${i == current ? ', current' : (i < current ? ', done' : '')}',
            excludeSemantics: true,
            child: Container(
              constraints: const BoxConstraints(minHeight: 40),
              padding: const EdgeInsets.only(left: 6, right: KmTokens.s3),
              decoration: BoxDecoration(
                color: i == current ? p.emberSoft : p.surface,
                borderRadius: BorderRadius.circular(KmTokens.radiusPill),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Container(
                    width: 28,
                    height: 28,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: i == current
                          ? p.emberBtn
                          : (i < current ? p.greenSoft : p.muted),
                    ),
                    child: i < current
                        ? Icon(Icons.check, size: 15, color: p.greenText)
                        : Text(
                            '${i + 1}',
                            style: TextStyle(
                              fontFamily: KmTokens.fontMono,
                              fontSize: KmTokens.textXs,
                              color: i == current ? p.onEmber : p.fg,
                            ),
                          ),
                  ),
                  const SizedBox(width: KmTokens.s2),
                  Text(
                    labels[i],
                    style: KmText.label(context).copyWith(
                      color: i == current
                          ? p.emberText
                          : (i < current ? p.fg : p.fgSub),
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
