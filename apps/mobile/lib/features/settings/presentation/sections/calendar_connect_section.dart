// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/session/session.dart';
import '../../../../shared/ui/ui.dart';
import '../../domain/settings_section.dart';
import '../settings_head.dart';
import '../widgets/settings_fields.dart';
import '../widgets/settings_panel.dart';
import 'calendars_section.dart' show ProviderMark;

const (String, String) _calendarsCrumb = ('Calendars', '/settings/calendars');

/// `settings.calendar-connect.<provider>`: the OAuth consent step for
/// Google and Microsoft, the account form for CalDAV. No OAuth runs here
/// (static screens); Continue is a static affordance.
class CalendarConnectSection extends StatelessWidget {
  const CalendarConnectSection({super.key, required this.provider});

  final CalendarProvider provider;

  @override
  Widget build(BuildContext context) => provider == CalendarProvider.caldav
      ? const _CaldavForm()
      : _OauthConsent(provider: provider);
}

class _OauthConsent extends ConsumerWidget {
  const _OauthConsent({required this.provider});

  final CalendarProvider provider;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final KmUser user = ref.watch(sessionControllerProvider) ?? SessionController.sampleUser;
    final KmPalette p = context.km;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        SettingsHead(
          group: SettingsGroup.connections,
          title: 'Connect ${provider.name}',
          parent: _calendarsCrumb,
        ),
        const KmSteps(labels: <String>['Permissions', 'Connect', 'Choose calendars'], current: 0),
        const SizedBox(height: KmTokens.s5),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: KmCard(
            panel: true,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    ProviderMark(provider.mark, size: 32),
                    const SizedBox(width: KmTokens.s3),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Semantics(
                            header: true,
                            child: Text(
                              'Know Meet wants to access your ${provider.accountNoun}',
                              style: KmText.h3(context),
                            ),
                          ),
                          const SizedBox(height: KmTokens.s2),
                          Text(user.email, style: KmText.smallSub(context)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: KmTokens.s3),
                const _Permission(
                  icon: LucideIcons.eye,
                  title: 'See your events',
                  detail: 'Read events in the calendars you choose, to show upcoming meetings and avoid conflicts.',
                ),
                Container(height: 1, color: p.muted),
                const _Permission(
                  icon: LucideIcons.calendar,
                  title: 'Create events with a KnowMe link',
                  detail: 'Add meetings you schedule in KnowMe, with the join link, dial-in number and PIN.',
                ),
                const SizedBox(height: KmTokens.s3),
                Text(
                  'KnowMe never deletes events, and never reads your email or contacts. '
                  'You can disconnect at any time.',
                  style: KmText.smallSub(context),
                ),
                const SizedBox(height: KmTokens.s3),
                Wrap(
                  spacing: KmTokens.s2,
                  runSpacing: KmTokens.s2,
                  children: <Widget>[
                    KmButton(label: 'Continue', variant: KmButtonVariant.primary, onPressed: () {}),
                    KmButton(label: 'Cancel', onPressed: () => context.go('/settings/calendars')),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// `.perm`: one requested permission.
class _Permission extends StatelessWidget {
  const _Permission({required this.icon, required this.title, required this.detail});

  final IconData icon;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return MergeSemantics(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: KmTokens.s3),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: ExcludeSemantics(child: Icon(icon, size: 20, color: context.km.emberText)),
            ),
            const SizedBox(width: KmTokens.s3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    title,
                    style: KmText.body(context).copyWith(fontWeight: KmTokens.fontWeightSemibold),
                  ),
                  Text(detail, style: KmText.smallSub(context)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CaldavForm extends StatelessWidget {
  const _CaldavForm();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const SettingsHead(
          group: SettingsGroup.connections,
          title: 'Connect iCloud / CalDAV',
          description: 'Works with iCloud, Fastmail, Nextcloud and other CalDAV servers.',
          parent: _calendarsCrumb,
        ),
        SettingsPanel(
          title: 'Account details',
          children: <Widget>[
            SettingsStack(
              children: <Widget>[
                const SettingsField(
                  label: 'Server URL',
                  required: true,
                  mono: true,
                  hint: 'For iCloud use https://caldav.icloud.com.',
                  value: 'https://caldav.icloud.com',
                ),
                const SettingsField(
                  label: 'Username',
                  required: true,
                  hint: 'For iCloud, your Apple Account email.',
                  placeholder: 'you@icloud.com',
                ),
                const SettingsField(
                  label: 'App-specific password',
                  required: true,
                  mono: true,
                  secret: true,
                  hint: 'Create one at appleid.apple.com → Sign-In and Security → App-Specific '
                      'Passwords. Your regular password won’t work.',
                  placeholder: 'xxxx-xxxx-xxxx-xxxx',
                ),
                SettingsFormFoot(
                  children: <Widget>[
                    KmButton(
                      label: 'Test & connect',
                      icon: LucideIcons.link,
                      variant: KmButtonVariant.primary,
                      onPressed: () {},
                    ),
                    KmButton(
                      label: 'Cancel',
                      variant: KmButtonVariant.ghost,
                      onPressed: () => context.go('/settings/calendars'),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }
}

/// `/settings/calendar-connect/<unknown>`.
class CalendarProviderNotFound extends StatelessWidget {
  const CalendarProviderNotFound({super.key});

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: <Widget>[
      const SettingsHead(
        group: SettingsGroup.connections,
        title: 'Calendar provider not found',
        parent: _calendarsCrumb,
      ),
      Align(
        alignment: Alignment.centerLeft,
        child: KmButton(
          label: 'Back to calendars',
          variant: KmButtonVariant.primary,
          size: KmButtonSize.small,
          onPressed: () => context.go('/settings/calendars'),
        ),
      ),
    ],
  );
}
