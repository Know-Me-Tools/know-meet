// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../widgets/rec_crumbs.dart';

/// Shown for an unknown recording id (recordings.html `notFound`).
class RecordingNotFoundScreen extends StatelessWidget {
  const RecordingNotFoundScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context) {
    return KmPage(
      children: <Widget>[
        RecCrumbs(<(String, VoidCallback?)>[
          ('Recordings', () => context.go('/recordings/library')),
          ('Not found', null),
        ]),
        const SizedBox(height: KmTokens.s3),
        const KmPageHead(title: 'Recording not found'),
        KmEmptyState(
          icon: LucideIcons.circleAlert,
          title: 'Details',
          body:
              'We couldn’t find a recording with the id ${id.isEmpty ? '(none)' : id}. '
              'It may have been deleted, or the link may be incomplete.',
          actions: <Widget>[
            KmButton(
              label: 'Back to recordings',
              icon: LucideIcons.film,
              variant: KmButtonVariant.primary,
              onPressed: () => context.go('/recordings/library'),
            ),
          ],
        ),
      ],
    );
  }
}
