// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../shared/ui/ui.dart';

/// Prototype settings `field()`: label (with required asterisk or
/// "(optional)"), then hint, then the input — the hint sits above the input
/// here, unlike [KmTextField]. The label is the input's accessible name.
class SettingsField extends StatelessWidget {
  const SettingsField({
    super.key,
    required this.label,
    this.hint,
    this.placeholder,
    this.value,
    this.required = false,
    this.optional = false,
    this.mono = false,
    this.readOnly = false,
    this.secret = false,
    this.copyable = false,
    this.maxLines = 1,
    this.counter,
    this.keyboardType,
  });

  final String label;
  final String? hint;
  final String? placeholder;
  final String? value;
  final bool required;
  final bool optional;
  final bool mono;

  /// Read-only value on the `surface` fill (prototype readonly).
  final bool readOnly;

  /// Password-type input with a reveal button beside it. Never prefilled.
  final bool secret;

  /// Adds a copy button inside the input end.
  final bool copyable;
  final int maxLines;

  /// Shown under the input (`79 / 200`).
  final String? counter;
  final TextInputType? keyboardType;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final Widget input = Semantics(
      label: required ? '$label, required' : label,
      child: TextFormField(
        initialValue: secret ? null : value,
        readOnly: readOnly,
        obscureText: secret,
        keyboardType: keyboardType,
        maxLines: secret ? 1 : maxLines,
        minLines: maxLines > 1 ? maxLines : null,
        style: kmFieldStyle(context, mono: mono, readOnly: readOnly),
        decoration: kmFieldDecoration(
          context,
          placeholder: placeholder,
          mono: mono,
          readOnly: readOnly,
          suffixIcon: copyable && value != null
              ? KmIconButton(
                  icon: LucideIcons.copy,
                  label: 'Copy $label',
                  onPressed: () => Clipboard.setData(ClipboardData(text: value!)),
                )
              : null,
        ),
      ),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        SettingsLabel(label, required: required, optional: optional),
        if (hint != null) ...<Widget>[
          const SizedBox(height: 6),
          Text(hint!, style: KmText.smallSub(context)),
        ],
        const SizedBox(height: 6),
        if (secret)
          Row(
            children: <Widget>[
              Expanded(child: input),
              const SizedBox(width: KmTokens.s2),
              KmIconButton(
                icon: LucideIcons.eye,
                label: 'Show $label',
                onPressed: () {},
              ),
            ],
          )
        else
          input,
        if (counter != null) ...<Widget>[
          const SizedBox(height: 6),
          Text(counter!, style: KmText.xsmall(context).copyWith(color: p.fgSub)),
        ],
      ],
    );
  }
}

/// A field label: semibold small, ember asterisk when required, muted
/// "(optional)" when optional. Excluded from semantics; the control
/// carries the name.
class SettingsLabel extends StatelessWidget {
  const SettingsLabel(this.text, {super.key, this.required = false, this.optional = false});

  final String text;
  final bool required;
  final bool optional;

  @override
  Widget build(BuildContext context) =>
      KmFieldLabel(text, required: required, optional: optional);
}

/// Prototype `selectField()`: label, hint, then a [KmSelect] on the
/// `control` fill. The selection is local to the field (static screens).
class SettingsSelect extends StatefulWidget {
  const SettingsSelect({
    super.key,
    required this.label,
    required this.value,
    required this.options,
    this.hint,
    this.required = false,
  });

  final String label;
  final String? hint;
  final bool required;

  /// The selected option's label; must be one of [options].
  final String value;
  final List<String> options;

  @override
  State<SettingsSelect> createState() => _SettingsSelectState();
}

class _SettingsSelectState extends State<SettingsSelect> {
  late String _value = widget.value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        SettingsLabel(widget.label, required: widget.required),
        if (widget.hint != null) ...<Widget>[
          const SizedBox(height: 6),
          Text(widget.hint!, style: KmText.smallSub(context)),
        ],
        const SizedBox(height: 6),
        KmSelect<String>(
          label: widget.required ? '${widget.label}, required' : widget.label,
          value: _value,
          options: <(String, String)>[for (final String o in widget.options) (o, o)],
          onChanged: (String v) => setState(() => _value = v),
        ),
      ],
    );
  }
}
