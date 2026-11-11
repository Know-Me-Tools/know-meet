// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/session/session.dart';
import '../../../../shared/ui/ui.dart';
import '../../domain/recording.dart';
import '../../domain/recording_format.dart';
import '../providers/recordings_providers.dart';
import '../widgets/rec_crumbs.dart';
import '../widgets/recording_bits.dart';
import 'not_found_screen.dart';

/// State of one pipeline step.
enum _StepState { running, waiting }

/// `#processing:<id>` (state `recordings.processing.<id>`): the
/// post-meeting pipeline. Rendered in its first state (step 1 of 5 in
/// progress), which is the state the prototype is captured in; the pipeline
/// itself runs server-side and is not simulated here.
class RecordingProcessingScreen extends ConsumerWidget {
  const RecordingProcessingScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final Recording? r = ref.watch(recordingByIdProvider(id));
    if (r == null) return RecordingNotFoundScreen(id: id);
    final String fmt = r.format.toUpperCase();
    final List<(String, String)> steps = <(String, String)>[
      ('Finalize composite', 'LiveKit Egress closes the Room Composite $fmt'),
      (
        'Upload to S3',
        r.isByo
            ? 'Writing to your bucket ${r.bucket}'
            : 'Writing to KnowMe-managed S3-compatible storage',
      ),
      (
        'Pin to IPFS',
        r.isByo ? 'Pinning through your pinning service' : 'Pinning through KnowMe pinning',
      ),
      ('Summary', 'Generating the summary and action items from the transcript'),
      ('Delivery', 'Sending transcript and summary per your delivery settings'),
    ];
    return KmPage(
      children: <Widget>[
        RecCrumbs(<(String, VoidCallback?)>[
          ('Recordings', () => context.go('/recordings/library')),
          (r.title, () => context.go('/recordings/detail/${r.id}')),
          ('Processing', null),
        ]),
        const SizedBox(height: KmTokens.s2),
        KmPageHead(
          eyebrow: 'Still finalizing',
          title: r.title,
          lede:
              'The meeting has ended. Your recording is being finalized, stored and '
              'pinned. You can leave this page — we’ll notify you when it’s ready.',
        ),
        const RecMeter(fraction: 0, semanticLabel: 'Overall progress, 0 percent'),
        const SizedBox(height: KmTokens.s2),
        Semantics(
          liveRegion: true,
          child: Text('Step 1 of ${steps.length}: ${steps.first.$1}', style: KmText.smallSub(context)),
        ),
        const SizedBox(height: KmTokens.s4),
        for (int i = 0; i < steps.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: KmTokens.s2),
            child: _Check(
              number: i + 1,
              title: steps[i].$1,
              detail: steps[i].$2,
              state: i == 0 ? _StepState.running : _StepState.waiting,
            ),
          ),
        const SizedBox(height: KmTokens.s3),
        _NotifyPanel(recording: r),
      ],
    );
  }
}

/// `.check`: status circle, label, state text and the step's progress bar.
class _Check extends StatelessWidget {
  const _Check({
    required this.number,
    required this.title,
    required this.detail,
    required this.state,
  });

  final int number;
  final String title;
  final String detail;
  final _StepState state;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final bool running = state == _StepState.running;
    final String stateText = running ? 'In progress' : 'Waiting';
    return MergeSemantics(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s3),
        decoration: BoxDecoration(
          color: p.surface,
          borderRadius: BorderRadius.circular(KmTokens.radius),
          boxShadow: p.shadowCard,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: ExcludeSemantics(
                child: Container(
                  width: 36,
                  height: 36,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: running ? p.amberSoft : p.muted,
                  ),
                  child: running
                      ? Icon(LucideIcons.refreshCw, size: 20, color: p.amberText)
                      : Text(
                          '$number',
                          style: KmText.mono(context).copyWith(color: p.fgSub),
                        ),
                ),
              ),
            ),
            const SizedBox(width: KmTokens.s3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Text(
                    title,
                    style: KmText.body(context).copyWith(fontWeight: KmTokens.fontWeightSemibold),
                  ),
                  const SizedBox(height: 2),
                  Text(detail, style: KmText.smallSub(context)),
                  const SizedBox(height: KmTokens.s3),
                  Text(
                    stateText,
                    style: KmText.label(context).copyWith(color: p.fgSub),
                  ),
                  const SizedBox(height: KmTokens.s3),
                  ExcludeSemantics(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(KmTokens.radiusPill),
                      child: SizedBox(height: 4, child: ColoredBox(color: p.muted)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The "We’ll notify you" aside.
class _NotifyPanel extends ConsumerWidget {
  const _NotifyPanel({required this.recording});

  final Recording recording;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final Recording r = recording;
    final KmUser? user = ref.watch(sessionControllerProvider);
    final bool notify = ref.watch(notifyWhenReadyProvider);
    return KmCard(
      panel: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Semantics(
            header: true,
            child: Text('We’ll notify you', style: KmText.h3(context)),
          ),
          KmSwitchRow(
            title: 'Email me when it’s ready',
            description: user?.email,
            value: notify,
            onChanged: ref.read(notifyWhenReadyProvider.notifier).set,
          ),
          const SizedBox(height: KmTokens.s2),
          KmKeyValues(
            <(String, String)>[
              ('Duration', RecordingFormat.minutes(r.durationMin)),
              ('Layout', '${r.layout == RecordingLayout.grid ? 'Grid' : 'Speaker'} · ${r.format.toUpperCase()}'),
            ],
            plainValues: true,
          ),
          const SizedBox(height: KmTokens.s3),
          KmKeyValues(<(String, String)>[('Destination', r.bucket)]),
          const SizedBox(height: KmTokens.s3),
          Center(
            child: KmButton(
              label: 'Back to recordings',
              icon: LucideIcons.film,
              variant: KmButtonVariant.ghost,
              size: KmButtonSize.small,
              onPressed: () => context.go('/recordings/library'),
            ),
          ),
        ],
      ),
    );
  }
}
