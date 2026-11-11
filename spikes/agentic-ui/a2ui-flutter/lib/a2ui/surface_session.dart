import 'package:a2ui_core/a2ui_core.dart';
import 'package:a2ui_flutter/a2ui_flutter.dart';
import 'package:flutter/foundation.dart';

import 'km_catalog.dart';
import 'media_policy.dart';
import 'unknown_component_shim.dart';

/// One processor plus everything the parity checks observe: live surfaces,
/// last data model per surface, emitted actions and reported errors.
final class SurfaceSession {
  SurfaceSession({
    required MediaPolicy media,
    this.useFallbackShim = true,
    CatalogImplementation? catalog,
  }) : _knownTypes = kmCatalogTypes() {
    processor = MessageProcessor<ComponentImplementation>(
      catalogs: [catalog ?? kmCatalog(media: media)],
    );
    processor.model.onSurfaceCreated.subscribe(_onCreated);
    processor.model.onSurfaceDeleted.subscribe(_onDeleted);
    processor.model.onAction.subscribe(actions.add);
    processor.model.onError.subscribe(errors.add);
  }

  /// Rewrite unknown component types to `KmFallback` before processing.
  final bool useFallbackShim;
  final Set<String> _knownTypes;
  late final MessageProcessor<ComponentImplementation> processor;

  final ValueNotifier<List<SurfaceModel<ComponentImplementation>>> surfaces =
      ValueNotifier(const []);
  final List<A2uiRendererAction> actions = [];
  final List<A2uiRendererError> errors = [];

  /// Errors thrown by `processMessages` (a whole message rejected).
  final List<Object> rejected = [];
  final Set<String> deletedSurfaceIds = {};
  final Map<String, Object?> _lastDataModel = {};

  /// Applies messages one at a time, so one rejected message does not stop the
  /// rest (the web renderer also continues past a bad message).
  void apply(Iterable<Map<String, Object?>> messages) {
    for (final Map<String, Object?> message in messages) {
      applyOne(message);
    }
  }

  void applyOne(Map<String, Object?> message) {
    final Map<String, Object?> input = useFallbackShim
        ? rewriteUnknownComponents(message, _knownTypes)
        : message;
    try {
      processor.processMessages([input]);
    } on Object catch (error) {
      rejected.add(error);
    }
    _captureDataModels();
  }

  /// The surface's data model, or the last one seen if it was deleted.
  Object? dataModelOf(String surfaceId) {
    for (final s in surfaces.value) {
      if (s.id == surfaceId) return s.dataModel.get('/');
    }
    return _lastDataModel[surfaceId];
  }

  void _captureDataModels() {
    for (final s in surfaces.value) {
      _lastDataModel[s.id] = _snapshot(s.dataModel.get('/'));
    }
  }

  static Object? _snapshot(Object? value) => switch (value) {
    final Map<Object?, Object?> m => {
      for (final e in m.entries) e.key.toString(): _snapshot(e.value),
    },
    final List<Object?> l => [for (final e in l) _snapshot(e)],
    _ => value,
  };

  void _onCreated(SurfaceModel<ComponentImplementation> surface) {
    surfaces.value = [...surfaces.value, surface];
  }

  void _onDeleted(String id) {
    deletedSurfaceIds.add(id);
    surfaces.value = [
      for (final s in surfaces.value)
        if (s.id != id) s,
    ];
  }

  void dispose() {
    processor.dispose();
    surfaces.dispose();
  }
}
