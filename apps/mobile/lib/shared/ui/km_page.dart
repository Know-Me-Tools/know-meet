// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import 'km_palette_of.dart';
import 'km_text.dart';

/// `.page`: the scrolling content column of an app screen, capped at
/// `--page-max` and padded per the km.css breakpoints. [narrow] is
/// `.page-narrow` (760px).
class KmPage extends StatelessWidget {
  const KmPage({
    super.key,
    required this.children,
    this.narrow = false,
    this.controller,
  });

  final List<Widget> children;
  final bool narrow;
  final ScrollController? controller;

  @override
  Widget build(BuildContext context) {
    final bool phone = MediaQuery.sizeOf(context).width <= KmTokens.bp767;
    return SingleChildScrollView(
      controller: controller,
      padding: phone
          ? const EdgeInsets.fromLTRB(KmTokens.s4, KmTokens.s5, KmTokens.s4, KmTokens.s7)
          : const EdgeInsets.fromLTRB(KmTokens.s5, KmTokens.s6, KmTokens.s5, KmTokens.s8),
      child: Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: narrow ? 760 : KmTokens.pageMax),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: children,
          ),
        ),
      ),
    );
  }
}

/// One breadcrumb (`.crumbs a`).
class KmCrumb {
  const KmCrumb(this.label, {this.onTap});

  final String label;
  final VoidCallback? onTap;
}

/// `.page-head`: crumbs, eyebrow, h1 (announced as a heading), lede and an
/// actions cluster that wraps under the title at phone width.
class KmPageHead extends StatelessWidget {
  const KmPageHead({
    super.key,
    required this.title,
    this.eyebrow,
    this.lede,
    this.crumbs = const <KmCrumb>[],
    this.actions = const <Widget>[],
    this.leading,
  });

  final String title;
  final String? eyebrow;
  final String? lede;
  final List<KmCrumb> crumbs;
  final List<Widget> actions;

  /// Shown left of the title block (an agent glyph or dot).
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final bool phone = MediaQuery.sizeOf(context).width <= KmTokens.bp767;
    final Widget titleBlock = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        if (crumbs.isNotEmpty) ...<Widget>[
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 6,
            children: <Widget>[
              for (int i = 0; i < crumbs.length; i++) ...<Widget>[
                if (i > 0) ExcludeSemantics(child: Icon(Icons.chevron_right, size: 14, color: p.fgSub)),
                _Crumb(crumbs[i]),
              ],
            ],
          ),
          const SizedBox(height: KmTokens.s2),
        ],
        if (eyebrow != null) ...<Widget>[
          KmEyebrow(eyebrow!),
          const SizedBox(height: KmTokens.s2),
        ],
        Semantics(header: true, child: Text(title, style: KmText.h1(context))),
        if (lede != null) ...<Widget>[
          const SizedBox(height: KmTokens.s2),
          Text(lede!, style: KmText.sub(context)),
        ],
      ],
    );
    return Padding(
      padding: EdgeInsets.only(bottom: phone ? KmTokens.s5 : KmTokens.s6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          if (leading == null)
            titleBlock
          else
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                leading!,
                const SizedBox(width: KmTokens.s4),
                Expanded(child: titleBlock),
              ],
            ),
          if (actions.isNotEmpty) ...<Widget>[
            const SizedBox(height: KmTokens.s4),
            Wrap(spacing: KmTokens.s2, runSpacing: KmTokens.s2, children: actions),
          ],
        ],
      ),
    );
  }
}

class _Crumb extends StatelessWidget {
  const _Crumb(this.crumb);

  final KmCrumb crumb;

  @override
  Widget build(BuildContext context) {
    final Text text = Text(crumb.label, style: KmText.smallSub(context));
    if (crumb.onTap == null) return text;
    return Semantics(
      link: true,
      label: crumb.label,
      excludeSemantics: true,
      onTap: crumb.onTap,
      child: InkWell(
        onTap: crumb.onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 24),
          child: Align(widthFactor: 1, child: text),
        ),
      ),
    );
  }
}

/// `.section`: an h2 (announced as a heading), optional copy, then content.
class KmSection extends StatelessWidget {
  const KmSection({
    super.key,
    required this.title,
    required this.children,
    this.description,
    this.trailing,
    this.eyebrow,
  });

  final String title;
  final String? description;
  final String? eyebrow;
  final Widget? trailing;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (eyebrow != null) ...<Widget>[KmEyebrow(eyebrow!), const SizedBox(height: KmTokens.s2)],
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Expanded(
              child: Semantics(header: true, child: Text(title, style: KmText.h2(context))),
            ),
            ?trailing,
          ],
        ),
        if (description != null) ...<Widget>[
          const SizedBox(height: KmTokens.s2),
          Text(description!, style: KmText.smallSub(context)),
        ],
        const SizedBox(height: KmTokens.s4),
        ...children,
      ],
    );
  }
}

/// `.sidenav` at phone width: a horizontally scrolling row of section pills;
/// the current one is ember and announced as selected.
class KmSideNav<T> extends StatelessWidget {
  const KmSideNav({
    super.key,
    required this.items,
    required this.current,
    required this.onSelect,
    required this.label,
  });

  final List<(T, String, IconData)> items;
  final T current;
  final ValueChanged<T> onSelect;

  /// Landmark name ("Settings sections").
  final String label;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      container: true,
      label: label,
      explicitChildNodes: true,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: <Widget>[
            for (final (T value, String text, IconData icon) in items)
              Padding(
                padding: const EdgeInsets.only(right: KmTokens.s1),
                child: Semantics(
                  button: true,
                  selected: value == current,
                  label: text,
                  excludeSemantics: true,
                  onTap: () => onSelect(value),
                  child: Material(
                    color: value == current ? p.emberSoft : Colors.transparent,
                    borderRadius: BorderRadius.circular(KmTokens.radius),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(KmTokens.radius),
                      onTap: () => onSelect(value),
                      child: Container(
                        constraints: const BoxConstraints(minHeight: 44),
                        padding: const EdgeInsets.symmetric(horizontal: KmTokens.s3),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: <Widget>[
                            Icon(icon, size: 20, color: value == current ? p.emberText : p.fgSub),
                            const SizedBox(width: KmTokens.s3),
                            Text(
                              text,
                              style: KmText.label(context).copyWith(
                                color: value == current ? p.emberText : p.fgSub,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
