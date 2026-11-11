// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import 'km_palette_of.dart';
import 'km_states.dart';
import 'km_text.dart';

/// `.list-row`: leading / body (title + meta) / trailing. At phone width the
/// trailing cluster wraps under the body (km.css <= 767px). When [onTap] is
/// set the whole row is one button named by [semanticLabel] or [title].
class KmListRow extends StatelessWidget {
  const KmListRow({
    super.key,
    required this.title,
    this.meta,
    this.leading,
    this.trailing,
    this.onTap,
    this.semanticLabel,
  });

  final String title;
  final List<String>? meta;
  final Widget? leading;
  final Widget? trailing;
  final VoidCallback? onTap;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final bool phone = MediaQuery.sizeOf(context).width <= KmTokens.bp767;
    Widget layout(KmStateColors c) {
      final bool focused = c.fill == p.focus;
      final Widget body = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Text(
            title,
            style: KmText.body(context).copyWith(
              fontWeight: KmTokens.fontWeightSemibold,
              color: c.on,
            ),
          ),
          for (final String line in meta ?? const <String>[])
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(
                line,
                style: KmText.small(context).copyWith(color: focused ? c.on : p.fgSub),
              ),
            ),
        ],
      );
      final Widget top = Row(
        children: <Widget>[
          if (leading != null) ...<Widget>[leading!, const SizedBox(width: KmTokens.s3)],
          Expanded(child: body),
          if (trailing != null && !phone) ...<Widget>[
            const SizedBox(width: KmTokens.s3),
            trailing!,
          ],
        ],
      );
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s3),
        child: phone && trailing != null
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[top, const SizedBox(height: KmTokens.s3), trailing!],
              )
            : top,
      );
    }

    final KmStateColors rest = KmStateColors(p.surface, p.fg);
    if (onTap == null) {
      return KmFillBox(colors: rest, child: layout(rest));
    }
    // Interactive row: text identifies it; hover `card-hov`, keyboard focus
    // fills the whole row with `focus` and turns all text `on-focus`.
    return Semantics(
      button: true,
      label: semanticLabel ?? title,
      onTap: onTap,
      child: KmInteractive(
        onTap: onTap,
        builder: (BuildContext context, Set<WidgetState> s) {
          final KmStateColors c = KmStateColors.resolve(
            p,
            s,
            rest: p.surface,
            restOn: p.fg,
            hover: p.cardHov,
          );
          return KmFillBox(colors: c, child: layout(c));
        },
      ),
    );
  }
}

/// `.list-row .lead`: a 40px rounded icon tile.
class KmLeadIcon extends StatelessWidget {
  const KmLeadIcon(this.icon, {super.key, this.background, this.color});

  final IconData icon;
  final Color? background;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return ExcludeSemantics(
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: background ?? p.muted,
          borderRadius: BorderRadius.circular(KmTokens.radius10),
        ),
        child: Icon(icon, size: 20, color: color ?? p.fg),
      ),
    );
  }
}

/// `.empty`: icon tile, heading, copy and actions.
class KmEmptyState extends StatelessWidget {
  const KmEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.body,
    this.actions = const <Widget>[],
    this.centered = false,
  });

  final IconData icon;
  final String title;
  final String body;
  final List<Widget> actions;
  final bool centered;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final CrossAxisAlignment align =
        centered ? CrossAxisAlignment.center : CrossAxisAlignment.start;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: KmTokens.s5, vertical: KmTokens.s6),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(KmTokens.radiusTile),
      ),
      child: Column(
        crossAxisAlignment: align,
        children: <Widget>[
          ExcludeSemantics(
            child: Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: p.muted,
                borderRadius: BorderRadius.circular(KmTokens.radius14),
              ),
              child: Icon(icon, color: p.fgSub),
            ),
          ),
          const SizedBox(height: KmTokens.s3),
          Semantics(header: true, child: Text(title, style: KmText.h3(context))),
          const SizedBox(height: KmTokens.s3),
          ConstrainedBox(
            // `measure-empty` (46ch): 46 advances of "0" in the body style.
            constraints: BoxConstraints(maxWidth: _ch(context) * KmTokens.measureEmptyCh),
            child: Text(
              body,
              textAlign: centered ? TextAlign.center : TextAlign.start,
              style: KmText.smallSub(context),
            ),
          ),
          if (actions.isNotEmpty) ...<Widget>[
            const SizedBox(height: KmTokens.s3),
            Wrap(spacing: KmTokens.s2, runSpacing: KmTokens.s2, children: actions),
          ],
        ],
      ),
    );
  }
}

/// Width of one `ch` (the advance of "0") in the small body style.
double _ch(BuildContext context) {
  final TextPainter tp = TextPainter(
    text: TextSpan(text: '0', style: KmText.smallSub(context)),
    textDirection: TextDirection.ltr,
    textScaler: MediaQuery.textScalerOf(context),
  )..layout();
  final double w = tp.width;
  tp.dispose();
  return w;
}

/// `.stat`: numeral + caption.
class KmStat extends StatelessWidget {
  const KmStat({super.key, required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return MergeSemantics(
      child: Container(
        padding: const EdgeInsets.all(KmTokens.s4),
        decoration: BoxDecoration(
          color: p.surface,
          borderRadius: BorderRadius.circular(KmTokens.radius),
          boxShadow: p.shadowCard,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              value,
              maxLines: 1,
              style: KmText.displayAt(
                context,
                size: KmTokens.textStat(MediaQuery.sizeOf(context).width),
              ).copyWith(
                height: KmTokens.leadingStat,
                fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
              ),
            ),
            const SizedBox(height: 2),
            Text(label, style: KmText.smallSub(context)),
          ],
        ),
      ),
    );
  }
}

/// `.kv`: key/value technical details. Phone width stacks key over value.
class KmKeyValues extends StatelessWidget {
  const KmKeyValues(this.entries, {super.key, this.plainValues = false});

  /// (key, value) pairs; values render in mono unless [plainValues].
  final List<(String, String)> entries;
  final bool plainValues;

  @override
  Widget build(BuildContext context) {
    final TextStyle value = plainValues ? KmText.small(context) : KmText.mono(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        for (int i = 0; i < entries.length; i++)
          Padding(
            padding: EdgeInsets.only(top: i == 0 ? 0 : KmTokens.s3),
            child: MergeSemantics(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(entries[i].$1, style: KmText.smallSub(context)),
                  const SizedBox(height: 2),
                  Text(entries[i].$2, style: value),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

/// `.code`: a monospace block on the `surface` fill (D-6: the ring is gone).
class KmCodeBlock extends StatelessWidget {
  const KmCodeBlock(this.code, {super.key});

  final String code;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s3),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(KmTokens.radius),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Text(
          code,
          style: KmText.mono(context).copyWith(height: KmTokens.leadingCode, color: p.fg),
        ),
      ),
    );
  }
}

/// `.masked`: a hidden secret's placeholder, announced as hidden.
class KmMasked extends StatelessWidget {
  const KmMasked({super.key, this.length = 12});

  final int length;

  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Hidden value',
    excludeSemantics: true,
    child: Text(
      List<String>.filled(length, '•').join(),
      style: KmText.mono(context).copyWith(
        letterSpacing: KmTokens.trackingMaskedEm * KmTokens.text13,
        color: context.km.fgSub,
      ),
    ),
  );
}
