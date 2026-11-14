// TJ-ARCH-MOB-001 compliant
import 'package:flutter/widgets.dart';

import '../../shared/ui/ui.dart';

/// DESIGN.md "Adaptive layout" width classes, shared with the web
/// (`medium:` / `expanded:` Tailwind variants). Bounds come from the window
/// tokens, never from literals, and from the window width, never the OS.
enum KmWindowClass {
  /// < 600: bottom bar.
  compact,

  /// 600 to 1023: navigation rail.
  medium,

  /// >= 1024: inline links in the app bar.
  expanded;

  static KmWindowClass forWidth(double width) => width >= KmTokens.windowExpanded
      ? KmWindowClass.expanded
      : width >= KmTokens.windowMedium
      ? KmWindowClass.medium
      : KmWindowClass.compact;

  static KmWindowClass of(BuildContext context) =>
      forWidth(MediaQuery.sizeOf(context).width);
}
