// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/settings_section.dart';
import '../settings_head.dart';
import '../widgets/settings_checks.dart';
import '../widgets/settings_choices.dart';
import '../widgets/settings_fields.dart';
import '../widgets/settings_panel.dart';

/// `settings.storage`: storage mode, destinations, Egress output,
/// retention and IPFS pinning (KnowMe-managed mode).
class StorageSection extends StatelessWidget {
  const StorageSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const SettingsHead(
          group: SettingsGroup.recording,
          title: 'Storage',
          description:
              'Where recordings go after LiveKit Egress writes them, and how they are pinned to IPFS.',
        ),
        const SettingsSegField(
          label: 'Storage mode',
          initial: 'managed',
          options: <KmOption<String>>[
            KmOption<String>('managed', 'KnowMe-managed', icon: LucideIcons.cloud),
            KmOption<String>('byo', 'Bring your own', icon: LucideIcons.database),
          ],
        ),
        const SizedBox(height: KmTokens.s3),
        const SettingsPanel(
          title: 'Where new recordings go',
          description: 'KnowMe provides S3-compatible storage and IPFS pinning.',
          children: <Widget>[
            SettingsStack(
              gap: KmTokens.s3,
              children: <Widget>[
                SettingsFact(label: 'Storage', value: Text('KnowMe-managed S3-compatible bucket')),
                SettingsFact(label: 'IPFS pinning', value: Text('KnowMe pinning')),
                SettingsFact(
                  label: 'Existing recordings',
                  value: Text('Stay where they are. Only new recordings use this setting.'),
                ),
              ],
            ),
          ],
        ),
        SettingsLinkCard(
          icon: LucideIcons.database,
          title: 'S3-compatible storage',
          detail: 'Amazon S3, R2, B2, Wasabi, MinIO…',
          chip: const KmChip('Not configured'),
          onTap: () => context.go('/settings/storage-s3'),
        ),
        const SizedBox(height: KmTokens.s4),
        SettingsLinkCard(
          icon: LucideIcons.globe,
          title: 'IPFS pinning',
          detail: 'KnowMe pinning',
          chip: const KmChip('Default'),
          onTap: () => context.go('/settings/storage-ipfs'),
        ),
        const SizedBox(height: KmTokens.s5 + KmTokens.s4),
        const SettingsPanel(
          title: 'Egress output',
          description: 'LiveKit Egress records every participant in one Room Composite.',
          children: <Widget>[
            SettingsStack(
              children: <Widget>[
                SettingsSegField(
                  label: 'Format',
                  initial: 'mp4',
                  options: <KmOption<String>>[
                    KmOption<String>('mp4', 'MP4 file'),
                    KmOption<String>('hls', 'HLS segments'),
                  ],
                ),
                Wrap(
                  spacing: KmTokens.s4,
                  runSpacing: KmTokens.s4,
                  children: <Widget>[
                    SettingsSegField(
                      label: 'Layout',
                      initial: 'speaker',
                      options: <KmOption<String>>[
                        KmOption<String>('speaker', 'Speaker'),
                        KmOption<String>('grid', 'Grid'),
                      ],
                    ),
                    SettingsSegField(
                      label: 'Resolution',
                      initial: '1080p',
                      options: <KmOption<String>>[
                        KmOption<String>('720p', '720p'),
                        KmOption<String>('1080p', '1080p'),
                      ],
                    ),
                  ],
                ),
                SettingsToggleRow(
                  toggleKey: 'storage.audioOnly',
                  title: 'Audio only',
                  description:
                      'Record a Room Composite audio mix without video. Smaller files; layout and resolution don’t apply.',
                ),
              ],
            ),
          ],
        ),
        const SettingsPanel(
          title: 'Retention and privacy',
          children: <Widget>[
            SettingsStack(
              children: <Widget>[
                SettingsSelect(
                  label: 'Keep recordings for',
                  hint:
                      'After this, the file is deleted from storage and unpinned. Transcripts and summaries follow the same schedule.',
                  value: '1 year',
                  options: <String>['30 days', '90 days', '1 year', 'Forever'],
                ),
                SettingsNote(
                  tone: SettingsNoteTone.info,
                  icon: LucideIcons.lock,
                  child: Text(
                    'Recordings are encrypted at rest in S3-compatible storage. For bring-your-own '
                    'buckets, your bucket’s encryption settings apply.',
                  ),
                ),
                SettingsToggleRow(
                  toggleKey: 'storage.ipfs',
                  title: 'Pin recordings to IPFS',
                  description: 'Keeps a content-addressed copy and stores its CID with the recording.',
                ),
                SettingsNote(
                  tone: SettingsNoteTone.warn,
                  icon: LucideIcons.globe,
                  child: Text(
                    'IPFS is a public network: anyone who has a recording’s CID can fetch it through '
                    'a gateway. Turn pinning off for meetings that must stay private.',
                  ),
                ),
              ],
            ),
          ],
        ),
        Align(
          alignment: Alignment.centerLeft,
          child: KmButton(
            label: 'Save storage settings',
            icon: LucideIcons.check,
            variant: KmButtonVariant.primary,
            onPressed: () {},
          ),
        ),
      ],
    );
  }
}
