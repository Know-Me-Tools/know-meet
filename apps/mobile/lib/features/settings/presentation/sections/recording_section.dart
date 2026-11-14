// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/settings_section.dart';
import '../settings_head.dart';
import '../widgets/settings_choices.dart';
import '../widgets/settings_fields.dart';
import '../widgets/settings_panel.dart';

/// `settings.recording`: recording and transcription defaults. Consent is
/// always on and cannot be switched off.
class RecordingSection extends StatelessWidget {
  const RecordingSection({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        SettingsHead(
          group: SettingsGroup.recording,
          title: 'Recording & transcription',
          description:
              'Defaults for meetings you host. Hosts can still start or stop recording in the room.',
        ),
        SettingsPanel(
          title: 'Recording',
          children: <Widget>[
            SettingsSwitchList(
              children: <Widget>[
                SettingsToggleRow(
                  toggleKey: 'rec.auto',
                  title: 'Auto-record meetings I host',
                  description: 'Starts a Room Composite recording once everyone present has consented.',
                ),
                SettingsToggleRow(
                  toggleKey: 'rec.consent',
                  title: 'Ask participants for consent',
                  description:
                      'Always on. Everyone sees a recording notice and must agree before recording '
                      'starts; people who join later see it before they enter.',
                  locked: true,
                ),
              ],
            ),
          ],
        ),
        SettingsPanel(
          title: 'Transcription',
          children: <Widget>[
            SettingsSwitchList(
              children: <Widget>[
                SettingsToggleRow(
                  toggleKey: 'rec.live',
                  title: 'Live transcription',
                  description: 'Transcribe as people speak and show captions in the room.',
                ),
                SettingsToggleRow(
                  toggleKey: 'rec.speakers',
                  title: 'Speaker labels',
                  description: 'Attribute each line to a participant or agent.',
                ),
                SettingsToggleRow(
                  toggleKey: 'rec.kb',
                  title: 'Add transcript to meeting knowledge in real time',
                  description:
                      'Every agent in the room, including Concierge, can answer from what has been said so far.',
                ),
                SettingsToggleRow(
                  toggleKey: 'rec.profanity',
                  title: 'Profanity filter',
                  description: 'Masks profanity in captions, transcripts and summaries.',
                ),
              ],
            ),
            SizedBox(height: KmTokens.s4),
            SettingsSelect(
              label: 'Transcription language',
              value: 'Detect automatically',
              options: <String>['Detect automatically', 'English', 'Spanish', 'French', 'German', 'Japanese'],
            ),
          ],
        ),
        SettingsPanel(
          title: 'Guest meetings',
          trailing: KmLockBadge('Not editable', icon: LucideIcons.lock),
          children: <Widget>[
            Text(
              'Meetings started by someone who isn’t signed in are never recorded. They get live '
              'transcription and the Concierge only, and the transcript is deleted when the meeting '
              'ends — it isn’t saved or sent to anyone.',
            ),
          ],
        ),
      ],
    );
  }
}
