// TJ-ARCH-MOB-001 compliant
import 'package:flutter/widgets.dart';

import 'km_palette_of.dart';

/// Motion durations that honour reduced motion. Prototype rule
/// (km.css `prefers-reduced-motion`): every transition collapses to
/// effectively zero and looping animations stop.
abstract final class KmMotion {
  /// [base] normally; [Duration.zero] when animations are disabled.
  static Duration of(BuildContext context, Duration base) =>
      context.kmReduceMotion ? Duration.zero : base;

  /// Whether looping (ambient) animations such as the dot breathing may run.
  static bool loopsAllowed(BuildContext context) => !context.kmReduceMotion;
}

/// Fades and lifts [child] in once (the prototype's `pop-in`), or shows it
/// immediately under reduced motion.
class KmPopIn extends StatelessWidget {
  const KmPopIn({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final Duration duration = KmMotion.of(context, KmTokens.dur);
    if (duration == Duration.zero) return child;
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: 1),
      duration: duration,
      curve: KmTokens.easeOut,
      child: child,
      builder: (BuildContext context, double t, Widget? child) => Opacity(
        opacity: t,
        child: Transform.translate(
          offset: Offset(0, (1 - t) * -4),
          child: child,
        ),
      ),
    );
  }
}
