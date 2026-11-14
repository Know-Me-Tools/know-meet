// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../shared/ui/ui.dart';
import 'km_destinations.dart';

/// Shared inputs of the three navigation layouts (DESIGN.md "Anatomy and
/// states"). One `Primary` navigation landmark in every class; the class
/// changes layout only, never the destination order.
class KmNavProps {
  const KmNavProps({
    required this.location,
    required this.onSelect,
    this.focusNodes,
    this.labelOpacity = kAlwaysCompleteAnimation,
  });

  /// The router's matched location; the current item is derived from it.
  final String location;
  final ValueChanged<KmDestination> onSelect;

  /// One node per destination, owned by the frame so focus survives the
  /// bar <-> rail <-> links morph. Null for the non-interactive outgoing copy.
  final List<FocusNode>? focusNodes;

  /// Label fade during the morph (`dur-nav-label`).
  final Animation<double> labelOpacity;

  int get current => kmDestinationIndex(location);
}

/// Compact (< 600): the bottom bar. Fill `bg-2`, height `size-nav-bar-h`
/// plus the bottom safe area, five equal items at least 48 wide.
class KmBottomBar extends StatelessWidget {
  const KmBottomBar({super.key, required this.props});

  final KmNavProps props;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: 'Primary',
      child: ColoredBox(
        color: context.km.bg2,
        child: SafeArea(
          top: false,
          left: false,
          right: false,
          child: SizedBox(
            height: KmTokens.sizeNavBarH,
            child: Row(
              children: <Widget>[
                for (int i = 0; i < kmDestinations.length; i++)
                  Expanded(child: _StackedItem(index: i, props: props)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Medium (600 to 1023): the navigation rail on the leading edge under the
/// app bar. Fill `bg-2`, width `size-nav-rail-w` plus the leading safe
/// area; 80 x 64 items from the top with `s4` padding and `s1` gaps.
class KmNavRail extends StatelessWidget {
  const KmNavRail({super.key, required this.props});

  final KmNavProps props;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: 'Primary',
      child: ColoredBox(
        color: context.km.bg2,
        child: SafeArea(
          top: false,
          bottom: false,
          right: false,
          child: SizedBox(
            width: KmTokens.sizeNavRailW,
            child: Padding(
              padding: const EdgeInsets.only(top: KmTokens.s4),
              child: Column(
                children: <Widget>[
                  for (int i = 0; i < kmDestinations.length; i++)
                    Padding(
                      padding: const EdgeInsets.only(bottom: KmTokens.s1),
                      child: SizedBox(
                        width: KmTokens.sizeNavRailW,
                        height: KmTokens.sizeNavBarH,
                        child: _StackedItem(index: i, props: props),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Expanded (>= 1024): the prototype's inline pill links in the app bar
/// (44 tall, 14px semibold, radius-pill, 2px gaps). Current is `selected` /
/// `on-selected` (was `ember-soft` / `ember-text`).
class KmInlineNav extends StatelessWidget {
  const KmInlineNav({super.key, required this.props});

  final KmNavProps props;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: 'Primary',
      child: FadeTransition(
        opacity: props.labelOpacity,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: <Widget>[
              for (int i = 0; i < kmDestinations.length; i++)
                Padding(
                  padding: const EdgeInsets.only(right: 2),
                  child: _InlineLink(index: i, props: props),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A bar or rail item: 24px glyph in a 56 x 32 indicator, 12px semibold
/// label below, gap 4. Rest `fg-sub`; hover indicator `card-hov`; current
/// indicator `selected`, glyph `on-selected`, label `fg`; keyboard focus
/// fills the whole item (radius 12) with `focus`, glyph and label
/// `on-focus`. No ripple: the fill change is the feedback.
class _StackedItem extends StatelessWidget {
  const _StackedItem({required this.index, required this.props});

  final int index;
  final KmNavProps props;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final KmDestination d = kmDestinations[index];
    final bool current = index == props.current;
    return Semantics(
      button: true,
      selected: current,
      label: d.label,
      excludeSemantics: true,
      onTap: () => props.onSelect(d),
      child: KmInteractive(
        key: ValueKey<String>('km-nav-${d.path}'),
        focusNode: props.focusNodes?[index],
        selected: current,
        onTap: () => props.onSelect(d),
        builder: (BuildContext context, Set<WidgetState> s) {
          final bool focused = s.contains(WidgetState.focused);
          final bool hovered = s.contains(WidgetState.hovered);
          final Color indicator = focused
              ? Colors.transparent
              : current
              ? p.selected
              : (hovered ? p.cardHov : Colors.transparent);
          final Color glyph = focused ? p.onFocus : (current ? p.onSelected : p.fgSub);
          final Color label = focused ? p.onFocus : (current ? p.fg : p.fgSub);
          return KmFillBox(
            colors: KmStateColors(focused ? p.focus : Colors.transparent, label),
            alignment: Alignment.center,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                AnimatedContainer(
                  key: current ? const ValueKey<String>('km-nav-current') : null,
                  duration: KmMotion.of(context, KmTokens.durFast),
                  width: KmTokens.sizeNavIndicatorW,
                  height: KmTokens.sizeNavIndicatorH,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: indicator,
                    borderRadius: BorderRadius.circular(KmTokens.radiusPill),
                  ),
                  child: KmGlyphIcon(d.glyph, size: 24, color: glyph),
                ),
                const SizedBox(height: 4),
                FadeTransition(
                  opacity: props.labelOpacity,
                  child: Text(
                    d.label,
                    maxLines: 1,
                    overflow: TextOverflow.fade,
                    softWrap: false,
                    style: KmText.label(context).copyWith(
                      fontSize: KmTokens.textXs,
                      color: label,
                      height: 1.2,
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _InlineLink extends StatelessWidget {
  const _InlineLink({required this.index, required this.props});

  final int index;
  final KmNavProps props;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final KmDestination d = kmDestinations[index];
    final bool current = index == props.current;
    return Semantics(
      button: true,
      selected: current,
      label: d.label,
      excludeSemantics: true,
      onTap: () => props.onSelect(d),
      child: KmInteractive(
        key: ValueKey<String>('km-nav-${d.path}'),
        focusNode: props.focusNodes?[index],
        selected: current,
        onTap: () => props.onSelect(d),
        builder: (BuildContext context, Set<WidgetState> s) {
          final KmStateColors c = KmStateColors.quiet(p, s);
          return KmFillBox(
            key: current ? const ValueKey<String>('km-nav-current') : null,
            colors: c,
            radius: KmTokens.radiusPill,
            constraints: const BoxConstraints(minHeight: KmTokens.sizeTarget),
            padding: const EdgeInsets.symmetric(horizontal: 14),
            alignment: Alignment.center,
            child: Text(
              d.label,
              maxLines: 1,
              style: KmText.label(context).copyWith(color: c.on),
            ),
          );
        },
      ),
    );
  }
}
