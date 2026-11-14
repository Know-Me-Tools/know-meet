// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/invitation.dart';
import 'join_chrome.dart';

/// "Join by phone": dial-in numbers, the PIN and a copy-all button.
class PhoneCard extends StatelessWidget {
  const PhoneCard({super.key, required this.invite});

  final Invitation invite;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final String all = <String>[
      invite.title,
      for (final DialInNumber d in invite.dialIn) '${d.region}: ${d.number}',
      'PIN: ${invite.pin}#',
    ].join('\n');
    return KmCard(
      panel: true,
      padding: const EdgeInsets.all(KmTokens.s5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              ExcludeSemantics(
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: p.greenSoft,
                    borderRadius: BorderRadius.circular(KmTokens.radius10),
                  ),
                  child: Icon(LucideIcons.phoneIncoming, size: 20, color: p.greenText),
                ),
              ),
              const SizedBox(width: KmTokens.s3),
              Semantics(header: true, child: Text('Join by phone', style: KmText.h3(context))),
            ],
          ),
          const SizedBox(height: KmTokens.s3),
          Text(
            'Call one of these numbers and enter the PIN followed by #. Phone '
            'callers join audio-only: you’ll hear everyone, including the '
            'agents, and appear as a phone tile.',
            style: KmText.smallSub(context),
          ),
          const SizedBox(height: KmTokens.s3),
          for (final DialInNumber d in invite.dialIn)
            _CopyRow(
              caption: d.region,
              value: d.number,
              copyLabel: 'Copy ${d.region} dial-in number',
              onCopy: () => copyWithNotice(context, d.number, 'Copied ${d.region} dial-in number'),
            ),
          _CopyRow(
            caption: 'Meeting PIN',
            value: '${invite.pin} #',
            large: true,
            copyLabel: 'Copy meeting PIN',
            onCopy: () => copyWithNotice(
              context,
              '${invite.pin.replaceAll(' ', '')}#',
              'Copied meeting PIN',
            ),
          ),
          KmButton(
            label: 'Copy all dial-in details',
            icon: LucideIcons.copy,
            size: KmButtonSize.small,
            block: true,
            onPressed: () => copyWithNotice(context, all, 'Copied dial-in details'),
          ),
        ],
      ),
    );
  }
}

class _CopyRow extends StatelessWidget {
  const _CopyRow({
    required this.caption,
    required this.value,
    required this.copyLabel,
    required this.onCopy,
    this.large = false,
  });

  final String caption;
  final String value;
  final String copyLabel;
  final VoidCallback onCopy;
  final bool large;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Container(
      margin: const EdgeInsets.only(bottom: KmTokens.s2),
      padding: const EdgeInsets.fromLTRB(KmTokens.s4, KmTokens.s2, KmTokens.s2, KmTokens.s2),
      decoration: BoxDecoration(
        color: p.card,
        borderRadius: BorderRadius.circular(KmTokens.radius),
      ),
      child: Row(
        children: <Widget>[
          Expanded(
            child: MergeSemantics(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(caption, style: KmText.xsmall(context).copyWith(color: p.fgSub)),
                  Text(
                    value,
                    style: KmText.mono(context).copyWith(
                      fontSize: large ? KmTokens.text22 : KmTokens.text15,
                      color: p.fg,
                    ),
                  ),
                ],
              ),
            ),
          ),
          KmIconButton(icon: LucideIcons.copy, label: copyLabel, onPressed: onCopy),
        ],
      ),
    );
  }
}

/// "Meeting link": the code and copy / calendar actions.
class LinkCard extends StatelessWidget {
  const LinkCard({super.key, required this.invite});

  final Invitation invite;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return KmCard(
      panel: true,
      padding: const EdgeInsets.all(KmTokens.s5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(LucideIcons.link, size: 18, color: p.fg),
              const SizedBox(width: KmTokens.s2),
              Semantics(header: true, child: Text('Meeting link', style: KmText.h3(context))),
            ],
          ),
          const SizedBox(height: KmTokens.s2),
          Text.rich(
            TextSpan(
              text: 'Code ',
              children: <InlineSpan>[
                WidgetSpan(
                  alignment: PlaceholderAlignment.middle,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                    decoration: BoxDecoration(
                      color: p.muted,
                      borderRadius: BorderRadius.circular(KmTokens.radius6),
                    ),
                    child: Text(
                      invite.joinCode,
                      style: KmText.mono(context).copyWith(fontSize: KmTokens.textXs),
                    ),
                  ),
                ),
                const TextSpan(text: ' · works in any modern browser on desktop or phone.'),
              ],
            ),
            style: KmText.smallSub(context),
          ),
          const SizedBox(height: KmTokens.s3),
          Wrap(
            spacing: KmTokens.s2,
            runSpacing: KmTokens.s2,
            children: <Widget>[
              KmButton(
                label: 'Copy link',
                icon: LucideIcons.copy,
                size: KmButtonSize.small,
                // No public join URL exists yet (contract exclusion): copy the code.
                onPressed: () => copyWithNotice(context, invite.joinCode, 'Copied meeting code'),
              ),
              KmButton(
                label: 'Download .ics',
                icon: LucideIcons.download,
                size: KmButtonSize.small,
                onPressed: () => showCalendarUnavailable(context),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
