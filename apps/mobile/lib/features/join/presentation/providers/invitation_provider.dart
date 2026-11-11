// TJ-ARCH-MOB-001 compliant
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../shared/clock/km_clock.dart';
import '../../data/static_invite_repository.dart';
import '../../domain/invitation.dart';

part 'invitation_provider.g.dart';

/// The invite port; static fixtures this phase.
@Riverpod(keepAlive: true)
InviteRepository inviteRepository(Ref ref) => const StaticInviteRepository();

/// The invitation the join views show, placed relative to the clock.
@riverpod
Invitation invitation(Ref ref) => ref
    .watch(inviteRepositoryProvider)
    .defaultInvitation(ref.watch(kmClockProvider)());
