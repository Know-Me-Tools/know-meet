// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';

/// `#empty` (state `recordings.empty`): no recordings yet, with how each
/// recording is processed and where to start.
class RecordingsEmptyScreen extends StatelessWidget {
  const RecordingsEmptyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return KmPage(
      children: <Widget>[
        const KmPageHead(eyebrow: 'Library', title: 'Recordings'),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: KmTokens.s5, vertical: KmTokens.s6),
          decoration: BoxDecoration(
            color: p.surface,
            borderRadius: BorderRadius.circular(KmTokens.radiusTile),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              ExcludeSemantics(
                child: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: p.muted,
                    borderRadius: BorderRadius.circular(KmTokens.radius14),
                  ),
                  child: Icon(LucideIcons.film, color: p.fgSub),
                ),
              ),
              const SizedBox(height: KmTokens.s4),
              Semantics(
                header: true,
                child: Text('No recordings yet', style: KmText.h2(context)),
              ),
              const SizedBox(height: KmTokens.s4),
              Text(
                'When you record a meeting you host, it shows up here with its '
                'transcript and summary. Here is what happens to each recording:',
                style: KmText.smallSub(context),
              ),
              const SizedBox(height: KmTokens.s4),
              const _HowItem(
                icon: LucideIcons.circleDot,
                title: 'Recorded as one composite',
                body:
                    'LiveKit Egress records every participant in a single Room '
                    'Composite layout, after everyone in the room consents.',
              ),
              const _HowItem(
                icon: LucideIcons.database,
                title: 'Saved to S3-compatible storage',
                body: 'KnowMe-managed by default, or your own bucket.',
              ),
              const _HowItem(
                icon: LucideIcons.globe,
                title: 'Pinned to IPFS',
                body: 'A post-recording job pins the file and keeps its content ID (CID).',
              ),
              const _HowItem(
                icon: LucideIcons.send,
                title: 'Summary and transcript sent',
                body:
                    'Participants get them by email, or an SMS link, when the '
                    'meeting closes.',
              ),
              const SizedBox(height: KmTokens.s1),
              Wrap(
                spacing: KmTokens.s2,
                runSpacing: KmTokens.s2,
                children: <Widget>[
                  KmButton(
                    label: 'Start a meeting',
                    icon: LucideIcons.video,
                    variant: KmButtonVariant.primary,
                    onPressed: () => context.go('/meet/room'),
                  ),
                  KmButton(
                    label: 'Recording settings',
                    icon: LucideIcons.settings,
                    onPressed: () => context.go('/settings/recording'),
                  ),
                  KmButton(
                    label: 'Choose storage',
                    icon: LucideIcons.database,
                    variant: KmButtonVariant.ghost,
                    onPressed: () => context.go('/settings/storage'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// `.how li`: numbered-by-icon pipeline step.
class _HowItem extends StatelessWidget {
  const _HowItem({required this.icon, required this.title, required this.body});

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Padding(
      padding: const EdgeInsets.only(bottom: KmTokens.s3),
      child: MergeSemantics(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            ExcludeSemantics(
              child: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: p.muted,
                  borderRadius: BorderRadius.circular(KmTokens.radius),
                ),
                child: Icon(icon, size: 20, color: p.fg),
              ),
            ),
            const SizedBox(width: KmTokens.s3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    title,
                    style: KmText.body(context).copyWith(fontWeight: KmTokens.fontWeightSemibold),
                  ),
                  Text(body, style: KmText.smallSub(context)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
