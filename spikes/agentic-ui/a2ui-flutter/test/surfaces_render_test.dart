// Per golden surface: renders without error, every expected component id is
// present (Key('a2ui:<id>')), fallback ids use the fallback, visible text,
// final data model and blocked media. Mirrors the static half of
// harness/checks/a2ui-surfaces.spec.ts.
import 'package:a2ui_parity/surfaces/golden_surface.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/image_requests.dart';
import 'support/surface_harness.dart';

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    await loadBrandFonts();
    await preloadSurfaces();
  });
  setUp(installFakeVideo);

  for (final String id in goldenSurfaceIds) {
    group('a2ui/$id', () {
      testWidgets('renders without error', (tester) async {
        final surface = await loadSurface(id);
        final session = await pumpSurface(tester, surface);
        expect(tester.takeException(), isNull);
        expect(session.rejected, isEmpty, reason: 'no message rejected');
        if (surface.validationMode == 'strict-pass') {
          expect(
            session.errors.map((e) => '${e.code}: ${e.message}'),
            isEmpty,
            reason: 'strict-pass surface reports no renderer errors',
          );
        }
      });

      testWidgets('every expected component id is rendered', (tester) async {
        final surface = await loadSurface(id);
        await pumpSurface(tester, surface);
        for (final String cid in surface.expected.renderedComponentIds) {
          expect(a2ui(cid), findsWidgets, reason: 'component $cid rendered');
        }
      });

      testWidgets('fallback ids use the neutral fallback', (tester) async {
        final surface = await loadSurface(id);
        await pumpSurface(tester, surface);
        for (final String cid in surface.expected.fallbackComponentIds) {
          expect(a2uiFallback(cid), findsOneWidget, reason: '$cid falls back');
        }
        final rendered = surface.expected.renderedComponentIds.toSet()
          ..removeAll(surface.expected.fallbackComponentIds);
        for (final String cid in rendered) {
          expect(a2uiFallback(cid), findsNothing, reason: '$cid is real');
        }
      });

      testWidgets('visible text', (tester) async {
        final surface = await loadSurface(id);
        await pumpSurface(tester, surface);
        for (final String text in surface.expected.visibleText) {
          expect(find.textContaining(text), findsWidgets, reason: text);
        }
      });

      if (_hasDataModelOrDelete(id)) {
        testWidgets('final data model and deletion', (tester) async {
          final surface = await loadSurface(id);
          final session = await pumpSurface(tester, surface);
          if (surface.expected.hasDataModel) {
            final Object? model = session.dataModelOf(surface.surfaceId);
            expect(
              jsonEquals(model, surface.expected.dataModel),
              isTrue,
              reason: 'expected ${surface.expected.dataModel}, got $model',
            );
          }
          if (surface.expected.deleted) {
            expect(session.deletedSurfaceIds, contains(surface.surfaceId));
            expect(session.surfaces.value, isEmpty);
          }
        });
      }

      testWidgets('blocked media is never requested', (tester) async {
        final surface = await loadSurface(id);
        final recorder = ImageRequestRecorder()..install();
        final video = installFakeVideo();
        try {
          await pumpSurface(tester, surface);
          final requested = [...recorder.urls, ...video.openedUris];
          for (final String url in surface.expected.blockedMediaUrls) {
            expect(requested, isNot(contains(url)), reason: 'blocked $url');
          }
        } finally {
          recorder.uninstall();
        }
      });
    });
  }
}

bool _hasDataModelOrDelete(String id) =>
    id == 'incremental-update-delete' || id == 'list-template';
