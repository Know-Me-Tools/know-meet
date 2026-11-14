// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/recording.dart';
import '../../domain/recording_format.dart';
import 'recording_bits.dart';

/// Storage tab: egress, bucket, object key, CID and retention details, the
/// IPFS caution and the danger zone.
class StoragePanel extends StatelessWidget {
  const StoragePanel({super.key, required this.recording});

  final Recording recording;

  @override
  Widget build(BuildContext context) {
    final Recording r = recording;
    final TextStyle mono = KmText.mono(context);
    final TextStyle plain = KmText.small(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Semantics(header: true, child: Text('Storage', style: KmText.h2(context))),
        const SizedBox(height: KmTokens.s2),
        Text(
          r.isByo
              ? 'This recording lives in your own bucket and is pinned through your pinning service.'
              : 'This recording is stored and pinned by KnowMe.',
          style: KmText.smallSub(context),
        ),
        const SizedBox(height: KmTokens.s2),
        Align(
          alignment: Alignment.centerLeft,
          child: KmButton(
            label: 'Storage settings',
            icon: LucideIcons.settings,
            size: KmButtonSize.small,
            onPressed: () => context.go(r.isByo ? '/settings/storage-s3' : '/settings/storage'),
          ),
        ),
        const SizedBox(height: KmTokens.s4),
        KmCard(
          panel: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              _Kv('Egress type', Text('Room Composite', style: plain)),
              _Kv('Layout', Text(r.layout == RecordingLayout.grid ? 'Grid' : 'Speaker', style: plain)),
              _Kv('Format', Text(r.format.toUpperCase(), style: mono)),
              _Kv('Resolution', Text(r.resolution, style: plain)),
              _Kv('Provider', Text(r.provider, style: plain)),
              _Kv('Endpoint', Text(r.endpoint, style: mono)),
              _Kv('Region', Text(r.region, style: mono)),
              _Kv(
                'Bucket',
                Wrap(
                  spacing: KmTokens.s2,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: <Widget>[
                    Text(r.bucket, style: mono),
                    if (r.isByo) const KmChip('Your bucket'),
                  ],
                ),
              ),
              _Kv('Object key', _Copyable(value: r.objectKey, what: 'object key')),
              _Kv('Size', Text(RecordingFormat.bytes(r.sizeBytes), style: mono)),
              _Kv(
                'Checksum',
                Text.rich(
                  TextSpan(
                    text: '${r.checksum} ',
                    style: mono,
                    children: <InlineSpan>[
                      TextSpan(text: '(sample)', style: KmText.smallSub(context)),
                    ],
                  ),
                ),
              ),
              _Kv('IPFS CID', _Copyable(value: r.cid, what: 'CID')),
              _Kv('Gateway URL', _Copyable(value: r.gatewayUrl, what: 'gateway URL')),
              _Kv(
                'Pin status',
                Align(
                  alignment: Alignment.centerLeft,
                  child: KmChip(r.pin, tone: KmChipTone.green, pip: true),
                ),
              ),
              _Kv('Retention', Text(r.retention, style: plain), last: true),
            ],
          ),
        ),
        const SizedBox(height: KmTokens.s4),
        const RecNote(
          kind: RecNoteKind.info,
          icon: LucideIcons.info,
          child: Text(
            'IPFS content is addressed by its CID. Anyone who has the CID can fetch '
            'the file from a public gateway, so share the CID only with people who '
            'should see the recording.',
          ),
        ),
        const SizedBox(height: KmTokens.s4),
        KmCard(
          panel: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Semantics(header: true, child: Text('Delete recording', style: KmText.h3(context))),
              const SizedBox(height: KmTokens.s4),
              Text(
                'Removes the file from storage, the transcript and summary from KnowMe, '
                'and unpins it from IPFS. This can’t be undone.',
                style: KmText.smallSub(context),
              ),
              const SizedBox(height: KmTokens.s4),
              KmButton(
                label: 'Delete recording',
                icon: LucideIcons.trash2,
                variant: KmButtonVariant.danger,
                onPressed: () => showRecordingsUnavailable(context, 'Deleting recordings'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// One `.kv` pair, stacked at phone width.
class _Kv extends StatelessWidget {
  const _Kv(this.label, this.value, {this.last = false});

  final String label;
  final Widget value;
  final bool last;

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(bottom: last ? 0 : KmTokens.s3),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(label, style: KmText.smallSub(context)),
        const SizedBox(height: 2),
        value,
      ],
    ),
  );
}

/// A mono value with its copy button (`copyBtn`).
class _Copyable extends StatelessWidget {
  const _Copyable({required this.value, required this.what});

  final String value;
  final String what;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      children: <Widget>[
        Text(value, style: KmText.mono(context)),
        KmIconButton(
          icon: LucideIcons.copy,
          label: 'Copy $what',
          onPressed: () async {
            await Clipboard.setData(ClipboardData(text: value));
            if (!context.mounted) return;
            ScaffoldMessenger.maybeOf(context)?.showSnackBar(
              SnackBar(content: Text('Copied $what')),
            );
          },
        ),
      ],
    );
  }
}
