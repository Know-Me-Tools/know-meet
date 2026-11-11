// TJ-ARCH-MOB-001 compliant
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../features/notes/presentation/screens/notes_screen.dart';

part 'app_router.g.dart';

/// Route tree. c07 keeps the generator's notes screen as the only route;
/// c12 adds the Know Meet frame and the in-scope screens here.
@Riverpod(keepAlive: true)
GoRouter appRouter(Ref ref) {
  final GoRouter router = GoRouter(
    initialLocation: '/',
    routes: <RouteBase>[
      GoRoute(path: '/', builder: (context, state) => const NotesScreen()),
      // The baseline's restart certification relaunches the app with this
      // platform initial route (baseline-mobile.md). GoRouter honours the
      // platform route, so map it home instead of the error page.
      GoRoute(path: '/verify-restart', redirect: (context, state) => '/'),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
}
