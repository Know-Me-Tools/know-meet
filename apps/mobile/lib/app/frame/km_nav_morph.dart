// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../shared/ui/ui.dart';
import 'km_window_class.dart';

/// Resize motion (DESIGN.md "Resize motion"): when the window crosses 600 or
/// 1024 (desktop resize, tablet rotation) the navigation morphs once, with
/// `dur-nav-morph` on `ease-layout`; labels fade with `dur-nav-label`; the
/// page column crossfades and slides with `dur-reflow`. Resizing inside a
/// class never animates. Only `transform` and `opacity` animate, never a
/// width, height, padding or margin: the layout switches at once and the
/// motion plays over it. Reduced motion (`MediaQuery.disableAnimations`)
/// makes every crossing instant.
///
/// Owned by the frame state; holds no navigation data, only which class is
/// current, which one is leaving, and the two controllers.
class KmNavMorph {
  KmNavMorph({required TickerProvider vsync, required VoidCallback onSettled})
    : _nav = AnimationController(vsync: vsync, duration: KmTokens.durNavMorph, value: 1),
      _reflow = AnimationController(vsync: vsync, duration: KmTokens.durReflow, value: 1) {
    _nav.addStatusListener((AnimationStatus s) {
      if (s == AnimationStatus.completed && _previous != null) {
        _previous = null;
        onSettled();
      }
    });
  }

  final AnimationController _nav;
  final AnimationController _reflow;
  late final Animation<double> _navCurve = CurvedAnimation(
    parent: _nav,
    curve: KmTokens.easeLayout,
  );
  late final Animation<double> _reflowCurve = CurvedAnimation(
    parent: _reflow,
    curve: KmTokens.easeLayout,
  );

  /// Labels fade in over the last `dur-nav-label` of the morph.
  late final Animation<double> labelOpacity = CurvedAnimation(
    parent: _nav,
    curve: Interval(
      1 - KmTokens.durNavLabel.inMilliseconds / KmTokens.durNavMorph.inMilliseconds,
      1,
      curve: KmTokens.easeLayout,
    ),
  );

  KmWindowClass? _current;
  KmWindowClass? _previous;

  KmWindowClass get current => _current ?? KmWindowClass.compact;

  /// Called from the frame's `didChangeDependencies` with the width class
  /// of the new window size. Starts the morph on a crossing and, if a
  /// destination had keyboard focus, gives focus back to the same
  /// destination in its new position once the new layout is built.
  void update(
    KmWindowClass next, {
    required bool instant,
    required List<FocusNode> focusNodes,
  }) {
    if (_current == null) {
      _current = next;
      return;
    }
    if (next == _current) return;
    final int focused = focusNodes.indexWhere((FocusNode n) => n.hasFocus);
    _previous = _current;
    _current = next;
    if (instant) {
      _previous = null;
      _nav.value = 1;
      _reflow.value = 1;
    } else {
      // A crossing during a running morph restarts it from the new state
      // (the web's skipTransition()).
      _nav.forward(from: 0);
      _reflow.forward(from: 0);
    }
    if (focused >= 0) {
      WidgetsBinding.instance.addPostFrameCallback((Duration _) {
        final FocusNode node = focusNodes[focused];
        if (node.context != null) node.requestFocus();
      });
    }
  }

  /// Wraps the navigation of class [wc] so it slides and fades in when it
  /// is the class just entered (identity otherwise).
  Widget enter(KmWindowClass wc, Widget nav) {
    final Offset from = wc == KmWindowClass.compact ? const Offset(0, 1) : const Offset(-1, 0);
    return SlideTransition(
      position: Tween<Offset>(begin: from, end: Offset.zero).animate(_navCurve),
      child: FadeTransition(opacity: _navCurve, child: nav),
    );
  }

  /// The page column's crossfade and short slide toward its new position.
  Widget reflow(Widget main) {
    final bool railArrived = current == KmWindowClass.medium;
    return SlideTransition(
      position: Tween<Offset>(
        begin: Offset(railArrived ? -0.02 : 0.02, 0),
        end: Offset.zero,
      ).animate(_reflowCurve),
      child: FadeTransition(
        opacity: Tween<double>(begin: 0.6, end: 1).animate(_reflowCurve),
        child: main,
      ),
    );
  }

  /// Non-interactive copies of the navigation that is leaving, sliding and
  /// fading out over the new layout. Empty when nothing is leaving.
  List<Widget> outgoing({required Widget bar, required Widget rail, required double railTop}) {
    final KmWindowClass? previous = _previous;
    if (previous == null) return const <Widget>[];
    Widget ghost(Widget child, Offset to) => IgnorePointer(
      child: ExcludeFocus(
        child: ExcludeSemantics(
          child: SlideTransition(
            position: Tween<Offset>(begin: Offset.zero, end: to).animate(_navCurve),
            child: FadeTransition(opacity: ReverseAnimation(_navCurve), child: child),
          ),
        ),
      ),
    );
    return <Widget>[
      if (previous == KmWindowClass.compact)
        Positioned(
          key: const ValueKey<String>('km-nav-outgoing-bar'),
          left: 0,
          right: 0,
          bottom: 0,
          child: ghost(bar, const Offset(0, 1)),
        ),
      if (previous == KmWindowClass.medium)
        Positioned(
          key: const ValueKey<String>('km-nav-outgoing-rail'),
          top: railTop,
          left: 0,
          bottom: 0,
          child: ghost(rail, const Offset(-1, 0)),
        ),
    ];
  }

  void dispose() {
    _nav.dispose();
    _reflow.dispose();
  }
}
