// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../shared/ui/ui.dart';

/// `.skip-link`: the first focus stop. Invisible until focused, then shown
/// top-left; activating it moves focus to the main content.
class KmSkipLink extends StatefulWidget {
  const KmSkipLink({super.key, required this.onActivate});

  final VoidCallback onActivate;

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
      top: _focused ? KmTokens.s2 : -100,
      child: Semantics(
        link: true,
        label: 'Skip to content',
        excludeSemantics: true,
        onTap: widget.onActivate,
        child: InkWell(
          key: const ValueKey<String>('km-skip-link'),
          onFocusChange: (bool f) => setState(() => _focused = f),
          onTap: widget.onActivate,
          borderRadius: BorderRadius.circular(KmTokens.radius),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s2),
            decoration: BoxDecoration(
              color: p.emberBtn,
              borderRadius: BorderRadius.circular(KmTokens.radius),
            ),
            child: Text(
              'Skip to content',
              style: KmText.body(context).copyWith(
                color: p.onEmber,
                fontWeight: KmTokens.fontWeightSemibold,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
