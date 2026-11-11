// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/know_meet_app.dart';
import 'bridge/generated/frb_generated.dart';
import 'features/theme_mode/theme_mode.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await RustLib.init();
  // Load the stored theme before the first frame so it never flashes.
  final ThemePreferenceStore themeStore =
      await SharedPreferencesThemePreferenceStore.open();
  runApp(
    ProviderScope(
      overrides: [themePreferenceStoreProvider.overrideWithValue(themeStore)],
      child: const KnowMeetApp(),
    ),
  );
}
