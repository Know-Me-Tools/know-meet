// TJ-ARCH-MOB-001 compliant
import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'km_user.dart';

part 'session_controller.g.dart';

/// Who is signed in, or null for a guest. Static-screen phase: there is no
/// identity backend (contract exclusion), so sign-in records the sample
/// person locally, exactly as the prototype's `km-auth` key does. Tests
/// override this provider to render signed-in and signed-out states.
@Riverpod(keepAlive: true)
class SessionController extends _$SessionController {
  /// The prototype's sample signed-in person (capture environment).
  static const KmUser sampleUser = KmUser(
    name: 'Avery Chen',
    email: 'avery@example.com',
  );

  @override
  KmUser? build() => null;

  void signIn([KmUser user = sampleUser]) => state = user;

  void signOut() => state = null;
}
