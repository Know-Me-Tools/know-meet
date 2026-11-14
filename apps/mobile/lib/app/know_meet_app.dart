// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_flutter/shadcn_flutter.dart' as shad;

import '../shared/theme_mode/theme_mode.dart';
import 'app_router.dart';
import 'app_theme.dart';
import 'shadcn_theme.dart';

/// Root widget: generated light and dark themes, the persisted theme mode
/// and the route tree. The fluid (CSS clamp) type sizes depend on the
/// viewport width, so both themes are rebuilt when the window width changes.
/// `View` provides the MediaQuery above MaterialApp.
///
/// shadcn_flutter widgets read their own Theme; [_ShadcnBridge] derives it
/// from the Material theme in force, so both kits render the same tokens.
class KnowMeetApp extends ConsumerWidget {
  const KnowMeetApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final double viewportWidth = MediaQuery.sizeOf(context).width;
    final KmThemeFactory themeFor = ref.watch(kmThemeFactoryProvider);
    final ThemePreference preference = ref.watch(
      themePreferenceControllerProvider,
    );
    final GoRouter router = ref.watch(appRouterProvider);
    return MaterialApp.router(
      title: 'Know Meet',
      debugShowCheckedModeBanner: false,
      theme: themeFor(Brightness.light, viewportWidth),
      darkTheme: themeFor(Brightness.dark, viewportWidth),
      themeMode: preference.themeMode,
      // Theme switches are instant: the prototype swaps data-theme without a
      // transition, and an animated swap would ignore reduced motion.
      themeAnimationDuration: Duration.zero,
      routerConfig: router,
      builder: (BuildContext context, Widget? child) =>
          _ShadcnBridge(child: child ?? const SizedBox.shrink()),
    );
  }
}

class _ShadcnBridge extends StatelessWidget {
  const _ShadcnBridge({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) =>
      shad.Theme(data: kmShadcnTheme(Theme.of(context)), child: child);
}
