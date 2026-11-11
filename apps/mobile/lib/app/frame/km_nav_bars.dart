// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../shared/ui/ui.dart';
import 'km_destinations.dart';

/// Compact-width bottom bar (mobile-navigation skill: top-level
/// destinations at the bottom on every platform, below 600px).
class KmBottomBar extends StatelessWidget {
  const KmBottomBar({super.key, required this.location, required this.onSelect});

  final String location;
  final ValueChanged<KmDestination> onSelect;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final int current = kmDestinationIndex(location);
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: 'Primary (bottom bar)',
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: p.bg,
          border: Border(top: BorderSide(color: p.muted)),
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 64,
            child: Row(
              children: <Widget>[
                for (int i = 0; i < kmDestinations.length; i++)
                  Expanded(
                    child: _NavItem(
                      destination: kmDestinations[i],
                      selected: i == current,
                      vertical: true,
                      onTap: () => onSelect(kmDestinations[i]),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Medium and wider: a navigation rail on the leading edge.
class KmNavRail extends StatelessWidget {
  const KmNavRail({super.key, required this.location, required this.onSelect});

  final String location;
  final ValueChanged<KmDestination> onSelect;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final int current = kmDestinationIndex(location);
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: 'Primary (rail)',
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: p.bg,
          border: Border(right: BorderSide(color: p.muted)),
        ),
        child: SizedBox(
          width: 88,
          child: Column(
            children: <Widget>[
              const SizedBox(height: KmTokens.s3),
              for (int i = 0; i < kmDestinations.length; i++)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: KmTokens.s2, vertical: 2),
                  child: SizedBox(
                    height: 64,
                    child: _NavItem(
                      destination: kmDestinations[i],
                      selected: i == current,
                      vertical: true,
                      onTap: () => onSelect(kmDestinations[i]),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The app-bar menu panel (prototype `.appnav[data-open="true"]` below
/// 900px): the same list, full-width rows.
class KmNavPanel extends StatelessWidget {
  const KmNavPanel({super.key, required this.location, required this.onSelect});

  final String location;
  final ValueChanged<KmDestination> onSelect;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final int current = kmDestinationIndex(location);
    return KmPopIn(
      child: Semantics(
        container: true,
        explicitChildNodes: true,
        label: 'Primary',
        child: Container(
          padding: const EdgeInsets.all(KmTokens.s2),
          decoration: BoxDecoration(
            color: p.bg2,
            borderRadius: BorderRadius.circular(KmTokens.radiusTile),
            boxShadow: p.shadowFloat,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              for (int i = 0; i < kmDestinations.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: SizedBox(
                    height: 44,
                    child: _NavItem(
                      destination: kmDestinations[i],
                      selected: i == current,
                      vertical: false,
                      onTap: () => onSelect(kmDestinations[i]),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.destination,
    required this.selected,
    required this.vertical,
    required this.onTap,
  });

  final KmDestination destination;
  final bool selected;
  final bool vertical;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final Color fg = selected ? p.emberText : p.fgSub;
    final TextStyle text = KmText.label(context).copyWith(
      color: fg,
      fontSize: vertical ? KmTokens.textXs : KmTokens.textBase,
    );
    final Widget icon = Icon(destination.icon, size: 20, color: fg);
    final Widget content = vertical
        ? Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Container(
                width: 56,
                height: 32,
                decoration: BoxDecoration(
                  color: selected ? p.emberSoft : Colors.transparent,
                  borderRadius: BorderRadius.circular(KmTokens.radiusPill),
                ),
                child: icon,
              ),
              const SizedBox(height: 4),
              Text(destination.label, style: text, maxLines: 1),
            ],
          )
        : Padding(
            padding: const EdgeInsets.symmetric(horizontal: KmTokens.s3),
            child: Row(
              children: <Widget>[
                icon,
                const SizedBox(width: KmTokens.s2),
                Text(destination.label, style: text),
              ],
            ),
          );
    return Semantics(
      button: true,
      selected: selected,
      label: destination.label,
      excludeSemantics: true,
      onTap: onTap,
      child: Material(
        color: !vertical && selected ? p.emberSoft : Colors.transparent,
        borderRadius: BorderRadius.circular(KmTokens.radius),
        child: InkWell(
          borderRadius: BorderRadius.circular(KmTokens.radius),
          onTap: onTap,
          child: content,
        ),
      ),
    );
  }
}
