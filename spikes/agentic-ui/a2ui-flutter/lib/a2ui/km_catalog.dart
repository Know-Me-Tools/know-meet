import 'package:a2ui_flutter/a2ui_flutter.dart';
import 'package:a2ui_flutter/basic_catalog.dart';
import 'package:flutter/material.dart';
import 'package:json_schema_builder/json_schema_builder.dart' show Schema;

import 'media_policy.dart';
import 'unknown_component_shim.dart';

/// Key on the root widget of each rendered component: `Key('a2ui:<id>')`, the
/// Flutter equivalent of the web contract's `data-a2ui-id`.
ValueKey<String> a2uiIdKey(String componentId) =>
    ValueKey<String>('a2ui:$componentId');

/// Marks a fallback (web `data-a2ui-fallback`).
ValueKey<String> a2uiFallbackKey(String componentId) =>
    ValueKey<String>('a2ui-fallback:$componentId');

/// Marks blocked media (web `km-media-blocked`).
ValueKey<String> a2uiBlockedKey(String componentId) =>
    ValueKey<String>('a2ui-blocked:$componentId');

const Set<String> _mediaComponents = {'Image', 'Video', 'AudioPlayer'};

/// The Know Meet catalog: the official basic v1.0 catalog under the same id,
/// with each builder wrapped to (1) key its root by component id, (2) block
/// media from origins outside [media], plus a `KmFallback` component for the
/// unknown-component shim. Visuals come from the ambient ThemeData, which the
/// app builds from packages/design-tokens (km_theme.g.dart).
CatalogImplementation kmCatalog({
  required MediaPolicy media,
  String locale = 'en-US',
}) {
  final CatalogImplementation basic = basicCatalog(locale: locale);
  return CatalogImplementation(
    id: basic.id,
    components: [
      for (final ComponentImplementation c in BasicComponents.all)
        _wrap(c, media),
      _fallbackComponent,
    ],
    functions: basic.functions.values.toList(),
    schemaId: basic.schemaId,
    title: 'Know Meet A2UI catalog (spike)',
    description: basic.description,
    protocolVersion: basic.protocolVersion,
    instructions: basic.instructions,
    definitions: basic.definitions,
  );
}

/// Component type names the Know Meet catalog implements (shim input).
Set<String> kmCatalogTypes() => {
  for (final ComponentImplementation c in BasicComponents.all) c.name,
  fallbackType,
};

ComponentImplementation _wrap(ComponentImplementation base, MediaPolicy media) =>
    ComponentImplementation(
      name: base.name,
      schema: base.schema,
      allowedParents: base.allowedParents,
      allowedChildren: base.allowedChildren,
      builder: (context, node, props, buildChild) {
        final String id = node.componentId;
        final bool blocked =
            _mediaComponents.contains(base.name) &&
            !(media.allows(props.string('url')) &&
                media.allows(props.string('posterUrl')));
        return KeyedSubtree(
          key: a2uiIdKey(id),
          child: blocked
              ? _BlockedMedia(
                  key: a2uiBlockedKey(id),
                  description: props.string('description'),
                )
              : base.builder(context, node, props, buildChild),
        );
      },
    );

final ComponentImplementation _fallbackComponent = ComponentImplementation(
  name: fallbackType,
  schema: Schema.object(
    properties: {'originalType': Schema.string()},
    required: ['originalType'],
  ),
  builder: (context, node, props, buildChild) => KeyedSubtree(
    key: a2uiIdKey(node.componentId),
    child: _Fallback(
      key: a2uiFallbackKey(node.componentId),
      originalType: props.string('originalType') ?? 'unknown',
    ),
  ),
);

/// Neutral placeholder for a component type the app cannot render.
class _Fallback extends StatelessWidget {
  const _Fallback({super.key, required this.originalType});

  final String originalType;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    return Semantics(
      label: 'Unsupported content',
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Text(
            'Unsupported content ($originalType)',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      ),
    );
  }
}

/// Shown in place of media whose origin is not allowed. Makes no request.
class _BlockedMedia extends StatelessWidget {
  const _BlockedMedia({super.key, this.description});

  final String? description;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final String label = (description == null || description!.isEmpty)
        ? 'Media blocked'
        : 'Media blocked: ${description!}';
    return Semantics(
      label: label,
      excludeSemantics: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.block, size: 18, color: theme.colorScheme.error),
          const SizedBox(width: 8),
          Flexible(child: Text(label, style: theme.textTheme.bodySmall)),
        ],
      ),
    );
  }
}
