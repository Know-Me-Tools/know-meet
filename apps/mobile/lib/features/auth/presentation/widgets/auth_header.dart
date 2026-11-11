// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/theme_mode/theme_mode.dart';
import '../../../../shared/ui/ui.dart';

/// `.auth-top`: brand, "Back to home" (icon-only at phone width) and the
/// theme toggle.
class AuthHeader extends ConsumerWidget {
  const AuthHeader({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bool dark = Theme.of(context).brightness == Brightness.dark;
    final double width = MediaQuery.sizeOf(context).width;
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: 'Header',
      child: SizedBox(
        height: KmTokens.headerH,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4),
          child: Row(
            children: <Widget>[
              Semantics(
                link: true,
                label: 'Know Meet home',
                excludeSemantics: true,
                onTap: () => context.go('/'),
                child: InkWell(
                  onTap: () => context.go('/'),
                  child: const SizedBox(
                    height: 44,
                    child: Row(
                      children: <Widget>[
                        KmBrandMark(),
                        SizedBox(width: 10),
                        KmBrandWord(size: 16),
                      ],
                    ),
                  ),
                ),
              ),
              const Spacer(),
              if (width > KmTokens.bp599)
                KmButton(
                  label: 'Back to home',
                  icon: LucideIcons.house,
                  variant: KmButtonVariant.ghost,
                  size: KmButtonSize.small,
                  onPressed: () => context.go('/'),
                )
              else
                KmIconButton(
                  icon: LucideIcons.house,
                  label: 'Back to home',
                  color: context.km.fgSub,
                  onPressed: () => context.go('/'),
                ),
              const SizedBox(width: KmTokens.s2),
              KmIconButton(
                icon: dark ? LucideIcons.sun : LucideIcons.moon,
                label: 'Switch theme',
                onPressed: () => ref
                    .read(themePreferenceControllerProvider.notifier)
                    .select(dark ? ThemePreference.light : ThemePreference.dark),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
