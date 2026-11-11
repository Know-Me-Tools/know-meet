// Baseline: the official a2ui_flutter 0.2.0 basicCatalog() with no Know Meet
// wrapper, no unknown-component shim and no media policy. Records what the
// renderer does out of the box, for the parity table.
import 'package:a2ui_flutter/basic_catalog.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/image_requests.dart';
import 'support/surface_harness.dart';

void main() {
  setUpAll(() async {
    await loadBrandFonts();
    await preloadSurfaces();
  });
  setUp(installFakeVideo);

  testWidgets('unknown type: siblings render, unknown renders nothing, '
      'error reported, message not rejected', (tester) async {
    final surface = await loadSurface('unknown-component-fallback');
    final session = await pumpSurface(
      tester,
      surface,
      useFallbackShim: false,
      catalog: basicCatalog(),
    );
    expect(tester.takeException(), isNull);
    expect(session.rejected, isEmpty);
    expect(find.text('Before the unknown widget'), findsOneWidget);
    expect(find.text('After the unknown widget'), findsOneWidget);
    expect(find.textContaining('KmHologram'), findsNothing);
    expect(find.textContaining('Unsupported'), findsNothing);
    final codes = session.errors.map((e) => '${e.code}: ${e.message}').toList();
    debugPrint('native unknown-component errors: $codes');
    expect(codes.join(), contains('KmHologram'));
  });

  testWidgets('media: without a policy the disallowed image IS requested',
      (tester) async {
    final surface = await loadSurface('media-image-video-audio');
    final recorder = ImageRequestRecorder()..install();
    final video = installFakeVideo();
    try {
      await pumpSurface(tester, surface, catalog: basicCatalog());
      debugPrint('native image requests: ${recorder.urls}');
      debugPrint('native media opened: ${video.openedUris}');
      expect(recorder.urls, contains(surface.expected.blockedMediaUrls.single));
    } finally {
      recorder.uninstall();
    }
  });

  testWidgets('media with Know Meet policy: allowed media is requested '
      '(recorder positive control), evil URL is not, placeholder shown',
      (tester) async {
    final surface = await loadSurface('media-image-video-audio');
    final recorder = ImageRequestRecorder()..install();
    final video = installFakeVideo();
    try {
      await pumpSurface(tester, surface);
      final requested = [...recorder.urls, ...video.openedUris];
      debugPrint('km media requests: $requested');
      expect(requested, contains('${testOrigins.allowed}/media/whiteboard.png'));
      expect(requested, contains('${testOrigins.allowed}/media/clip.mp4'));
      expect(requested, contains('${testOrigins.allowed}/media/note.wav'));
      expect(requested, isNot(contains(surface.expected.blockedMediaUrls.single)));
      expect(a2uiBlocked('tracker'), findsOneWidget);
      expect(find.textContaining('Media blocked'), findsOneWidget);
    } finally {
      recorder.uninstall();
    }
  });

  testWidgets('native renderer exposes only NodeKey(instanceId), no id keys',
      (tester) async {
    final surface = await loadSurface('card-with-action');
    await pumpSurface(tester, surface, catalog: basicCatalog());
    expect(a2ui('add_btn'), findsNothing);
    expect(find.byKey(const _NodeKeyProbe('add_btn')), findsNothing);
    expect(find.text('Add to meeting'), findsOneWidget);
  });
}

/// ValueKey look-alike: NodeKey is a ValueKey subclass and never equals a
/// plain ValueKey, so app code cannot target components by id.
class _NodeKeyProbe extends ValueKey<String> {
  const _NodeKeyProbe(super.value);
}
