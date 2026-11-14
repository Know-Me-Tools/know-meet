// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';
import 'agent_widgets.dart';

/// One choice of an [AgentOptionGroup].
final class AgentOption<T> {
  const AgentOption(this.value, this.title, [this.description = '']);

  final T value;
  final String title;
  final String description;
}

/// `.option`: a radio or checkbox card, the kit [KmChoiceCard] (D-6: the
/// indicator carries the state, the `ember-soft` fill is supplementary, no
/// ring). Announced as a checked/unchecked control named by its title and
/// description.
class AgentOptionCard extends StatelessWidget {
  const AgentOptionCard({
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

  /// `.card .option`: inside a card/panel the option uses the card fill.
  final bool onCard;

  @override
  Widget build(BuildContext context) => KmChoiceCard(
    title: title,
    description: description,
    selected: selected,
    onTap: onTap,
    multi: multi,
    onCard: onCard,
  );
}

/// `fieldset.fs`: legend, optional hint, then single-select option cards.
class AgentOptionGroup<T> extends StatelessWidget {
  const AgentOptionGroup({
    super.key,
    required this.legend,
    required this.options,
    required this.selected,
    required this.onChanged,
    this.required = false,
    this.hint,
    this.onCard = false,
  });

  final String legend;
  final List<AgentOption<T>> options;
  final T selected;
  final ValueChanged<T> onChanged;
  final bool required;
  final String? hint;
  final bool onCard;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: legend,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          AgentLegend(legend, required: required),
          if (hint != null) ...<Widget>[
            const SizedBox(height: KmTokens.s1),
            Text(hint!, style: KmText.smallSub(context)),
          ],
          const SizedBox(height: KmTokens.s2),
          for (final AgentOption<T> o in options)
            Padding(
              padding: const EdgeInsets.only(bottom: KmTokens.s2),
              child: AgentOptionCard(
                title: o.title,
                description: o.description,
                selected: o.value == selected,
                onCard: onCard,
                onTap: () => onChanged(o.value),
              ),
            ),
        ],
      ),
    );
  }
}

/// A labelled select on the `control` fill (`select.input`, kit [KmSelect]).
class AgentSelectField<T> extends StatelessWidget {
  const AgentSelectField({
    super.key,
    required this.label,
    required this.options,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final List<(T, String)> options;
  final T value;
  final ValueChanged<T?> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        KmFieldLabel(label),
        const SizedBox(height: 6),
        KmSelect<T>(
          label: label,
          value: value,
          options: options,
          onChanged: (T v) => onChanged(v),
        ),
      ],
    );
  }
}

/// States of one connection-test check (agents.html `.check[data-state]`).
enum AgentCheckState { waiting, passed, failed, skipped }

/// `.check`: numbered or iconed badge, title, detail and status word.
class AgentCheckRow extends StatelessWidget {
  const AgentCheckRow({
    super.key,
    required this.index,
    required this.title,
    required this.detail,
    this.state = AgentCheckState.waiting,
  });

  final int index;
  final String title;
  final String detail;
  final AgentCheckState state;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final (Color bg, Color fg, String word) = switch (state) {
      AgentCheckState.waiting => (p.muted, p.fgSub, 'Waiting'),
      AgentCheckState.passed => (p.greenSoft, p.greenText, 'Passed'),
      AgentCheckState.failed => (p.redSoft, p.redText, 'Failed'),
      AgentCheckState.skipped => (p.muted, p.fgSub, 'Skipped'),
    };
    final Widget badge = Container(
      width: 32,
      height: 32,
      alignment: Alignment.center,
      decoration: BoxDecoration(shape: BoxShape.circle, color: bg),
      child: switch (state) {
        AgentCheckState.passed => Icon(LucideIcons.check, size: 16, color: fg),
        AgentCheckState.failed => Icon(LucideIcons.x, size: 16, color: fg),
        _ => Text(
          '${index + 1}',
          style: TextStyle(
            fontFamily: KmTokens.fontMono,
            fontSize: KmTokens.textXs,
            fontWeight: KmTokens.fontWeightSemibold,
            color: fg,
          ),
        ),
      },
    );
    return MergeSemantics(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s3),
        decoration: BoxDecoration(color: p.card, borderRadius: BorderRadius.circular(KmTokens.radius)),
        child: Row(
          children: <Widget>[
            ExcludeSemantics(child: badge),
            const SizedBox(width: KmTokens.s3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(title, style: KmText.label(context)),
                  const SizedBox(height: 2),
                  Text(detail, style: KmText.smallSub(context)),
                  const SizedBox(height: KmTokens.s3),
                  Text(word, style: KmText.label(context).copyWith(color: fg)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
