// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/settings_section.dart';
import '../settings_head.dart';
import '../widgets/settings_choices.dart';
import '../widgets/settings_fields.dart';
import '../widgets/settings_panel.dart';

/// `settings.notifications`: email switches; SMS switches stay disabled
/// until a mobile number is saved.
class NotificationsSection extends StatelessWidget {
  const NotificationsSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const SettingsHead(
          group: SettingsGroup.account,
          title: 'Notifications',
          description: 'Choose what KnowMe tells you about, and where.',
        ),
        const SettingsPanel(
          title: 'Email',
          children: <Widget>[
            SettingsSwitchList(
              children: <Widget>[
                SettingsToggleRow(
                  toggleKey: 'notif.recReady',
                  title: 'Recording ready',
                  description: 'When a recording finishes processing and is pinned.',
                ),
                SettingsToggleRow(
                  toggleKey: 'notif.summary',
                  title: 'Summary and transcript',
                  description: 'Your own copy after each meeting you join.',
                ),
                SettingsToggleRow(
                  toggleKey: 'notif.responses',
                  title: 'Invite responses',
                  description: 'When invitees accept or decline.',
                ),
                SettingsToggleRow(
                  toggleKey: 'notif.digest',
                  title: 'Weekly digest',
                  description: 'Open action items assigned to you across meetings.',
                ),
              ],
            ),
          ],
        ),
        SettingsPanel(
          title: 'SMS',
          description: 'Sent through Telnyx. Standard message rates may apply.',
          children: <Widget>[
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: <Widget>[
                const Expanded(
                  child: SettingsField(
                    label: 'Mobile number for SMS',
                    hint: 'Include the country code. Reply STOP to any message to opt out.',
                    placeholder: '+1 415 555 0142',
                    keyboardType: TextInputType.phone,
                  ),
                ),
                const SizedBox(width: KmTokens.s2),
                KmButton(label: 'Save number', onPressed: () {}),
              ],
            ),
            const SizedBox(height: KmTokens.s4),
            const SettingsNote(
              tone: SettingsNoteTone.info,
              icon: LucideIcons.info,
              child: Text('Add a mobile number to turn on SMS notifications.'),
            ),
            const SizedBox(height: KmTokens.s3),
            const SettingsSwitchList(
              children: <Widget>[
                SettingsToggleRow(
                  toggleKey: 'notif.smsStart',
                  title: 'Meeting starting',
                  description: 'A text 5 minutes before meetings you host or were invited to.',
                  disabled: true,
                ),
                SettingsToggleRow(
                  toggleKey: 'notif.smsSummary',
                  title: 'Summary link',
                  description: 'A short link to the summary when a meeting closes.',
                  disabled: true,
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }
}
