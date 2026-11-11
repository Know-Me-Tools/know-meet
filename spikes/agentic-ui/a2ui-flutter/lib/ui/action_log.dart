import 'dart:convert';

import 'package:flutter/material.dart';

import '../a2ui/agui_action.dart';
import '../a2ui/surface_session.dart';

/// Shows the AG-UI forwardedProps each emitted action would send to the agent.
class ActionLog extends StatelessWidget {
  const ActionLog({super.key, required this.session, required this.revision});

  final SurfaceSession session;

  /// Bumped by the parent when an action arrives, to rebuild.
  final int revision;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    if (session.actions.isEmpty) {
      return Text(
        'No actions yet. Activate a button in the surface.',
        style: theme.textTheme.bodySmall,
      );
    }
    const JsonEncoder encoder = JsonEncoder.withIndent('  ');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final action in session.actions.reversed)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHigh,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: SelectableText(
                  encoder.convert(toAgUiForwardedProps(action)),
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onSurface,
                    letterSpacing: 0,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
