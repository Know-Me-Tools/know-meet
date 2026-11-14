// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/theme_mode/theme_mode.dart';
import '../../../../shared/ui/ui.dart';

/// `.j-top`: brand, "No account needed" (hidden below 600px, as in the
/// phone baseline) and the theme toggle.
class JoinHeader extends ConsumerWidget {
  const JoinHeader({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bool dark = Theme.of(context).brightness == Brightness.dark;
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
                child: KmInteractive(
                  onTap: () => context.go('/'),
                  builder: (BuildContext context, Set<WidgetState> s) {
                    final KmPalette p = context.km;
                    final bool focused = s.contains(WidgetState.focused);
                    return KmFillBox(
                      colors: KmStateColors(focused ? p.focus : Colors.transparent, p.onFocus),
                      radius: KmTokens.radius8,
                      height: KmTokens.sizeTarget,
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: <Widget>[
                          KmBrandMark(color: focused ? p.onFocus : null),
                          const SizedBox(width: 10),
                          KmBrandWord(size: 16, color: focused ? p.onFocus : null),
                        ],
                      ),
                    );
                  },
                ),
              ),
              const Spacer(),
              if (MediaQuery.sizeOf(context).width > KmTokens.bp599) ...<Widget>[
                const KmChip('No account needed', tone: KmChipTone.green, icon: LucideIcons.check),
                const SizedBox(width: KmTokens.s2),
              ],
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

/// `.j-foot`: the prototype's simulation note. Its "All screens" link has
/// no app equivalent and is omitted.
class JoinFooter extends StatelessWidget {
  const JoinFooter({super.key});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: KmTokens.s7),
    child: Text(
      'Prototype — joining, dial-in and admission are simulated.',
      style: KmText.xsmall(context).copyWith(color: context.km.fgSub),
    ),
  );
}

/// Inline ember link. Feature-local: the kit has no text-link widget.
class JoinLink extends StatelessWidget {
  const JoinLink(this.label, {super.key, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      link: true,
      label: label,
      excludeSemantics: true,
      onTap: onTap,
      child: KmInteractive(
        onTap: onTap,
        builder: (BuildContext context, Set<WidgetState> s) {
          final KmStateColors c = KmStateColors.quiet(p, s, restOn: p.emberText);
          return KmFillBox(
            colors: c,
            radius: KmTokens.radius4,
            constraints: const BoxConstraints(minHeight: KmTokens.sizeTarget),
            padding: const EdgeInsets.symmetric(horizontal: 2),
            alignment: Alignment.centerLeft,
            child: Text(
              label,
              style: KmText.small(context).copyWith(
                color: c.on,
                fontWeight: KmTokens.fontWeightSemibold,
                decoration: TextDecoration.underline,
                decorationColor: c.on,
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Copies [text] and confirms with a snackbar.
Future<void> copyWithNotice(BuildContext context, String text, String notice) async {
  await Clipboard.setData(ClipboardData(text: text));
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(notice)));
}

/// Calendar files (.ics) are a browser download in the prototype; the app
/// has no calendar export this phase, so it says so instead of failing
/// silently.
void showCalendarUnavailable(BuildContext context) {
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Calendar files aren’t available in the app yet. Copy the link instead.')),
  );
}
