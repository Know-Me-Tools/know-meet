// TJ-ARCH-MOB-001 compliant
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Import boundaries (AGENTS.md clean architecture; hybrid-mobile-
/// architecture feature modules), checked over lib/ source text:
/// - domain/ and application/ import no Flutter, UI kit, Riverpod or vendor
///   SDK (LiveKit included);
/// - a feature never imports another feature (cross-feature goes through
///   app/ or shared/);
/// - shared/ never imports a feature or app/.
void main() {
  final RegExp importLine = RegExp(r"^import '([^']+)';", multiLine: true);
  final List<File> sources = <File>[
    for (final FileSystemEntity f in Directory('lib').listSync(recursive: true))
      if (f is File &&
          f.path.endsWith('.dart') &&
          !f.path.endsWith('.g.dart') &&
          !f.path.contains('${Platform.pathSeparator}bridge${Platform.pathSeparator}'))
        f,
  ];

  List<String> importsOf(File f) => <String>[
    for (final RegExpMatch m in importLine.allMatches(f.readAsStringSync())) m.group(1)!,
  ];

  String norm(String path) => path.replaceAll(Platform.pathSeparator, '/');

  test('domain and application layers stay framework-free', () {
    const List<String> banned = <String>[
      'package:flutter/',
      'package:flutter_riverpod/',
      'package:riverpod_annotation/',
      'package:shadcn_flutter/',
      'package:go_router/',
      'package:livekit_client/',
      'package:shared_preferences/',
    ];
    final List<String> violations = <String>[
      for (final File f in sources)
        if (RegExp(r'/(domain|application)/').hasMatch(norm(f.path)))
          for (final String i in importsOf(f))
            if (banned.any(i.startsWith)) '${norm(f.path)} -> $i',
    ];
    expect(violations, isEmpty);
  });

  test('features never import another feature', () {
    final RegExp feature = RegExp(r'^lib/features/([a-z_]+)/');
    final List<String> violations = <String>[];
    for (final File f in sources) {
      final RegExpMatch? own = feature.firstMatch(norm(f.path));
      if (own == null) continue;
      for (final String i in importsOf(f)) {
        if (i.startsWith('package:') || i.startsWith('dart:')) {
          final RegExpMatch? pkg = RegExp(
            r'^package:sovereign_hybrid_mobile/features/([a-z_]+)/',
          ).firstMatch(i);
          if (pkg != null && pkg.group(1) != own.group(1)) {
            violations.add('${norm(f.path)} -> $i');
          }
          continue;
        }
        final String target = norm(File('${f.parent.path}/$i').absolute.path);
        final RegExpMatch? other = RegExp(r'/lib/features/([a-z_]+)/').firstMatch(target);
        if (other != null && other.group(1) != own.group(1)) {
          violations.add('${norm(f.path)} -> $i');
        }
        if (target.contains('/lib/app/')) violations.add('${norm(f.path)} -> $i');
      }
    }
    expect(violations, isEmpty);
  });

  test('shared never imports features or app', () {
    final List<String> violations = <String>[
      for (final File f in sources)
        if (norm(f.path).startsWith('lib/shared/'))
          for (final String i in importsOf(f))
            if (i.contains('/features/') || i.contains('/app/') || i.startsWith('../../app'))
              '${norm(f.path)} -> $i',
    ];
    expect(violations, isEmpty);
  });
}
