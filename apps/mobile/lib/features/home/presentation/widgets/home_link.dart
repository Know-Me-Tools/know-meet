// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';

/// An inline text link (km.css `a`): ember, underlined, announced as a link.
/// Feature-local: the kit has no text-link widget yet.
class HomeLink extends StatelessWidget {
  const HomeLink(this.label, {super.key, required this.onTap, this.small = true});

  final String label;
  final VoidCallback onTap;
  final bool small;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final TextStyle base = small ? KmText.small(context) : KmText.body(context);
    return Semantics(
      link: true,
      label: label,
      excludeSemantics: true,
      onTap: onTap,
      child: InkWell(
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44),
          child: Align(
            widthFactor: 1,
            child: Text(
              label,
              style: base.copyWith(
                color: p.emberText,
                decoration: TextDecoration.underline,
                decorationColor: p.emberText,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// `.sec-head`: eyebrow, h2 (announced as a heading) and intro copy.
class HomeSectionHead extends StatelessWidget {
  const HomeSectionHead({
    super.key,
    required this.eyebrow,
    required this.title,
    required this.body,
  });

  final String eyebrow;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        KmEyebrow(eyebrow),
        const SizedBox(height: KmTokens.s3),
        Semantics(header: true, child: Text(title, style: KmText.h1(context))),
        const SizedBox(height: KmTokens.s5),
        Text(body, style: KmText.lede(context)),
        const SizedBox(height: KmTokens.s5),
      ],
    );
  }
}
