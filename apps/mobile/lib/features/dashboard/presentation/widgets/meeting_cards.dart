// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../application/meetings_repository.dart';
import '../../domain/meeting.dart';
import '../dashboard_format.dart';
import 'dash_bits.dart';

/// `.live-banner`: the meeting happening now.
class LiveBanner extends StatelessWidget {
  const LiveBanner({super.key, required this.meeting, required this.now});

  final Meeting meeting;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final int mins = now.difference(meeting.start).inMinutes < 1
        ? 1
        : (now.difference(meeting.start).inSeconds / 60).round();
    final String sub = 'Started $mins min ago · ${meeting.invitees.length} invitees'
        '${meeting.record ? ' · Recording on' : ''}';
    return Container(
      margin: const EdgeInsets.only(bottom: KmTokens.s5),
      padding: const EdgeInsets.symmetric(horizontal: KmTokens.s5, vertical: KmTokens.s4),
      decoration: BoxDecoration(
        color: p.emberSoft,
        borderRadius: BorderRadius.circular(KmTokens.radiusTile),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const LivePip(),
              const SizedBox(width: KmTokens.s4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    const KmEyebrow('Live now'),
                    const SizedBox(height: 2),
                    Semantics(
                      header: true,
                      child: Text(
                        meeting.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: KmText.h3(context),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(sub, style: KmText.smallSub(context)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: KmTokens.s4),
          Wrap(
            spacing: KmTokens.s2,
            runSpacing: KmTokens.s2,
            children: <Widget>[
              KmButton(
                label: 'Details',
                variant: KmButtonVariant.ghost,
                size: KmButtonSize.small,
                onPressed: () => context.go('/dashboard/meeting/${meeting.id}'),
              ),
              KmButton(
                label: 'Join',
                icon: LucideIcons.video,
                variant: KmButtonVariant.primary,
                onPressed: () => context.go('/meet/room'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// `.live-pip`: an ember dot with an expanding ring; static under reduced
/// motion. Decorative (the "Live now" text carries the meaning).
class LivePip extends StatefulWidget {
  const LivePip({super.key});

  @override
  State<LivePip> createState() => _LivePipState();
}

class _LivePipState extends State<LivePip> with SingleTickerProviderStateMixin {
  late final AnimationController _ring = AnimationController(
    vsync: this,
    duration: KmTokens.animLiveRing,
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (KmMotion.loopsAllowed(context)) {
      if (!_ring.isAnimating) _ring.repeat();
    } else {
      _ring
        ..stop()
        ..value = 0;
    }
  }

  @override
  void dispose() {
    _ring.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final Color ember = context.km.ember;
    return ExcludeSemantics(
      child: SizedBox.square(
        dimension: 12,
        child: AnimatedBuilder(
          animation: _ring,
          builder: (BuildContext context, Widget? child) {
            final double t = KmTokens.easeOut.transform(_ring.value);
            return Stack(
              clipBehavior: Clip.none,
              children: <Widget>[
                if (_ring.isAnimating)
                  Transform.scale(
                    scale: 1 + 1.6 * t,
                    child: Opacity(
                      opacity: 0.6 * (1 - t),
                      child: DecoratedBox(
                        decoration: BoxDecoration(color: ember, shape: BoxShape.circle),
                        child: const SizedBox.square(dimension: 12),
                      ),
                    ),
                  ),
                DecoratedBox(
                  decoration: BoxDecoration(color: ember, shape: BoxShape.circle),
                  child: const SizedBox.square(dimension: 12),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

/// `.mt-row` at phone width: time + duration, title, meta cluster, actions.
class MeetingCard extends StatelessWidget {
  const MeetingCard({super.key, required this.meeting, required this.repository});

  final Meeting meeting;
  final MeetingsRepository repository;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final Meeting m = meeting;
    final List<Widget> agents = <Widget>[
      for (final String id in m.agentIds.where((String a) => a != 'concierge'))
        if (repository.agent(id) != null)
          KmChip(repository.agent(id)!.name, tone: KmChipTone.cyan, icon: LucideIcons.bot),
    ];
    return Semantics(
      container: true,
      label: '${m.title}, ${DashFormat.time(m.start)}',
      explicitChildNodes: true,
      child: Container(
        padding: const EdgeInsets.all(KmTokens.s4),
        decoration: BoxDecoration(
          color: p.surface,
          borderRadius: BorderRadius.circular(KmTokens.radius),
          boxShadow: p.shadowCard,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: <Widget>[
                Text(
                  DashFormat.time(m.start),
                  style: KmText.displayAt(context, size: KmTokens.textBase),
                ),
                const SizedBox(width: KmTokens.s2),
                Text(DashFormat.mins(m.durationMin), style: KmText.smallSub(context)),
              ],
            ),
            const SizedBox(height: KmTokens.s3),
            Semantics(
              link: true,
              label: m.title,
              excludeSemantics: true,
              onTap: () => context.go('/dashboard/meeting/${m.id}'),
              child: InkWell(
                onTap: () => context.go('/dashboard/meeting/${m.id}'),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 44),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      m.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: KmText.body(context).copyWith(fontWeight: KmTokens.fontWeightSemibold),
                    ),
                  ),
                ),
              ),
            ),
            Wrap(
              spacing: KmTokens.s2,
              runSpacing: KmTokens.s2,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: <Widget>[
                SourceChip(m.source),
                AvatarStack(m.invitees),
                if (m.record) const MetaItem(icon: LucideIcons.circleDot, text: 'Recording on'),
                if (m.dialIn != null) const MetaItem(icon: LucideIcons.phoneIncoming, text: 'Dial-in'),
                if (!m.isHostedBy(repository.ownerName))
                  MetaItem(icon: LucideIcons.user, text: 'Host: ${m.host}'),
                ...agents,
              ],
            ),
            const SizedBox(height: KmTokens.s3),
            Wrap(
              spacing: KmTokens.s2,
              runSpacing: KmTokens.s2,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: <Widget>[
                KmButton(
                  label: 'Join',
                  icon: LucideIcons.video,
                  size: KmButtonSize.small,
                  onPressed: () => context.go('/meet/room'),
                ),
                CopyLinkButton(meeting: m),
                KmIconButton(
                  icon: LucideIcons.chevronRight,
                  label: 'Open details for ${m.title}',
                  onPressed: () => context.go('/dashboard/meeting/${m.id}'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
