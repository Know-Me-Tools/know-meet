// TJ-ARCH-MOB-001 compliant
import '../application/meetings_repository.dart';
import '../domain/invite_delivery.dart';
import '../domain/meeting.dart';

/// [MeetingsRepository] on the prototype's fictional sample data (km.js
/// `buildData()` plus dashboard.html `BASE_EXTRA` and `buildBaseDeliveries`).
/// Times are placed relative to the injected clock, in UTC, exactly as the
/// prototype places them relative to the browser clock (captured in UTC).
final class FixtureMeetingsRepository implements MeetingsRepository {
  const FixtureMeetingsRepository({this.empty = false});

  /// No calendars connected and no meetings (`dashboard.empty`).
  final bool empty;

  static const String _ownerEmail = 'jordan.reyes@know-me.tools';
  static const String _landlineReason = 'Number cannot receive SMS (landline)';
  static const DialIn _dialIn = DialIn(number: '+1 (415) 555-0199', pin: '482 913 07');

  static const List<(String, String, String, String?)> _people = <(String, String, String, String?)>[
    // (id, name, email, phone)
    ('avery', 'Avery Chen', 'avery.chen@northwind.io', '+1 415 555 0142'),
    ('marcus', 'Marcus Oyelaran', 'marcus@northwind.io', '+1 312 555 0190'),
    ('priya', 'Priya Natarajan', 'priya.n@lumenlabs.co', '+1 646 555 0117'),
    ('dana', 'Dana Whitfield', 'dana@lumenlabs.co', '+1 206 555 0163'),
  ];

  static const List<AgentSummary> _agents = <AgentSummary>[
    AgentSummary(id: 'concierge', name: 'Concierge', role: 'Guide', worker: 'knowme-concierge', mono: 'CG', online: true, system: true),
    AgentSummary(id: 'scribe', name: 'Scribe', role: 'Note-taker', worker: 'scribe-notes', mono: 'SC', online: true),
    AgentSummary(id: 'researcher', name: 'Researcher', role: 'Research', worker: 'kb-researcher', mono: 'RS', online: true),
    AgentSummary(id: 'facilitator', name: 'Facilitator', role: 'Facilitation', worker: 'agenda-facilitator', mono: 'FA', online: true),
    AgentSummary(id: 'translator', name: 'Translator', role: 'Live translation', worker: 'live-translate', mono: 'TR', online: false),
  ];

  static const List<DotSummary> _dots = <DotSummary>[
    DotSummary(id: 'iris', name: 'Iris', ownerLabel: 'Your dot', cyan: false),
    DotSummary(id: 'sol', name: 'Sol', ownerLabel: 'Avery’s dot', cyan: true),
  ];

  @override
  String get ownerName => 'Jordan Reyes';

  @override
  List<Meeting> meetings(DateTime now) {
    if (empty) return const <Meeting>[];
    final DateTime t = now.toUtc();
    final DateTime liveStart = _floorTo(t.subtract(const Duration(minutes: 18)), 5);
    DateTime laterStart = _ceilTo(t.add(const Duration(minutes: 90)), 15);
    if (laterStart.day != t.day) laterStart = t.add(const Duration(minutes: 10));
    DateTime at(int dayOffset, int hh, int mm) =>
        DateTime.utc(t.year, t.month, t.day + dayOffset, hh, mm);
    return <Meeting>[
      Meeting(
        id: 'partner-onboarding',
        title: 'Partner onboarding review',
        start: liveStart,
        durationMin: 60,
        source: MeetingSource.google,
        host: 'Jordan Reyes',
        invitees: const <String>['Avery Chen', 'Marcus Oyelaran', 'Priya Natarajan'],
        dialIn: _dialIn,
        agentIds: const <String>['concierge', 'scribe', 'researcher'],
        dotIds: const <String>['iris'],
        record: true,
        joinCode: 'km-4fq-82x',
        description: 'Walk Northwind and Lumen Labs through the partner program and agree on onboarding owners.',
        preReads: const <PreRead>[
          PreRead(name: 'Partner program overview.pdf', sizeBytes: 1258291),
          PreRead(name: 'Onboarding checklist v3.docx', sizeBytes: 84210),
        ],
      ),
      Meeting(
        id: 'cohort-kickoff',
        title: 'Cohort 2 kickoff',
        start: laterStart,
        durationMin: 45,
        source: MeetingSource.outlook,
        host: 'Jordan Reyes',
        invitees: const <String>['Priya Natarajan', 'Dana Whitfield'],
        dialIn: _dialIn,
        agentIds: const <String>['concierge', 'facilitator'],
        dotIds: const <String>['iris'],
        record: true,
        joinCode: 'km-7td-31p',
        description: 'Kick off Cohort 2: introductions, schedule and first deliverables.',
        preReads: const <PreRead>[PreRead(name: 'Cohort 2 roster.xlsx', sizeBytes: 40960)],
      ),
      Meeting(
        id: 'product-sync',
        title: 'Weekly product sync',
        start: at(1, 10, 0),
        durationMin: 30,
        source: MeetingSource.knowme,
        host: 'Avery Chen',
        invitees: const <String>['Jordan Reyes', 'Marcus Oyelaran'],
        dialIn: _dialIn,
        agentIds: const <String>['concierge', 'scribe'],
        dotIds: const <String>['sol', 'iris'],
        record: false,
        joinCode: 'km-2hn-95k',
        description: 'Weekly status across roadmap items.',
        preReads: const <PreRead>[],
      ),
      Meeting(
        id: 'pricing-review',
        title: 'Pricing review',
        start: at(3, 14, 0),
        durationMin: 60,
        source: MeetingSource.google,
        host: 'Jordan Reyes',
        invitees: const <String>['Avery Chen', 'Priya Natarajan', 'Dana Whitfield'],
        dialIn: _dialIn,
        agentIds: const <String>['concierge', 'researcher', 'translator'],
        dotIds: const <String>['iris'],
        record: true,
        joinCode: 'km-9wc-48m',
        description: 'Review the pricing model draft before it goes to partners.',
        preReads: const <PreRead>[
          PreRead(name: 'Pricing model draft.pdf', sizeBytes: 2306867),
          PreRead(name: 'Competitor notes.md', sizeBytes: 12288),
        ],
      ),
    ];
  }

  @override
  List<InviteDelivery> deliveries(DateTime now) {
    final List<InviteDelivery> list = <InviteDelivery>[];
    for (final Meeting m in meetings(now)) {
      final DateTime sentAt = m.start.subtract(const Duration(days: 2));
      for (int i = 0; i < m.invitees.length; i++) {
        final String name = m.invitees[i];
        final (String, String, String, String?)? p = _person(name);
        final String id = p?.$1 ?? 'self';
        final String email = p?.$3 ?? (name == ownerName ? _ownerEmail : '');
        final String? phone = p?.$4;
        final bool phoneOnly = m.id == 'pricing-review' && id == 'dana';
        final List<InviteChannel> channels = <InviteChannel>[
          if (!phoneOnly && email.isNotEmpty) InviteChannel.email,
          if (phone != null && (i.isEven || phoneOnly)) InviteChannel.sms,
          if (m.source != MeetingSource.knowme && email.isNotEmpty && !phoneOnly) InviteChannel.calendar,
        ];
        for (final InviteChannel ch in channels) {
          DeliveryStatus st = DeliveryStatus.delivered;
          String? reason;
          bool landline = false;
          if (ch == InviteChannel.email && i == 0) st = DeliveryStatus.opened;
          if (ch == InviteChannel.sms && m.id == 'cohort-kickoff') st = DeliveryStatus.queued;
          if (ch == InviteChannel.sms && phoneOnly) {
            st = DeliveryStatus.failed;
            reason = _landlineReason;
            landline = true;
          }
          list.add(InviteDelivery(
            id: '${m.id}-$id-${ch.name}',
            meetingId: m.id,
            name: name,
            channel: ch,
            to: ch == InviteChannel.sms ? (phone ?? '') : email,
            status: st,
            sentAt: sentAt,
            reason: reason,
            landline: landline,
          ));
        }
      }
    }
    return list;
  }

  @override
  List<CalendarConnection> calendars() => empty
      ? const <CalendarConnection>[]
      : const <CalendarConnection>[
          CalendarConnection(name: 'Google Calendar', account: _ownerEmail, connected: true),
          CalendarConnection(name: 'Outlook', account: 'jordan.reyes@outlook.com', connected: true),
          CalendarConnection(name: 'CalDAV', account: 'Not connected', connected: false),
        ];

  @override
  List<DialInNumber> dialInNumbers() => const <DialInNumber>[
    DialInNumber(number: '+1 (415) 555-0199', region: 'US'),
    DialInNumber(number: '+44 20 7946 0958', region: 'UK'),
  ];

  @override
  AgentSummary? agent(String id) {
    for (final AgentSummary a in _agents) {
      if (a.id == id) return a;
    }
    return null;
  }

  @override
  DotSummary? dot(String id) {
    for (final DotSummary d in _dots) {
      if (d.id == id) return d;
    }
    return null;
  }

  @override
  List<AgentSummary> dispatchableAgents() =>
      _agents.where((AgentSummary a) => !a.system).toList();

  @override
  DateTime lastSynced(DateTime now) => now.toUtc().subtract(const Duration(minutes: 12));

  static (String, String, String, String?)? _person(String name) {
    for (final (String, String, String, String?) p in _people) {
      if (p.$2 == name) return p;
    }
    return null;
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
    final int ms = t.millisecondsSinceEpoch;
    return DateTime.fromMillisecondsSinceEpoch(
      ((ms + step - 1) ~/ step) * step,
      isUtc: true,
    );
  }
}
