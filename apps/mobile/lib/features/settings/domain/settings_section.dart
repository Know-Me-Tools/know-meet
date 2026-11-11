// TJ-ARCH-MOB-001 compliant

/// The settings sections (prototype settings.html `NAV`), in nav order.
/// [key] is the route segment (`/settings/<key>`); [group] is the crumb.
enum SettingsSection {
  account('account', 'Account', SettingsGroup.account),
  notifications('notifications', 'Notifications', SettingsGroup.account),
  livekit('livekit', 'LiveKit', SettingsGroup.connections),
  telnyxSms('telnyx-sms', 'Telnyx SMS', SettingsGroup.connections),
  telnyxVoice('telnyx-voice', 'Telnyx voice dial-in', SettingsGroup.connections),
  calendars('calendars', 'Calendars', SettingsGroup.connections),
  storage('storage', 'Storage', SettingsGroup.recording),
  recording('recording', 'Recording & transcription', SettingsGroup.recording),
  delivery('delivery', 'Summary delivery', SettingsGroup.recording),
  templates('templates', 'Message templates', SettingsGroup.recording);

  const SettingsSection(this.key, this.label, this.group);

  final String key;
  final String label;
  final SettingsGroup group;

  /// The section for a route segment, or null when unknown.
  static SettingsSection? fromKey(String key) {
    for (final SettingsSection s in values) {
      if (s.key == key) return s;
    }
    return null;
  }
}

/// Nav groups; their names are the second breadcrumb.
enum SettingsGroup {
  account('Account'),
  connections('Connections'),
  recording('Recording');

  const SettingsGroup(this.label);

  final String label;
}

/// Pages that are not nav sections. [nav] is the section highlighted in the
/// nav while the page shows (prototype `ACTIVE_ALIAS`).
enum SettingsSubpage {
  storageS3('storage-s3', 'S3-compatible storage', SettingsSection.storage),
  storageIpfs('storage-ipfs', 'IPFS pinning', SettingsSection.storage),
  storageTestFailed('storage-test-failed', 'Storage test failed', SettingsSection.storage);

  const SettingsSubpage(this.key, this.label, this.nav);

  final String key;
  final String label;
  final SettingsSection nav;

  static SettingsSubpage? fromKey(String key) {
    for (final SettingsSubpage s in values) {
      if (s.key == key) return s;
    }
    return null;
  }
}

/// Calendar providers reachable at `/settings/calendar-connect/<key>`.
enum CalendarProvider {
  google('google', 'Google Calendar', 'G', 'Google Calendar account'),
  outlook('outlook', 'Microsoft 365 / Outlook', 'M', 'Microsoft 365 account'),
  caldav('caldav', 'iCloud / CalDAV', 'iC', 'iCloud / CalDAV account');

  const CalendarProvider(this.key, this.name, this.mark, this.accountNoun);

  final String key;
  final String name;

  /// Two-letter provider mark (prototype `.prov-mark`).
  final String mark;

  /// "your <accountNoun>" in the consent heading.
  final String accountNoun;

  static CalendarProvider? fromKey(String key) {
    for (final CalendarProvider p in values) {
      if (p.key == key) return p;
    }
    return null;
  }
}
