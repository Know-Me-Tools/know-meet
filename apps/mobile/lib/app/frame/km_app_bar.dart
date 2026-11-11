// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../shared/session/session.dart';
import '../../shared/ui/ui.dart';

/// The app bar (prototype km.js `mountAppBar`): brand, start-meeting,
/// theme toggle, account or sign-in, and the menu toggle below 900px.
/// Stateless: open/closed state and actions come from [KmAppFrame].
class KmAppBar extends StatelessWidget {
  const KmAppBar({
    super.key,
    required this.user,
    required this.navOpen,
    required this.menuOpen,
    required this.onHome,
    required this.onStart,
    required this.onToggleTheme,
    required this.onSignIn,
    required this.onToggleMenu,
    required this.onToggleNav,
    required this.accountButtonFocus,
    required this.navToggleFocus,
  });

  final KmUser? user;
  final bool navOpen;
  final bool menuOpen;
  final VoidCallback onHome;
  final VoidCallback onStart;
  final VoidCallback onToggleTheme;
  final VoidCallback onSignIn;
  final VoidCallback onToggleMenu;
  final VoidCallback onToggleNav;
  final FocusNode accountButtonFocus;
  final FocusNode navToggleFocus;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final double width = MediaQuery.sizeOf(context).width;
    final bool dark = Theme.of(context).brightness == Brightness.dark;
    final bool showWord = width > KmTokens.bp380;
    final bool compact = width <= KmTokens.bp599;
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: 'App bar',
      child: Container(
        key: const ValueKey<String>('km-appbar'),
        height: KmTokens.headerH,
        decoration: BoxDecoration(
          color: p.bg,
          border: Border(bottom: BorderSide(color: p.muted)),
        ),
        padding: EdgeInsets.symmetric(
          horizontal: width <= KmTokens.bp899 ? KmTokens.s4 : KmTokens.s5,
        ),
        child: Row(
          children: <Widget>[
            _Brand(showWord: showWord, wordSize: compact ? 16 : 18, onTap: onHome),
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
            if (width <= KmTokens.bp899) ...<Widget>[
              const SizedBox(width: KmTokens.s2),
              KmIconButton(
                key: const ValueKey<String>('km-nav-toggle'),
                icon: navOpen ? LucideIcons.x : LucideIcons.menu,
                label: navOpen ? 'Close navigation menu' : 'Open navigation menu',
                expanded: navOpen,
                focusNode: navToggleFocus,
                onPressed: onToggleNav,
              ),
            ],
          ],
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
    return Semantics(
      link: true,
      label: 'Know Meet home',
      excludeSemantics: true,
      onTap: onTap,
      child: InkWell(
        key: const ValueKey<String>('km-brand'),
        onTap: onTap,
        borderRadius: BorderRadius.circular(KmTokens.radius8),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              const KmBrandMark(),
              if (showWord) ...<Widget>[
                const SizedBox(width: 10),
                KmBrandWord(size: wordSize),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// `.acct-btn`: the avatar button that opens the account menu.
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
    final KmPalette p = context.km;
    return Semantics(
      button: true,
      expanded: open,
      label: 'Account: ${user.name}',
      excludeSemantics: true,
      onTap: onTap,
      child: InkResponse(
        key: const ValueKey<String>('km-account-button'),
        focusNode: focusNode,
        onTap: onTap,
        radius: 22,
        child: SizedBox.square(
          dimension: 44,
          child: Center(
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: open
                    ? <BoxShadow>[BoxShadow(color: p.ember, spreadRadius: 2)]
                    : null,
              ),
              child: KmAvatar(user.initials, size: 36, tone: KmAvatarTone.ember),
            ),
          ),
        ),
      ),
    );
  }
}

/// `.menu.acct-menu`: identity, Settings and Sign out.
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
              Container(height: 1, color: p.muted, margin: const EdgeInsets.only(bottom: 4)),
              _MenuItem(icon: LucideIcons.settings, label: 'Settings', onTap: onSettings, autofocus: true),
              _MenuItem(icon: LucideIcons.logOut, label: 'Sign out', onTap: onSignOut),
            ],
          ),
        ),
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  const _MenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.autofocus = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  /// The first item takes focus when the menu opens (km.js `setMenu`).
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      onTap: onTap,
      child: InkWell(
        autofocus: autofocus,
        onTap: onTap,
        borderRadius: BorderRadius.circular(KmTokens.radius10),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: KmTokens.s3),
            child: Row(
              children: <Widget>[
                Icon(icon, size: 20, color: p.fg),
                const SizedBox(width: KmTokens.s2),
                Text(
                  label,
                  style: KmText.small(context).copyWith(fontWeight: KmTokens.fontWeightMedium),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
