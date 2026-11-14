// TJ-ARCH-MOB-001 compliant
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'km_clock.g.dart';

/// Returns the current instant. Sample meetings and recordings are placed
/// relative to it (prototype km.js `buildData()`), so the golden suite
/// overrides it with the frozen capture instant
/// (tests/fidelity capture environment: 2026-11-10T15:00:00Z).
typedef KmClock = DateTime Function();

@Riverpod(keepAlive: true)
KmClock kmClock(Ref ref) => DateTime.now;
