// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../shared/session/session.dart';
import '../../shared/ui/ui.dart';

/// The app bar (DESIGN.md "Anatomy and states", all classes): height
/// `header-h` on `bg` with no bottom rule (separation by spacing). Brand,
/// then the inline links at expanded width ([inlineNav]), then Start
/// meeting (icon-only below 600), theme toggle and account or sign-in.
/// The prototype's 900px hamburger is retired. Stateless: open state and
/// actions come from the frame.
class KmAppBar extends StatelessWidget {
  const KmAppBar({
    super.key,
    required this.user,
    required this.menuOpen,
    required this.onHome,
    required this.onStart,
    required this.onToggleTheme,
    required this.onSignIn,
    required this.onToggleMenu,
    required this.accountButtonFocus,
    this.inlineNav,
  });

  final KmUser? user;
  final bool menuOpen;
  final VoidCallback onHome;
  final VoidCallback onStart;
  final VoidCallback onToggleTheme;
  final VoidCallback onSignIn;
  final VoidCallback onToggleMenu;
  final FocusNode accountButtonFocus;

  /// The expanded-width destination links; null in compact and medium.
  final Widget? inlineNav;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final double width = MediaQuery.sizeOf(context).width;
    final bool dark = Theme.of(context).brightness == Brightness.dark;
    final bool showWord = width > KmTokens.bp380;
    final bool compact = width < KmTokens.windowMedium;
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: 'App bar',
      child: ColoredBox(
        color: p.bg,
        child: Center(
          child: ConstrainedBox(
            // km.css `.appbar-inner`: max-width 1280.
            constraints: const BoxConstraints(maxWidth: 1280),
            child: Container(
              key: const ValueKey<String>('km-appbar'),
              height: KmTokens.headerH,
              padding: EdgeInsets.symmetric(
                horizontal: width <= KmTokens.bp899 ? KmTokens.s4 : KmTokens.s5,
              ),
              child: Row(
                children: <Widget>[
                  _Brand(showWord: showWord, wordSize: compact ? 16 : 18, onTap: onHome),
                  if (inlineNav != null) ...<Widget>[
                    const SizedBox(width: KmTokens.s4),
                    Flexible(child: inlineNav!),
                  ],
                  const Spacer(),
                  KmButton(
                    key: const ValueKey<String>('km-start-meeting'),
                    label: 'Start meeting',
                    icon: LucideIcons.video,
                    variant: KmButtonVariant.primary,
                    size: KmButtonSize.small,
                    showLabel: !compact,
                    onPressed: onStart,
                  ),
                  const SizedBox(width: KmTokens.s2),
                  KmIconButton(
                    key: const ValueKey<String>('km-theme-toggle'),
                    icon: dark ? LucideIcons.sun : LucideIcons.moon,
                    label: 'Switch theme',
                    onPressed: onToggleTheme,
                  ),
                  const SizedBox(width: KmTokens.s2),
                  if (user == null)
                    KmButton(
                      key: const ValueKey<String>('km-sign-in'),
                      label: 'Sign in',
                      variant: KmButtonVariant.ghost,
                      size: KmButtonSize.small,
                      onPressed: onSignIn,
                    )
                  else
                    _AccountButton(
                      user: user!,
                      open: menuOpen,
                      focusNode: accountButtonFocus,
                      onTap: onToggleMenu,
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

class _Brand extends StatelessWidget {
  const _Brand({required this.showWord, required this.wordSize, required this.onTap});

  final bool showWord;
  final double wordSize;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      link: true,
      label: 'Know Meet home',
      excludeSemantics: true,
      onTap: onTap,
      child: KmInteractive(
        key: const ValueKey<String>('km-brand'),
        onTap: onTap,
        builder: (BuildContext context, Set<WidgetState> s) {
          final bool focused = s.contains(WidgetState.focused);
          return KmFillBox(
            colors: KmStateColors(focused ? p.focus : Colors.transparent, p.onFocus),
            radius: KmTokens.radius8,
            constraints: const BoxConstraints(
              minHeight: KmTokens.sizeTarget,
              minWidth: KmTokens.sizeTarget,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                KmBrandMark(color: focused ? p.onFocus : null),
                if (showWord) ...<Widget>[
                  const SizedBox(width: 10),
                  KmBrandWord(size: wordSize, color: focused ? p.onFocus : null),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

/// `.acct-btn`: the avatar button that opens the account menu. Open is the
/// `selected` avatar fill (replaces the expanded ring); keyboard focus is
/// the `focus` fill.
class _AccountButton extends StatelessWidget {
  const _AccountButton({
    required this.user,
    required this.open,
    required this.focusNode,
    required this.onTap,
  });

  final KmUser user;
  final bool open;
  final FocusNode focusNode;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      expanded: open,
      label: 'Account: ${user.name}',
      excludeSemantics: true,
      onTap: onTap,
      child: KmInteractive(
        key: const ValueKey<String>('km-account-button'),
        focusNode: focusNode,
        onTap: onTap,
        builder: (BuildContext context, Set<WidgetState> s) => SizedBox.square(
          dimension: KmTokens.sizeTarget,
          child: Center(
            child: KmAvatar(
              user.initials,
              size: 36,
              tone: s.contains(WidgetState.focused)
                  ? KmAvatarTone.focus
                  : open
                  ? KmAvatarTone.selected
                  : KmAvatarTone.ember,
            ),
          ),
        ),
      ),
    );
  }
}

/// `.menu.acct-menu`: identity, Settings and Sign out. Groups separate by
/// spacing (`s3`), not a rule.
class KmAccountMenu extends StatelessWidget {
  const KmAccountMenu({
    super.key,
    required this.user,
    required this.onSettings,
    required this.onSignOut,
  });

  final KmUser user;
  final VoidCallback onSettings;
  final VoidCallback onSignOut;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return KmPopIn(
      child: Semantics(
        container: true,
        explicitChildNodes: true,
        label: 'Account menu',
        child: Container(
          width: 240,
          padding: const EdgeInsets.all(KmTokens.s2),
          decoration: BoxDecoration(
            color: p.bg2,
            borderRadius: BorderRadius.circular(KmTokens.radiusTile),
            boxShadow: p.shadowFloat,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Padding(
                padding: const EdgeInsets.fromLTRB(KmTokens.s3, KmTokens.s2, KmTokens.s3, KmTokens.s3),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(user.name, style: KmText.displayAt(context, size: KmTokens.textBase)),
                    const SizedBox(height: 2),
                    Text(user.email, style: KmText.smallSub(context)),
                  ],
                ),
              ),
              KmMenuItem(
                icon: LucideIcons.settings,
                label: 'Settings',
                onTap: onSettings,
                autofocus: true,
              ),
              KmMenuItem(icon: LucideIcons.logOut, label: 'Sign out', onTap: onSignOut),
            ],
          ),
        ),
      ),
    );
  }
}
