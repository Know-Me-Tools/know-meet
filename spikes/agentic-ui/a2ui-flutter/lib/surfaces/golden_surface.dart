// Golden A2UI surface files from spikes/agentic-ui/harness/corpus/a2ui/surfaces.
// Mirrors GoldenSurfaceFile in harness/src/domain/a2ui-surface.ts. Pure Dart:
// no Flutter imports, so the loader and the tests share one model.

/// Origins the harness substitutes for `{{ALLOWED_ORIGIN}}` and `{{EVIL_ORIGIN}}`
/// (mock server defaults: port 4317 and the evil listener on 4318).
final class HarnessOrigins {
  const HarnessOrigins({
    this.allowed = 'http://127.0.0.1:4317',
    this.evil = 'http://127.0.0.1:4318',
  });

  final String allowed;
  final String evil;

  String resolve(String text) => text
      .replaceAll('{{ALLOWED_ORIGIN}}', allowed)
      .replaceAll('{{EVIL_ORIGIN}}', evil);
}

/// The A2UI action a golden interaction must emit (timestamp excluded).
final class ExpectedAction {
  const ExpectedAction({
    required this.name,
    required this.sourceComponentId,
    required this.context,
  });

  factory ExpectedAction.fromJson(Map<String, Object?> json) => ExpectedAction(
    name: json['name']! as String,
    sourceComponentId: json['sourceComponentId']! as String,
    context: Map<String, Object?>.from(json['context']! as Map),
  );

  final String name;
  final String sourceComponentId;
  final Map<String, Object?> context;
}

final class GoldenInteraction {
  const GoldenInteraction({
    required this.description,
    required this.fill,
    required this.toggle,
    required this.click,
    required this.expectAction,
    required this.expectVisibleText,
  });

  factory GoldenInteraction.fromJson(Map<String, Object?> json) {
    final Object? action = json['expectAction'];
    return GoldenInteraction(
      description: json['description']! as String,
      fill: Map<String, String>.from((json['fill'] as Map?) ?? const {}),
      toggle: List<String>.from((json['toggle'] as List?) ?? const []),
      click: json['click']! as String,
      expectAction: action is Map
          ? ExpectedAction.fromJson(Map<String, Object?>.from(action))
          : null,
      expectVisibleText: List<String>.from(
        (json['expectVisibleText'] as List?) ?? const [],
      ),
    );
  }

  final String description;
  final Map<String, String> fill;
  final List<String> toggle;
  final String click;

  /// Null means the click must not emit an action.
  final ExpectedAction? expectAction;
  final List<String> expectVisibleText;
}

final class GoldenExpectation {
  const GoldenExpectation({
    required this.renderedComponentIds,
    required this.fallbackComponentIds,
    required this.visibleText,
    required this.blockedMediaUrls,
    required this.dataModel,
    required this.hasDataModel,
    required this.deleted,
  });

  factory GoldenExpectation.fromJson(Map<String, Object?> json) =>
      GoldenExpectation(
        renderedComponentIds: List<String>.from(
          json['renderedComponentIds']! as List,
        ),
        fallbackComponentIds: List<String>.from(
          json['fallbackComponentIds']! as List,
        ),
        visibleText: List<String>.from(json['visibleText']! as List),
        blockedMediaUrls: List<String>.from(json['blockedMediaUrls']! as List),
        dataModel: json['dataModel'],
        hasDataModel: json.containsKey('dataModel'),
        deleted: json['deleted'] == true,
      );

  final List<String> renderedComponentIds;
  final List<String> fallbackComponentIds;
  final List<String> visibleText;
  final List<String> blockedMediaUrls;
  final Object? dataModel;
  final bool hasDataModel;
  final bool deleted;
}

final class GoldenSurface {
  const GoldenSurface({
    required this.id,
    required this.title,
    required this.surfaceId,
    required this.a2uiSpecVersion,
    required this.validationMode,
    required this.messages,
    required this.interactions,
    required this.expected,
    required this.flutterNotes,
  });

  /// Parses one surface file, resolving the media origin placeholders.
  factory GoldenSurface.fromJson(
    Map<String, Object?> json, {
    HarnessOrigins origins = const HarnessOrigins(),
  }) {
    final Object? resolved = _resolve(json, origins);
    final Map<String, Object?> doc = Map<String, Object?>.from(resolved! as Map);
    final Map<String, Object?> validation = Map<String, Object?>.from(
      doc['validation']! as Map,
    );
    return GoldenSurface(
      id: doc['id']! as String,
      title: doc['title']! as String,
      surfaceId: doc['surfaceId']! as String,
      a2uiSpecVersion: doc['a2uiSpecVersion']! as String,
      validationMode: validation['mode']! as String,
      messages: [
        for (final Object? m in doc['messages']! as List)
          Map<String, Object?>.from(m! as Map),
      ],
      interactions: [
        for (final Object? i in doc['interactions']! as List)
          GoldenInteraction.fromJson(Map<String, Object?>.from(i! as Map)),
      ],
      expected: GoldenExpectation.fromJson(
        Map<String, Object?>.from(doc['expected']! as Map),
      ),
      flutterNotes: doc['flutterNotes']! as String,
    );
  }

  final String id;
  final String title;
  final String surfaceId;
  final String a2uiSpecVersion;

  /// `strict-pass` or `strict-fail-expected` (web_core STRICT validation).
  final String validationMode;
  final List<Map<String, Object?>> messages;
  final List<GoldenInteraction> interactions;
  final GoldenExpectation expected;
  final String flutterNotes;

  static Object? _resolve(Object? value, HarnessOrigins origins) =>
      switch (value) {
        final String s => origins.resolve(s),
        final List<Object?> l => [for (final e in l) _resolve(e, origins)],
        final Map<Object?, Object?> m => <String, Object?>{
          for (final e in m.entries)
            e.key.toString(): _resolve(e.value, origins),
        },
        _ => value,
      };
}

/// The eight golden surface ids, in harness manifest order.
const List<String> goldenSurfaceIds = [
  'button-actions-roundtrip',
  'card-with-action',
  'form-validation',
  'incremental-update-delete',
  'list-template',
  'media-image-video-audio',
  'nested-layout',
  'unknown-component-fallback',
];
