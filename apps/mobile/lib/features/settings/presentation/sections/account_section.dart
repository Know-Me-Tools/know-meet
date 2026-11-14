// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/session/session.dart';
import '../../../../shared/ui/ui.dart';
import '../../domain/settings_section.dart';
import '../../domain/settings_values.dart';
import '../settings_head.dart';
import '../settings_providers.dart';
import '../widgets/settings_choices.dart';
import '../widgets/settings_fields.dart';
import '../widgets/settings_panel.dart';

/// `settings.account`: profile, meeting defaults, session, delete account.
class AccountSection extends ConsumerWidget {
  const AccountSection({super.key});

  static const List<String> _timeZones = <String>[
    'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York',
    'America/Sao_Paulo', 'Europe/London', 'Europe/Berlin', 'Africa/Lagos',
    'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'UTC',
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final KmUser user = ref.watch(sessionControllerProvider) ?? SessionController.sampleUser;
    final SettingsSnapshot s = ref.watch(settingsSnapshotProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const SettingsHead(
          group: SettingsGroup.account,
          title: 'Account',
          description: 'Your profile, time zone, and the defaults new meetings start with.',
        ),
        SettingsPanel(
          title: 'Profile',
          children: <Widget>[
            SettingsStack(
              children: <Widget>[
                Row(
                  children: <Widget>[
                    KmAvatar(user.initials, size: 64, tone: KmAvatarTone.ember),
                    const SizedBox(width: KmTokens.s4),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(user.name, style: KmText.displayAt(context, size: KmTokens.textBase)),
                          const SizedBox(height: 2),
                          Text(user.email, style: KmText.smallSub(context)),
                        ],
                      ),
                    ),
                  ],
                ),
                SettingsField(
                  label: 'Display name',
                  required: true,
                  hint: 'Shown to participants and in invites you send.',
                  value: user.name,
                ),
                SettingsField(
                  label: 'Email',
                  readOnly: true,
                  hint: 'Your sign-in identity. To use a different email, sign out and sign in with it.',
                  value: user.email,
                ),
                SettingsFormFoot(
                  children: <Widget>[
                    KmButton(
                      label: 'Save profile',
                      icon: LucideIcons.check,
                      variant: KmButtonVariant.primary,
                      onPressed: () {},
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        SettingsPanel(
          title: 'Meeting defaults',
          description: 'Applied when you start or schedule a meeting. You can change them per meeting.',
          children: <Widget>[
            SettingsSelect(
              label: 'Time zone',
              hint: 'Used for scheduling, invites and the dates in summaries.',
              value: s.timeZone,
              options: _timeZones,
            ),
            const SizedBox(height: KmTokens.s4),
            const SettingsSwitchList(
              children: <Widget>[
                SettingsToggleRow(
                  toggleKey: 'defaults.waiting',
                  title: 'Waiting room',
                  description: 'Invitees wait until you admit them.',
                ),
                SettingsToggleRow(
                  toggleKey: 'defaults.scribe',
                  title: 'Add Scribe to meetings I host',
                  description: 'Scribe keeps notes, decisions and action items.',
                ),
                SettingsToggleRow(
                  toggleKey: 'defaults.dot',
                  title: 'Bring Iris, your dot',
                  description: 'Your always-on agent joins with your private memory.',
                ),
                SettingsToggleRow(
                  toggleKey: 'defaults.dialin',
                  title: 'Include phone dial-in in invites',
                  description: 'Adds the dial-in number and meeting PIN to email and SMS invites.',
                ),
              ],
            ),
          ],
        ),
        SettingsPanel(
          title: 'Session',
          description: 'Signing out keeps your recordings and settings in your account.',
          children: <Widget>[
            Align(
              alignment: Alignment.centerLeft,
              child: KmButton(
                label: 'Sign out',
                icon: LucideIcons.logOut,
                onPressed: () => ref.read(sessionControllerProvider.notifier).signOut(),
              ),
            ),
          ],
        ),
        SettingsPanel(
          title: 'Delete account',
          description: 'Removes your account and everything KnowMe stores for it. This can’t be undone.',
          children: <Widget>[
            Align(
              alignment: Alignment.centerLeft,
              child: KmButton(
                label: 'Delete account',
                icon: LucideIcons.trash2,
                variant: KmButtonVariant.danger,
                onPressed: () {},
              ),
            ),
          ],
        ),
      ],
    );
  }
}
