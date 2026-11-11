// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../application/meetings_repository.dart';
import '../providers/dashboard_providers.dart';
import '../providers/schedule_draft.dart';
import '../widgets/dash_bits.dart';
import 'schedule_sections.dart';

/// `dashboard.schedule`: the "Schedule a meeting" form at phone width
/// (sections stack; the invite preview follows the form). Static-screen
/// phase: the form renders and edits its draft but does not submit.
class ScheduleView extends ConsumerWidget {
  const ScheduleView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final DateTime now = ref.watch(dashboardNowProvider);
    final MeetingsRepository repo = ref.watch(meetingsRepositoryProvider);
    final ScheduleDraft draft = ref.watch(scheduleDraftControllerProvider);
    final ScheduleDraftController ctl = ref.read(scheduleDraftControllerProvider.notifier);
    final DateTime start = DateTime.utc(now.year, now.month, now.day + 1, 10);
    final KmPalette p = context.km;
    return KmPage(
      children: <Widget>[
        const KmPageHead(
          title: 'Schedule a meeting',
          lede: 'Invite anyone by email or phone. They join from the link or by dialing in — '
              'no account needed.',
        ),
        const DashTabs(active: 'schedule'),
        Text.rich(
          TextSpan(
            text: '*',
            style: KmText.small(context).copyWith(color: p.emberText),
            children: <InlineSpan>[TextSpan(text: ' Required', style: KmText.smallSub(context))],
          ),
        ),
        const SizedBox(height: KmTokens.s4),
        _DetailsPanel(start: start, onTitle: ctl.setTitle),
        const SizedBox(height: KmTokens.s4),
        const _InviteesPanel(),
        const SizedBox(height: KmTokens.s4),
        _CalendarPanel(account: repo.calendars().isEmpty ? '' : repo.calendars().first.account),
        const SizedBox(height: KmTokens.s4),
        OptionsPanel(draft: draft, controller: ctl, dialIns: repo.dialInNumbers()),
        const SizedBox(height: KmTokens.s4),
        AgentsPanel(draft: draft, controller: ctl, agents: repo.dispatchableAgents()),
        const SizedBox(height: KmTokens.s4),
        const KnowledgePanel(),
        const SizedBox(height: KmTokens.s5),
        Wrap(
          alignment: WrapAlignment.end,
          spacing: KmTokens.s2,
          runSpacing: KmTokens.s2,
          children: <Widget>[
            KmButton(
              label: 'Cancel',
              variant: KmButtonVariant.ghost,
              onPressed: () => context.go('/dashboard/upcoming'),
            ),
            KmButton(
              label: 'Schedule meeting',
              icon: LucideIcons.send,
              variant: KmButtonVariant.primary,
              onPressed: () => ScaffoldMessenger.maybeOf(context)?.showSnackBar(
                const SnackBar(content: Text('Add a title and at least one invitee to schedule.')),
              ),
            ),
          ],
        ),
        const SizedBox(height: KmTokens.s5),
        InvitePreviewPanel(draft: draft, start: start, dialIns: repo.dialInNumbers()),
      ],
    );
  }
}

class _DetailsPanel extends StatelessWidget {
  const _DetailsPanel({required this.start, required this.onTitle});

  final DateTime start;
  final ValueChanged<String> onTitle;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final String date = '${start.month.toString().padLeft(2, '0')}/'
        '${start.day.toString().padLeft(2, '0')}/${start.year}';
    return KmCard(
      panel: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Semantics(header: true, child: Text('Details', style: KmText.h3(context))),
          const SizedBox(height: KmTokens.s4),
          _TitleField(onChanged: onTitle),
          const SizedBox(height: KmTokens.s4),
          KmTextField(
            label: 'Date',
            required: true,
            initialValue: date,
            readOnly: true,
            trailing: Icon(LucideIcons.calendar, size: 18, color: p.fg),
          ),
          const SizedBox(height: KmTokens.s4),
          KmTextField(
            label: 'Start time',
            required: true,
            initialValue: '10:00  AM',
            readOnly: true,
            trailing: Icon(LucideIcons.clock, size: 18, color: p.fg),
          ),
          const SizedBox(height: KmTokens.s4),
          const DashSelect(label: 'Duration', options: <String>['15 min', '30 min', '45 min', '1 h', '1 h 30 min', '2 h'], initial: '30 min'),
          const SizedBox(height: KmTokens.s4),
          const DashSelect(label: 'Time zone', options: <String>['UTC', 'New York', 'London', 'Lagos', 'Kolkata', 'Tokyo'], initial: 'UTC'),
          const SizedBox(height: KmTokens.s4),
          const KmTextField(
            label: 'Description',
            placeholder: 'Agenda, goals, anything invitees should know.',
            hint: 'Shown in the email and calendar event. Agents in the room can read it too.',
            maxLines: 3,
          ),
        ],
      ),
    );
  }
}

class _TitleField extends StatelessWidget {
  const _TitleField({required this.onChanged});

  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        ExcludeSemantics(
          child: Text.rich(
            TextSpan(
              text: 'Title',
              style: KmText.label(context),
              children: <InlineSpan>[TextSpan(text: ' *', style: TextStyle(color: p.emberText))],
            ),
          ),
        ),
        const SizedBox(height: 6),
        Semantics(
          label: 'Title, required',
          child: TextField(
            onChanged: onChanged,
            style: KmText.body(context),
            decoration: const InputDecoration(
              hintText: 'e.g. Partner onboarding review',
              constraints: BoxConstraints(minHeight: 48),
            ),
          ),
        ),
      ],
    );
  }
}

class _InviteesPanel extends StatelessWidget {
  const _InviteesPanel();

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return KmCard(
      panel: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(child: Semantics(header: true, child: Text('Invitees', style: KmText.h3(context)))),
              Text('No invitees yet', style: KmText.smallSub(context)),
            ],
          ),
          const SizedBox(height: KmTokens.s4),
          ExcludeSemantics(
            child: Text.rich(
              TextSpan(
                text: 'Add people by email or phone number',
                style: KmText.label(context),
                children: <InlineSpan>[TextSpan(text: ' *', style: TextStyle(color: p.emberText))],
              ),
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: <Widget>[
              Expanded(
                child: Semantics(
                  label: 'Add people by email or phone number, required',
                  child: TextField(
                    style: KmText.body(context),
                    decoration: const InputDecoration(
                      hintText: 'name@company.com or +1 415 555 0142',
                      constraints: BoxConstraints(minHeight: 48),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: KmTokens.s2),
              KmButton(label: 'Add', icon: LucideIcons.plus, onPressed: () {}),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Press Enter or comma to add. Email addresses get an email invite; phone numbers '
            'get an SMS via Telnyx; people with both on file get both. Invitees don’t need an account.',
            style: KmText.smallSub(context),
          ),
        ],
      ),
    );
  }
}

class _CalendarPanel extends StatelessWidget {
  const _CalendarPanel({required this.account});

  final String account;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return KmCard(
      panel: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Semantics(header: true, child: Text('Calendar', style: KmText.h3(context))),
          const SizedBox(height: KmTokens.s4),
          DashSelect(
            label: 'Add to calendar',
            options: <String>[
              'Google Calendar — $account',
              'Outlook — jordan.reyes@outlook.com',
              'Don’t add to a calendar',
            ],
            initial: 'Google Calendar — $account',
          ),
          const SizedBox(height: KmTokens.s3),
          Container(
            padding: const EdgeInsets.all(KmTokens.s3),
            decoration: BoxDecoration(
              color: p.card,
              borderRadius: BorderRadius.circular(KmTokens.radius),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Icon(LucideIcons.info, size: 18, color: p.cyanText),
                const SizedBox(width: KmTokens.s2),
                Expanded(
                  child: Text(
                    'The KnowMe join link and dial-in details are inserted into the calendar '
                    'event, so they appear for everyone who gets it.',
                    style: KmText.smallSub(context),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
