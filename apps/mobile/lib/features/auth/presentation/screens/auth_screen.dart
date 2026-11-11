// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/auth_view.dart';
import '../providers/auth_samples_provider.dart';
import '../widgets/auth_header.dart';
import '../widgets/auth_parts.dart';
import '../widgets/inbox_panels.dart';
import '../widgets/sign_in_panel.dart';
import '../widgets/sign_up_panel.dart';

/// The sign-in flow (`auth.*`): full screen, outside the app frame, with
/// the prototype's own header. Sign-in views also show "Why sign in".
class AuthScreen extends ConsumerWidget {
  const AuthScreen({super.key, required this.view});

  final AuthView view;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final String email = ref.watch(authSamplesProvider).sampleEmail;
    final bool signInView = view == AuthView.signIn || view == AuthView.signInError;
    final Widget panel = switch (view) {
      AuthView.signIn => const SignInPanel(isError: false),
      AuthView.signInError => const SignInPanel(isError: true),
      AuthView.signUp => const SignUpPanel(),
      AuthView.checkEmail => CheckEmailPanel(email: email),
      AuthView.magicLinkSent => MagicLinkPanel(email: email),
    };
    return Scaffold(
      backgroundColor: context.km.bg,
      body: SafeArea(
        child: Column(
          children: <Widget>[
            const AuthHeader(),
            Expanded(
              child: Semantics(
                container: true,
                explicitChildNodes: true,
                label: 'Main content',
                child: KmPage(
                  narrow: true,
                  children: <Widget>[
                    panel,
                    if (signInView) ...<Widget>[
                      const SizedBox(height: KmTokens.s7),
                      const WhySignIn(),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
