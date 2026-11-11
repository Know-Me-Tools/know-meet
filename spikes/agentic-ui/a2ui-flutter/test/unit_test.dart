// Pure-Dart units: unknown-component shim, media policy, and that the copied
// theme files are byte-identical to packages/design-tokens/generated/flutter.
import 'dart:io';

import 'package:a2ui_parity/a2ui/media_policy.dart';
import 'package:a2ui_parity/a2ui/unknown_component_shim.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('rewriteUnknownComponents', () {
    test('rewrites only unknown types, keeps ids and order', () {
      final out = rewriteUnknownComponents({
        'version': '1.0',
        'updateComponents': {
          'surfaceId': 's',
          'components': [
            {'id': 'a', 'component': 'Text', 'text': 'x'},
            {'id': 'b', 'component': 'KmHologram', 'intensity': 11},
          ],
        },
      }, {'Text'});
      final comps = (out['updateComponents']! as Map)['components']! as List;
      expect(comps[0], {'id': 'a', 'component': 'Text', 'text': 'x'});
      expect(comps[1], {
        'id': 'b',
        'component': fallbackType,
        'originalType': 'KmHologram',
      });
    });

    test('returns the same message when nothing is unknown', () {
      final msg = <String, Object?>{'version': '1.0', 'deleteSurface': {}};
      expect(identical(rewriteUnknownComponents(msg, {}), msg), isTrue);
    });
  });

  group('MediaPolicy', () {
    const policy = MediaPolicy(allowedOrigins: {'http://127.0.0.1:4317'});
    test('allows the listed origin and empty urls', () {
      expect(policy.allows('http://127.0.0.1:4317/media/a.png'), isTrue);
      expect(policy.allows(''), isTrue);
      expect(policy.allows(null), isTrue);
    });
    test('blocks other origins, ports and schemes', () {
      expect(policy.allows('http://127.0.0.1:4318/beacon.png'), isFalse);
      expect(policy.allows('https://127.0.0.1:4317/a.png'), isFalse);
      expect(policy.allows('data:image/png;base64,AAAA'), isFalse);
      expect(policy.allows('file:///etc/passwd'), isFalse);
    });
  });

  test('copied theme matches packages/design-tokens/generated/flutter', () {
    const source = '../../../packages/design-tokens/generated/flutter';
    for (final name in ['km_theme.g.dart', 'tokens.g.dart']) {
      expect(
        File('lib/theme/generated/$name').readAsStringSync(),
        File('$source/$name').readAsStringSync(),
        reason: '$name drifted; re-copy it',
      );
    }
  });
}
