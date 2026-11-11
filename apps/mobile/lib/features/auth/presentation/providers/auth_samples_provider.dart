// TJ-ARCH-MOB-001 compliant
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/static_auth_samples.dart';
import '../../domain/auth_view.dart';

part 'auth_samples_provider.g.dart';

/// Sample identity for the static auth views.
@Riverpod(keepAlive: true)
AuthSampleSource authSamples(Ref ref) => const StaticAuthSamples();
