// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/settings_section.dart';
import '../settings_head.dart';
import '../widgets/settings_choices.dart';
import '../widgets/settings_fields.dart';
import '../widgets/settings_panel.dart';

/// `settings.storage-s3`: the bring-your-own bucket form. The access key
/// fields are empty: credentials are entered here and stored server-side,
/// never shown again.
class StorageS3Section extends StatelessWidget {
  const StorageS3Section({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const SettingsHead(
          group: SettingsGroup.recording,
          title: 'S3-compatible storage',
          description:
              'Bring your own bucket. LiveKit Egress writes recordings here, then KnowMe pins them to IPFS.',
          parent: ('Storage', '/settings/storage'),
        ),
        SettingsPanel(
          title: 'Bucket',
          children: <Widget>[
            SettingsStack(
              children: <Widget>[
                const SettingsSelect(
                  label: 'Provider',
                  required: true,
                  value: 'Cloudflare R2',
                  options: <String>[
                    'Amazon S3', 'Cloudflare R2', 'Backblaze B2', 'Wasabi', 'MinIO', 'Other S3-compatible',
                  ],
                ),
                const SettingsField(
                  label: 'Region',
                  required: true,
                  mono: true,
                  hint: 'R2 uses auto.',
                  value: 'auto',
                ),
                const SettingsField(
                  label: 'Endpoint URL',
                  required: true,
                  mono: true,
                  hint: 'e.g. https://<account-id>.r2.cloudflarestorage.com',
                  placeholder: 'https://<account-id>.r2.cloudflarestorage.com',
                  keyboardType: TextInputType.url,
                ),
                const SettingsField(
                  label: 'Bucket',
                  required: true,
                  mono: true,
                  placeholder: 'acme-meet-archive',
                ),
                const SettingsField(
                  label: 'Path prefix',
                  optional: true,
                  mono: true,
                  hint: 'Recordings are written under this folder, e.g. meet/2026/10/14/…',
                  value: 'meet/',
                ),
                const SettingsField(label: 'Access key ID', required: true, mono: true),
                const SettingsField(
                  label: 'Secret access key',
                  required: true,
                  mono: true,
                  secret: true,
                  hint: 'Needs PutObject, GetObject and DeleteObject on this bucket. Stored encrypted; never shown again.',
                ),
                const SettingsToggleRow(
                  toggleKey: 's3.pathStyle',
                  title: 'Force path style',
                  description:
                      'Uses endpoint/bucket/key URLs instead of bucket.endpoint/key. LiveKit Egress needs '
                      'this (force_path_style) for most non-AWS endpoints, so it turns on automatically for them.',
                ),
                SettingsFormFoot(
                  children: <Widget>[
                    KmButton(label: 'Test connection', icon: LucideIcons.zap, onPressed: () {}),
                    KmButton(
                      label: 'Save',
                      icon: LucideIcons.check,
                      variant: KmButtonVariant.primary,
                      onPressed: () {},
                    ),
                    KmButton(
                      label: 'Back to storage',
                      variant: KmButtonVariant.ghost,
                      onPressed: () => context.go('/settings/storage'),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }
}
