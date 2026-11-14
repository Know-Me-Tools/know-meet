// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';

/// `dashboard.empty`: no calendars connected and no meetings yet.
class EmptyDashboardView extends StatelessWidget {
  const EmptyDashboardView({super.key});

  static const List<(String, String)> _steps = <(String, String)>[
    ('Connect a calendar', ' — read your events and add KnowMe links to new ones.'),
    ('Schedule and invite', ' — by email, by SMS, or both.'),
    ('Meet with your agents', ' — the transcript and summary go out when the meeting ends.'),
  ];

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return KmPage(
      children: <Widget>[
        const KmPageHead(
          title: 'Meetings',
          lede: 'No calendars connected and no meetings yet.',
        ),
        Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 640),
            padding: const EdgeInsets.symmetric(horizontal: KmTokens.s5, vertical: KmTokens.s7),
            decoration: BoxDecoration(
              color: p.surface,
              borderRadius: BorderRadius.circular(KmTokens.radiusTile),
            ),
            child: Column(
              children: <Widget>[
                ExcludeSemantics(
                  child: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: p.muted,
                      borderRadius: BorderRadius.circular(KmTokens.radius14),
                    ),
                    child: Icon(LucideIcons.calendar, size: 28, color: p.fgSub),
                  ),
                ),
                const SizedBox(height: KmTokens.s3),
                Semantics(
                  header: true,
                  child: Text(
                    'Connect a calendar to see your meetings here',
                    textAlign: TextAlign.center,
                    style: KmText.h2(context),
                  ),
                ),
                const SizedBox(height: KmTokens.s3),
                Text(
                  'Link Google Calendar, Outlook or any CalDAV calendar and your meetings '
                  'show up in this list. Each event gets a KnowMe join link and phone '
                  'dial-in details, so invitees can join from the browser or a phone — '
                  'no account needed.',
                  textAlign: TextAlign.center,
                  style: KmText.smallSub(context),
                ),
                const SizedBox(height: KmTokens.s4),
                for (int i = 0; i < _steps.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: KmTokens.s3),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        ExcludeSemantics(
                          child: Container(
                            width: 28,
                            height: 28,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(color: p.muted, shape: BoxShape.circle),
                            child: Text(
                              '${i + 1}',
                              style: TextStyle(
                                fontFamily: KmTokens.fontMono,
                                fontSize: KmTokens.textXs,
                                fontWeight: KmTokens.fontWeightSemibold,
                                color: p.fg,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: KmTokens.s3),
                        Expanded(
                          child: Text.rich(
                            TextSpan(
                              text: _steps[i].$1,
                              style: KmText.small(context).copyWith(
                                fontWeight: KmTokens.fontWeightSemibold,
                                color: p.fg,
                              ),
                              children: <InlineSpan>[
                                TextSpan(
                                  text: _steps[i].$2,
                                  style: KmText.smallSub(context),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: KmTokens.s3),
                Wrap(
                  spacing: KmTokens.s2,
                  runSpacing: KmTokens.s2,
                  children: <Widget>[
                    KmButton(
                      label: 'Connect a calendar',
                      icon: LucideIcons.calendar,
                      variant: KmButtonVariant.primary,
                      onPressed: () => context.go('/settings/calendars'),
                    ),
                    KmButton(
                      label: 'Schedule a meeting',
                      icon: LucideIcons.plus,
                      onPressed: () => context.go('/dashboard/schedule'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
