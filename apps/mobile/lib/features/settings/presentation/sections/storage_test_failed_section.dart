// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/settings_section.dart';
import '../../domain/settings_values.dart';
import '../settings_head.dart';
import '../settings_providers.dart';
import '../widgets/settings_checks.dart';
import '../widgets/settings_choices.dart';
import '../widgets/settings_panel.dart';

/// `settings.storage-test-failed`: which step failed, the raw provider
/// error, and a fix-it checklist.
class StorageTestFailedSection extends ConsumerWidget {
  const StorageTestFailedSection({super.key});

  static const List<String> _fixes = <String>[
    'Check the bucket name for typos. Names are lowercase and must match exactly.',
    'Create the bucket in your Cloudflare R2 console if it doesn’t exist yet.',
    'Confirm the endpoint points at the right account and region.',
    'Make sure the access key can PutObject, GetObject and DeleteObject on this bucket.',
    'For non-AWS providers, keep Force path style on.',
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final SettingsSnapshot s = ref.watch(settingsSnapshotProvider);
    final String b = s.failedBucket;
    final String raw =
        'PUT /$b/${s.failedObject}  (path style)\n'
        'HTTP/1.1 404 Not Found\n\n'
        '<?xml version="1.0" encoding="UTF-8"?>\n<Error>\n  <Code>NoSuchBucket</Code>\n'
        '  <Message>The specified bucket does not exist.</Message>\n'
        '  <BucketName>$b</BucketName>\n</Error>';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const SettingsHead(
          group: SettingsGroup.recording,
          title: 'Storage test failed',
          description:
              'KnowMe couldn’t write to your bucket, so new recordings won’t upload until this is fixed.',
          parent: ('S3-compatible storage', '/settings/storage-s3'),
        ),
        SettingsPanel(
          title: 'What failed',
          description: 'Cloudflare R2 · ${s.failedEndpoint}',
          children: <Widget>[
            SettingsNote(
              tone: SettingsNoteTone.error,
              icon: LucideIcons.circleAlert,
              child: Text.rich(
                TextSpan(
                  children: <InlineSpan>[
                    const TextSpan(
                      text: 'Step 2 of 4 — Write test object. ',
                      style: TextStyle(fontWeight: KmTokens.fontWeightSemibold),
                    ),
                    TextSpan(text: 'Bucket not found: $b'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: KmTokens.s4),
            SettingsCheckList(
              steps: <CheckStep>[
                CheckStep('Connect to endpoint', s.failedEndpoint, CheckState.passed),
                CheckStep('Write test object', 'Bucket not found: $b', CheckState.failed),
                const CheckStep('Read it back', 'GET and compare checksum', CheckState.skipped),
                CheckStep('Delete test object', 'DELETE $b/${s.failedObject}', CheckState.skipped),
              ],
            ),
          ],
        ),
        SettingsPanel(
          title: 'Raw provider error',
          trailing: KmButton(
            label: 'Copy',
            icon: LucideIcons.copy,
            size: KmButtonSize.small,
            onPressed: () => Clipboard.setData(ClipboardData(text: raw)),
          ),
          children: <Widget>[
            Semantics(label: 'Raw provider error', child: KmCodeBlock(raw)),
          ],
        ),
        SettingsPanel(
          title: 'How to fix it',
          description: 'Tick items off as you go.',
          children: <Widget>[
            for (final String fix in _fixes) SettingsLocalCheck(label: fix, initial: false),
          ],
        ),
        Wrap(
          spacing: KmTokens.s2,
          runSpacing: KmTokens.s2,
          children: <Widget>[
            KmButton(
              label: 'Retry test',
              icon: LucideIcons.rotateCw,
              variant: KmButtonVariant.primary,
              onPressed: () {},
            ),
            KmButton(
              label: 'Edit storage settings',
              icon: LucideIcons.pencil,
              onPressed: () => context.go('/settings/storage-s3'),
            ),
            KmButton(
              label: 'Back to storage',
              variant: KmButtonVariant.ghost,
              onPressed: () => context.go('/settings/storage'),
            ),
          ],
        ),
      ],
    );
  }
}
