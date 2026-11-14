// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import 'km_motion.dart';
import 'km_palette_of.dart';

/// Who is speaking, which picks the speaking-badge colour.
enum KmSpeaker { person, agent, phone }

/// Speaking on a room tile (DESIGN.md; replaces the 3px inset rings): a
/// `size-speak-badge` (24px) solid badge holding voice bars in `on-speak`.
/// `speak-person` for people, `speak-agent` for dots and agents,
/// `speak-phone` for dial-in. Theme-invariant colours, so it passes on dark
/// and light tiles and over video. Decorative: the tile's text state line
/// or label names the speaker.
class KmSpeakBadge extends StatelessWidget {
  const KmSpeakBadge({super.key, required this.speaker});

  final KmSpeaker speaker;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final Color fill = switch (speaker) {
      KmSpeaker.person => p.speakPerson,
      KmSpeaker.agent => p.speakAgent,
      KmSpeaker.phone => p.speakPhone,
    };
    return ExcludeSemantics(
      child: Container(
        key: const ValueKey<String>('km-speak-badge'),
        width: KmTokens.sizeSpeakBadge,
        height: KmTokens.sizeSpeakBadge,
        decoration: BoxDecoration(color: fill, shape: BoxShape.circle),
        alignment: Alignment.center,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: <Widget>[
            for (final double h in const <double>[6, 11, 8])
              Container(
                width: 2.5,
                height: h,
                margin: const EdgeInsets.symmetric(horizontal: 1),
                decoration: BoxDecoration(
                  color: p.onSpeak,
                  borderRadius: BorderRadius.circular(KmTokens.radius2),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Status pip (`size-pip`, 8px) in the `pip-*` role for its tone; always
/// beside a text label (state is never colour alone).
enum KmPipTone { green, amber, red }

class KmPip extends StatelessWidget {
  const KmPip(this.tone, {super.key});

  final KmPipTone tone;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Container(
      width: KmTokens.sizePip,
      height: KmTokens.sizePip,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: switch (tone) {
          KmPipTone.green => p.pipGreen,
          KmPipTone.amber => p.pipAmber,
          KmPipTone.red => p.pipRed,
        },
      ),
    );
  }
}

/// Paused or offline glyph (DESIGN.md; replaces the ring): a filled 8px
/// `fg-sub` square. A round dot means live.
class KmPausedGlyph extends StatelessWidget {
  const KmPausedGlyph({super.key, this.size = KmTokens.sizePip});

  final double size;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: context.km.fgSub,
      borderRadius: BorderRadius.circular(KmTokens.radius2),
    ),
  );
}

/// Tooltip, toast style (operator 2026-11-11): `fg` fill, `bg` text 14px
/// medium, radius 12, `size-tooltip-pad-*`, max width `size-tooltip-max-w`,
/// float shadow, after 500ms hover or on long press. Never the only copy of
/// information: the wrapped control keeps its own accessible name.
class KmTooltip extends StatelessWidget {
  const KmTooltip({super.key, required this.message, required this.child});

  final String message;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Tooltip(
      message: message,
      excludeFromSemantics: true,
      waitDuration: const Duration(milliseconds: 500),
      exitDuration: KmMotion.of(context, KmTokens.durFast),
      constraints: const BoxConstraints(maxWidth: KmTokens.sizeTooltipMaxW),
      padding: const EdgeInsets.symmetric(
        horizontal: KmTokens.sizeTooltipPadX,
        vertical: KmTokens.sizeTooltipPadY,
      ),
      decoration: BoxDecoration(
        color: p.fg,
        borderRadius: BorderRadius.circular(KmTokens.radius),
        boxShadow: p.shadowFloat,
      ),
      textStyle: Theme.of(context).textTheme.bodyMedium?.copyWith(
        color: p.bg,
        fontWeight: KmTokens.fontWeightMedium,
      ),
      child: child,
    );
  }
}

/// Slider (DESIGN.md): 6px `control` track, `selected` range, 20px
/// `slider-thumb`; on keyboard focus the track turns `focus` and the thumb
/// `on-focus`. No overlay halo, no value indicator ring.
class KmSlider extends StatefulWidget {
  const KmSlider({
    super.key,
    required this.value,
    required this.onChanged,
    required this.label,
    this.min = 0,
    this.max = 1,
    this.semanticFormatterCallback,
  });

  final double value;
  final ValueChanged<double>? onChanged;

  /// Accessible name.
  final String label;
  final double min;
  final double max;
  final SemanticFormatterCallback? semanticFormatterCallback;

  @override
  State<KmSlider> createState() => _KmSliderState();
}

class _KmSliderState extends State<KmSlider> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      label: widget.label,
      child: Focus(
        canRequestFocus: false,
        skipTraversal: true,
        onFocusChange: (bool f) => setState(
          () => _focused = f &&
              FocusManager.instance.highlightMode == FocusHighlightMode.traditional,
        ),
        child: SliderTheme(
          data: SliderTheme.of(context).copyWith(
            trackHeight: KmTokens.sizeSliderTrackH,
            activeTrackColor: p.selected,
            inactiveTrackColor: _focused ? p.focus : p.control,
            thumbColor: _focused ? p.onFocus : p.sliderThumb,
            overlayColor: Colors.transparent,
            thumbShape: const RoundSliderThumbShape(
              enabledThumbRadius: KmTokens.sizeSliderThumb / 2,
              elevation: 0,
              pressedElevation: 0,
            ),
            trackShape: const RoundedRectSliderTrackShape(),
          ),
          child: Slider(
            value: widget.value.clamp(widget.min, widget.max),
            min: widget.min,
            max: widget.max,
            onChanged: widget.onChanged,
            semanticFormatterCallback: widget.semanticFormatterCallback,
          ),
        ),
      ),
    );
  }
}
