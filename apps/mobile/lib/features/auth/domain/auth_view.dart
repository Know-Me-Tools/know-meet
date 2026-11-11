// TJ-ARCH-MOB-001 compliant

/// The five views of the sign-in flow (prototype auth.html hashes; D-1:
/// the whole flow is in scope).
enum AuthView {
  signIn('sign-in'),
  signUp('sign-up'),
  checkEmail('check-email'),
  signInError('sign-in-error'),
  magicLinkSent('magic-link-sent');

  const AuthView(this.slug);

  /// The path segment and inventory state suffix (`auth.<slug>`).
  final String slug;

  /// The view for [slug], or null when there is none.
  static AuthView? fromSlug(String? slug) {
    for (final AuthView v in values) {
      if (v.slug == slug) return v;
    }
    return null;
  }
}

/// Sample identity the static auth views show (prototype km.js
/// `data.user`), behind a port so a real identity source can replace it.
abstract interface class AuthSampleSource {
  /// The address the check-email and magic-link views name.
  String get sampleEmail;
}
