// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/ui/ui.dart';
import '../settings_providers.dart';

/// `.switches`: switch rows separated by spacing ([KmRule], D-6: no line).
class SettingsSwitchList extends StatelessWidget {
  const SettingsSwitchList({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: <Widget>[
      for (int i = 0; i < children.length; i++) ...<Widget>[
        if (i > 0) const KmRule(vertical: 0),
        children[i],
      ],
    ],
  );
}

/// A [KmSwitchRow] bound to one key of [settingsTogglesProvider]. [locked]
/// renders the switch on and disabled (always-on consent); [disabled] dims
/// the whole row as the prototype's `fieldset[disabled]` does.
class SettingsToggleRow extends ConsumerWidget {
  const SettingsToggleRow({
    super.key,
    required this.toggleKey,
    required this.title,
    this.description,
    this.locked = false,
    this.disabled = false,
  });

  final String toggleKey;
  final String title;
  final String? description;
  final bool locked;
  final bool disabled;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bool value = locked || (ref.watch(settingsTogglesProvider)[toggleKey] ?? false);
    final Widget row = KmSwitchRow(
      title: title,
      description: description,
      value: value,
      onChanged: locked || disabled
          ? null
          : (bool v) => ref.read(settingsTogglesProvider.notifier).toggle(toggleKey, v),
    );
    return disabled ? Opacity(opacity: 0.55, child: row) : row;
  }
}

/// A [KmCheckRow] bound to one key of [settingsTogglesProvider].
class SettingsCheckToggle extends ConsumerWidget {
  const SettingsCheckToggle({
    super.key,
    required this.toggleKey,
    required this.label,
    this.description,
  });

  final String toggleKey;
  final String label;
  final String? description;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return KmCheckRow(
      label: label,
      description: description,
      value: ref.watch(settingsTogglesProvider)[toggleKey] ?? false,
      onChanged: (bool v) => ref.read(settingsTogglesProvider.notifier).toggle(toggleKey, v),
    );
  }
}

/// A checkbox row whose value is local (calendar lists, fix-it lists).
class SettingsLocalCheck extends StatefulWidget {
  const SettingsLocalCheck({super.key, required this.label, required this.initial});

  final String label;
  final bool initial;

  @override
  State<SettingsLocalCheck> createState() => _SettingsLocalCheckState();
}

class _SettingsLocalCheckState extends State<SettingsLocalCheck> {
  late bool _value = widget.initial;

  @override
  Widget build(BuildContext context) => KmCheckRow(
    label: widget.label,
    value: _value,
    onChanged: (bool v) => setState(() => _value = v),
  );
}

/// One radio choice.
final class SettingsRadioOption {
  const SettingsRadioOption(this.value, this.label, {this.description});

  final String value;
  final String label;
  final String? description;
}

/// A labelled radio group (`legend` + fill-only radio rows). Selection is
/// local.
class SettingsRadioGroup extends StatefulWidget {
  const SettingsRadioGroup({
    super.key,
    required this.legend,
    required this.options,
    required this.initial,
  });

  final String legend;
  final List<SettingsRadioOption> options;
  final String initial;

  @override
  State<SettingsRadioGroup> createState() => _SettingsRadioGroupState();
}

class _SettingsRadioGroupState extends State<SettingsRadioGroup> {
  late String _value = widget.initial;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: widget.legend,
      explicitChildNodes: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          ExcludeSemantics(child: Text(widget.legend, style: KmText.label(context))),
          const SizedBox(height: 6),
          for (final SettingsRadioOption o in widget.options)
            KmChoiceRow(
              kind: KmIndicatorKind.radio,
              label: o.label,
              description: o.description,
              checked: o.value == _value,
              onTap: () => setState(() => _value = o.value),
            ),
        ],
      ),
    );
  }
}

/// A labelled segmented control (`segField`). The draft selection is
/// local UI state; nothing is saved.
class SettingsSegField extends StatefulWidget {
  const SettingsSegField({
    super.key,
    required this.label,
    required this.options,
    required this.initial,
  });

  final String label;
  final List<KmOption<String>> options;
  final String initial;

  @override
  State<SettingsSegField> createState() => _SettingsSegFieldState();
}

class _SettingsSegFieldState extends State<SettingsSegField> {
  late String _value = widget.initial;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    mainAxisSize: MainAxisSize.min,
    children: <Widget>[
      ExcludeSemantics(child: Text(widget.label, style: KmText.label(context))),
      const SizedBox(height: 6),
      KmSegmented<String>(
        label: widget.label,
        options: widget.options,
        selected: _value,
        onChanged: (String v) => setState(() => _value = v),
      ),
    ],
  );
}
