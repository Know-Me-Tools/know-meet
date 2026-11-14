// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/settings_values.dart';

/// `.checks`: connection-check rows. Each state pairs an icon and a word
/// with its colour (never colour alone) and is announced as one line.
class SettingsCheckList extends StatelessWidget {
  const SettingsCheckList({super.key, required this.steps});

  final List<CheckStep> steps;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: <Widget>[
      for (int i = 0; i < steps.length; i++) ...<Widget>[
        if (i > 0) const SizedBox(height: KmTokens.s2),
        _CheckRow(steps[i]),
      ],
    ],
  );
}

class _CheckRow extends StatelessWidget {
  const _CheckRow(this.step);

  final CheckStep step;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final (Color bg, Color fg, IconData icon, String word) = switch (step.state) {
      CheckState.passed => (p.greenSoft, p.greenText, LucideIcons.check, 'Passed'),
      CheckState.active => (p.greenSoft, p.greenText, LucideIcons.check, 'Active'),
      CheckState.failed => (p.redSoft, p.redText, LucideIcons.circleAlert, 'Failed'),
      CheckState.skipped => (p.muted, p.fgSub, LucideIcons.circleMinus, 'Skipped'),
    };
    return Semantics(
      label: '${step.label}: $word. ${step.detail}',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s3),
        decoration: BoxDecoration(
          color: p.bg2,
          borderRadius: BorderRadius.circular(KmTokens.radius),
        ),
        child: Row(
          children: <Widget>[
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
              child: Icon(icon, size: 18, color: fg),
            ),
            const SizedBox(width: KmTokens.s3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    step.label,
                    style: KmText.body(context).copyWith(fontWeight: KmTokens.fontWeightSemibold),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    step.detail,
                    style: KmText.small(context).copyWith(
                      color: step.state == CheckState.failed ? p.fg : p.fgSub,
                    ),
                  ),
                  const SizedBox(height: KmTokens.s3),
                  Text(
                    word,
                    style: KmText.label(context).copyWith(
                      color: step.state == CheckState.skipped ? p.fgSub : fg,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// `.link-card`: a surface row linking to a sub-page, with a status chip.
class SettingsLinkCard extends StatelessWidget {
  const SettingsLinkCard({
    super.key,
    required this.icon,
    required this.title,
    required this.detail,
    required this.chip,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String detail;
  final Widget chip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      button: true,
      label: '$title, $detail',
      onTap: onTap,
      excludeSemantics: true,
      child: KmInteractive(
        onTap: onTap,
        builder: (BuildContext context, Set<WidgetState> s) {
          final KmStateColors c = KmStateColors.resolve(
            p,
            s,
            rest: p.surface,
            restOn: p.fg,
            hover: p.cardHov,
          );
          final bool focused = s.contains(WidgetState.focused);
          return KmFillBox(
            colors: c,
            radius: KmTokens.radiusTile,
            padding: const EdgeInsets.all(KmTokens.s4),
            child: Row(
              children: <Widget>[
                KmLeadIcon(icon),
                const SizedBox(width: KmTokens.s3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        title,
                        style: KmText.h3(context).copyWith(fontSize: KmTokens.textBase, color: c.on),
                      ),
                      Text(
                        detail,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: KmText.small(context).copyWith(color: focused ? c.on : p.fgSub),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: KmTokens.s3),
                chip,
                const SizedBox(width: KmTokens.s2),
                Icon(LucideIcons.chevronRight, size: 18, color: focused ? c.on : p.fgSub),
              ],
            ),
          );
        },
      ),
    );
  }
}
