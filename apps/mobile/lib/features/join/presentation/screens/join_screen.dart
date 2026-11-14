// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/clock/km_clock.dart';
import '../../../../shared/ui/ui.dart';
import '../../domain/invitation.dart';
import '../providers/invitation_provider.dart';
import '../widgets/invite_view.dart';
import '../widgets/join_chrome.dart';
import '../widgets/status_views.dart';

/// The invitee flow (`join.*`): full screen, outside the app frame, with
/// the prototype's own header and footer. No account is needed.
class JoinScreen extends ConsumerWidget {
  const JoinScreen({super.key, required this.view});

  final JoinView view;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final Invitation invite = ref.watch(invitationProvider);
    final DateTime now = ref.watch(kmClockProvider)();
    final Widget body = switch (view) {
      JoinView.invite => InviteView(invite: invite, now: now),
      JoinView.waiting => WaitingView(invite: invite),
      JoinView.expired => ExpiredView(invite: invite),
      JoinView.wrongCode => const WrongCodeView(),
    };
    return Scaffold(
      backgroundColor: context.km.bg,
      body: SafeArea(
        child: Column(
          children: <Widget>[
            const JoinHeader(),
            Expanded(
              child: Semantics(
                container: true,
                explicitChildNodes: true,
                label: 'Main content',
                child: KmPage(
                  narrow: true,
                  children: <Widget>[body, const JoinFooter()],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
