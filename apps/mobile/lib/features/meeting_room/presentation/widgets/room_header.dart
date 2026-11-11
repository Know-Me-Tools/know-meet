// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/theme_mode/theme_mode.dart';
import '../../../../shared/ui/ui.dart';
import '../../domain/room_snapshot.dart';

/// `.room-head`: brand, meeting title with the status line, the guest chip
/// (wider screens) and the theme toggle. The room is full-screen, outside
/// the app frame.
class RoomHeader extends ConsumerWidget {
  const RoomHeader({super.key, required this.room});

  final RoomSnapshot room;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final KmPalette p = context.km;
    final bool phone = MediaQuery.sizeOf(context).width <= KmTokens.bp767;
    final bool dark = Theme.of(context).brightness == Brightness.dark;
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: KmTokens.headerH),
      child: Padding(
        padding: phone
            ? const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s2)
            : const EdgeInsets.symmetric(horizontal: KmTokens.s5, vertical: KmTokens.s3),
        child: Row(
          children: <Widget>[
            Semantics(
              link: true,
              label: 'Know Meet home',
              excludeSemantics: true,
              onTap: () => context.go('/'),
              child: InkWell(
                onTap: () => context.go('/'),
                borderRadius: BorderRadius.circular(KmTokens.radius8),
                child: const SizedBox.square(
                  dimension: 44,
                  child: Center(child: KmBrandMark()),
                ),
              ),
            ),
            SizedBox(width: phone ? KmTokens.s2 : KmTokens.s3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Semantics(
                    header: true,
                    child: Text(
                      room.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: KmText.h3(context),
                    ),
                  ),
                  Row(
                    children: <Widget>[
                      if (room.transcribing) ...<Widget>[
                        ExcludeSemantics(
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(color: p.green, shape: BoxShape.circle),
                          ),
                        ),
                        const SizedBox(width: 6),
                      ],
                      Expanded(
                        child: Text(
                          room.statusLine,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: KmText.smallSub(context),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (room.guest && !phone) ...<Widget>[
              const SizedBox(width: KmTokens.s3),
              const KmChip('Guest', tone: KmChipTone.ember),
            ],
            SizedBox(width: phone ? KmTokens.s2 : KmTokens.s3),
            KmIconButton(
              icon: dark ? LucideIcons.sun : LucideIcons.moon,
              label: 'Switch theme',
              onPressed: () => ref
                  .read(themePreferenceControllerProvider.notifier)
                  .select(dark ? ThemePreference.light : ThemePreference.dark),
            ),
          ],
        ),
      ),
    );
  }
}
