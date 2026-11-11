// TJ-ARCH-MOB-001 compliant
import '../domain/auth_view.dart';

/// The prototype's sample user (km.js `data.user`).
final class StaticAuthSamples implements AuthSampleSource {
  const StaticAuthSamples();

  @override
  String get sampleEmail => 'jordan.reyes@know-me.tools';
}
