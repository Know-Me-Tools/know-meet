// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import 'km_motion.dart';
import 'km_palette_of.dart';

/// `.orb`: a dot's spherical body (ember for people's dots, cyan for agents).
/// Breathes slowly (`orb-breathe`, 3.2s) unless reduced motion is on, in
/// which case it is static, as km.css requires. Decorative; the dot's name
/// is always in adjacent text.
class KmOrb extends StatefulWidget {
  const KmOrb({super.key, this.size = 40, this.cyan = false, this.paused = false});

  final double size;
  final bool cyan;

  /// `[data-state="paused"]`: greyed and still.
  final bool paused;

  @override
  State<KmOrb> createState() => _KmOrbState();
}

class _KmOrbState extends State<KmOrb> with SingleTickerProviderStateMixin {
  late final AnimationController _breathe = AnimationController(
    vsync: this,
    duration: KmTokens.dotBreathe,
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(KmOrb oldWidget) {
    super.didUpdateWidget(oldWidget);
    _sync();
  }

  void _sync() {
    final bool run = KmMotion.loopsAllowed(context) && !widget.paused;
    if (run && !_breathe.isAnimating) {
      _breathe.repeat(reverse: true);
    } else if (!run && _breathe.isAnimating) {
      _breathe
        ..stop()
        ..value = 0;
    }
  }

  @override
  void dispose() {
    _breathe.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final Color base = widget.cyan ? p.cyan : p.ember;
    final Widget body = Container(
      width: widget.size,
      height: widget.size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          center: const Alignment(-0.32, -0.4),
          colors: <Color>[
            Color.lerp(base, Colors.white, 0.55)!,
            base,
            Color.lerp(base, Colors.black, 1 - KmTokens.orbShadeMix)!,
          ],
          stops: const <double>[0, KmTokens.orbMidStop, 1],
        ),
      ),
    );
    final Widget orb = widget.paused
        ? Opacity(
            opacity: 0.45,
            child: ColorFiltered(
              colorFilter: const ColorFilter.matrix(<double>[
                0.2126, 0.7152, 0.0722, 0, 0, //
                0.2126, 0.7152, 0.0722, 0, 0, //
                0.2126, 0.7152, 0.0722, 0, 0, //
                0, 0, 0, 1, 0,
              ]),
              child: body,
            ),
          )
        : body;
    return ExcludeSemantics(
      child: AnimatedBuilder(
        animation: _breathe,
        child: orb,
        builder: (BuildContext context, Widget? child) => Transform.scale(
          scale: 1 + 0.04 * Curves.easeInOut.transform(_breathe.value),
          child: child,
        ),
      ),
    );
  }
}
