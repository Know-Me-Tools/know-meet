// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/session/session.dart';
import '../../../shared/ui/ui.dart';
import '../domain/settings_section.dart';
import 'sections/account_section.dart';
import 'sections/calendar_connect_section.dart';
import 'sections/calendars_section.dart';
import 'sections/delivery_section.dart';
import 'sections/livekit_section.dart';
import 'sections/notifications_section.dart';
import 'sections/recording_section.dart';
import 'sections/storage_ipfs_section.dart';
import 'sections/storage_s3_section.dart';
import 'sections/storage_section.dart';
import 'sections/storage_test_failed_section.dart';
import 'sections/telnyx_sms_section.dart';
import 'sections/telnyx_voice_section.dart';
import 'sections/templates_section.dart';

/// Route segment of the calendar-connect pages.
const String calendarConnectKey = 'calendar-connect';

/// One settings route: the signed-out gate, or the section nav plus the
/// page for [page] (a section key, a sub-page key or [calendarConnectKey]
/// with [provider]). The highlighted nav item derives from the route.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key, required this.page, this.provider});

  final String page;
  final String? provider;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (ref.watch(sessionControllerProvider) == null) {
      return const KmSignInGate(
        pageTitle: 'Settings',
        pageLede: '',
        title: 'Sign in to manage settings',
        body:
            'LiveKit, Telnyx, calendars, storage and delivery settings belong to '
            'your account. Guests can still start a meeting with the Concierge.',
      );
    }
    final (SettingsSection? nav, Widget body) = _resolve();
    return KmPage(
      children: <Widget>[
        _SettingsNav(current: nav),
        const SizedBox(height: KmTokens.s5),
        body,
      ],
    );
  }

  (SettingsSection?, Widget) _resolve() {
    if (page == calendarConnectKey) {
      final CalendarProvider? p = CalendarProvider.fromKey(provider ?? '');
      return (
        SettingsSection.calendars,
        p == null ? const CalendarProviderNotFound() : CalendarConnectSection(provider: p),
      );
    }
    final SettingsSubpage? sub = SettingsSubpage.fromKey(page);
    if (sub != null) {
      return (sub.nav, switch (sub) {
        SettingsSubpage.storageS3 => const StorageS3Section(),
        SettingsSubpage.storageIpfs => const StorageIpfsSection(),
        SettingsSubpage.storageTestFailed => const StorageTestFailedSection(),
      });
    }
    final SettingsSection? section = SettingsSection.fromKey(page);
    if (section == null) return (null, const _SectionNotFound());
    return (section, switch (section) {
      SettingsSection.account => const AccountSection(),
      SettingsSection.notifications => const NotificationsSection(),
      SettingsSection.livekit => const LivekitSection(),
      SettingsSection.telnyxSms => const TelnyxSmsSection(),
      SettingsSection.telnyxVoice => const TelnyxVoiceSection(),
      SettingsSection.calendars => const CalendarsSection(),
      SettingsSection.storage => const StorageSection(),
      SettingsSection.recording => const RecordingSection(),
      SettingsSection.delivery => const DeliverySection(),
      SettingsSection.templates => const TemplatesSection(),
    });
  }
}

/// `nav.sidenav` at phone width: the eyebrow, then one horizontally
/// scrolling row of pills per group (group labels hidden, km.css <= 899px).
class _SettingsNav extends StatelessWidget {
  const _SettingsNav({required this.current});

  final SettingsSection? current;

  static IconData _icon(SettingsSection s) => switch (s) {
    SettingsSection.account => LucideIcons.user,
    SettingsSection.notifications => LucideIcons.mail,
    SettingsSection.livekit => LucideIcons.server,
    SettingsSection.telnyxSms => LucideIcons.messageSquareText,
    SettingsSection.telnyxVoice => LucideIcons.phoneIncoming,
    SettingsSection.calendars => LucideIcons.calendar,
    SettingsSection.storage => LucideIcons.database,
    SettingsSection.recording => LucideIcons.circleDot,
    SettingsSection.delivery => LucideIcons.send,
    SettingsSection.templates => LucideIcons.pencil,
  };

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const Padding(
          padding: EdgeInsets.fromLTRB(KmTokens.s3, 0, KmTokens.s3, KmTokens.s2),
          child: KmEyebrow('Settings'),
        ),
        for (final SettingsGroup g in SettingsGroup.values)
          Padding(
            padding: const EdgeInsets.only(bottom: 2),
            child: KmSideNav<SettingsSection?>(
              label: 'Settings sections: ${g.label}',
              current: current,
              onSelect: (SettingsSection? s) {
                if (s != null) context.go('/settings/${s.key}');
              },
              items: <(SettingsSection?, String, IconData)>[
                for (final SettingsSection s in SettingsSection.values)
                  if (s.group == g) (s, s.label, _icon(s)),
              ],
            ),
          ),
      ],
    );
  }
}

class _SectionNotFound extends StatelessWidget {
  const _SectionNotFound();

  @override
  Widget build(BuildContext context) => KmEmptyState(
    icon: LucideIcons.settings,
    title: 'Settings page not found',
    body: 'This settings page doesn’t exist. Pick a section above.',
    actions: <Widget>[
      KmButton(
        label: 'Go to Account',
        variant: KmButtonVariant.primary,
        size: KmButtonSize.small,
        onPressed: () => context.go('/settings/account'),
      ),
    ],
  );
}
