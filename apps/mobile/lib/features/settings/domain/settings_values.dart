// TJ-ARCH-MOB-001 compliant

/// Static sample values the settings screens show. No credential is ever
/// held here: LiveKit, Telnyx and S3 secrets stay server-side, and the
/// screens only show variable names and masked placeholders.

/// One calendar inside a connected account, with its sync choice.
final class SyncedCalendar {
  const SyncedCalendar(this.name, {required this.synced});

  final String name;
  final bool synced;
}

/// A calendar account card on the Calendars page.
final class CalendarAccount {
  const CalendarAccount({
    required this.provider,
    required this.connected,
    required this.calendars,
    required this.addLink,
    required this.syncWindowDays,
  });

  /// [CalendarProvider.key].
  final String provider;
  final bool connected;
  final List<SyncedCalendar> calendars;
  final bool addLink;
  final int syncWindowDays;
}

/// A Telnyx dial-in number.
final class DialInNumber {
  const DialInNumber(this.number, this.region, {this.active = true});

  final String number;
  final String region;
  final bool active;
}

/// Outcome of one connection-check step.
enum CheckState { passed, failed, skipped, active }

/// One row of a connection check (Telnyx status, storage test).
final class CheckStep {
  const CheckStep(this.label, this.detail, this.state);

  final String label;
  final String detail;
  final CheckState state;
}

/// An action item in the summary email preview.
final class SampleActionItem {
  const SampleActionItem(this.title, this.owner, this.due);

  final String title;
  final String owner;
  final String due;
}

/// The two sample meetings the template previews fill in, placed relative
/// to "now" exactly as the prototype's km.js `buildData()` does.
final class SampleMeeting {
  const SampleMeeting({
    required this.title,
    required this.host,
    required this.start,
    required this.durationMin,
    required this.joinCode,
  });

  final String title;
  final String host;

  /// UTC start.
  final DateTime start;
  final int durationMin;
  final String joinCode;
}

/// Everything the settings pages read.
final class SettingsSnapshot {
  const SettingsSnapshot({
    required this.timeZone,
    required this.livekitUrl,
    required this.livekitKeyVar,
    required this.livekitSecretVar,
    required this.smsFrom,
    required this.dialInNumbers,
    required this.sipConnection,
    required this.inboundTrunkId,
    required this.pinLengthDigits,
    required this.greeting,
    required this.meetingPin,
    required this.calendars,
    required this.toggles,
    required this.summaryMeeting,
    required this.inviteMeeting,
    required this.summaryText,
    required this.actionItems,
    required this.failedBucket,
    required this.failedEndpoint,
    required this.failedObject,
  });

  final String timeZone;
  final String livekitUrl;
  final String livekitKeyVar;
  final String livekitSecretVar;
  final String smsFrom;
  final List<DialInNumber> dialInNumbers;
  final String sipConnection;
  final String inboundTrunkId;
  final int pinLengthDigits;
  final String greeting;
  final String meetingPin;
  final List<CalendarAccount> calendars;

  /// Initial switch and checkbox values by key (see `SettingsToggle`).
  final Map<String, bool> toggles;
  final SampleMeeting summaryMeeting;
  final SampleMeeting inviteMeeting;
  final String summaryText;
  final List<SampleActionItem> actionItems;
  final String failedBucket;
  final String failedEndpoint;
  final String failedObject;
}
