// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/session/session.dart';
import '../../../../shared/ui/ui.dart';
import '../../domain/home_content.dart';
import 'home_link.dart';

/// Section 02, "Guest or signed in": the capability table and the status
/// line for the current visitor.
class AccessCompare extends StatelessWidget {
  const AccessCompare({super.key, required this.rows, required this.user});

  final List<CapabilityRow> rows;
  final KmUser? user;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const HomeSectionHead(
          eyebrow: '02 — Access',
          title: 'Guest or signed in',
          body:
              'Anyone can start or join a meeting. Signing in turns on '
              'everything that needs to remember you: agents, recording, '
              'delivery, storage and calendars.',
        ),
        Semantics(
          label: 'Capabilities available to guests compared with signed-in users',
          container: true,
          explicitChildNodes: true,
          child: Container(
            // The table carries its own row fills (bg-2 header, alternating
            // body rows), so the frame is only the rounded clip.
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(KmTokens.radiusTile),
            ),
            clipBehavior: Clip.antiAlias,
            child: Table(
              columnWidths: const <int, TableColumnWidth>{
                0: FlexColumnWidth(1.1),
                1: FlexColumnWidth(1),
                2: FlexColumnWidth(1),
              },
              children: <TableRow>[
                // D-6: header row on `bg-2`, body rows alternate
                // transparent and `surface`; no rules.
                TableRow(
                  decoration: BoxDecoration(color: p.bg2),
                  children: const <Widget>[
                    _HeadCell('Capability'),
                    _HeadCell('Guest'),
                    _HeadCell('Signed in'),
                  ],
                ),
                for (int i = 0; i < rows.length; i++)
                  TableRow(
                    decoration: BoxDecoration(
                      color: i.isOdd ? p.surface : Colors.transparent,
                    ),
                    children: <Widget>[
                      _NameCell(rows[i]),
                      _ValueCell(included: rows[i].guestIncluded, note: rows[i].guestNote),
                      _ValueCell(included: true, note: rows[i].signedInNote),
                    ],
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: KmTokens.s4),
        Text(
          user == null
              ? 'You’re browsing as a guest. Invitees never need an account, '
                    'whichever column the host is in.'
              : 'You’re signed in as ${user!.name}, so everything in the Signed '
                    'in column is on for meetings you host.',
          style: KmText.smallSub(context).copyWith(fontSize: KmTokens.text15),
        ),
        const SizedBox(height: KmTokens.s3),
        Align(
          alignment: Alignment.centerLeft,
          child: user == null
              ? KmButton(
                  label: 'Sign in',
                  icon: LucideIcons.user,
                  onPressed: () => context.go('/auth/sign-in'),
                )
              : KmButton(
                  label: 'Your meetings',
                  icon: LucideIcons.calendar,
                  onPressed: () => context.go('/dashboard'),
                ),
        ),
      ],
    );
  }
}

class _HeadCell extends StatelessWidget {
  const _HeadCell(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s3),
    child: Text(
      text.toUpperCase(),
      style: TextStyle(
        fontFamily: KmTokens.fontMono,
        fontSize: KmTokens.text11,
        fontWeight: KmTokens.fontWeightSemibold,
        letterSpacing: KmTokens.trackingTableEm * KmTokens.text11,
        color: context.km.fgSub,
      ),
    ),
  );
}

class _NameCell extends StatelessWidget {
  const _NameCell(this.row);

  final CapabilityRow row;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(KmTokens.s4, KmTokens.s4, KmTokens.s2, KmTokens.s4),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(row.capability, style: KmText.label(context)),
        if (row.note != null)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(row.note!, style: KmText.xsmall(context).copyWith(color: context.km.fgSub)),
          ),
      ],
    ),
  );
}

/// "Included" (check) or "Sign in required" (lock): status by icon and
/// text, never colour alone.
class _ValueCell extends StatelessWidget {
  const _ValueCell({required this.included, this.note});

  final bool included;
  final String? note;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Padding(
      padding: const EdgeInsets.fromLTRB(KmTokens.s4, KmTokens.s4, KmTokens.s2, KmTokens.s4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(
            included ? LucideIcons.check : LucideIcons.lock,
            size: 16,
            color: included ? p.green : p.fgSub,
          ),
          const SizedBox(width: KmTokens.s2),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  included ? 'Included' : 'Sign in required',
                  style: KmText.small(context).copyWith(color: included ? p.fg : p.fgSub),
                ),
                if (note != null)
                  Text(note!, style: KmText.xsmall(context).copyWith(color: p.fgSub)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
