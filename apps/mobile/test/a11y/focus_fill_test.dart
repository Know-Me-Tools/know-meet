// TJ-ARCH-MOB-001 compliant
@Tags(<String>['a11y'])
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shadcn_flutter/shadcn_flutter.dart' as shad;
import 'package:sovereign_hybrid_mobile/app/app_theme.dart';
import 'package:sovereign_hybrid_mobile/app/shadcn_theme.dart';
import 'package:sovereign_hybrid_mobile/shared/ui/ui.dart';
import 'package:sovereign_hybrid_mobile/theme/generated/km_theme.g.dart';

import '../support/km_contrast.dart';
import '../support/km_inventory.dart';
import '../support/km_test_app.dart';

/// D-6 focus model (DESIGN.md, Flat 2.0 controls; WCAG 2.2 SC 1.4.11,
/// 2.4.7): every control boundary is a fill >= 3:1 against the surfaces it
/// may sit on, keyboard focus is a fill change >= 3:1 against both the
/// unfocused state and the surface, content on every fill is >= 4.5:1, and
/// nothing draws a stroke.
void main() {
  for (final (String name, KmPalette p) in <(String, KmPalette)>[
    ('dark', KmPalette.dark),
    ('light', KmPalette.light),
  ]) {
    group('fill contrast ($name)', () {
      final Map<String, Color> surfaces = <String, Color>{
        'bg': p.bg,
        'bg-2': p.bg2,
        'surface': p.surface,
        'card': p.card,
      };
      for (final MapEntry<String, Color> s in surfaces.entries) {
        test('control boundary on ${s.key} >= 3:1 (1.4.11)', () {
          expect(kmContrast(p.control, s.value), greaterThanOrEqualTo(3));
        });
        test('focus fill on ${s.key} >= 3:1 (2.4.7)', () {
          expect(kmContrast(p.focus, s.value), greaterThanOrEqualTo(3));
        });
      }
      for (final (String what, Color rest) in <(String, Color)>[
        ('control', p.control),
        ('primary button', p.emberBtn),
        ('selected', p.selected),
        ('danger button', p.dangerBtn),
        ('invalid field', p.controlInvalid),
      ]) {
        test('focus vs unfocused $what >= 3:1', () {
          expect(kmContrast(p.focus, rest), greaterThanOrEqualTo(3));
        });
      }
      for (final (String what, Color fg, Color bg) in <(String, Color, Color)>[
        ('on-control', p.onControl, p.control),
        ('placeholder', p.controlPlaceholder, p.control),
        ('on-focus', p.onFocus, p.focus),
        ('focus placeholder', p.focusPlaceholder, p.focus),
        ('on-selected', p.onSelected, p.selected),
        ('on-control-invalid', p.onControlInvalid, p.controlInvalid),
        ('on-ember', p.onEmber, p.emberBtn),
      ]) {
        test('$what text >= 4.5:1 (1.4.3)', () {
          expect(kmContrast(fg, bg), greaterThanOrEqualTo(4.5));
        });
      }
    });
  }

  group('kit controls show keyboard focus by fill', () {
    for (final KmTestTheme theme in KmTestTheme.values) {
      testWidgets('every kit control takes the focus fill (${theme.name})', (
        WidgetTester tester,
      ) async {
        setKmViewport(tester, width: 375);
        await loadKmFonts();
        final Brightness b = theme == KmTestTheme.dark ? Brightness.dark : Brightness.light;
        final ThemeData t = withKmInteraction(buildKmTheme(b));
        final KmPalette p = kmPaletteOf(t);
        await tester.pumpWidget(_Harness(theme: t));
        await tester.pumpAndSettle();

        for (final String key in _fillControls) {
          await _tabTo(tester, ValueKey<String>(key));
          final Iterable<Color?> fills = tester
              .widgetList(find.descendant(
                of: find.byKey(ValueKey<String>(key)),
                matching: find.byWidgetPredicate((Widget w) => kmDecorationFill(w) != null),
              ))
              .map(kmDecorationFill);
          expect(fills, contains(p.focus), reason: '$key shows focus by fill');
        }

        await _tabTo(tester, const ValueKey<String>('field'));
        final InputDecorator decorator = tester.widget<InputDecorator>(find.descendant(
          of: find.byKey(const ValueKey<String>('field')),
          matching: find.byType(InputDecorator),
        ));
        expect(decorator.isFocused, isTrue);
        final Color? fill = WidgetStateProperty.resolveAs<Color?>(
          decorator.decoration.fillColor,
          <WidgetState>{WidgetState.focused},
        );
        expect(fill, p.focus);
        expect(decorator.decoration.focusedBorder?.borderSide.style, BorderStyle.none);
      });
    }
  });

  group('Flat 2.0: no strokes in any in-scope state', () {
    for (final KmInventoryState s in kmInScopeStates()) {
      testWidgets('${s.id} draws no border, outline, ring or divider', (WidgetTester tester) async {
        setKmViewport(tester, width: 375);
        await pumpKmApp(tester, stateId: s.id, signedIn: s.signedIn);
        final List<String> strokes = <String>[
          for (final Widget w in tester.allWidgets)
            if (kmStrokeOf(w) case final String found) found,
        ];
        expect(strokes, isEmpty);
      });
    }
  });
}

/// Controls whose focus is a [KmFillBox] or button decoration.
const List<String> _fillControls = <String>[
  'primary',
  'secondary',
  'ghost',
  'icon',
  'segmented',
  'chip',
  'checkbox',
  'radio',
  'select',
  'row',
];

Future<void> _tabTo(WidgetTester tester, Key key) async {
  for (int i = 0; i < 40; i++) {
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.pump();
    if (focusIsWithin(key)) {
      // Let the fill animation finish before the fill is read.
      await tester.pumpAndSettle();
      return;
    }
  }
  fail('Tab never reached $key');
}

class _Harness extends StatefulWidget {
  const _Harness({required this.theme});

  final ThemeData theme;

  @override
  State<_Harness> createState() => _HarnessState();
}

class _HarnessState extends State<_Harness> {
  bool _check = false;
  String _radio = 'a';
  String _seg = 'a';
  bool _chip = false;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: widget.theme,
      builder: (BuildContext context, Widget? child) =>
          shad.Theme(data: kmShadcnTheme(Theme.of(context)), child: child!),
      home: Scaffold(
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              KmButton(key: const ValueKey<String>('primary'), label: 'Primary', variant: KmButtonVariant.primary, onPressed: () {}),
              KmButton(key: const ValueKey<String>('secondary'), label: 'Secondary', onPressed: () {}),
              KmButton(key: const ValueKey<String>('ghost'), label: 'Ghost', variant: KmButtonVariant.ghost, onPressed: () {}),
              KmIconButton(key: const ValueKey<String>('icon'), icon: LucideIcons.sun, label: 'Icon', onPressed: () {}),
              KmSegmented<String>(
                key: const ValueKey<String>('segmented'),
                options: const <KmOption<String>>[KmOption<String>('a', 'A'), KmOption<String>('b', 'B')],
                selected: _seg,
                onChanged: (String v) => setState(() => _seg = v),
              ),
              KmToggleChip(
                key: const ValueKey<String>('chip'),
                label: 'Chip',
                selected: _chip,
                onChanged: (bool v) => setState(() => _chip = v),
              ),
              KmCheckbox(
                key: const ValueKey<String>('checkbox'),
                label: 'Check',
                value: _check,
                onChanged: (bool v) => setState(() => _check = v),
              ),
              KmRadio<String>(
                key: const ValueKey<String>('radio'),
                label: 'Radio',
                value: 'b',
                groupValue: _radio,
                onChanged: (String v) => setState(() => _radio = v),
              ),
              SizedBox(
                width: 240,
                child: KmSelect<String>(
                  key: const ValueKey<String>('select'),
                  label: 'Select',
                  value: 'a',
                  options: const <(String, String)>[('a', 'Alpha'), ('b', 'Beta')],
                  onChanged: (String _) {},
                ),
              ),
              KmListRow(key: const ValueKey<String>('row'), title: 'Row', onTap: () {}),
              const KmTextField(key: ValueKey<String>('field'), label: 'Field', placeholder: 'e.g. Avery'),
            ],
          ),
        ),
      ),
    );
  }
}
