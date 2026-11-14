// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/home_content.dart';
import 'feature_card.dart';
import 'home_link.dart';

/// Section 01, "What happens in a KnowMe meeting": the nine feature cards,
/// stacked at phone width as the prototype's bento collapses to one column.
class FeatureBento extends StatelessWidget {
  const FeatureBento({super.key, required this.content});

  final HomeContent content;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    void go(String location) => context.go(location);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const HomeSectionHead(
          eyebrow: '01 — Inside the room',
          title: 'What happens in a KnowMe meeting',
          body:
              'Every room is a LiveKit room with agents as real participants. '
              'They hear the same audio, read the same transcript, and work '
              'from the same shared knowledge — so the work after the meeting '
              'is already done when it ends.',
        ),
        FeatureCard(
          eyebrow: 'Persistent dots',
          title: 'A dot that remembers you across every meeting',
          body:
              'A dot is your always-on personal agent with its own private '
              'memory. Iris joins your calls, recalls what was decided last '
              'time, and keeps notes only you can read. Your colleagues bring '
              'theirs — Avery’s is Sol.',
          footer: <Widget>[
            const SignInChip(),
            HomeLink('How dots work', onTap: () => go('/agents/dots')),
          ],
          after: const _DotsPair(),
        ),
        FeatureCard(
          icon: LucideIcons.bot,
          title: 'Dispatch registered agents into the room',
          body:
              'Register your own LiveKit agent workers once, then add them to '
              'any meeting mid-call.',
          extra: Column(
            children: <Widget>[
              for (final AgentTeaser a in content.agents)
                Padding(
                  padding: const EdgeInsets.only(bottom: KmTokens.s2),
                  child: Row(
                    children: <Widget>[
                      KmAgentGlyph(a.glyph, size: 40),
                      const SizedBox(width: KmTokens.s3),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Text(a.name, style: KmText.label(context)),
                            Text(a.role, style: KmText.xsmall(context).copyWith(color: p.fgSub)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          footer: <Widget>[
            const SignInChip(),
            HomeLink('Agent registry', onTap: () => go('/agents/registry')),
          ],
        ),
        FeatureCard(
          icon: LucideIcons.eyeOff,
          title: 'A private agent panel only you see',
          body:
              'Ask your dot or an agent a question mid-meeting without '
              'interrupting. Nobody else sees the thread.',
          extra: ExcludeSemantics(
            child: Container(
              padding: const EdgeInsets.all(KmTokens.s3),
              decoration: BoxDecoration(
                color: p.card,
                borderRadius: BorderRadius.circular(KmTokens.radius),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const KmEyebrow('Only you · Iris'),
                  const SizedBox(height: KmTokens.s1),
                  Text('What did Marcus commit to on Oct 14?', style: KmText.small(context)),
                ],
              ),
            ),
          ),
          footer: const <Widget>[SignInChip()],
        ),
        const FeatureCard(
          icon: LucideIcons.bookOpen,
          title: 'Shared meeting knowledge',
          body:
              'Files you upload and every transcript segment feed one knowledge '
              'base that all agents in the room can read — including the '
              'Concierge.',
          footer: <Widget>[
            SignInChip(label: 'Uploads: sign-in'),
            KmChip('Live transcript: guests too', tone: KmChipTone.green, icon: LucideIcons.check),
          ],
        ),
        FeatureCard(
          icon: LucideIcons.circleDot,
          title: 'Record and transcribe on the fly',
          body:
              'Start recording any time. LiveKit Room Composite egress captures '
              'everyone in one layout as MP4 or HLS, with consent asked in the '
              'room.',
          footer: <Widget>[
            const SignInChip(),
            HomeLink('See the consent prompt', onTap: () => go('/meet/room')),
          ],
        ),
        FeatureCard(
          icon: LucideIcons.send,
          title: 'Transcript, summary and action items, sent at close',
          body:
              'When the host ends the meeting, KnowMe writes the summary and '
              'action items and delivers them to every participant '
              'automatically, per your delivery settings.',
          extra: const Column(
            children: <Widget>[
              IconLine(icon: LucideIcons.mail, label: 'Email with transcript and summary attached'),
              IconLine(icon: LucideIcons.messageSquareText, label: 'SMS with a link to the summary'),
            ],
          ),
          footer: <Widget>[
            const SignInChip(),
            HomeLink('Delivery settings', onTap: () => go('/settings/delivery')),
          ],
        ),
        FeatureCard(
          icon: LucideIcons.database,
          title: 'Recall the whole session',
          body:
              'The combined video lands in S3-compatible storage, then KnowMe '
              'pins it to IPFS and keeps the CID with the transcript. Use '
              'KnowMe-managed storage or bring your own bucket and pinning '
              'service.',
          extra: _CidBox(cid: content.sampleCid),
          footer: <Widget>[
            const SignInChip(),
            HomeLink(
              'Open a stored recording',
              onTap: () => go('/recordings/detail/partner-onboarding-1014/storage'),
            ),
          ],
        ),
        FeatureCard(
          icon: LucideIcons.calendar,
          title: 'Your calendars, connected',
          body:
              'Meetings you schedule land on the calendar you already use, with '
              'the join link and dial-in attached.',
          extra: const Wrap(
            spacing: 6,
            runSpacing: 6,
            children: <Widget>[
              KmChip('Google Calendar'),
              KmChip('Microsoft 365 / Outlook'),
              KmChip('iCloud / CalDAV'),
            ],
          ),
          footer: <Widget>[
            const SignInChip(),
            HomeLink('Connect a calendar', onTap: () => go('/settings/calendars')),
          ],
        ),
        FeatureCard(
          icon: LucideIcons.users,
          title: 'Invite anyone — no account required',
          body:
              'Invitees open a link and join in the browser, or call in. Phone '
              'callers come in through a Telnyx SIP trunk and join audio-only '
              'with a PIN.',
          footer: <Widget>[
            const KmChip('Invitees: no account', tone: KmChipTone.green, icon: LucideIcons.check),
            HomeLink('See what invitees see', onTap: () => go('/join/invite')),
          ],
          after: const _InviteChannels(),
        ),
      ],
    );
  }
}

class _DotsPair extends StatelessWidget {
  const _DotsPair();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.only(top: KmTokens.s2),
      child: Row(
        children: <Widget>[
          Expanded(child: _DotCard(name: 'Iris', caption: 'Your dot', cyan: false)),
          SizedBox(width: KmTokens.s3),
          Expanded(child: _DotCard(name: 'Sol', caption: 'Avery’s dot', cyan: true)),
        ],
      ),
    );
  }
}

class _DotCard extends StatelessWidget {
  const _DotCard({required this.name, required this.caption, required this.cyan});

  final String name;
  final String caption;
  final bool cyan;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: KmTokens.s4),
      decoration: BoxDecoration(
        color: context.km.bg2,
        borderRadius: BorderRadius.circular(KmTokens.radius14),
      ),
      child: Column(
        children: <Widget>[
          KmOrb(size: 80, cyan: cyan),
          const SizedBox(height: KmTokens.s4),
          Text(name, style: KmText.displayAt(context, size: KmTokens.textBase)),
          const SizedBox(height: KmTokens.s2),
          Text(caption, style: KmText.xsmall(context).copyWith(color: context.km.fgSub)),
        ],
      ),
    );
  }
}

class _CidBox extends StatelessWidget {
  const _CidBox({required this.cid});

  final String cid;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Container(
      padding: const EdgeInsets.all(KmTokens.s3),
      decoration: BoxDecoration(
        color: p.card,
        borderRadius: BorderRadius.circular(KmTokens.radius),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text('IPFS CID · Partner onboarding review', style: KmText.xsmall(context).copyWith(color: p.fgSub)),
          const SizedBox(height: 2),
          Text(cid, maxLines: 1, overflow: TextOverflow.ellipsis, style: KmText.mono(context)),
        ],
      ),
    );
  }
}

/// `.channels` of the invite card.
class _InviteChannels extends StatelessWidget {
  const _InviteChannels();

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: <Widget>[
        IconLine(icon: LucideIcons.mail, label: 'Email', tile: true),
        IconLine(icon: LucideIcons.messageSquareText, label: 'SMS', tile: true),
        IconLine(icon: LucideIcons.calendar, label: 'Calendar invite', tile: true),
        IconLine(icon: LucideIcons.phoneIncoming, label: 'Phone dial-in', tile: true),
      ],
    );
  }
}
