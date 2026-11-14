// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/ui/ui.dart';
import '../domain/settings_section.dart';

/// The settings page head (prototype `head()`): crumbs `Settings > <group>`
/// plus an optional parent page, the h1, copy and actions.
class SettingsHead extends StatelessWidget {
  const SettingsHead({
    super.key,
    required this.group,
    required this.title,
    this.description,
    this.parent,
    this.actions = const <Widget>[],
  });

  final SettingsGroup group;
  final String title;
  final String? description;

  /// (label, location) of a parent page shown as the third crumb.
  final (String, String)? parent;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final (String, String)? up = parent;
    return KmPageHead(
      title: title,
      lede: description,
      crumbs: <KmCrumb>[
        KmCrumb('Settings', onTap: () => context.go('/settings/account')),
        KmCrumb(group.label),
        if (up != null) KmCrumb(up.$1, onTap: () => context.go(up.$2)),
      ],
      actions: actions,
    );
  }
}
