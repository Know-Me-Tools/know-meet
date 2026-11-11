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

  /// Read-only value shown without the input ring (prototype readonly).
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
    final TextStyle base = mono ? KmText.mono(context) : KmText.body(context);
    final Widget input = Semantics(
      label: required ? '$label, required' : label,
      child: TextFormField(
        initialValue: secret ? null : value,
        readOnly: readOnly,
        obscureText: secret,
        keyboardType: keyboardType,
        maxLines: secret ? 1 : maxLines,
        minLines: maxLines > 1 ? maxLines : null,
        style: base.copyWith(color: p.fg),
        decoration: InputDecoration(
          hintText: placeholder,
          hintStyle: base.copyWith(color: p.fgSub.withValues(alpha: 0.85)),
          fillColor: readOnly ? p.surface : p.card,
          enabledBorder: readOnly
              ? OutlineInputBorder(
                  borderRadius: BorderRadius.circular(KmTokens.radius),
                  borderSide: BorderSide.none,
                )
              : null,
          suffixIcon: copyable && value != null
              ? KmIconButton(
                  icon: LucideIcons.copy,
                  label: 'Copy $label',
                  onPressed: () => Clipboard.setData(ClipboardData(text: value!)),
                )
              : null,
          constraints: const BoxConstraints(minHeight: 48),
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

/// Prototype `selectField()`: label, hint, then a dropdown styled as an
/// input. The selection is local to the field (static screens).
class SettingsSelect extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        SettingsLabel(label, required: required),
        if (hint != null) ...<Widget>[
          const SizedBox(height: 6),
          Text(hint!, style: KmText.smallSub(context)),
        ],
        const SizedBox(height: 6),
        Semantics(
          label: label,
          child: DropdownButtonFormField<String>(
            initialValue: value,
            isExpanded: true,
            dropdownColor: p.bg2,
            icon: Icon(Icons.arrow_drop_down, color: p.fgSub),
            style: KmText.body(context).copyWith(color: p.fg),
            decoration: InputDecoration(
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(KmTokens.radius),
                borderSide: BorderSide.none,
              ),
              constraints: const BoxConstraints(minHeight: 48),
            ),
            items: <DropdownMenuItem<String>>[
              for (final String o in options)
                DropdownMenuItem<String>(value: o, child: Text(o)),
            ],
            onChanged: (String? _) {},
          ),
        ),
      ],
    );
  }
}
