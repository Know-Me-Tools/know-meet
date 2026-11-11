// TJ-ARCH-MOB-001 compliant
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/session/session.dart';
import '../../../shared/ui/ui.dart';
import '../domain/recording.dart';
import 'screens/detail_screen.dart';
import 'screens/empty_screen.dart';
import 'screens/library_screen.dart';
import 'screens/processing_screen.dart';

/// Routes of the recordings feature, inside the app frame. Every route is
/// gated: a signed-out visitor sees the sign-in gate (state
/// `recordings.gate-signed-out`).
List<RouteBase> get recordingsRoutes => <RouteBase>[
  GoRoute(
    path: '/recordings',
    builder: (BuildContext context, GoRouterState state) =>
        const _Gated(child: LibraryScreen()),
    routes: <RouteBase>[
      GoRoute(
        path: 'library',
        builder: (BuildContext context, GoRouterState state) =>
            const _Gated(child: LibraryScreen()),
      ),
      GoRoute(
        path: 'empty',
        builder: (BuildContext context, GoRouterState state) =>
            const _Gated(child: RecordingsEmptyScreen()),
      ),
      GoRoute(
        path: 'detail/:id',
        builder: (BuildContext context, GoRouterState state) => _Gated(
          child: RecordingDetailScreen(
            id: state.pathParameters['id'] ?? '',
            tab: RecordingTab.transcript,
          ),
        ),
        routes: <RouteBase>[
          GoRoute(
            path: ':tab',
            builder: (BuildContext context, GoRouterState state) => _Gated(
              child: RecordingDetailScreen(
                id: state.pathParameters['id'] ?? '',
                tab: RecordingTab.parse(state.pathParameters['tab']),
              ),
            ),
          ),
        ],
      ),
      GoRoute(
        path: 'processing/:id',
        builder: (BuildContext context, GoRouterState state) => _Gated(
          child: RecordingProcessingScreen(id: state.pathParameters['id'] ?? ''),
        ),
      ),
    ],
  ),
];

class _Gated extends ConsumerWidget {
  const _Gated({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (ref.watch(sessionControllerProvider) != null) return child;
    return const KmSignInGate(
      pageTitle: 'Your recordings',
      pageLede: '',
      title: 'Sign in to see your recordings',
      body:
          'Recordings, transcripts and summaries are saved to your account. '
          'Guest meetings are never recorded, and their live transcript is '
          'deleted when the meeting ends.',
    );
  }
}
