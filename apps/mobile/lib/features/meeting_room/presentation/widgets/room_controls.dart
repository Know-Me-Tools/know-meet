// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/room_snapshot.dart';

/// Visual treatment of a control (meet.html `.ctl` modifiers).
enum _CtlTone { normal, off, panel, leave }

class _Ctl {
  const _Ctl(
    this.label,
    this.icon, {
    this.pressed,
    this.tone = _CtlTone.normal,
    this.locked = false,
  });

  final String label;
  final IconData icon;

  /// `aria-pressed`; null for plain actions.
  final bool? pressed;
  final _CtlTone tone;

  /// Guest-locked feature (`.ctl-lock`).
  final bool locked;
}

/// The control bar (`nav.controls`, "Meeting controls"). Below 900px the
/// labels are visually hidden but stay the accessible names; below 768px
/// the bar scrolls horizontally. Panels and media are out of scope this
/// phase (D-2), so the controls render their state but do nothing.
class RoomControls extends StatelessWidget {
  const RoomControls({super.key, required this.room});

  final RoomSnapshot room;

  List<_Ctl> get _controls => <_Ctl>[
    _Ctl(room.micOn ? 'Mute' : 'Unmute', room.micOn ? LucideIcons.mic : LucideIcons.micOff,
        pressed: room.micOn),
    _Ctl(
      room.cameraOn ? 'Stop video' : 'Start video',
      room.cameraOn ? LucideIcons.video : LucideIcons.videoOff,
      pressed: room.cameraOn,
      tone: room.cameraOn ? _CtlTone.normal : _CtlTone.off,
    ),
    const _Ctl('Share', LucideIcons.monitorUp, pressed: false, tone: _CtlTone.panel),
    _Ctl('Captions', LucideIcons.captions, pressed: room.captionsOn, tone: _CtlTone.panel),
    _Ctl(
      room.guest ? 'Record (sign in to unlock)' : 'Record',
      LucideIcons.circleDot,
      pressed: room.recording,
      locked: room.guest,
    ),
    const _Ctl('Chat', LucideIcons.messageSquare, pressed: false, tone: _CtlTone.panel),
    const _Ctl('Transcript', LucideIcons.audioLines, pressed: false, tone: _CtlTone.panel),
    const _Ctl('Knowledge', LucideIcons.bookOpen, pressed: false, tone: _CtlTone.panel),
    const _Ctl('Invite', LucideIcons.users, pressed: false, tone: _CtlTone.panel),
    _Ctl(
      room.guest ? 'Add agent (sign in to unlock)' : 'Add agent',
      LucideIcons.botMessageSquare,
      locked: room.guest,
    ),
    _Ctl(room.guest ? 'Concierge' : 'My agent', LucideIcons.sparkles,
        pressed: false, tone: _CtlTone.panel),
    const _Ctl('Leave', LucideIcons.phoneOff, tone: _CtlTone.leave),
  ];

  @override
  Widget build(BuildContext context) {
    final double width = MediaQuery.sizeOf(context).width;
    final bool showLabels = width > KmTokens.bp899;
    final bool phone = width <= KmTokens.bp767;
    final List<Widget> items = <Widget>[
      for (final _Ctl c in _controls) _CtlButton(ctl: c, showLabel: showLabels),
    ];
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: 'Meeting controls',
      child: Padding(
        padding: phone
            ? const EdgeInsets.fromLTRB(KmTokens.s3, KmTokens.s2, KmTokens.s3, KmTokens.s3)
            : const EdgeInsets.fromLTRB(KmTokens.s5, KmTokens.s3, KmTokens.s5, KmTokens.s4),
        child: phone || !showLabels
            ? SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(children: _spaced(items)),
              )
            : Wrap(
                alignment: WrapAlignment.center,
                spacing: KmTokens.s2,
                runSpacing: KmTokens.s2,
                children: items,
              ),
      ),
    );
  }

  static List<Widget> _spaced(List<Widget> items) => <Widget>[
    for (int i = 0; i < items.length; i++) ...<Widget>[
      if (i > 0) const SizedBox(width: KmTokens.s2),
      items[i],
    ],
  ];
}

class _CtlButton extends StatelessWidget {
  const _CtlButton({required this.ctl, required this.showLabel});

  final _Ctl ctl;
  final bool showLabel;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final bool pressedPanel = ctl.tone == _CtlTone.panel && (ctl.pressed ?? false);
    final Color bg = switch (ctl.tone) {
      _CtlTone.off => p.redSoft,
      _CtlTone.leave => p.dangerBtn,
      _ when pressedPanel => p.emberSoft,
      _ => p.card,
    };
    final Color fg = switch (ctl.tone) {
      _CtlTone.leave => p.onDanger,
      _ when pressedPanel => p.emberText,
      _ => p.fg,
    };
    final Widget body = Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Icon(ctl.icon, size: 20, color: fg),
        if (showLabel) ...<Widget>[
          const SizedBox(height: 2),
          Text(
            ctl.label,
            maxLines: 1,
            style: KmText.xsmall(context).copyWith(
              color: fg,
              fontWeight: KmTokens.fontWeightSemibold,
            ),
          ),
        ],
      ],
    );
    return Semantics(
      button: true,
      toggled: ctl.pressed,
      label: ctl.label,
      excludeSemantics: true,
      onTap: () {},
      child: Material(
        color: bg,
        borderRadius: BorderRadius.circular(KmTokens.radius),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () {},
          child: Stack(
            children: <Widget>[
              Container(
                constraints: BoxConstraints(
                  minWidth: showLabel ? 64 : 48,
                  minHeight: showLabel ? 56 : 48,
                ),
                padding: EdgeInsets.symmetric(horizontal: showLabel ? 8 : 12, vertical: 6),
                alignment: Alignment.center,
                child: body,
              ),
              if (ctl.locked)
                Positioned(
                  top: 4,
                  right: 6,
                  child: Container(
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(color: p.muted, shape: BoxShape.circle),
                    child: Icon(LucideIcons.lock, size: 12, color: p.fgSub),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
