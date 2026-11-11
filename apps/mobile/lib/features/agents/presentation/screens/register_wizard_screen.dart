// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/registration_draft.dart';
import '../widgets/register_identity_step.dart';
import '../widgets/register_permissions_step.dart';
import '../widgets/register_test_step.dart';
import '../widgets/register_worker_step.dart';

/// `agents.register.1` to `.4`: the four-step registration wizard. The step
/// is the route (`/agents/register/<n>`); the draft lives in
/// `registrationDraftControllerProvider`.
class RegisterWizardScreen extends StatelessWidget {
  const RegisterWizardScreen({super.key, required this.step});

  /// 1-based; out-of-range values fall back to step 1, as in the prototype.
  final int step;

  @override
  Widget build(BuildContext context) {
    final int s = step >= 1 && step <= 4 ? step : 1;
    final Widget body = switch (s) {
      1 => const RegisterIdentityStep(),
      2 => const RegisterWorkerStep(),
      3 => const RegisterPermissionsStep(),
      _ => const RegisterTestStep(),
    };
    return KmPage(
      children: <Widget>[
        KmPageHead(
          eyebrow: 'Step $s of 4 · ${registrationSteps[s - 1]}',
          title: 'Register an agent',
          crumbs: <KmCrumb>[
            KmCrumb('Agents', onTap: () => context.go('/agents/registry')),
            const KmCrumb('Register an agent'),
          ],
        ),
        KmSteps(labels: registrationSteps, current: s - 1),
        const SizedBox(height: KmTokens.s1),
        body,
        RegisterWizardFoot(step: s),
      ],
    );
  }
}

/// `.wiz-foot`: Cancel or Back, and Next (absent on the test step). At
/// phone width Next fills the row, as km.css does below 768px.
class RegisterWizardFoot extends StatelessWidget {
  const RegisterWizardFoot({super.key, required this.step});

  final int step;

  @override
  Widget build(BuildContext context) {
    final bool phone = MediaQuery.sizeOf(context).width <= KmTokens.bp767;
    final Widget back = step > 1
        ? KmButton(label: 'Back', onPressed: () => context.go('/agents/register/${step - 1}'))
        : KmButton(
            label: 'Cancel',
            variant: KmButtonVariant.ghost,
            onPressed: () => context.go('/agents/registry'),
          );
    final Widget? next = step < 4
        ? KmButton(
            label: 'Next',
            trailingIcon: LucideIcons.chevronRight,
            variant: KmButtonVariant.primary,
            block: phone,
            onPressed: () => context.go('/agents/register/${step + 1}'),
          )
        : null;
    return Padding(
      padding: const EdgeInsets.only(top: KmTokens.s6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const KmRule(vertical: 0),
          const SizedBox(height: KmTokens.s5),
          if (phone) ...<Widget>[
            Align(alignment: Alignment.centerLeft, child: back),
            if (next != null) ...<Widget>[const SizedBox(height: KmTokens.s3), next],
          ] else
            Row(
              children: <Widget>[back, const Spacer(), ?next],
            ),
        ],
      ),
    );
  }
}
