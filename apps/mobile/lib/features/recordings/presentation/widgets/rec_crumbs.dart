// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';

/// `nav.crumbs[aria-label=Breadcrumb]`: linked crumbs, the last one is the
/// current page. Feature-local: the kit's crumbs live inside KmPageHead,
/// and the recording detail head needs its own layout.
class RecCrumbs extends StatelessWidget {
  const RecCrumbs(this.items, {super.key});

  /// (label, onTap) pairs; a null onTap marks the current page.
  final List<(String, VoidCallback?)> items;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: 'Breadcrumb',
      child: Wrap(
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 6,
        runSpacing: 2,
        children: <Widget>[
          for (int i = 0; i < items.length; i++) ...<Widget>[
            if (i > 0)
              ExcludeSemantics(child: Icon(LucideIcons.chevronRight, size: 14, color: p.fgSub)),
            _crumb(context, items[i].$1, items[i].$2),
          ],
        ],
      ),
    );
  }

  Widget _crumb(BuildContext context, String label, VoidCallback? onTap) {
    if (onTap == null) return Text(label, style: KmText.smallSub(context));
    final KmPalette p = context.km;
    return Semantics(
      link: true,
      label: label,
      excludeSemantics: true,
      onTap: onTap,
      // Link: quiet at rest, `card-hov` hover, `focus` fill on focus.
      child: KmInteractive(
        onTap: onTap,
        builder: (BuildContext context, Set<WidgetState> s) {
          final KmStateColors c = KmStateColors.quiet(p, s);
          return KmFillBox(
            colors: c,
            radius: KmTokens.radius4,
            constraints: const BoxConstraints(minHeight: KmTokens.sizeTargetMin),
            padding: const EdgeInsets.symmetric(horizontal: 2),
            alignment: Alignment.center,
            child: Text(label, style: KmText.small(context).copyWith(color: c.on)),
          );
        },
      ),
    );
  }
}
