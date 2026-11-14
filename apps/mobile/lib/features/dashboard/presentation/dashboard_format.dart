// TJ-ARCH-MOB-001 compliant

/// The prototype's formatters (km.js `fmt`), in UTC: the baselines are
/// captured in UTC and the page says "Times shown in UTC".
abstract final class DashFormat {
  static const List<String> _days = <String>['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  static const List<String> _months = <String>[
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  /// "4:30 PM"
  static String time(DateTime d) {
    final DateTime u = d.toUtc();
    final int h12 = u.hour % 12 == 0 ? 12 : u.hour % 12;
    final String mm = u.minute.toString().padLeft(2, '0');
    return '$h12:$mm ${u.hour < 12 ? 'AM' : 'PM'}';
  }

  /// "Tue, Nov 10"
  static String day(DateTime d) {
    final DateTime u = d.toUtc();
    return '${_days[u.weekday - 1]}, ${_months[u.month - 1]} ${u.day}';
  }

  /// "Tue, Nov 10 · 2:40 PM"
  static String date(DateTime d) => '${day(d)} · ${time(d)}';

  /// "Today" / "Tomorrow" / "Yesterday" / "Fri, Nov 13"
  static String relDay(DateTime d, DateTime now) {
    final DateTime a = _midnight(now);
    final DateTime b = _midnight(d);
    final int diff = (b.difference(a).inHours / 24).round();
    if (diff == 0) return 'Today';
    if (diff == 1) return 'Tomorrow';
    if (diff == -1) return 'Yesterday';
    return day(d);
  }

  /// "45 min" / "1 h" / "1 h 12 min"
  static String mins(int min) {
    if (min < 60) return '$min min';
    final int rest = min % 60;
    return '${min ~/ 60} h${rest == 0 ? '' : ' $rest min'}';
  }

  /// "1.2 MB" / "82 KB"
  static String bytes(int n) {
    if (n < 1024) return '$n B';
    const List<String> units = <String>['KB', 'MB', 'GB', 'TB'];
    double v = n.toDouble();
    int i = -1;
    do {
      v /= 1024;
      i++;
    } while (v >= 1024 && i < units.length - 1);
    final String text = (v >= 100 || i == 0) ? v.round().toString() : v.toStringAsFixed(1);
    return '$text ${units[i]}';
  }

  /// Initials as km.js derives them.
  static String initials(String name) {
    final List<String> parts =
        name.trim().split(RegExp(r'\s+')).where((String s) => s.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    final String last = parts.length > 1 ? parts.last.substring(0, 1) : '';
    return (parts.first.substring(0, 1) + last).toUpperCase();
  }

  /// The join link the prototype builds (`join.html#invite?code=`); the app
  /// route equivalent.
  static String joinLink(String code) => 'https://meet.know-me.tools/join/invite?code=$code';

  static DateTime _midnight(DateTime d) {
    final DateTime u = d.toUtc();
    return DateTime.utc(u.year, u.month, u.day);
  }
}
