// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/settings_section.dart';
import '../../domain/settings_values.dart';
import '../settings_head.dart';
import '../settings_providers.dart';
import '../widgets/settings_choices.dart';
import '../widgets/settings_fields.dart';
import '../widgets/settings_panel.dart';

/// `settings.livekit`: KnowMe-managed mode. Credentials are shown only as
/// their variable names with masked placeholders; values stay server-side.
class LivekitSection extends ConsumerWidget {
  const LivekitSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final SettingsSnapshot s = ref.watch(settingsSnapshotProvider);
    final KmPalette p = context.km;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const SettingsHead(
          group: SettingsGroup.connections,
          title: 'LiveKit',
          description:
              'All meeting audio, video, agents, recording (Egress) and phone dial-in (SIP) run on LiveKit.',
        ),
        const SettingsSegField(
          label: 'Connection mode',
          initial: 'managed',
          options: <KmOption<String>>[
            KmOption<String>('managed', 'KnowMe-managed', icon: LucideIcons.cloud),
            KmOption<String>('own', 'My own LiveKit project', icon: LucideIcons.server),
          ],
        ),
        const SizedBox(height: KmTokens.s2),
        Text.rich(
          TextSpan(
            text: 'Active now: ',
            children: <InlineSpan>[
              TextSpan(
                text: 'KnowMe-managed',
                style: TextStyle(color: p.fg, fontWeight: KmTokens.fontWeightSemibold),
              ),
            ],
          ),
          style: KmText.smallSub(context),
        ),
        const SizedBox(height: KmTokens.s5),
        SettingsPanel(
          title: 'KnowMe-managed project',
          description: 'KnowMe runs and scales the LiveKit project for you.',
          children: <Widget>[
            SettingsStack(
              children: <Widget>[
                SettingsField(
                  label: 'Server URL',
                  value: s.livekitUrl,
                  readOnly: true,
                  mono: true,
                  copyable: true,
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    const SettingsLabel('Credentials'),
                    const SizedBox(height: 6),
                    _CredentialRow(name: s.livekitKeyVar),
                    const SizedBox(height: KmTokens.s2),
                    _CredentialRow(name: s.livekitSecretVar),
                    const SizedBox(height: 6),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: ExcludeSemantics(
                            child: Icon(LucideIcons.lock, size: 16, color: p.fgSub),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            'Managed by KnowMe — stored server-side. Values are never shown in the browser.',
                            style: KmText.smallSub(context),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        const LivekitCapabilities(),
      ],
    );
  }
}

/// `.cred`: a credential's variable name, a masked value and the
/// server-side badge. Never a real value.
class _CredentialRow extends StatelessWidget {
  const _CredentialRow({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s3),
      decoration: BoxDecoration(
        color: p.bg2,
        borderRadius: BorderRadius.circular(KmTokens.radius),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: p.muted,
                    borderRadius: BorderRadius.circular(KmTokens.radius6),
                  ),
                  child: Text(name, style: KmText.mono(context)),
                ),
              ),
              const SizedBox(width: KmTokens.s3),
              const KmChip('Server-side', icon: LucideIcons.lock),
            ],
          ),
          const SizedBox(height: KmTokens.s2),
          const KmMasked(length: 16),
        ],
      ),
    );
  }
}

/// The Capabilities panel (Egress and SIP availability).
class LivekitCapabilities extends StatelessWidget {
  const LivekitCapabilities({super.key});

  @override
  Widget build(BuildContext context) {
    return const SettingsPanel(
      title: 'Capabilities',
      description: 'What this connection supports for Know Meet.',
      children: <Widget>[
        SettingsSwitchList(
          children: <Widget>[
            _Capability(
              icon: LucideIcons.circleDot,
              title: 'Egress',
              detail: 'Room Composite recording to MP4 or HLS on S3-compatible storage',
            ),
            _Capability(
              icon: LucideIcons.phoneIncoming,
              title: 'SIP',
              detail: 'Inbound trunk for Telnyx voice dial-in (no outbound calling)',
            ),
          ],
        ),
      ],
    );
  }
}

class _Capability extends StatelessWidget {
  const _Capability({required this.icon, required this.title, required this.detail});

  final IconData icon;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return MergeSemantics(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: KmTokens.s3),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            ExcludeSemantics(child: Icon(icon, size: 20, color: context.km.fg)),
            const SizedBox(width: KmTokens.s3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(title, style: KmText.label(context)),
                  Text(detail, style: KmText.smallSub(context)),
                  const SizedBox(height: KmTokens.s3),
                  const KmChip('Available', tone: KmChipTone.green, pip: true),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
