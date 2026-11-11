// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/session/session.dart';
import '../../../../shared/ui/ui.dart';
import '../../domain/settings_section.dart';
import '../../domain/settings_values.dart';
import '../../domain/sms_stats.dart';
import '../settings_head.dart';
import '../settings_providers.dart';
import '../widgets/settings_fields.dart';
import '../widgets/settings_panel.dart';
import 'templates_previews.dart';

/// Default template text (prototype settings.html `DEF.tpl`).
const String _subject = 'Summary: {meeting}';
const String _intro =
    'Thanks for joining. Here is what we covered, the decisions we made, and who owns each next step.';
const String _smsIntro = 'Your summary for {meeting} is ready:';
const String _inviteSubject = 'Invitation: {meeting} · {date}';
const String _inviteSms = '{host} invited you to {meeting}, {date}.';
const String _shortLink = 'meet.know-me.tools/s/7Qx2';

/// `settings.templates`: summary email, summary SMS and invite templates
/// with live previews filled from the sample meetings.
class TemplatesSection extends ConsumerWidget {
  const TemplatesSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final SettingsSnapshot s = ref.watch(settingsSnapshotProvider);
    final KmUser user = ref.watch(sessionControllerProvider) ?? SessionController.sampleUser;
    final SampleMeeting m = s.summaryMeeting;
    final SampleMeeting next = s.inviteMeeting;
    String fill(String t, SampleMeeting mt) => fillTemplate(
      t,
      meeting: mt.title,
      host: mt.host,
      date: '${formatDay(mt.start)} ${formatTime(mt.start)}',
    );
    final String smsText = '${fill(_smsIntro, m)} $_shortLink Reply STOP to opt out.';
    final String inviteSmsText =
        '${fill(_inviteSms, next)} Join: meet.know-me.tools/j/${next.joinCode} '
        'Dial-in: ${s.dialInNumbers.first.number} PIN ${s.meetingPin}# Reply STOP to opt out.';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        SettingsHead(
          group: SettingsGroup.recording,
          title: 'Message templates',
          description: 'What participants receive. Edit the subject and intro; previews update as you type.',
          actions: <Widget>[
            KmButton(
              label: 'Delivery settings',
              icon: LucideIcons.settings,
              onPressed: () => context.go('/settings/delivery'),
            ),
          ],
        ),
        const _Placeholders(),
        const SizedBox(height: KmTokens.s5),
        SettingsPanel(
          title: 'Summary email',
          description: 'Sent at meeting close to recipients chosen in delivery settings.',
          children: <Widget>[
            SettingsStack(
              children: <Widget>[
                const SettingsField(label: 'Email subject', required: true, value: _subject),
                const SettingsField(label: 'Email intro', required: true, value: _intro, maxLines: 4),
                EmailPreview(
                  semanticLabel: 'Summary email preview',
                  from: 'Know Meet <summaries@know-me.tools>',
                  to: 'avery.chen@northwind.io',
                  subject: fill(_subject, m),
                  body: <Widget>[
                    Text(m.title, style: KmText.h3(context)),
                    Text(
                      '${formatDay(m.start)} · ${formatMinutes(m.durationMin)} · Hosted by ${m.host}',
                      style: KmText.smallSub(context),
                    ),
                    Text(fill(_intro, m)),
                    const EmailSubhead('Summary'),
                    Text(s.summaryText),
                    const EmailSubhead('Action items'),
                    _ActionItems(items: s.actionItems),
                    const Wrap(
                      spacing: KmTokens.s2,
                      runSpacing: KmTokens.s2,
                      children: <Widget>[
                        PreviewButton('Read the transcript', primary: true),
                        PreviewButton('Watch the recording'),
                      ],
                    ),
                    Text(
                      'Links expire in 30 days. You received this because you joined this meeting.',
                      style: KmText.xsmall(context).copyWith(color: context.km.fgSub),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        SettingsPanel(
          title: 'Summary SMS',
          description: 'Sent via Telnyx to participants with a phone number. Keep it to 2 segments.',
          children: <Widget>[
            SettingsStack(
              children: <Widget>[
                const SettingsField(label: 'SMS intro', required: true, value: _smsIntro),
                SmsCounter(SmsStats.of(smsText)),
                SmsPreview(from: s.smsFrom, text: smsText),
              ],
            ),
          ],
        ),
        SettingsPanel(
          title: 'Invites',
          description: 'What invitees receive by email and SMS. Invitees never need an account.',
          children: <Widget>[
            SettingsStack(
              children: <Widget>[
                const SettingsField(label: 'Invite email subject', required: true, value: _inviteSubject),
                const SettingsField(label: 'Invite SMS intro', required: true, value: _inviteSms),
                SmsCounter(SmsStats.of(inviteSmsText)),
                EmailPreview(
                  semanticLabel: 'Invite email preview',
                  from: '${user.name} via Know Meet',
                  to: 'dana@lumenlabs.co',
                  subject: fill(_inviteSubject, next),
                  body: <Widget>[
                    Text(next.title, style: KmText.h3(context)),
                    Text(
                      '${formatDay(next.start)} · ${formatTime(next.start)} · ${formatMinutes(next.durationMin)}',
                    ),
                    const PreviewButton('Join in browser', primary: true),
                    Text.rich(
                      TextSpan(
                        children: <InlineSpan>[
                          const TextSpan(text: 'Or dial '),
                          TextSpan(
                            text: s.dialInNumbers.first.number,
                            style: const TextStyle(fontWeight: KmTokens.fontWeightSemibold),
                          ),
                          const TextSpan(text: ' and enter PIN '),
                          TextSpan(
                            text: '${s.meetingPin}#',
                            style: const TextStyle(fontWeight: KmTokens.fontWeightSemibold),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      'No account needed. This meeting may be recorded and is transcribed live; '
                      'you’ll be asked for consent before recording starts.',
                      style: KmText.xsmall(context).copyWith(color: context.km.fgSub),
                    ),
                  ],
                ),
                SmsPreview(from: s.smsFrom, text: inviteSmsText),
              ],
            ),
          ],
        ),
        SettingsFormFoot(
          children: <Widget>[
            KmButton(
              label: 'Save templates',
              icon: LucideIcons.check,
              variant: KmButtonVariant.primary,
              onPressed: () {},
            ),
            KmButton(label: 'Reset to defaults', variant: KmButtonVariant.ghost, onPressed: () {}),
          ],
        ),
      ],
    );
  }
}

/// `.tokens`: the available placeholders as inline code.
class _Placeholders extends StatelessWidget {
  const _Placeholders();

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      label: 'Available placeholders: meeting, host, date',
      excludeSemantics: true,
      child: Wrap(
        spacing: 6,
        runSpacing: 6,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: <Widget>[
          Text('Placeholders:', style: KmText.smallSub(context)),
          for (final String t in const <String>['{meeting}', '{host}', '{date}'])
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
              decoration: BoxDecoration(
                color: p.muted,
                borderRadius: BorderRadius.circular(KmTokens.radius6),
              ),
              child: Text(t, style: KmText.mono(context)),
            ),
        ],
      ),
    );
  }
}

class _ActionItems extends StatelessWidget {
  const _ActionItems({required this.items});

  final List<SampleActionItem> items;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: <Widget>[
      for (final SampleActionItem a in items)
        Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const SizedBox(width: 18, child: Text('•')),
              Expanded(
                child: Text.rich(
                  TextSpan(
                    children: <InlineSpan>[
                      TextSpan(
                        text: a.title,
                        style: const TextStyle(fontWeight: KmTokens.fontWeightSemibold),
                      ),
                      TextSpan(text: ' — ${a.owner}, due ${a.due}'),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
    ],
  );
}
