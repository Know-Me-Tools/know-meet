// TJ-ARCH-MOB-001 compliant
// Shared session state: who is signed in. Cross-cutting, so it lives in
// shared/ rather than in a feature (features never import each other).
export 'km_user.dart';
export 'session_controller.dart';
