// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/home_content.dart';
import 'home_link.dart';

/// Section 03, "Meet the Concierge".
class ConciergeSection extends StatelessWidget {
  const ConciergeSection({super.key});

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return KmCard(
      panel: true,
      color: p.emberSoft,
      padding: const EdgeInsets.all(KmTokens.s5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          ExcludeSemantics(
            child: SizedBox(
              width: 108,
              height: 100,
              child: Stack(
                children: <Widget>[
                  Positioned(
                    left: 0,
                    top: 4,
                    child: Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        color: p.bg2,
                        borderRadius: BorderRadius.circular(KmTokens.radius28),
                      ),
                      alignment: Alignment.center,
                      child: const KmAgentGlyph('CG', size: 56, system: true),
                    ),
                  ),
                  const Positioned(right: 0, top: 0, child: KmOrb(size: 36)),
                ],
              ),
            ),
          ),
          const SizedBox(height: KmTokens.s4),
          const KmEyebrow('03 — The system agent'),
          const SizedBox(height: KmTokens.s3),
          Semantics(header: true, child: Text('Meet the Concierge', style: KmText.h1(context))),
          const SizedBox(height: KmTokens.s4),
          Text(
            'The Concierge is in every room, including guest rooms. It greets '
            'people as they arrive, explains what’s happening, answers '
            'questions from the live transcript, and tells guests what signing '
            'in would add. It’s the only agent guests get.',
            style: KmText.body(context).copyWith(fontSize: KmTokens.textLg - 1),
          ),
          const SizedBox(height: KmTokens.s5),
          Semantics(
            label: 'What the Concierge does',
            container: true,
            explicitChildNodes: true,
            child: Padding(
              padding: const EdgeInsets.only(left: KmTokens.s6 + KmTokens.s2),
              child: Wrap(
                direction: Axis.vertical,
                spacing: 6,
                children: <Widget>[
                  _ConciergeChip('Greets and orients', fill: p.bg2),
                  _ConciergeChip('Answers from the live transcript', fill: p.bg2),
                  _ConciergeChip('Routes questions to the right agent', fill: p.bg2),
                ],
              ),
            ),
          ),
          const SizedBox(height: KmTokens.s5),
          KmButton(
            label: 'About the Concierge',
            trailingIcon: LucideIcons.chevronRight,
            variant: KmButtonVariant.primary,
            onPressed: () => context.go('/agents/concierge'),
          ),
          const SizedBox(height: KmTokens.s2),
          KmButton(
            label: 'Try it as a guest',
            icon: LucideIcons.video,
            onPressed: () => context.go('/meet/room-guest'),
          ),
        ],
      ),
    );
  }
}

class _ConciergeChip extends StatelessWidget {
  const _ConciergeChip(this.label, {required this.fill});

  final String label;
  final Color fill;

  @override
  Widget build(BuildContext context) => Container(
    constraints: const BoxConstraints(minHeight: 28),
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: fill,
      borderRadius: BorderRadius.circular(KmTokens.radiusPill),
    ),
    child: Text(label, style: Theme.of(context).textTheme.labelMedium),
  );
}

/// Section 04, "How a meeting flows": four linked step cards.
class FlowSection extends StatelessWidget {
  const FlowSection({super.key, required this.steps});

  final List<FlowStep> steps;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const HomeSectionHead(
          eyebrow: '04 — Start to finish',
          title: 'How a meeting flows',
          body: 'Four steps, each one a screen you can open now.',
        ),
        for (final FlowStep s in steps) _FlowCard(step: s),
      ],
    );
  }
}

class _FlowCard extends StatelessWidget {
  const _FlowCard({required this.step});

  final FlowStep step;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    void open() => context.go(step.location);
    return Padding(
      padding: const EdgeInsets.only(bottom: KmTokens.s3),
      child: Semantics(
        link: true,
        label: '${step.number} ${step.title}. ${step.body} ${step.linkLabel}',
        excludeSemantics: true,
        onTap: open,
        child: KmInteractive(
          onTap: open,
          builder: (BuildContext context, Set<WidgetState> s) {
            final KmStateColors c = KmStateColors.resolve(
              p,
              s,
              rest: p.surface,
              restOn: p.fg,
              hover: p.cardHov,
            );
            final bool focused = s.contains(WidgetState.focused);
            final Color accent = focused ? c.on : p.emberText;
            return KmFillBox(
              colors: c,
              radius: KmTokens.radiusTile,
              padding: const EdgeInsets.all(KmTokens.s5),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(step.number, style: KmText.mono(context).copyWith(color: accent)),
                  const SizedBox(height: KmTokens.s3),
                  Text(
                    step.title,
                    style: KmText.displayAt(context, size: KmTokens.textLg, color: c.on),
                  ),
                  const SizedBox(height: KmTokens.s2),
                  Text(
                    step.body,
                    style: KmText.sub(context).copyWith(
                      fontSize: KmTokens.text15,
                      color: focused ? c.on : p.fgSub,
                    ),
                  ),
                  const SizedBox(height: KmTokens.s4),
                  Row(
                    children: <Widget>[
                      Text(step.linkLabel, style: KmText.label(context).copyWith(color: accent)),
                      const SizedBox(width: KmTokens.s2),
                      Icon(LucideIcons.chevronRight, size: 16, color: accent),
                    ],
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

/// `.site-foot`: brand, the prototype note and footer links. The
/// prototype's "All screens" index has no app equivalent and is omitted.
class HomeFooter extends StatelessWidget {
  const HomeFooter({super.key});

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        const Row(
          children: <Widget>[KmBrandMark(), SizedBox(width: 10), KmBrandWord(size: 16)],
        ),
        const SizedBox(height: KmTokens.s3),
        Text(
          'Prototype. Meetings, agents, recordings, SMS, phone and calendar '
          'connections on these pages are simulated with fictional sample '
          'data — nothing is sent or stored outside this browser.',
          style: KmText.xsmall(context).copyWith(color: p.fgSub),
        ),
        const SizedBox(height: KmTokens.s4),
        Semantics(
          label: 'Footer',
          container: true,
          explicitChildNodes: true,
          child: Wrap(
            spacing: KmTokens.s5,
            children: <Widget>[
              HomeLink('Agents', onTap: () => context.go('/agents')),
              HomeLink('Settings', onTap: () => context.go('/settings')),
              HomeLink('Join as invitee', onTap: () => context.go('/join/invite')),
            ],
          ),
        ),
      ],
    );
  }
}
