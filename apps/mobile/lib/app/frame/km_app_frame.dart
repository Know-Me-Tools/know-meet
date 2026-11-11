// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/theme_mode/theme_mode.dart';
import '../../shared/session/session.dart';
import '../../shared/ui/ui.dart';
import 'km_app_bar.dart';
import 'km_destinations.dart';
import 'km_nav_bars.dart';
import 'km_skip_link.dart';

/// Initial open state of the frame's popovers. Production always starts
/// closed; the golden suite opens them to render `frame.nav-open` and
/// `frame.account-menu-open` without a tap.
enum KmFrameOverlay { none, nav, accountMenu }

/// The app frame for the signed-in app pages and home (go_router
/// ShellRoute). Navigation placement follows the mobile-navigation skill:
/// bottom bar below 600px, rail at 600px and wider, both from
/// [kmDestinations]; the selected destination is derived from [location].
class KmAppFrame extends ConsumerStatefulWidget {
  const KmAppFrame({
    super.key,
    required this.location,
    required this.child,
    this.initialOverlay = KmFrameOverlay.none,
  });

  /// The router's matched location.
  final String location;
  final Widget child;
  final KmFrameOverlay initialOverlay;

  @override
  ConsumerState<KmAppFrame> createState() => _KmAppFrameState();
}

class _KmAppFrameState extends ConsumerState<KmAppFrame> {
  final FocusNode _mainFocus = FocusNode(debugLabel: 'km-main');
  final FocusNode _accountFocus = FocusNode(debugLabel: 'km-account-button');
  final FocusNode _navToggleFocus = FocusNode(debugLabel: 'km-nav-toggle');
  late KmFrameOverlay _overlay = widget.initialOverlay;

  @override
  void didUpdateWidget(KmAppFrame oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.location != widget.location) _overlay = KmFrameOverlay.none;
  }

  @override
  void dispose() {
    _mainFocus.dispose();
    _accountFocus.dispose();
    _navToggleFocus.dispose();
    super.dispose();
  }

  void _set(KmFrameOverlay next, {bool returnFocus = false}) {
    final KmFrameOverlay previous = _overlay;
    setState(() => _overlay = next);
    if (!returnFocus || next != KmFrameOverlay.none) return;
    if (previous == KmFrameOverlay.accountMenu) _accountFocus.requestFocus();
    if (previous == KmFrameOverlay.nav) _navToggleFocus.requestFocus();
  }

  void _go(String path) {
    _set(KmFrameOverlay.none);
    context.go(path);
  }

  void _toggleTheme() {
    final bool dark = Theme.of(context).brightness == Brightness.dark;
    ref
        .read(themePreferenceControllerProvider.notifier)
        .select(dark ? ThemePreference.light : ThemePreference.dark);
  }

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final KmUser? user = ref.watch(sessionControllerProvider);
    final double width = MediaQuery.sizeOf(context).width;
    final bool compact = width < 600;
    final Widget main = Semantics(
      container: true,
      explicitChildNodes: true,
      label: 'Main content',
      child: Focus(
        // The skip link's target. Not a Tab stop itself: Tab goes on to the
        // first control inside the page.
        focusNode: _mainFocus,
        skipTraversal: true,
        child: ColoredBox(color: p.bg, child: widget.child),
      ),
    );
    return CallbackShortcuts(
      bindings: <ShortcutActivator, VoidCallback>{
        const SingleActivator(LogicalKeyboardKey.escape): () =>
            _set(KmFrameOverlay.none, returnFocus: true),
      },
      child: Scaffold(
        backgroundColor: p.bg,
        bottomNavigationBar: compact
            ? FocusTraversalOrder(
                order: const NumericFocusOrder(4),
                child: KmBottomBar(
                  location: widget.location,
                  onSelect: (KmDestination d) => _go(d.path),
                ),
              )
            : null,
        body: SafeArea(
          bottom: false,
          child: FocusTraversalGroup(
            policy: OrderedTraversalPolicy(),
            child: Stack(
              children: <Widget>[
                Column(
                  children: <Widget>[
                    FocusTraversalOrder(
                      order: const NumericFocusOrder(1),
                      child: KmAppBar(
                        user: user,
                        navOpen: _overlay == KmFrameOverlay.nav,
                        menuOpen: _overlay == KmFrameOverlay.accountMenu,
                        accountButtonFocus: _accountFocus,
                        navToggleFocus: _navToggleFocus,
                        onHome: () => _go('/'),
                        onStart: () => _go(user == null ? '/meet/room-guest' : '/meet/room'),
                        onToggleTheme: _toggleTheme,
                        onSignIn: () => _go('/auth/sign-in'),
                        onToggleMenu: () => _set(
                          _overlay == KmFrameOverlay.accountMenu
                              ? KmFrameOverlay.none
                              : KmFrameOverlay.accountMenu,
                        ),
                        onToggleNav: () => _set(
                          _overlay == KmFrameOverlay.nav
                              ? KmFrameOverlay.none
                              : KmFrameOverlay.nav,
                        ),
                      ),
                    ),
                    Expanded(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: <Widget>[
                          if (!compact)
                            FocusTraversalOrder(
                              order: const NumericFocusOrder(2),
                              child: KmNavRail(
                                location: widget.location,
                                onSelect: (KmDestination d) => _go(d.path),
                              ),
                            ),
                          Expanded(
                            child: FocusTraversalOrder(
                              order: const NumericFocusOrder(3),
                              child: main,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (_overlay != KmFrameOverlay.none)
                  Positioned.fill(
                    top: KmTokens.headerH,
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () => _set(KmFrameOverlay.none),
                      child: const SizedBox.expand(),
                    ),
                  ),
                if (_overlay == KmFrameOverlay.nav)
                  Positioned(
                    top: KmTokens.headerH + 4,
                    left: KmTokens.s3,
                    right: KmTokens.s3,
                    child: FocusTraversalOrder(
                      order: const NumericFocusOrder(1.5),
                      child: KmNavPanel(
                        location: widget.location,
                        onSelect: (KmDestination d) => _go(d.path),
                      ),
                    ),
                  ),
                if (_overlay == KmFrameOverlay.accountMenu && user != null)
                  Positioned(
                    top: KmTokens.headerH - KmTokens.s2,
                    right: width <= KmTokens.bp899 ? KmTokens.s4 + 52 : KmTokens.s5,
                    child: FocusTraversalOrder(
                      order: const NumericFocusOrder(1.5),
                      child: KmAccountMenu(
                        user: user,
                        onSettings: () => _go('/settings'),
                        onSignOut: () {
                          _set(KmFrameOverlay.none);
                          ref.read(sessionControllerProvider.notifier).signOut();
                        },
                      ),
                    ),
                  ),
                FocusTraversalOrder(
                  order: const NumericFocusOrder(0),
                  child: KmSkipLink(onActivate: _mainFocus.requestFocus),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
