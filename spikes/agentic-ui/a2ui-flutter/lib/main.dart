import 'package:flutter/material.dart';

import 'a2ui/media_policy.dart';
import 'surfaces/golden_surface.dart';
import 'surfaces/surface_loader.dart';
import 'ui/parity_app.dart';

/// Origin of the harness mock server. On a device, pass the host LAN address:
/// `flutter run --dart-define=KM_HARNESS_ORIGIN=http://192.168.1.20:4317`.
const String harnessOrigin = String.fromEnvironment(
  'KM_HARNESS_ORIGIN',
  defaultValue: 'http://127.0.0.1:4317',
);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final Uri allowed = Uri.parse(harnessOrigin);
  final HarnessOrigins origins = HarnessOrigins(
    allowed: allowed.origin,
    evil: allowed.replace(port: allowed.port + 1).origin,
  );
  final List<GoldenSurface> surfaces = await SurfaceLoader(
    origins: origins,
  ).loadAll();
  runApp(
    ParityApp(
      surfaces: surfaces,
      media: MediaPolicy(allowedOrigins: {origins.allowed}),
    ),
  );
}
