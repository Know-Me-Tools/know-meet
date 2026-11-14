// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/settings_section.dart';
import '../../domain/settings_values.dart';
import '../settings_head.dart';
import '../settings_providers.dart';
import '../widgets/settings_checks.dart';
import '../widgets/settings_fields.dart';
import '../widgets/settings_panel.dart';

/// `settings.telnyx-voice`: inbound-only dial-in numbers, the SIP trunk to
/// LiveKit, status and test-call steps.
class TelnyxVoiceSection extends ConsumerWidget {
  const TelnyxVoiceSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final SettingsSnapshot s = ref.watch(settingsSnapshotProvider);
    final int active = s.dialInNumbers.where((DialInNumber n) => n.active).length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const SettingsHead(
          group: SettingsGroup.connections,
          title: 'Telnyx voice dial-in',
          description:
              'Let people join from any phone. Telnyx numbers route inbound calls over SIP into '
              'LiveKit, where the caller enters a meeting PIN.',
        ),
        SettingsNote(
          tone: SettingsNoteTone.info,
          icon: LucideIcons.phoneIncoming,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                'Inbound only.',
                style: KmText.label(context),
              ),
              const SizedBox(height: KmTokens.s2),
              const Text(
                'KnowMe never places outbound calls — there is no dial-out or “call a phone” '
                'feature. Callers dial in to your numbers.',
              ),
            ],
          ),
        ),
        const SizedBox(height: KmTokens.s5),
        SettingsPanel(
          title: 'Dial-in numbers',
          description: 'Shown in invites alongside the meeting PIN.',
          children: <Widget>[
            Align(
              alignment: Alignment.centerLeft,
              child: KmButton(
                label: 'Add number',
                icon: LucideIcons.plus,
                variant: KmButtonVariant.primary,
                size: KmButtonSize.small,
                onPressed: () {},
              ),
            ),
            const SizedBox(height: KmTokens.s4),
            _NumbersTable(numbers: s.dialInNumbers),
          ],
        ),
        SettingsPanel(
          title: 'SIP trunk to LiveKit',
          description:
              'Calls arrive on a Telnyx SIP connection and are handed to a LiveKit inbound trunk.',
          children: <Widget>[
            SettingsStack(
              children: <Widget>[
                SettingsField(
                  label: 'Telnyx SIP connection name',
                  required: true,
                  mono: true,
                  hint: 'The SIP connection in Telnyx that your numbers are assigned to.',
                  value: s.sipConnection,
                ),
                SettingsField(
                  label: 'LiveKit inbound trunk ID',
                  readOnly: true,
                  mono: true,
                  copyable: true,
                  hint: 'Created by KnowMe on your LiveKit project (sample ID).',
                  value: s.inboundTrunkId,
                ),
                const SettingsFact(
                  label: 'Dispatch rule',
                  value: Text.rich(
                    TextSpan(
                      children: <InlineSpan>[
                        TextSpan(
                          text: 'PIN-based. ',
                          style: TextStyle(fontWeight: KmTokens.fontWeightSemibold),
                        ),
                        TextSpan(
                          text: 'The caller enters the meeting PIN and is routed to that '
                              'meeting’s LiveKit room as a phone participant.',
                        ),
                      ],
                    ),
                  ),
                ),
                const SettingsFact(
                  label: 'Wrong PIN',
                  value: Text('Callers get three tries, then the call ends.'),
                ),
                SettingsSelect(
                  label: 'Meeting PIN length',
                  hint: 'Longer PINs are harder to guess. Applies to meetings scheduled from now on.',
                  value: '${s.pinLengthDigits} digits',
                  options: const <String>['6 digits', '8 digits', '10 digits'],
                ),
                SettingsField(
                  label: 'Greeting',
                  required: true,
                  hint: 'Read to callers before they enter the PIN.',
                  value: s.greeting,
                  maxLines: 3,
                  counter: '${s.greeting.length} / 200',
                ),
                SettingsFormFoot(
                  children: <Widget>[
                    KmButton(
                      label: 'Save dial-in settings',
                      icon: LucideIcons.check,
                      variant: KmButtonVariant.primary,
                      onPressed: () {},
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        SettingsPanel(
          title: 'Status',
          description: 'Every hop from the phone network to the meeting room.',
          children: <Widget>[
            Align(
              alignment: Alignment.centerLeft,
              child: KmButton(
                label: 'Re-check',
                icon: LucideIcons.rotateCw,
                size: KmButtonSize.small,
                onPressed: () {},
              ),
            ),
            const SizedBox(height: KmTokens.s3),
            SettingsCheckList(
              steps: <CheckStep>[
                CheckStep('Telnyx number', '$active active dial-in numbers', CheckState.active),
                CheckStep('SIP connection', s.sipConnection, CheckState.active),
                CheckStep('LiveKit inbound trunk', '${s.inboundTrunkId} (sample)', CheckState.active),
                const CheckStep('Dispatch rule', 'PIN → meeting room', CheckState.active),
              ],
            ),
          ],
        ),
        SettingsPanel(
          title: 'Test call',
          children: <Widget>[
            _TestCallSteps(number: s.dialInNumbers.first.number, pin: s.meetingPin),
          ],
        ),
      ],
    );
  }
}

/// The dial-in numbers table; scrolls horizontally inside its own box at
/// phone width (`.table-wrap`).
class _NumbersTable extends StatelessWidget {
  const _NumbersTable({required this.numbers});

  final List<DialInNumber> numbers;

  static const List<double> _widths = <double>[148, 72, 104, 120];

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final TextStyle head = TextStyle(
      fontFamily: KmTokens.fontMono,
      fontSize: KmTokens.text11,
      fontWeight: KmTokens.fontWeightSemibold,
      letterSpacing: KmTokens.trackingTableEm * KmTokens.text11,
      color: p.fgSub,
    );
    Widget cell(int i, Widget child) => SizedBox(
      width: _widths[i],
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s3),
        child: child,
      ),
    );
    return ClipRRect(
      borderRadius: BorderRadius.circular(KmTokens.radiusTile),
      child: ColoredBox(
        color: p.bg2,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              ExcludeSemantics(
                child: Row(
                  children: <Widget>[
                    cell(0, Text('NUMBER', style: head)),
                    cell(1, Text('REGION', style: head)),
                    cell(2, Text('STATUS', style: head)),
                    cell(3, Text('ROUTES TO', style: head)),
                  ],
                ),
              ),
              for (final DialInNumber n in numbers) ...<Widget>[
                Container(height: 1, width: _widths.reduce((double a, double b) => a + b), color: p.muted),
                Semantics(
                  label: '${n.number}, ${n.region}, ${n.active ? 'Active' : 'Provisioning'}, '
                      'routes to the meeting PIN prompt',
                  excludeSemantics: true,
                  child: Row(
                    children: <Widget>[
                      cell(0, Text(n.number, style: KmText.mono(context))),
                      cell(1, Text(n.region, style: KmText.small(context))),
                      cell(
                        2,
                        Align(
                          alignment: Alignment.centerLeft,
                          child: KmChip(
                            n.active ? 'Active' : 'Provisioning',
                            tone: n.active ? KmChipTone.green : KmChipTone.amber,
                            pip: true,
                          ),
                        ),
                      ),
                      cell(3, Text('PIN prompt', style: KmText.small(context))),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _TestCallSteps extends StatelessWidget {
  const _TestCallSteps({required this.number, required this.pin});

  final String number;
  final String pin;

  @override
  Widget build(BuildContext context) {
    final TextStyle mono = KmText.mono(context);
    final List<InlineSpan> steps = <InlineSpan>[
      TextSpan(
        children: <InlineSpan>[
          const TextSpan(text: 'Start a meeting, then call '),
          TextSpan(text: number, style: mono),
          const TextSpan(text: ' from any phone.'),
        ],
      ),
      const TextSpan(text: 'Listen for your greeting.'),
      TextSpan(
        children: <InlineSpan>[
          const TextSpan(text: 'Enter the meeting PIN shown in the room’s invite panel, followed by '),
          TextSpan(text: '#', style: mono),
          const TextSpan(text: ' — for example '),
          TextSpan(text: '$pin#', style: mono),
          const TextSpan(text: '.'),
        ],
      ),
      const TextSpan(
        text: 'You join as a phone participant. Your speech is transcribed like everyone else’s.',
      ),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        for (final InlineSpan step in steps)
          Padding(
            padding: const EdgeInsets.only(bottom: KmTokens.s2),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const SizedBox(width: 18),
                Expanded(child: Text.rich(step, style: KmText.body(context))),
              ],
            ),
          ),
      ],
    );
  }
}
