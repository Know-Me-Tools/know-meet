// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/session/session.dart';
import '../../../../shared/ui/ui.dart';
import '../../domain/settings_section.dart';
import '../../domain/settings_values.dart';
import '../settings_head.dart';
import '../settings_providers.dart';
import '../widgets/settings_choices.dart';
import '../widgets/settings_fields.dart';

/// `settings.calendars`: one card per provider account.
class CalendarsSection extends ConsumerWidget {
  const CalendarsSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final SettingsSnapshot s = ref.watch(settingsSnapshotProvider);
    final KmUser user = ref.watch(sessionControllerProvider) ?? SessionController.sampleUser;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const SettingsHead(
          group: SettingsGroup.connections,
          title: 'Calendars',
          description:
              'Connected calendars show your upcoming meetings and get a KnowMe link added to events you create.',
        ),
        for (final CalendarAccount a in s.calendars)
          if (CalendarProvider.fromKey(a.provider) case final CalendarProvider provider)
            _ProviderCard(account: a, provider: provider, email: user.email),
      ],
    );
  }
}

/// `.prov`: provider mark, status chip, then name, account and controls.
class _ProviderCard extends StatelessWidget {
  const _ProviderCard({required this.account, required this.provider, required this.email});

  final CalendarAccount account;
  final CalendarProvider provider;
  final String email;

  static String _window(int days) => switch (days) {
    14 => 'Next 2 weeks',
    90 => 'Next 90 days',
    _ => 'Next 30 days',
  };

  @override
  Widget build(BuildContext context) {
    final bool on = account.connected;
    return Padding(
      padding: const EdgeInsets.only(bottom: KmTokens.s5),
      child: KmCard(
        panel: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                ProviderMark(provider.mark),
                const SizedBox(width: KmTokens.s4),
                Expanded(
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: on
                        ? const KmChip('Connected', tone: KmChipTone.green, pip: true)
                        : const KmChip('Not connected'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: KmTokens.s3),
            Semantics(header: true, child: Text(provider.name, style: KmText.h3(context))),
            const SizedBox(height: 4),
            Text(on ? email : 'Not connected', style: KmText.smallSub(context)),
            const SizedBox(height: KmTokens.s3),
            if (on) ..._connected(context) else ..._disconnected(context),
          ],
        ),
      ),
    );
  }

  List<Widget> _connected(BuildContext context) => <Widget>[
    const SettingsLabel('Calendars to sync'),
    for (final SyncedCalendar c in account.calendars)
      SettingsLocalCheck(label: c.name, initial: c.synced),
    const SizedBox(height: KmTokens.s3),
    _LocalSwitch(
      title: 'Add KnowMe link to events I create',
      description: 'Adds the join link, dial-in number and PIN to the event description.',
      initial: account.addLink,
    ),
    const SizedBox(height: KmTokens.s3),
    SettingsSelect(
      label: 'Sync window',
      value: _window(account.syncWindowDays),
      options: const <String>['Next 2 weeks', 'Next 30 days', 'Next 90 days'],
    ),
    const SizedBox(height: KmTokens.s4),
    Text('Synced automatically every 5 minutes', style: KmText.smallSub(context)),
    const SizedBox(height: KmTokens.s2),
    Wrap(
      spacing: KmTokens.s2,
      runSpacing: KmTokens.s2,
      children: <Widget>[
        KmButton(
          label: 'Sync now',
          icon: LucideIcons.rotateCw,
          size: KmButtonSize.small,
          onPressed: () {},
        ),
        KmButton(
          label: 'Disconnect',
          variant: KmButtonVariant.ghost,
          size: KmButtonSize.small,
          onPressed: () {},
        ),
      ],
    ),
  ];

  List<Widget> _disconnected(BuildContext context) => <Widget>[
    Text(
      'Connect iCloud or any CalDAV server with an app-specific password.',
      style: KmText.smallSub(context),
    ),
    const SizedBox(height: KmTokens.s2),
    Align(
      alignment: Alignment.centerLeft,
      child: KmButton(
        label: 'Connect',
        icon: LucideIcons.link,
        variant: KmButtonVariant.primary,
        size: KmButtonSize.small,
        onPressed: () => context.go('/settings/calendar-connect/${provider.key}'),
      ),
    ),
  ];
}

/// A switch row whose value is local to the card.
class _LocalSwitch extends StatefulWidget {
  const _LocalSwitch({required this.title, required this.description, required this.initial});

  final String title;
  final String description;
  final bool initial;

  @override
  State<_LocalSwitch> createState() => _LocalSwitchState();
}

class _LocalSwitchState extends State<_LocalSwitch> {
  late bool _value = widget.initial;

  @override
  Widget build(BuildContext context) => KmSwitchRow(
    title: widget.title,
    description: widget.description,
    value: _value,
    onChanged: (bool v) => setState(() => _value = v),
  );
}

/// `.prov-mark`: a provider's letters in a 44px rounded tile. Decorative.
class ProviderMark extends StatelessWidget {
  const ProviderMark(this.letters, {super.key, this.size = 44});

  final String letters;
  final double size;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: p.muted,
          borderRadius: BorderRadius.circular(KmTokens.radius),
        ),
        child: Text(
          letters,
          style: KmText.displayAt(context, size: KmTokens.text15, weight: KmTokens.fontWeightBold),
        ),
      ),
    );
  }
}
