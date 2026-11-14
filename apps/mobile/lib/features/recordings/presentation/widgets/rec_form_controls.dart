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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        KmFieldLabel(widget.label),
        const SizedBox(height: 6),
        Semantics(
          label: widget.label,
          child: TextField(
            controller: _controller,
            onChanged: widget.onChanged,
            keyboardType: TextInputType.text,
            textInputAction: TextInputAction.search,
            style: kmFieldStyle(context),
            decoration: kmFieldDecoration(
              context,
              placeholder: widget.placeholder,
              prefixIcon: const ExcludeSemantics(child: Icon(LucideIcons.search, size: 20)),
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
    this.width,
  });

  final String label;
  final T value;
  final List<(T, String)> options;
  final ValueChanged<T> onChanged;

  /// False for a visually hidden label (`.sr-only`).
  final bool showLabel;

  /// `.ctrl-row select.input`: small text (the target stays >= 44px).
  final bool dense;

  /// Fixed width. [KmSelect] fills its parent, and this select sits in a
  /// Wrap or Row that gives it no width; the default fits the longest
  /// option ("Longest first", "1.25×").
  final double? width;

  @override
  Widget build(BuildContext context) {
    // D-6: the select sits on the `control` fill; focus is the `focus` fill.
    final Widget select = SizedBox(
      width: width ?? (dense ? 104 : 200),
      child: KmSelect<T>(
        label: label,
        value: value,
        options: options,
        onChanged: onChanged,
        dense: dense,
      ),
    );
    if (!showLabel) return select;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        KmFieldLabel(label),
        const SizedBox(height: 6),
        select,
      ],
    );
  }
}
