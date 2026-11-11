import 'package:flutter/material.dart';

import '../a2ui/media_policy.dart';
import '../a2ui/surface_session.dart';
import '../surfaces/golden_surface.dart';
import 'action_log.dart';
import 'surface_view.dart';

/// One golden surface: a fresh session with all messages applied, the
/// rendered surface and the action log.
class SurfacePage extends StatefulWidget {
  const SurfacePage({super.key, required this.surface, required this.media});

  final GoldenSurface surface;
  final MediaPolicy media;

  @override
  State<SurfacePage> createState() => _SurfacePageState();
}

class _SurfacePageState extends State<SurfacePage> {
  late SurfaceSession _session;
  int _revision = 0;

  @override
  void initState() {
    super.initState();
    _open();
  }

  @override
  void didUpdateWidget(SurfacePage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.surface.id != widget.surface.id) {
      _session.dispose();
      _open();
    }
  }

  void _open() {
    _session = SurfaceSession(media: widget.media);
    _session.processor.model.onAction.subscribe((_) {
      if (mounted) setState(() => _revision++);
    });
    _session.apply(widget.surface.messages);
  }

  @override
  void dispose() {
    _session.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(widget.surface.title, style: text.headlineMedium),
        const SizedBox(height: 4),
        Text(widget.surface.id, style: text.labelSmall),
        const SizedBox(height: 16),
        Material(
          type: MaterialType.transparency,
          child: SurfaceView(session: _session),
        ),
        if (_session.deletedSurfaceIds.isNotEmpty)
          Text('Surface deleted.', style: text.bodySmall),
        const SizedBox(height: 24),
        Text('ACTIONS', style: text.labelSmall),
        const SizedBox(height: 8),
        ActionLog(session: _session, revision: _revision),
      ],
    );
  }
}
