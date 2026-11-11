// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/invitation.dart';
import 'join_chrome.dart';

/// The invite's join form: name, start-with camera and microphone, the
/// recording consent notice, then "Join in browser" and "Add to calendar".
/// Device choices are ephemeral form state. Joining goes to the waiting
/// room (the prototype's lobby is out of scope, D-2).
class InviteForm extends StatefulWidget {
  const InviteForm({super.key, required this.invite});

  final Invitation invite;

  @override
  State<InviteForm> createState() => _InviteFormState();
}

class _InviteFormState extends State<InviteForm> {
  bool _camera = true;
  bool _mic = true;

  @override
  Widget build(BuildContext context) {
    final Invitation m = widget.invite;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const KmTextField(
          label: 'Your name',
          required: true,
          placeholder: 'e.g. Sam Patel',
          hint: 'Shown on your video tile and in the transcript.',
        ),
        const SizedBox(height: KmTokens.s4),
        Text('Start with', style: KmText.label(context)),
        const SizedBox(height: 6),
        _DeviceRow(
          label: 'Camera',
          on: _camera,
          onIcon: LucideIcons.video,
          offIcon: LucideIcons.videoOff,
          onChanged: (bool v) => setState(() => _camera = v),
        ),
        const SizedBox(height: KmTokens.s2),
        _DeviceRow(
          label: 'Microphone',
          on: _mic,
          onIcon: LucideIcons.mic,
          offIcon: LucideIcons.micOff,
          onChanged: (bool v) => setState(() => _mic = v),
        ),
        const SizedBox(height: KmTokens.s4),
        _ConsentNotice(invite: m),
        const SizedBox(height: KmTokens.s4),
        KmButton(
          label: 'Join in browser',
          icon: LucideIcons.video,
          variant: KmButtonVariant.primary,
          block: true,
          onPressed: () => context.go('/join/waiting'),
        ),
        const SizedBox(height: KmTokens.s2),
        KmButton(
          label: 'Add to calendar',
          icon: LucideIcons.calendar,
          block: true,
          onPressed: () => showCalendarUnavailable(context),
        ),
      ],
    );
  }
}

/// `.device`: icon, label + state line, switch. The whole row is one named
/// switch; keyboard focus fills the switch track with `focus` (D-6).
class _DeviceRow extends StatelessWidget {
  const _DeviceRow({
    required this.label,
    required this.on,
    required this.onIcon,
    required this.offIcon,
    required this.onChanged,
  });

  final String label;
  final bool on;
  final IconData onIcon;
  final IconData offIcon;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final String state = on ? 'On when you join' : 'Off when you join';
    return Semantics(
      toggled: on,
      label: '$label. $state',
      excludeSemantics: true,
      onTap: () => onChanged(!on),
      child: KmInteractive(
        onTap: () => onChanged(!on),
        builder: (BuildContext context, Set<WidgetState> s) => Container(
          constraints: const BoxConstraints(minHeight: KmTokens.sizeTarget),
          padding: const EdgeInsets.fromLTRB(KmTokens.s4, KmTokens.s2, KmTokens.s3, KmTokens.s2),
          decoration: BoxDecoration(
            color: p.card,
            borderRadius: BorderRadius.circular(KmTokens.radius),
          ),
          child: Row(
            children: <Widget>[
              Icon(on ? onIcon : offIcon, size: 20, color: p.fg),
              const SizedBox(width: KmTokens.s4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(label, style: KmText.displayAt(context, size: KmTokens.textBase)),
                    Text(state, style: KmText.xsmall(context).copyWith(color: p.fgSub)),
                  ],
                ),
              ),
              KmSwitchTrack(on: on, states: s),
            ],
          ),
        ),
      ),
    );
  }
}

class _ConsentNotice extends StatelessWidget {
  const _ConsentNotice({required this.invite});

  final Invitation invite;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final String first = invite.recordingOn
        ? '${invite.hostName} has recording turned on. KnowMe transcribes the '
              'conversation live and may record everyone in one combined '
              'video. When the meeting ends, the transcript and a summary with '
              'action items are sent to all participants by email and SMS.'
        : 'KnowMe transcribes the conversation live, and the host can start a '
              'recording during the meeting. When the meeting ends, the '
              'transcript and a summary with action items are sent to all '
              'participants by email and SMS.';
    return Container(
      padding: const EdgeInsets.all(KmTokens.s4),
      decoration: BoxDecoration(
        color: p.amberSoft,
        borderRadius: BorderRadius.circular(KmTokens.radius),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Icon(LucideIcons.circleDot, size: 20, color: p.amber),
          ),
          const SizedBox(width: KmTokens.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Semantics(
                  header: true,
                  child: Text(
                    'This meeting may be recorded and transcribed',
                    style: KmText.displayAt(context, size: KmTokens.text15),
                  ),
                ),
                const SizedBox(height: KmTokens.s1),
                Text(first, style: KmText.small(context)),
                const SizedBox(height: KmTokens.s2),
                Text(
                  'By joining, you consent to being transcribed and, if the host '
                  'starts it, recorded. You’ll see a notice in the room when '
                  'recording starts, and you can keep your camera off or join '
                  'by phone instead.',
                  style: KmText.small(context),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
