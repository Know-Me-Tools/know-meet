// Live A2UI action round-trip against the harness mock server (contract.md
// section 1): each action the Flutter renderer emits is POSTed as an AG-UI
// RunAgentInput with forwardedProps.a2uiAction.userAction, and the server's
// session log must hold exactly the expected action, with no 409 and no
// schema-invalid body. Run:
//   KM_HARNESS_URL=http://127.0.0.1:4317 flutter test --tags live-harness --run-skipped
@Tags(['live-harness'])
library;

import 'dart:convert';
import 'dart:io';

import 'package:a2ui_parity/a2ui/agui_action.dart';
import 'package:a2ui_parity/surfaces/golden_surface.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/interactions.dart';
import 'support/surface_harness.dart';

final String _base =
    Platform.environment['KM_HARNESS_URL'] ?? 'http://127.0.0.1:4317';

final class _RealHttp extends HttpOverrides {}

Future<int> _postRun(String scenario, String session, int n, Object? props) {
  return HttpOverrides.runWithHttpOverrides(() async {
    final client = HttpClient();
    try {
      final uri = Uri.parse(
        '$_base/agui/$scenario?session=$session&rate=max&gap=0',
      );
      final req = await client.postUrl(uri);
      req.headers
        ..contentType = ContentType.json
        ..set(HttpHeaders.acceptHeader, 'text/event-stream');
      req.write(jsonEncode({
        'threadId': 'thread-$session',
        'runId': 'run-$session-$n',
        'messages': <Object>[],
        'tools': <Object>[],
        'context': <Object>[],
        'state': <String, Object>{},
        'forwardedProps': props ?? <String, Object>{},
      }));
      final res = await req.close();
      await res.drain<void>();
      return res.statusCode;
    } finally {
      client.close(force: true);
    }
  }, _RealHttp());
}

Future<Map<String, Object?>> _summary(String session) =>
    HttpOverrides.runWithHttpOverrides(() async {
      final client = HttpClient();
      try {
        final res = await (await client.getUrl(
          Uri.parse('$_base/sessions/$session'),
        )).close();
        final body = await res.transform(utf8.decoder).join();
        return Map<String, Object?>.from(
          (jsonDecode(body) as Map)['summary']! as Map,
        );
      } finally {
        client.close(force: true);
      }
    }, _RealHttp());

void main() {
  setUpAll(() async {
    await loadBrandFonts();
    await preloadSurfaces();
  });
  setUp(installFakeVideo);

  for (final String id in goldenSurfaceIds) {
    final scenario = 'a2ui/$id';
    testWidgets('live round-trip $scenario', (tester) async {
      final surface = await loadSurface(id);
      final session = await pumpSurface(tester, surface);
      for (final i in surface.interactions) {
        await runInteraction(tester, session, surface, i);
      }
      final sid = 'flutter-$id-${DateTime.now().microsecondsSinceEpoch}';
      final statuses = <int>[];
      final summary = await tester.runAsync(() async {
        statuses.add(await _postRun(scenario, sid, 0, null));
        var n = 1;
        for (final a in session.actions) {
          statuses.add(await _postRun(scenario, sid, n++, toAgUiForwardedProps(a)));
        }
        return _summary(sid);
      });
      // ignore: avoid_print
      print('LIVE $scenario statuses=$statuses summary=${jsonEncode(summary)}');
      expect(statuses.every((s) => s == 200), isTrue, reason: '$statuses');
      final logged = (summary!['a2uiActions']! as List).cast<Map>();
      final expected = [
        for (final i in surface.interactions)
          if (i.expectAction case final a?)
            {
              'name': a.name,
              'surfaceId': surface.surfaceId,
              'sourceComponentId': a.sourceComponentId,
              'context': a.context,
            },
      ];
      expect(jsonEquals(logged, expected), isTrue, reason: 'logged $logged');
    });
  }
}
