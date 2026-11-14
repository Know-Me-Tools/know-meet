// TJ-ARCH-MOB-001 compliant

/// Date and time copy in the prototype's en-US format (km.js `fmt`),
/// without a locale package.
abstract final class InviteFormat {
  static const List<String> _weekdays = <String>[
    'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
  ];
  static const List<String> _months = <String>[
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  /// `10:00 AM`
  static String time(DateTime t) {
    final int h = t.hour % 12 == 0 ? 12 : t.hour % 12;
    final String m = t.minute.toString().padLeft(2, '0');
    return '$h:$m ${t.hour < 12 ? 'AM' : 'PM'}';
  }

  /// `Wed, Nov 11`
  static String day(DateTime t) =>
      '${_weekdays[t.weekday - 1]}, ${_months[t.month - 1]} ${t.day}';

  /// `Today`, `Tomorrow` or the weekday and date.
  static String relDay(DateTime t, DateTime now) {
    final DateTime a = DateTime.utc(now.year, now.month, now.day);
    final DateTime b = DateTime.utc(t.year, t.month, t.day);
    final int days = b.difference(a).inDays;
    if (days == 0) return 'Today';
    if (days == 1) return 'Tomorrow';
    return day(t);
  }

  /// `30 min`, `1 hr`, `1 hr 30 min`
  static String minutes(int total) {
    if (total < 60) return '$total min';
    final int h = total ~/ 60;
    final int m = total % 60;
    return m == 0 ? '$h hr' : '$h hr $m min';
  }
}
