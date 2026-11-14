// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/settings_section.dart';
import '../settings_head.dart';
import '../widgets/settings_choices.dart';
import '../widgets/settings_fields.dart';
import '../widgets/settings_panel.dart';

/// `settings.storage-ipfs`: pinning provider, gateway and timing.
class StorageIpfsSection extends StatelessWidget {
  const StorageIpfsSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const SettingsHead(
          group: SettingsGroup.recording,
          title: 'IPFS pinning',
          description: 'After each upload, a KnowMe job pins the recording to IPFS and stores its CID.',
          parent: ('Storage', '/settings/storage'),
        ),
        const SettingsPanel(
          title: 'Pinning',
          children: <Widget>[
            SettingsStack(
              children: <Widget>[
                SettingsSegField(
                  label: 'Pin with',
                  initial: 'knowme',
                  options: <KmOption<String>>[
                    KmOption<String>('knowme', 'KnowMe pinning'),
                    KmOption<String>('psa', 'Pinning Service API'),
                    KmOption<String>('kubo', 'Your Kubo node'),
                  ],
                ),
                SettingsNote(
                  tone: SettingsNoteTone.info,
                  icon: LucideIcons.info,
                  child: Text('KnowMe pins recordings on its own IPFS nodes. Nothing to configure.'),
                ),
              ],
            ),
          ],
        ),
        SettingsPanel(
          title: 'Gateway and timing',
          children: <Widget>[
            SettingsStack(
              children: <Widget>[
                const SettingsField(
                  label: 'Public gateway URL',
                  required: true,
                  mono: true,
                  hint: 'Used to build links like https://ipfs.io/ipfs/<cid>.',
                  value: 'https://ipfs.io',
                  keyboardType: TextInputType.url,
                ),
                const SettingsToggleRow(
                  toggleKey: 'ipfs.pinAfter',
                  title: 'Pin after upload',
                  description: 'Pin each recording as soon as it lands in storage.',
                ),
                SettingsFormFoot(
                  children: <Widget>[
                    KmButton(label: 'Test pinning', icon: LucideIcons.zap, onPressed: () {}),
                    KmButton(
                      label: 'Save',
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
        const SettingsNote(
          tone: SettingsNoteTone.warn,
          icon: LucideIcons.globe,
          child: Text(
            'Pinned content is public to anyone who has the CID. Unpinning removes your copy, '
            'but other IPFS nodes that fetched the file may keep it.',
          ),
        ),
      ],
    );
  }
}
