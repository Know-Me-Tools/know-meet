// TJ-ARCH-MOB-001 compliant

/// The four invitee views (prototype join.html hashes).
enum JoinView {
  invite('invite'),
  waiting('waiting'),
  expired('expired'),
  wrongCode('wrong-code');

  const JoinView(this.slug);

  final String slug;

  static JoinView? fromSlug(String? slug) {
    for (final JoinView v in values) {
      if (v.slug == slug) return v;
    }
    return null;
  }
}

/// A phone dial-in number (Telnyx SIP trunk).
final class DialInNumber {
  const DialInNumber(this.region, this.number);

  final String region;
  final String number;
}

/// The meeting an invitee was invited to.
final class Invitation {
  const Invitation({
    required this.title,
    required this.hostName,
    required this.hostInitials,
    required this.hostOrg,
    required this.hostEmail,
    required this.start,
    required this.durationMinutes,
    required this.invitedCount,
    required this.joinCode,
    required this.pin,
    required this.recordingOn,
    required this.dialIn,
  });

  final String title;
  final String hostName;
  final String hostInitials;
  final String hostOrg;
  final String hostEmail;
  final DateTime start;
  final int durationMinutes;

  /// Invitees plus the host.
  final int invitedCount;
  final String joinCode;
  final String pin;
  final bool recordingOn;
  final List<DialInNumber> dialIn;

  DateTime get end => start.add(Duration(minutes: durationMinutes));

  String get hostFirstName => hostName.split(' ').first;
}

/// Port: the invitation for a link, resolved against [now].
abstract interface class InviteRepository {
  Invitation defaultInvitation(DateTime now);
}
