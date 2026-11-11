// TJ-ARCH-MOB-001 compliant
import '../application/settings_repository.dart';
import '../domain/settings_values.dart';

/// Sample settings from the prototype (settings.html `DEF`, km.js
/// `buildData()`). Fictional people, numbers and hostnames only; credential
/// fields are represented by variable names, never values.
final class FixtureSettingsRepository implements SettingsRepository {
  const FixtureSettingsRepository();

  static const Duration _min = Duration(minutes: 1);

  @override
  SettingsSnapshot load(DateTime now) {
    final DateTime utc = now.toUtc();
    // Live now: started ~18 min ago, rounded down to 5 min.
    final DateTime liveStart = _floorTo(utc.subtract(_min * 18), 5);
    // Later today: ~90 min from now, on a 15-min boundary.
    DateTime laterStart = _ceilTo(utc.add(_min * 90), 15);
    if (laterStart.day != utc.day) laterStart = utc.add(_min * 10);
    return SettingsSnapshot(
      timeZone: 'UTC',
      livekitUrl: 'wss://knowme-23fkf8pz.livekit.cloud',
      livekitKeyVar: 'LIVEKIT_API_KEY',
      livekitSecretVar: 'LIVEKIT_API_SECRET',
      smsFrom: '+1 (415) 555-0123',
      dialInNumbers: const <DialInNumber>[
        DialInNumber('+1 (415) 555-0199', 'US'),
        DialInNumber('+44 20 7946 0958', 'UK'),
      ],
      sipConnection: 'knowme-livekit-inbound',
      inboundTrunkId: 'ST_k9Vb2xTn7pQe',
      pinLengthDigits: 8,
      greeting:
          'Welcome to Know Meet. Please enter your meeting PIN, followed by the pound key.',
      meetingPin: '482 913 07',
      calendars: const <CalendarAccount>[
        CalendarAccount(
          provider: 'google',
          connected: true,
          calendars: <SyncedCalendar>[
            SyncedCalendar('Work', synced: true),
            SyncedCalendar('Team rituals', synced: true),
            SyncedCalendar('Personal', synced: false),
            SyncedCalendar('Holidays in United States', synced: false),
          ],
          addLink: true,
          syncWindowDays: 30,
        ),
        CalendarAccount(
          provider: 'outlook',
          connected: true,
          calendars: <SyncedCalendar>[
            SyncedCalendar('Calendar', synced: true),
            SyncedCalendar('Shared — Partnerships', synced: true),
            SyncedCalendar('Birthdays', synced: false),
          ],
          addLink: true,
          syncWindowDays: 30,
        ),
        CalendarAccount(
          provider: 'caldav',
          connected: false,
          calendars: <SyncedCalendar>[],
          addLink: false,
          syncWindowDays: 30,
        ),
      ],
      toggles: const <String, bool>{
        'defaults.waiting': true,
        'defaults.scribe': true,
        'defaults.dot': true,
        'defaults.dialin': true,
        'notif.recReady': true,
        'notif.summary': true,
        'notif.responses': true,
        'notif.digest': false,
        'notif.smsStart': false,
        'notif.smsSummary': true,
        'storage.audioOnly': false,
        'storage.ipfs': true,
        's3.pathStyle': true,
        'ipfs.pinAfter': true,
        'rec.auto': true,
        'rec.live': true,
        'rec.speakers': true,
        'rec.kb': true,
        'rec.profanity': false,
        'delivery.on': true,
        'delivery.summary': true,
        'delivery.actions': true,
        'delivery.transcript': true,
        'delivery.recording': true,
        'delivery.email': true,
        'delivery.sms': true,
      },
      summaryMeeting: SampleMeeting(
        title: 'Partner onboarding review',
        host: 'Jordan Reyes',
        start: liveStart,
        durationMin: 60,
        joinCode: 'km-4fq-82x',
      ),
      inviteMeeting: SampleMeeting(
        title: 'Cohort 2 kickoff',
        host: 'Jordan Reyes',
        start: laterStart,
        durationMin: 45,
        joinCode: 'km-7td-31p',
      ),
      summaryText:
          'Jordan, Avery and Marcus agreed on a two-phase rollout: sandbox access first, then production once the security review closes.',
      actionItems: const <SampleActionItem>[
        SampleActionItem('Issue sandbox credentials', 'Jordan Reyes', 'Oct 19'),
        SampleActionItem('Confirm required API scopes', 'Marcus Oyelaran', 'Oct 20'),
        SampleActionItem('Schedule the security review', 'Avery Chen', 'Oct 23'),
      ],
      failedBucket: 'missing-bucket',
      failedEndpoint: 'https://acme-account.r2.cloudflarestorage.com',
      failedObject: 'meet/.knowme-test-mk2q8z.txt',
    );
  }

  static DateTime _floorTo(DateTime t, int minutes) {
    final int step = minutes * 60000;
    return DateTime.fromMillisecondsSinceEpoch(
      (t.millisecondsSinceEpoch ~/ step) * step,
      isUtc: true,
    );
  }

  static DateTime _ceilTo(DateTime t, int minutes) {
    final int step = minutes * 60000;
    return DateTime.fromMillisecondsSinceEpoch(
      ((t.millisecondsSinceEpoch + step - 1) ~/ step) * step,
      isUtc: true,
    );
  }
}
