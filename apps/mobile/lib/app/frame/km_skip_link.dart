// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../shared/ui/ui.dart';

/// `.skip-link`: the first focus stop. Invisible until focused, then shown
/// top-left on the `focus` fill (D-6: focus is a fill); activating it moves
/// focus to the main content.
class KmSkipLink extends StatefulWidget {
  const KmSkipLink({super.key, required this.onActivate, this.top = 0});

  final VoidCallback onActivate;

  /// The top safe-area inset.
  final double top;

  @override
  State<KmSkipLink> createState() => _KmSkipLinkState();
}

class _KmSkipLinkState extends State<KmSkipLink> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Positioned(
      left: KmTokens.s4,
      top: _focused ? widget.top + KmTokens.s2 : -100,
      child: Semantics(
        link: true,
        label: 'Skip to content',
        excludeSemantics: true,
        onTap: widget.onActivate,
        child: KmInteractive(
          key: const ValueKey<String>('km-skip-link'),
          onFocusChange: (bool f) => setState(() => _focused = f),
          onTap: widget.onActivate,
          builder: (BuildContext context, Set<WidgetState> s) {
            final KmStateColors c = KmStateColors(p.focus, p.onFocus);
            return KmFillBox(
              colors: c,
              constraints: const BoxConstraints(minHeight: KmTokens.sizeTarget),
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4),
              child: Text(
                'Skip to content',
                style: KmText.body(context).copyWith(
                  color: c.on,
                  fontWeight: KmTokens.fontWeightSemibold,
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
