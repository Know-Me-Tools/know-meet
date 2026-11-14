// TJ-ARCH-MOB-001 compliant
import 'package:flutter_test/flutter_test.dart';

import '../support/golden_theme_override.dart';

/// The VS-3 negative-control seam cannot pass silently: no define renders
/// the generated themes, `stock-dark` swaps in ThemeData.dark(), and any
/// other value throws.
void main() {
  test('no define: no override', () {
    expect(goldenThemeOverrides(value: ''), isEmpty);
  });

  test('stock-dark: one override of the theme factory', () {
    expect(goldenThemeOverrides(value: kmGoldenStockDark), hasLength(1));
  });

  test('a mistyped define throws', () {
    expect(() => goldenThemeOverrides(value: 'stock_dark'), throwsArgumentError);
  });
}
