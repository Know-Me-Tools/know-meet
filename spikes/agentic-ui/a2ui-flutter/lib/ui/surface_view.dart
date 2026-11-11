import 'package:a2ui_core/a2ui_core.dart';
import 'package:a2ui_flutter/a2ui_flutter.dart';
import 'package:flutter/material.dart';

import '../a2ui/surface_session.dart';

/// Renders every live surface of [session], each inside a container keyed
/// `km-a2ui-surface:<surfaceId>` (web `[data-testid=km-a2ui-surface]`).
class SurfaceView extends StatelessWidget {
  const SurfaceView({super.key, required this.session});

  final SurfaceSession session;

  static ValueKey<String> surfaceKey(String surfaceId) =>
      ValueKey<String>('km-a2ui-surface:$surfaceId');

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<List<SurfaceModel<ComponentImplementation>>>(
      valueListenable: session.surfaces,
      builder: (context, surfaces, _) => Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final surface in surfaces)
            KeyedSubtree(
              key: surfaceKey(surface.id),
              child: A2uiSurface(key: ObjectKey(surface), surface: surface),
            ),
        ],
      ),
    );
  }
}
