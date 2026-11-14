// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/session/session.dart';
import '../../../../shared/ui/ui.dart';
import '../../domain/home_content.dart';
import '../providers/home_content_provider.dart';
import '../widgets/access_compare.dart';
import '../widgets/concierge_and_flow.dart';
import '../widgets/feature_bento.dart';
import '../widgets/home_hero.dart';
import '../widgets/room_preview.dart';

/// Home (`index.default`), inside the app frame: hero, the mini room,
/// what happens in a meeting, guest vs signed in, the Concierge and the
/// meeting flow.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final KmUser? user = ref.watch(sessionControllerProvider);
    final HomeContent content = ref.watch(homeContentProvider);
    return KmPage(
      children: <Widget>[
        HomeHero(user: user),
        const SizedBox(height: KmTokens.s7),
        const RoomPreview(),
        const KmRule(vertical: KmTokens.s7),
        FeatureBento(content: content),
        const KmRule(vertical: KmTokens.s7),
        AccessCompare(rows: content.capabilities, user: user),
        const KmRule(vertical: KmTokens.s7),
        const ConciergeSection(),
        const KmRule(vertical: KmTokens.s7),
        FlowSection(steps: content.flow),
        const KmRule(vertical: KmTokens.s6),
        const HomeFooter(),
      ],
    );
  }
}
