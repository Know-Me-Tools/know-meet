// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import 'km_palette_of.dart';
import 'km_selection.dart';
import 'km_states.dart';
import 'km_text.dart';

/// `.option`: a choice card (DESIGN.md "Choice card"). The radio or checkbox
/// indicator inside carries the state; the `ember-soft` card fill when
/// chosen is supplementary. Hover is `card-hov`; keyboard focus fills the
/// whole card with `focus` and turns every text `on-focus`. No ring.
class KmChoiceCard extends StatelessWidget {
  const KmChoiceCard({
    super.key,
    required this.title,
    required this.selected,
    required this.onTap,
    this.description = '',
    this.multi = false,
    this.onCard = false,
  });

  final String title;
  final String description;
  final bool selected;
  final VoidCallback? onTap;

  /// Checkbox instead of radio.
  final bool multi;

  /// Inside a card or panel the resting fill is `card` instead of `surface`.
  final bool onCard;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      container: true,
      checked: selected,
      inMutuallyExclusiveGroup: !multi,
      label: description.isEmpty ? title : '$title. $description',
      onTap: onTap,
      excludeSemantics: true,
      child: KmInteractive(
        onTap: onTap,
        selected: selected,
        builder: (BuildContext context, Set<WidgetState> s) {
          final KmStateColors c = KmStateColors.resolve(
            p,
            s,
            rest: onCard ? p.card : p.surface,
            restOn: p.fg,
            hover: p.cardHov,
            selected: p.emberSoft,
            selectedOn: p.fg,
          );
          final bool focused = s.contains(WidgetState.focused);
          return KmFillBox(
            colors: c,
            disabled: onTap == null,
            constraints: const BoxConstraints(minHeight: KmTokens.sizeTarget),
            padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s3),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: KmIndicator(
                    kind: multi ? KmIndicatorKind.checkbox : KmIndicatorKind.radio,
                    checked: selected,
                    // The card shows focus; the indicator keeps its own state.
                    states: s.difference(<WidgetState>{WidgetState.focused, WidgetState.hovered}),
                  ),
                ),
                const SizedBox(width: KmTokens.s3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(title, style: KmText.label(context).copyWith(color: c.on)),
                      if (description.isNotEmpty) ...<Widget>[
                        const SizedBox(height: 2),
                        Text(
                          description,
                          style: KmText.small(context).copyWith(
                            color: focused ? c.on : p.fgSub,
                          ),
                        ),
                      ],
                    ],
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

/// Drop zone (DESIGN.md): a `control` fill reading "Drop files or browse";
/// while a file is dragged over it, `selected` reading "Release to upload";
/// `focus` fill on keyboard focus. Replaces the dashed outline (TD-50).
class KmDropZone extends StatelessWidget {
  const KmDropZone({
    super.key,
    required this.onBrowse,
    this.dragOver = false,
    this.label = 'Drop files or browse',
    this.hint,
  });

  final VoidCallback? onBrowse;

  /// True while a drag hovers the zone (driven by the platform drop target).
  final bool dragOver;
  final String label;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final String text = dragOver ? 'Release to upload' : label;
    return Semantics(
      button: true,
      label: hint == null ? text : '$text. $hint',
      excludeSemantics: true,
      onTap: onBrowse,
      child: KmInteractive(
        onTap: onBrowse,
        selected: dragOver,
        builder: (BuildContext context, Set<WidgetState> s) {
          final KmStateColors c = KmStateColors.control(p, s);
          return KmFillBox(
            colors: c,
            disabled: onBrowse == null,
            constraints: const BoxConstraints(minHeight: 96),
            padding: const EdgeInsets.all(KmTokens.s4),
            alignment: Alignment.center,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Icon(Icons.upload_outlined, size: 24, color: c.on),
                const SizedBox(height: KmTokens.s2),
                Text(
                  text,
                  textAlign: TextAlign.center,
                  style: KmText.label(context).copyWith(color: c.on),
                ),
                if (hint != null) ...<Widget>[
                  const SizedBox(height: 2),
                  Text(
                    hint!,
                    textAlign: TextAlign.center,
                    style: KmText.small(context).copyWith(color: c.on),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}
