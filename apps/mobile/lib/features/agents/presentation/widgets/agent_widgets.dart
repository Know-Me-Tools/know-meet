// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';

/// Notice tones (agents.html `.notice`, `-warn`, `-danger`).
enum AgentNoticeTone { info, warn, danger }

/// `.notice`: an icon beside a bold title and copy, on a soft tinted fill.
/// Status is carried by the icon and words, never by colour alone.
class AgentNotice extends StatelessWidget {
  const AgentNotice({
    super.key,
    required this.icon,
    required this.title,
    this.body,
    this.tone = AgentNoticeTone.info,
    this.titleWidget,
  });

  final IconData icon;
  final String title;
  final Widget? titleWidget;
  final Widget? body;
  final AgentNoticeTone tone;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final (Color bg, Color ic) = switch (tone) {
      AgentNoticeTone.info => (p.cyanSoft, p.cyanText),
      AgentNoticeTone.warn => (p.amberSoft, p.amberText),
      AgentNoticeTone.danger => (p.redSoft, p.redText),
    };
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(KmTokens.radius)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.only(top: 1),
            child: ExcludeSemantics(child: Icon(icon, size: 20, color: ic)),
          ),
          const SizedBox(width: KmTokens.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                titleWidget ??
                    Text(
                      title,
                      style: KmText.small(context).copyWith(fontWeight: KmTokens.fontWeightSemibold),
                    ),
                if (body != null) ...<Widget>[const SizedBox(height: KmTokens.s1), body!],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// `.state-line`: a shaped glyph (round `pip-green` dot online, filled
/// `fg-sub` square offline; D-6 replaces the hollow ring) beside the words.
class AgentStateLine extends StatelessWidget {
  const AgentStateLine({super.key, required this.online, required this.label});

  final bool online;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        ExcludeSemantics(
          child: online ? const KmPip(KmPipTone.green) : const KmPausedGlyph(),
        ),
        const SizedBox(width: KmTokens.s2),
        Flexible(
          child: Text(
            label,
            style: KmText.small(context).copyWith(fontWeight: KmTokens.fontWeightSemibold),
          ),
        ),
      ],
    );
  }
}

/// Online / Offline chip; offline uses the filled `fg-sub` square (D-6
/// replaces the hollow pip ring).
class AgentStatusChip extends StatelessWidget {
  const AgentStatusChip({super.key, required this.online});

  final bool online;

  @override
  Widget build(BuildContext context) {
    if (online) return const KmChip('Online', tone: KmChipTone.green, pip: true);
    final KmPalette p = context.km;
    return Container(
      constraints: const BoxConstraints(minHeight: 28),
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: p.muted,
        borderRadius: BorderRadius.circular(KmTokens.radiusPill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const ExcludeSemantics(child: KmPausedGlyph()),
          const SizedBox(width: 6),
          Text('Offline', style: Theme.of(context).textTheme.labelMedium!.copyWith(color: p.fg)),
        ],
      ),
    );
  }
}

/// Inline `code` (km.css `code:not(.code)`).
class AgentCode extends StatelessWidget {
  const AgentCode(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      decoration: BoxDecoration(color: p.muted, borderRadius: BorderRadius.circular(KmTokens.radius6)),
      child: Text(
        text,
        style: KmText.small(context).copyWith(
          fontFamily: KmTokens.fontMono,
          fontSize: KmTokens.textSm * KmTokens.textCodeInlineEm,
          color: p.fg,
        ),
      ),
    );
  }
}

/// `.feature-ic`: a 40px tinted icon tile.
class AgentFeatureIcon extends StatelessWidget {
  const AgentFeatureIcon(this.icon, {super.key, this.cyan = false});

  final IconData icon;
  final bool cyan;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return ExcludeSemantics(
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: cyan ? p.cyanSoft : p.emberSoft,
          borderRadius: BorderRadius.circular(KmTokens.radius),
        ),
        child: Icon(icon, size: 20, color: cyan ? p.cyanText : p.emberText),
      ),
    );
  }
}

/// `.plain-list li.yes|.no`: a check or cross beside a sentence.
class AgentPlainItem extends StatelessWidget {
  const AgentPlainItem(this.text, {super.key, required this.yes});

  final String text;
  final bool yes;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Padding(
      padding: const EdgeInsets.only(bottom: KmTokens.s2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.only(top: 1),
            child: Icon(
              yes ? LucideIcons.check : LucideIcons.x,
              size: 18,
              color: yes ? p.greenText : p.redText,
              semanticLabel: yes ? 'Yes' : 'No',
            ),
          ),
          const SizedBox(width: KmTokens.s2),
          Expanded(child: Text(text, style: KmText.small(context))),
        ],
      ),
    );
  }
}

/// `.fs-legend` with the required asterisk.
class AgentLegend extends StatelessWidget {
  const AgentLegend(this.text, {super.key, this.required = false});

  final String text;
  final bool required;

  @override
  Widget build(BuildContext context) => Text.rich(
    TextSpan(
      text: text,
      style: KmText.label(context),
      children: <InlineSpan>[
        if (required) TextSpan(text: ' *', style: TextStyle(color: context.km.emberText)),
      ],
    ),
    semanticsLabel: required ? '$text, required' : text,
  );
}

/// `.form-note`: "Fields marked * are required."
class AgentRequiredNote extends StatelessWidget {
  const AgentRequiredNote({super.key});

  @override
  Widget build(BuildContext context) => Text.rich(
    TextSpan(
      text: 'Fields marked ',
      style: KmText.smallSub(context),
      children: <InlineSpan>[
        TextSpan(text: '*', style: TextStyle(color: context.km.emberText)),
        const TextSpan(text: ' are required.'),
      ],
    ),
    semanticsLabel: 'Fields marked with an asterisk are required.',
  );
}

/// A ghost text link (`a` in prose), underlined in ember, with a 24px
/// minimum target; hover `card-hov`, keyboard focus the `focus` fill.
class AgentLink extends StatelessWidget {
  const AgentLink(this.label, {super.key, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      link: true,
      label: label,
      excludeSemantics: true,
      onTap: onTap,
      child: KmInteractive(
        onTap: onTap,
        builder: (BuildContext context, Set<WidgetState> s) {
          final KmStateColors c = KmStateColors.quiet(p, s, restOn: p.readable(p.emberText, <Color>[p.amberSoft, p.redSoft, p.emberSoft]));
          return KmFillBox(
            colors: c,
            radius: KmTokens.radius4,
            constraints: const BoxConstraints(minHeight: KmTokens.sizeTargetMin),
            alignment: Alignment.centerLeft,
            child: Text(
              label,
              style: KmText.small(context).copyWith(
                color: c.on,
                decoration: TextDecoration.underline,
                decorationColor: c.on,
              ),
            ),
          );
        },
      ),
    );
  }
}

/// `nav.crumbs` on its own, for heads whose glyph or orb sits between the
/// crumbs and the title (Concierge, dot pages). Each crumb with [onTap] is a
/// link; the last is the current page.
class AgentCrumbs extends StatelessWidget {
  const AgentCrumbs(this.crumbs, {super.key});

  final List<KmCrumb> crumbs;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final TextStyle style = KmText.smallSub(context);
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: 'Breadcrumb',
      child: Wrap(
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 6,
        children: <Widget>[
          for (int i = 0; i < crumbs.length; i++) ...<Widget>[
            if (i > 0) ExcludeSemantics(child: Icon(LucideIcons.chevronRight, size: 14, color: p.fgSub)),
            if (crumbs[i].onTap == null)
              Text(crumbs[i].label, style: style)
            else
              Semantics(
                link: true,
                label: crumbs[i].label,
                excludeSemantics: true,
                onTap: crumbs[i].onTap,
                child: KmInteractive(
                  onTap: crumbs[i].onTap,
                  builder: (BuildContext context, Set<WidgetState> s) {
                    final KmStateColors c = KmStateColors.quiet(p, s);
                    return KmFillBox(
                      colors: c,
                      radius: KmTokens.radius4,
                      constraints: const BoxConstraints(minHeight: KmTokens.sizeTargetMin),
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      alignment: Alignment.center,
                      child: Text(crumbs[i].label, style: style.copyWith(color: c.on)),
                    );
                  },
                ),
              ),
          ],
        ],
      ),
    );
  }
}
