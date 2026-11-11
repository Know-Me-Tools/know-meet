// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/settings_section.dart';
import '../settings_head.dart';
import '../widgets/settings_choices.dart';
import '../widgets/settings_fields.dart';
import '../widgets/settings_panel.dart';

/// `settings.delivery`: what is sent at meeting close, to whom, how and
/// when. SMS is flagged until Telnyx SMS is connected.
class DeliverySection extends StatelessWidget {
  const DeliverySection({super.key});

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    void preview() => context.go('/settings/templates');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        SettingsHead(
          group: SettingsGroup.recording,
          title: 'Summary delivery',
          description:
              'When a meeting closes, KnowMe generates a summary and action items and sends them with the transcript.',
          actions: <Widget>[
            KmButton(label: 'Preview messages', icon: LucideIcons.eye, onPressed: preview),
          ],
        ),
        const Padding(
          padding: EdgeInsets.only(bottom: KmTokens.s5),
          child: KmCard(
            panel: true,
            child: SettingsToggleRow(
              toggleKey: 'delivery.on',
              title: 'Send automatically at meeting close',
              description: 'Turn off to send summaries yourself from each recording.',
            ),
          ),
        ),
        const SettingsPanel(
          title: 'What to send',
          children: <Widget>[
            SettingsCheckToggle(
              toggleKey: 'delivery.summary',
              label: 'Summary',
              description: 'A short narrative of the meeting and its decisions.',
            ),
            SettingsCheckToggle(
              toggleKey: 'delivery.actions',
              label: 'Action items',
              description: 'Each item with its owner and due date.',
            ),
            SettingsCheckToggle(
              toggleKey: 'delivery.transcript',
              label: 'Full transcript',
              description: 'Speaker-attributed, with timestamps.',
            ),
            SettingsCheckToggle(
              toggleKey: 'delivery.recording',
              label: 'Recording link',
              description: 'Only for recorded meetings.',
            ),
          ],
        ),
        const SettingsPanel(
          title: 'Recipients',
          children: <Widget>[
            SettingsRadioGroup(
              legend: 'Who receives it',
              initial: 'all',
              options: <SettingsRadioOption>[
                SettingsRadioOption(
                  'all',
                  'All participants',
                  description:
                      'Including invitees without a KnowMe account — they open the link without signing in.',
                ),
                SettingsRadioOption('signed-in', 'Only signed-in participants'),
                SettingsRadioOption('me', 'Only me'),
              ],
            ),
          ],
        ),
        SettingsPanel(
          title: 'Channels',
          children: <Widget>[
            const SettingsCheckToggle(
              toggleKey: 'delivery.email',
              label: 'Email',
              description: 'Full summary in the message body.',
            ),
            const SettingsCheckToggle(
              toggleKey: 'delivery.sms',
              label: 'SMS link via Telnyx',
              description: 'Needs Telnyx SMS — not connected yet.',
            ),
            const SizedBox(height: KmTokens.s3),
            SettingsNote(
              tone: SettingsNoteTone.warn,
              icon: LucideIcons.messageSquareText,
              child: Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                children: <Widget>[
                  const Text('SMS links won’t send until you '),
                  Semantics(
                    link: true,
                    label: 'connect Telnyx SMS',
                    excludeSemantics: true,
                    onTap: () => context.go('/settings/telnyx-sms'),
                    child: InkWell(
                      onTap: () => context.go('/settings/telnyx-sms'),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(minHeight: 44),
                        child: Align(
                          widthFactor: 1,
                          child: Text(
                            'connect Telnyx SMS',
                            style: TextStyle(
                              color: p.emberText,
                              decoration: TextDecoration.underline,
                              decorationColor: p.emberText,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const Text('.'),
                ],
              ),
            ),
          ],
        ),
        const SettingsPanel(
          title: 'Timing',
          children: <Widget>[
            SettingsStack(
              children: <Widget>[
                SettingsRadioGroup(
                  legend: 'When to send',
                  initial: 'immediate',
                  options: <SettingsRadioOption>[
                    SettingsRadioOption('immediate', 'Immediately when processing completes'),
                    SettingsRadioOption(
                      'review',
                      'After I review',
                      description: 'Hold summaries until you approve them.',
                    ),
                  ],
                ),
                SettingsSelect(
                  label: 'Links expire after',
                  hint: 'Applies to transcript and recording links for people without an account.',
                  value: '30 days',
                  options: <String>['7 days', '30 days', '90 days', 'Never'],
                ),
              ],
            ),
          ],
        ),
        Wrap(
          spacing: KmTokens.s2,
          runSpacing: KmTokens.s2,
          children: <Widget>[
            KmButton(
              label: 'Save delivery settings',
              icon: LucideIcons.check,
              variant: KmButtonVariant.primary,
              onPressed: () {},
            ),
            KmButton(label: 'Preview', icon: LucideIcons.eye, onPressed: preview),
          ],
        ),
      ],
    );
  }
}
