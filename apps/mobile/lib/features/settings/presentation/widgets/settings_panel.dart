// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';

/// `.panel` with an h2 (text-lg) heading, optional copy and content.
class SettingsPanel extends StatelessWidget {
  const SettingsPanel({
    super.key,
    required this.title,
    required this.children,
    this.description,
    this.trailing,
  });

  final String title;
  final String? description;
  final Widget? trailing;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: KmTokens.s5),
      child: KmCard(
        panel: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Text(title, style: KmText.h3(context)),
                  ),
                ),
                ?trailing,
              ],
            ),
            if (description != null) ...<Widget>[
              const SizedBox(height: 4),
              Text(description!, style: KmText.smallSub(context)),
            ],
            const SizedBox(height: KmTokens.s4),
            ...children,
          ],
        ),
      ),
    );
  }
}

/// Vertical stack with the prototype's `.stack` gap (s4).
class SettingsStack extends StatelessWidget {
  const SettingsStack({super.key, required this.children, this.gap = KmTokens.s4});

  final List<Widget> children;
  final double gap;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: <Widget>[
      for (int i = 0; i < children.length; i++) ...<Widget>[
        if (i > 0) SizedBox(height: gap),
        children[i],
      ],
    ],
  );
}

/// Note tones (`.note-info`, `.note-warn`, `.note-ok`, `.note-err`).
enum SettingsNoteTone { neutral, info, warn, ok, error }

/// `.note`: an icon and copy on a tinted fill. The icon pairs with the
/// tone, so status never depends on colour alone.
class SettingsNote extends StatelessWidget {
  const SettingsNote({
    super.key,
    required this.icon,
    required this.child,
    this.tone = SettingsNoteTone.neutral,
  });

  final IconData icon;
  final SettingsNoteTone tone;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final (Color bg, Color fg) = switch (tone) {
      SettingsNoteTone.neutral => (p.muted, p.fg),
      SettingsNoteTone.info => (p.cyanSoft, p.cyanText),
      SettingsNoteTone.warn => (p.amberSoft, p.amberText),
      SettingsNoteTone.ok => (p.greenSoft, p.greenText),
      SettingsNoteTone.error => (p.redSoft, p.redText),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(KmTokens.radius),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.only(top: 1),
            child: ExcludeSemantics(child: Icon(icon, size: 20, color: fg)),
          ),
          const SizedBox(width: KmTokens.s3),
          Expanded(
            child: DefaultTextStyle.merge(
              style: KmText.small(context).copyWith(color: p.fg),
              child: child,
            ),
          ),
        ],
      ),
    );
  }
}

/// `.form-foot`: buttons and the "* Required" note, wrapping.
class SettingsFormFoot extends StatelessWidget {
  const SettingsFormFoot({super.key, required this.children, this.requiredNote = true});

  final List<Widget> children;
  final bool requiredNote;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: KmTokens.s2),
    child: Wrap(
      spacing: KmTokens.s2,
      runSpacing: KmTokens.s2,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: <Widget>[
        ...children,
        if (requiredNote)
          Text('* Required', style: KmText.xsmall(context).copyWith(color: context.km.fgSub)),
      ],
    ),
  );
}

/// A label over a plain value (`.kv` look used for read-only facts).
class SettingsFact extends StatelessWidget {
  const SettingsFact({super.key, required this.label, required this.value});

  final String label;
  final Widget value;

  @override
  Widget build(BuildContext context) => MergeSemantics(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(label, style: KmText.smallSub(context)),
        const SizedBox(height: 2),
        DefaultTextStyle.merge(style: KmText.small(context), child: value),
      ],
    ),
  );
}
