// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/invitation.dart';
import 'invite_form.dart';
import 'invite_format.dart';
import 'join_side_cards.dart';

/// `#invite`: who invited you, the meeting facts, the join form, and the
/// phone and link cards ("Other ways to join").
class InviteView extends StatelessWidget {
  const InviteView({super.key, required this.invite, required this.now});

  final Invitation invite;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final String rel = InviteFormat.relDay(invite.start, now);
    final String relLower = (rel == 'Today' || rel == 'Tomorrow') ? rel.toLowerCase() : rel;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        KmCard(
          panel: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Row(
                children: <Widget>[
                  KmAvatar(invite.hostInitials, tone: KmAvatarTone.cyan),
                  const SizedBox(width: KmTokens.s3),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          '${invite.hostName} invited you',
                          style: KmText.displayAt(context, size: KmTokens.textBase),
                        ),
                        Text(
                          '${invite.hostOrg} · ${invite.hostEmail}',
                          style: KmText.smallSub(context),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: KmTokens.s2),
              Align(
                alignment: Alignment.centerLeft,
                child: KmChip(
                  'Starts $relLower at ${InviteFormat.time(invite.start)}',
                  icon: LucideIcons.clock,
                ),
              ),
              const SizedBox(height: KmTokens.s4),
              Semantics(
                header: true,
                child: Text(
                  invite.title,
                  style: KmText.displayAt(
                    context,
                    size: KmTokens.text34,
                    weight: KmTokens.fontWeightBold,
                  ).copyWith(height: KmTokens.leading105),
                ),
              ),
              const SizedBox(height: KmTokens.s5),
              _Fact(k: 'When', v: rel, s: InviteFormat.day(invite.start)),
              _Fact(
                k: 'Time',
                v: '${InviteFormat.time(invite.start)} – ${InviteFormat.time(invite.end)}',
                s: 'Your local time',
              ),
              _Fact(
                k: 'Duration',
                v: InviteFormat.minutes(invite.durationMinutes),
                s: '${invite.invitedCount} people invited',
              ),
              const SizedBox(height: KmTokens.s3),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: <Widget>[
                  Text('Invitation sent via', style: KmText.smallSub(context)),
                  Semantics(
                    label: 'Email (how you opened this)',
                    excludeSemantics: true,
                    child: const KmChip('Email', tone: KmChipTone.ember, icon: LucideIcons.mail),
                  ),
                  const KmChip('SMS', icon: LucideIcons.messageSquareText),
                  const KmChip('Calendar', icon: LucideIcons.calendar),
                  Text(
                    '— you don’t need a KnowMe account.',
                    style: KmText.smallSub(context),
                  ),
                ],
              ),
              const SizedBox(height: KmTokens.s5),
              InviteForm(invite: invite),
            ],
          ),
        ),
        const SizedBox(height: KmTokens.s5),
        Semantics(
          container: true,
          explicitChildNodes: true,
          label: 'Other ways to join',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              PhoneCard(invite: invite),
              const SizedBox(height: KmTokens.s4),
              LinkCard(invite: invite),
            ],
          ),
        ),
      ],
    );
  }
}

/// `.fact`: mono key, value, sub line on a card fill.
class _Fact extends StatelessWidget {
  const _Fact({required this.k, required this.v, required this.s});

  final String k;
  final String v;
  final String s;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return MergeSemantics(
      child: Container(
        margin: const EdgeInsets.only(bottom: KmTokens.s2),
        padding: const EdgeInsets.all(KmTokens.s4),
        decoration: BoxDecoration(
          color: p.card,
          borderRadius: BorderRadius.circular(KmTokens.radius),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              k.toUpperCase(),
              style: TextStyle(
                fontFamily: KmTokens.fontMono,
                fontSize: KmTokens.text11,
                fontWeight: KmTokens.fontWeightSemibold,
                letterSpacing: KmTokens.trackingTableEm * KmTokens.text11,
                color: p.fgSub,
              ),
            ),
            const SizedBox(height: KmTokens.s2),
            Text(v, style: KmText.displayAt(context, size: KmTokens.textBase)),
            const SizedBox(height: 2),
            Text(s, style: KmText.smallSub(context)),
          ],
        ),
      ),
    );
  }
}
