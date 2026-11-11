import 'dart:convert';

import 'package:flutter/services.dart';

import 'golden_surface.dart';

/// Loads the golden surfaces bundled from the harness corpus (assets/surfaces/,
/// copied verbatim from spikes/agentic-ui/harness/corpus/a2ui/surfaces/).
final class SurfaceLoader {
  const SurfaceLoader({this.bundle, this.origins = const HarnessOrigins()});

  /// Defaults to [rootBundle].
  final AssetBundle? bundle;
  final HarnessOrigins origins;

  Future<GoldenSurface> load(String id) async {
    final String raw = await (bundle ?? rootBundle).loadString(
      'assets/surfaces/$id.json',
    );
    return GoldenSurface.fromJson(
      Map<String, Object?>.from(jsonDecode(raw) as Map),
      origins: origins,
    );
  }

  Future<List<GoldenSurface>> loadAll() =>
      Future.wait([for (final id in goldenSurfaceIds) load(id)]);
}
