// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';

/// A labelled search input with the leading search icon
/// (`.search-wrap`). Feature-local: the kit's text field has no leading
/// icon or change callback yet.
class RecSearchField extends StatefulWidget {
  const RecSearchField({
    super.key,
    required this.label,
    required this.placeholder,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final String placeholder;

  /// The query held by the provider; the field follows it when it is
  /// changed elsewhere (e.g. "Clear search and filter").
  final String value;
  final ValueChanged<String> onChanged;

  @override
  State<RecSearchField> createState() => _RecSearchFieldState();
}

class _RecSearchFieldState extends State<RecSearchField> {
  late final TextEditingController _controller = TextEditingController(text: widget.value);

  @override
  void didUpdateWidget(RecSearchField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != _controller.text) _controller.text = widget.value;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final TextStyle base = KmText.body(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        ExcludeSemantics(child: Text(widget.label, style: KmText.label(context))),
        const SizedBox(height: 6),
        Semantics(
          label: widget.label,
          child: TextField(
            controller: _controller,
            onChanged: widget.onChanged,
            keyboardType: TextInputType.text,
            textInputAction: TextInputAction.search,
            style: base.copyWith(color: p.fg),
            decoration: InputDecoration(
              hintText: widget.placeholder,
              hintStyle: base.copyWith(color: p.fgSub.withValues(alpha: 0.85)),
              prefixIcon: ExcludeSemantics(
                child: Icon(LucideIcons.search, size: 20, color: p.fgSub),
              ),
              constraints: const BoxConstraints(minHeight: 48),
            ),
          ),
        ),
      ],
    );
  }
}

/// A labelled select (`select.input`). The label is the control's
/// accessible name.
class RecSelect<T> extends StatelessWidget {
  const RecSelect({
    super.key,
    required this.label,
    required this.value,
    required this.options,
    required this.onChanged,
    this.showLabel = true,
    this.dense = false,
  });

  final String label;
  final T value;
  final List<(T, String)> options;
  final ValueChanged<T> onChanged;

  /// False for a visually hidden label (`.sr-only`).
  final bool showLabel;

  /// `.ctrl-row select.input`: 36px tall, small text.
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final TextStyle text = (dense ? KmText.small(context) : KmText.body(context))
        .copyWith(color: p.fg);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        if (showLabel) ...<Widget>[
          ExcludeSemantics(child: Text(label, style: KmText.label(context))),
          const SizedBox(height: 6),
        ],
        Semantics(
          label: label,
          child: Container(
            constraints: BoxConstraints(minHeight: dense ? 36 : 48),
            alignment: Alignment.centerLeft,
            padding: EdgeInsets.only(left: dense ? 10 : 14, right: 10),
            decoration: BoxDecoration(
              color: p.card,
              borderRadius: BorderRadius.circular(KmTokens.radius),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<T>(
                value: value,
                isDense: true,
                style: text,
                dropdownColor: p.bg2,
                borderRadius: BorderRadius.circular(KmTokens.radius),
                icon: Padding(
                  padding: const EdgeInsets.only(left: KmTokens.s3),
                  child: Icon(LucideIcons.chevronDown, size: 16, color: p.fgSub),
                ),
                items: <DropdownMenuItem<T>>[
                  for (final (T v, String l) in options)
                    DropdownMenuItem<T>(value: v, child: Text(l, style: text)),
                ],
                onChanged: (T? v) {
                  if (v != null) onChanged(v);
                },
              ),
            ),
          ),
        ),
      ],
    );
  }
}
