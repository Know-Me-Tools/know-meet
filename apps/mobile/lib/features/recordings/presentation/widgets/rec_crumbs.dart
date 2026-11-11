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
    final Text text = Text(label, style: KmText.smallSub(context));
    if (onTap == null) return text;
    return Semantics(
      link: true,
      label: label,
      excludeSemantics: true,
      onTap: onTap,
      child: InkWell(
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 24),
          child: Align(widthFactor: 1, child: text),
        ),
      ),
    );
  }
}
