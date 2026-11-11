// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';

/// The hero's mini room (`figure.mini`): six tiles, a live caption and a
/// caption describing the room. The tiles are decorative; the figure's
/// accessible name is the caption.
class RoomPreview extends StatelessWidget {
  const RoomPreview({super.key});

  static const String _caption =
      'A KnowMe room: three people on video, Priya on the phone dial-in, your '
      'dot Iris, and the Concierge — with live captions and recording on.';

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      container: true,
      label: _caption,
      excludeSemantics: true,
      child: KmCard(
        panel: true,
        padding: const EdgeInsets.all(KmTokens.s3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.fromLTRB(KmTokens.s2, KmTokens.s1, KmTokens.s1, KmTokens.s2),
              child: Row(
                children: <Widget>[
                  Expanded(
                    child: Text(
                      'Partner onboarding review',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: KmText.label(context),
                    ),
                  ),
                  _RecBadge(color: p.red, background: p.redSoft),
                ],
              ),
            ),
            GridView.count(
              crossAxisCount: 3,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: KmTokens.s2,
              crossAxisSpacing: KmTokens.s2,
              childAspectRatio: 100 / 76,
              children: <Widget>[
                _Tile(name: 'Avery Chen', speaking: true, child: const KmAvatar('AC', size: 32, tone: KmAvatarTone.onSurface)),
                const _Tile(name: 'Marcus Oyelaran', child: KmAvatar('MO', size: 32, tone: KmAvatarTone.onSurface)),
                const _Tile(name: 'Jordan Reyes', child: KmAvatar('JR', size: 32, tone: KmAvatarTone.onSurface)),
                const _Tile(name: 'Iris · your dot', child: KmOrb(size: 40)),
                const _Tile(name: 'Concierge', child: KmAgentGlyph('CG', size: 40, system: true)),
                _Tile(
                  name: 'Priya · dial-in',
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: p.greenSoft,
                      borderRadius: BorderRadius.circular(KmTokens.radius10),
                    ),
                    child: Icon(LucideIcons.phone, size: 18, color: p.greenText),
                  ),
                ),
              ],
            ),
            const SizedBox(height: KmTokens.s3),
            Container(
              padding: const EdgeInsets.all(KmTokens.s3),
              decoration: BoxDecoration(
                color: p.card,
                borderRadius: BorderRadius.circular(KmTokens.radius),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Padding(
                    padding: const EdgeInsets.only(top: 3),
                    child: Icon(LucideIcons.captions, size: 16, color: p.cyanText),
                  ),
                  const SizedBox(width: KmTokens.s2),
                  Expanded(
                    child: Text.rich(
                      TextSpan(
                        style: KmText.body(context),
                        children: const <InlineSpan>[
                          TextSpan(
                            text: 'Avery Chen: ',
                            style: TextStyle(fontWeight: KmTokens.fontWeightSemibold),
                          ),
                          TextSpan(
                            text: 'Let’s confirm the onboarding checklist before '
                                'Friday — Scribe, can you capture that as an action?',
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(KmTokens.s2, KmTokens.s3, KmTokens.s2, KmTokens.s2),
              child: Text(_caption, style: KmText.xsmall(context).copyWith(color: p.fgSub)),
            ),
          ],
        ),
      ),
    );
  }
}

class _RecBadge extends StatelessWidget {
  const _RecBadge({required this.color, required this.background});

  final Color color;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(KmTokens.radiusPill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            'REC 18:04',
            style: TextStyle(
              fontFamily: KmTokens.fontMono,
              fontSize: KmTokens.textXs,
              fontWeight: KmTokens.fontWeightSemibold,
              letterSpacing: KmTokens.trackingCodeEm * KmTokens.textXs,
              color: context.km.fg,
            ),
          ),
        ],
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.name, required this.child, this.speaking = false});

  final String name;
  final Widget child;
  final bool speaking;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Container(
      decoration: BoxDecoration(
        color: p.tile,
        borderRadius: BorderRadius.circular(KmTokens.radius10),
        border: speaking ? Border.all(color: p.cyan, width: 2) : null,
      ),
      padding: const EdgeInsets.all(6),
      child: Column(
        children: <Widget>[
          Expanded(child: Center(child: child)),
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: KmText.xsmall(context).copyWith(
                fontSize: KmTokens.text11,
                fontWeight: KmTokens.fontWeightSemibold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
