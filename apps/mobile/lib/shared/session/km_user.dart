// TJ-ARCH-MOB-001 compliant

/// The signed-in person as the static screens show them. Real identity is a
/// contract exclusion this phase; this mirrors the prototype's `km-auth`
/// value (`{"name","email"}`).
final class KmUser {
  const KmUser({required this.name, required this.email});

  final String name;
  final String email;

  /// Up to two initials from the name, as km.js derives them.
  String get initials {
    final List<String> parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((String s) => s.isNotEmpty)
        .toList();
    if (parts.isEmpty) return '?';
    final String first = parts.first.substring(0, 1);
    final String last = parts.length > 1 ? parts.last.substring(0, 1) : '';
    return (first + last).toUpperCase();
  }

  @override
  bool operator ==(Object other) =>
      other is KmUser && other.name == name && other.email == email;

  @override
  int get hashCode => Object.hash(name, email);
}
