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
import 'km_nav_morph.dart';
import 'km_skip_link.dart';
import 'km_window_class.dart';

/// Initial open state of the frame's popover. Production always starts
/// closed; the golden suite opens the account menu for
/// `frame.account-menu-open` without a tap. (The hamburger nav panel is
/// retired: DESIGN.md "Adaptive layout", ADJ-2.)
enum KmFrameOverlay { none, accountMenu }

/// The app frame for the signed-in app pages and home (go_router
/// ShellRoute). Navigation follows DESIGN.md "Adaptive layout" and the
/// mobile-navigation skill, by window width only: bottom bar below 600,
/// rail from 600, inline app-bar links from 1024, all from
/// [kmDestinations]; the current destination is derived from [location].
/// Crossing a width class animates once ([KmNavMorph]); reduced motion is
/// instant.
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

class _KmAppFrameState extends ConsumerState<KmAppFrame> with TickerProviderStateMixin {
  final FocusNode _mainFocus = FocusNode(debugLabel: 'km-main');
  final FocusNode _accountFocus = FocusNode(debugLabel: 'km-account-button');
  final GlobalKey _mainKey = GlobalKey(debugLabel: 'km-main-subtree');
  late final List<FocusNode> _navFocus = <FocusNode>[
    for (final KmDestination d in kmDestinations) FocusNode(debugLabel: 'km-nav-${d.label}'),
  ];
  late final KmNavMorph _morph = KmNavMorph(vsync: this, onSettled: () => setState(() {}));
  late KmFrameOverlay _overlay = widget.initialOverlay;

  @override
  void initState() {
    super.initState();
    // Twice: the route takes focus in its own post-frame callback.
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => WidgetsBinding.instance.addPostFrameCallback(
        (_) => _startFocusAtFrame(),
      ),
    );
  }

  /// The page route sits in a nested Navigator whose focus scope holds focus
  /// on arrival, so the first Tab would skip the frame. Like a browser's
  /// document start, hand focus to the frame's own scope unless a control
  /// (an autofocused field) already has it, so Tab starts at the skip link.
  void _startFocusAtFrame() {
    if (!mounted) return;
    final FocusNode? focus = FocusManager.instance.primaryFocus;
    if (focus is FocusScopeNode) {
      focus.unfocus(disposition: UnfocusDisposition.scope);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _morph.update(
      KmWindowClass.of(context),
      instant: MediaQuery.disableAnimationsOf(context),
      focusNodes: _navFocus,
    );
  }

  @override
  void didUpdateWidget(KmAppFrame oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.location != widget.location) _overlay = KmFrameOverlay.none;
  }

  @override
  void dispose() {
    _morph.dispose();
    _mainFocus.dispose();
    _accountFocus.dispose();
    for (final FocusNode n in _navFocus) {
      n.dispose();
    }
    super.dispose();
  }

  void _set(KmFrameOverlay next, {bool returnFocus = false}) {
    final KmFrameOverlay previous = _overlay;
    setState(() => _overlay = next);
    if (returnFocus && next == KmFrameOverlay.none && previous == KmFrameOverlay.accountMenu) {
      _accountFocus.requestFocus();
    }
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

  KmNavProps _props({bool interactive = true}) => KmNavProps(
    location: widget.location,
    onSelect: (KmDestination d) => _go(d.path),
    focusNodes: interactive ? _navFocus : null,
    labelOpacity: interactive ? _morph.labelOpacity : kAlwaysCompleteAnimation,
  );

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final KmUser? user = ref.watch(sessionControllerProvider);
    final KmWindowClass wc = _morph.current;
    final EdgeInsets safe = MediaQuery.paddingOf(context);
    final double width = MediaQuery.sizeOf(context).width;
    // DESIGN.md: the bar hides while the on-screen keyboard is open.
    final bool keyboard = MediaQuery.viewInsetsOf(context).bottom > 0;
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
        bottomNavigationBar: wc == KmWindowClass.compact && !keyboard
            ? FocusTraversalOrder(
                order: const NumericFocusOrder(4),
                child: _morph.enter(
                  KmWindowClass.compact,
                  KmBottomBar(props: _props()),
                ),
              )
            : null,
        body: FocusTraversalGroup(
          policy: OrderedTraversalPolicy(),
          child: Stack(
            children: <Widget>[
              Column(
                children: <Widget>[
                  FocusTraversalOrder(
                    order: const NumericFocusOrder(1),
                    child: Padding(
                      padding: EdgeInsets.only(top: safe.top),
                      child: KmAppBar(
                        user: user,
                        menuOpen: _overlay == KmFrameOverlay.accountMenu,
                        accountButtonFocus: _accountFocus,
                        inlineNav: wc == KmWindowClass.expanded
                            ? KmInlineNav(props: _props())
                            : null,
                        onHome: () => _go('/'),
                        onStart: () => _go(user == null ? '/meet/room-guest' : '/meet/room'),
                        onToggleTheme: _toggleTheme,
                        onSignIn: () => _go('/auth/sign-in'),
                        onToggleMenu: () => _set(
                          _overlay == KmFrameOverlay.accountMenu
                              ? KmFrameOverlay.none
                              : KmFrameOverlay.accountMenu,
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: <Widget>[
                        // Constant child structure, so the page subtree is
                        // never remounted by a class change.
                        if (wc == KmWindowClass.medium)
                          FocusTraversalOrder(
                            order: const NumericFocusOrder(2),
                            child: _morph.enter(
                              KmWindowClass.medium,
                              KmNavRail(props: _props()),
                            ),
                          )
                        else
                          const SizedBox.shrink(),
                        Expanded(
                          child: FocusTraversalOrder(
                            order: const NumericFocusOrder(3),
                            child: KeyedSubtree(
                              key: _mainKey,
                              child: _morph.reflow(main),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              ..._morph.outgoing(
                bar: KmBottomBar(props: _props(interactive: false)),
                rail: KmNavRail(props: _props(interactive: false)),
                railTop: safe.top + KmTokens.headerH,
              ),
              if (_overlay != KmFrameOverlay.none)
                Positioned.fill(
                  top: safe.top + KmTokens.headerH,
                  child: Semantics(
                    button: true,
                    label: 'Close menu',
                    excludeSemantics: true,
                    onTap: () => _set(KmFrameOverlay.none),
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () => _set(KmFrameOverlay.none),
                      child: const SizedBox.expand(),
                    ),
                  ),
                ),
              if (_overlay == KmFrameOverlay.accountMenu && user != null)
                Positioned(
                  top: safe.top + KmTokens.headerH - KmTokens.s2,
                  right: width <= KmTokens.bp899 ? KmTokens.s4 : KmTokens.s5,
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
                child: KmSkipLink(
                  top: safe.top,
                  onActivate: _mainFocus.requestFocus,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
