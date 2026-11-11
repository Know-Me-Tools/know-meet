// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import 'km_palette_of.dart';
import 'km_text.dart';

/// `.field`: label, control, optional hint and error. The label is the text
/// field's accessible name; [required] adds the ember asterisk the
/// prototype shows and announces "required".
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

  /// Inside the input's end (reveal-password button, copy button).
  final Widget? trailing;

  /// Right of the label (e.g. "Forgot password?").
  final Widget? labelTrailing;
  final int maxLines;
  final FocusNode? focusNode;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final TextStyle base = mono ? KmText.mono(context) : KmText.body(context);
    final OutlineInputBorder errorBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(KmTokens.radius),
      borderSide: BorderSide(color: p.red, width: 2),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(
              child: ExcludeSemantics(
                child: Text.rich(
                  TextSpan(
                    text: label,
                    style: KmText.label(context),
                    children: <InlineSpan>[
                      if (required)
                        TextSpan(text: ' *', style: TextStyle(color: p.emberText)),
                    ],
                  ),
                ),
              ),
            ),
            ?labelTrailing,
          ],
        ),
        const SizedBox(height: 6),
        Semantics(
          label: required ? '$label, required' : label,
          child: TextFormField(
            initialValue: initialValue,
            obscureText: obscure,
            readOnly: readOnly,
            keyboardType: keyboardType,
            focusNode: focusNode,
            maxLines: obscure ? 1 : maxLines,
            minLines: maxLines > 1 ? maxLines : null,
            style: base.copyWith(color: p.fg),
            decoration: InputDecoration(
              hintText: placeholder,
              hintStyle: base.copyWith(color: p.fgSub.withValues(alpha: 0.85)),
              fillColor: readOnly ? p.surface : p.card,
              suffixIcon: trailing,
              enabledBorder: error == null ? null : errorBorder,
              focusedBorder: error == null ? null : errorBorder,
              constraints: const BoxConstraints(minHeight: 48),
            ),
          ),
        ),
        if (hint != null) ...<Widget>[
          const SizedBox(height: 6),
          Text(hint!, style: KmText.smallSub(context)),
        ],
        if (error != null) ...<Widget>[
          const SizedBox(height: 6),
          Semantics(
            liveRegion: true,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Icon(Icons.error_outline, size: 18, color: p.red),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    error!,
                    style: KmText.small(context).copyWith(fontWeight: KmTokens.fontWeightMedium),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// `.switch-row`: title + description with a switch. The switch's
/// accessible name is [title].
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
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: KmTokens.s3),
      child: MergeSemantics(
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
            Switch(value: value, onChanged: onChanged),
          ],
        ),
      ),
    );
  }
}

/// `.check-row`: a checkbox with its label as one tappable, named control.
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
  final ValueChanged<bool?>? onChanged;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return MergeSemantics(
      child: InkWell(
        onTap: onChanged == null ? null : () => onChanged!(!value),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Checkbox(
                value: value,
                onChanged: onChanged,
                activeColor: p.emberBtn,
                checkColor: p.onEmber,
              ),
              const SizedBox(width: KmTokens.s2),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 12),
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
    );
  }
}
