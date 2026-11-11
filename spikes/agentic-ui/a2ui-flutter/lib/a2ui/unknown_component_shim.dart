/// Transport-side shim for the missing unknown-component fallback.
///
/// a2ui_flutter 0.1.0+ renders an unknown component type as nothing (fallback
/// API pending upstream, a2ui-project/a2ui#2013). The web contract requires a
/// neutral fallback carrying the component id, so before the processor sees an
/// `updateComponents` message, every component whose type the catalog does not
/// implement is rewritten to [fallbackType], keeping its id and recording the
/// original type. Pure Dart: no Flutter imports.
const String fallbackType = 'KmFallback';

/// Returns [message] with unknown component types rewritten, or [message]
/// itself when nothing changes.
Map<String, Object?> rewriteUnknownComponents(
  Map<String, Object?> message,
  Set<String> knownTypes,
) {
  final Object? update = message['updateComponents'];
  if (update is! Map) return message;
  final Object? components = update['components'];
  if (components is! List) return message;
  var changed = false;
  final List<Object?> rewritten = [
    for (final Object? component in components)
      if (component is Map &&
          component['component'] is String &&
          !knownTypes.contains(component['component']))
        () {
          changed = true;
          return <String, Object?>{
            'id': component['id'],
            'component': fallbackType,
            'originalType': component['component'],
          };
        }()
      else
        component,
  ];
  if (!changed) return message;
  return <String, Object?>{
    ...message,
    'updateComponents': <String, Object?>{
      ...Map<String, Object?>.from(update),
      'components': rewritten,
    },
  };
}
