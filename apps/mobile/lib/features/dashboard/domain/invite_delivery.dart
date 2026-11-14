// TJ-ARCH-MOB-001 compliant

/// How an invite was sent.
enum InviteChannel { email, sms, calendar }

/// Delivery state of one invite (prototype `STATUS`).
enum DeliveryStatus { delivered, opened, queued, sent, failed }

/// One invite to one person over one channel.
final class InviteDelivery {
  const InviteDelivery({
    required this.id,
    required this.meetingId,
    required this.name,
    required this.channel,
    required this.to,
    required this.status,
    required this.sentAt,
    this.reason,
    this.landline = false,
  });

  final String id;
  final String meetingId;
  final String name;
  final InviteChannel channel;

  /// Email address or phone number.
  final String to;
  final DeliveryStatus status;
  final DateTime sentAt;

  /// Why a failed invite failed.
  final String? reason;

  /// A failed SMS to a landline: offer "Send email instead".
  final bool landline;

  bool get isFailed => status == DeliveryStatus.failed;
}

/// A connected (or connectable) calendar account.
final class CalendarConnection {
  const CalendarConnection({
    required this.name,
    required this.account,
    required this.connected,
  });

  final String name;

  /// Account address, or "Not connected".
  final String account;
  final bool connected;
}
