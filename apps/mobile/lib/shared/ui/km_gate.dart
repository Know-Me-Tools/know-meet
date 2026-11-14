// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_flutter/shadcn_flutter.dart' show LucideIcons;

import 'km_button.dart';
import 'km_page.dart';
import 'km_palette_of.dart';
import 'km_text.dart';

/// `.gate`: the locked-feature card a signed-out visitor sees on an app page
/// (`<page>.gate-signed-out`): the page head, then the gate card. Sign-in
/// goes to the auth flow; guests can still start a meeting.
class KmSignInGate extends StatelessWidget {
  const KmSignInGate({
    super.key,
    required this.pageTitle,
    this.pageLede,
    this.pageEyebrow,
    required this.title,
    required this.body,
  });

  /// The page's own eyebrow, h1 and lede, shown above the gate as in the
  /// prototype. Empty or null eyebrow/lede are not rendered.
  final String pageTitle;
  final String? pageLede;
  final String? pageEyebrow;

  /// The gate card's heading and copy.
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return KmPage(
      children: <Widget>[
        KmPageHead(
          title: pageTitle,
          lede: (pageLede ?? '').isEmpty ? null : pageLede,
          eyebrow: (pageEyebrow ?? '').isEmpty ? null : pageEyebrow,
        ),
        Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 520),
            margin: const EdgeInsets.only(bottom: KmTokens.s6),
            padding: const EdgeInsets.symmetric(horizontal: KmTokens.s5, vertical: KmTokens.s7),
            decoration: BoxDecoration(
              color: p.surface,
              borderRadius: BorderRadius.circular(KmTokens.radiusLg),
              boxShadow: p.shadowCard,
            ),
            child: Column(
              children: <Widget>[
                ExcludeSemantics(
                  child: Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: p.emberSoft,
                      borderRadius: BorderRadius.circular(KmTokens.radiusTile),
                    ),
                    child: Icon(LucideIcons.lock, color: p.emberText, size: 28),
                  ),
                ),
                const SizedBox(height: KmTokens.s2 + KmTokens.s3),
                Semantics(
                  header: true,
                  child: Text(title, textAlign: TextAlign.center, style: KmText.h2(context)),
                ),
                const SizedBox(height: KmTokens.s3),
                Text(body, textAlign: TextAlign.center, style: KmText.sub(context)),
                const SizedBox(height: KmTokens.s3 * 2),
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: KmTokens.s2,
                  runSpacing: KmTokens.s2,
                  children: <Widget>[
                    KmButton(
                      label: 'Sign in',
                      icon: LucideIcons.user,
                      variant: KmButtonVariant.primary,
                      onPressed: () => context.go('/auth/sign-in'),
                    ),
                    KmButton(
                      label: 'Start a guest meeting',
                      icon: LucideIcons.video,
                      onPressed: () => context.go('/meet/room-guest'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
