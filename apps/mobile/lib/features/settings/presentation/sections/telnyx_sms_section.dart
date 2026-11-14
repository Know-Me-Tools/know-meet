// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/settings_section.dart';
import '../settings_head.dart';
import '../widgets/settings_panel.dart';

/// `settings.telnyx-sms`: not connected. The connect flow (API key entry)
/// is server-side work in a later phase; the button is a static affordance.
class TelnyxSmsSection extends StatelessWidget {
  const TelnyxSmsSection({super.key});

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const SettingsHead(
          group: SettingsGroup.connections,
          title: 'Telnyx SMS',
          description:
              'Telnyx Messaging sends SMS invites and summary links to participants with a phone number.',
        ),
        const SettingsNote(
          tone: SettingsNoteTone.info,
          icon: LucideIcons.info,
          child: Text(
            'Telnyx is used only for SMS (invites and summary links) and inbound voice dial-in. '
            'Meeting audio and video always run on LiveKit.',
          ),
        ),
        const SizedBox(height: KmTokens.s5),
        KmCard(
          panel: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              ExcludeSemantics(
                child: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: p.muted,
                    borderRadius: BorderRadius.circular(KmTokens.radius14),
                  ),
                  child: Icon(LucideIcons.messageSquareText, color: p.fgSub),
                ),
              ),
              const SizedBox(height: KmTokens.s3),
              Semantics(header: true, child: Text('Not connected', style: KmText.h3(context))),
              const SizedBox(height: KmTokens.s3),
              Text(
                'Connect a Telnyx account to text meeting invites and summary links. '
                'Without it, KnowMe sends everything by email only.',
                style: KmText.smallSub(context),
              ),
              const SizedBox(height: KmTokens.s3),
              KmButton(
                label: 'Connect Telnyx',
                icon: LucideIcons.plus,
                variant: KmButtonVariant.primary,
                onPressed: () {},
              ),
            ],
          ),
        ),
      ],
    );
  }
}
