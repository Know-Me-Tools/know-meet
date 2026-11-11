// TJ-ARCH-MOB-001 compliant
import '../domain/invitation.dart';

/// The prototype's default invite: "Weekly product sync", hosted by Avery
/// Chen, tomorrow at 10:00 (km.js `buildData()` meeting `product-sync`).
final class StaticInviteRepository implements InviteRepository {
  const StaticInviteRepository();

  @override
  Invitation defaultInvitation(DateTime now) {
    // Keep the clock's zone: the frozen capture clock is UTC.
    final DateTime start = now.isUtc
        ? DateTime.utc(now.year, now.month, now.day + 1, 10)
        : DateTime(now.year, now.month, now.day + 1, 10);
    return Invitation(
      title: 'Weekly product sync',
      hostName: 'Avery Chen',
      hostInitials: 'AC',
      hostOrg: 'Northwind',
      hostEmail: 'avery.chen@northwind.io',
      start: start,
      durationMinutes: 30,
      invitedCount: 3,
      joinCode: 'km-2hn-95k',
      pin: '482 913 07',
      recordingOn: false,
      dialIn: const <DialInNumber>[
        DialInNumber('US', '+1 (415) 555-0199'),
        DialInNumber('UK', '+44 20 7946 0958'),
      ],
    );
  }
}
