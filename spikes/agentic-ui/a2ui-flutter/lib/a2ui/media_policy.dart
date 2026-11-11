/// Origin allowlist for A2UI media (Image, Video, AudioPlayer), mirroring the
/// harness `allowMediaOrigin` rule. a2ui_flutter 0.2.0 has no such hook, so the
/// Know Meet catalog checks URLs before delegating to the basic builders.
final class MediaPolicy {
  const MediaPolicy({required this.allowedOrigins});

  /// Allows nothing; every http(s) media URL is blocked.
  const MediaPolicy.denyAll() : allowedOrigins = const {};

  /// Origins such as `http://127.0.0.1:4317` (scheme, host and port).
  final Set<String> allowedOrigins;

  /// True when [url] is empty (nothing loads) or its origin is allowed.
  bool allows(String? url) {
    if (url == null || url.isEmpty) return true;
    final Uri? uri = Uri.tryParse(url);
    if (uri == null || !uri.hasScheme) return false;
    if (uri.scheme != 'http' && uri.scheme != 'https') return false;
    return allowedOrigins.contains(uri.origin);
  }
}
