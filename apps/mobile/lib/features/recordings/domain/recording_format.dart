// TJ-ARCH-MOB-001 compliant

/// Formatters with the prototype's exact output (km.js `fmt`).
abstract final class RecordingFormat {
  static const List<String> _days = <String>['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  static const List<String> _months = <String>[
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  static String _pad(int n) => n.toString().padLeft(2, '0');

  /// `mm:ss`, or `h:mm:ss` from one hour.
  static String duration(int seconds) {
    final int s = seconds < 0 ? 0 : seconds;
    final int m = s ~/ 60;
    final int h = m ~/ 60;
    return h > 0 ? '$h:${_pad(m % 60)}:${_pad(s % 60)}' : '${_pad(m)}:${_pad(s % 60)}';
  }

  /// "46 min" / "1 h 12 min".
  static String minutes(int min) {
    if (min < 60) return '$min min';
    final int rest = min % 60;
    return '${min ~/ 60} h${rest > 0 ? ' $rest min' : ''}';
  }

  /// "4:00 PM".
  static String time(DateTime d) {
    final int h = d.hour % 12 == 0 ? 12 : d.hour % 12;
    return '$h:${_pad(d.minute)} ${d.hour < 12 ? 'AM' : 'PM'}';
  }

  /// "Wed, Oct 14".
  static String day(DateTime d) =>
      '${_days[d.weekday - 1]}, ${_months[d.month - 1]} ${d.day}';

  /// "Wed, Oct 14 · 4:00 PM".
  static String date(DateTime d) => '${day(d)} · ${time(d)}';

  /// "412 MB", "50.0 GB".
  static String bytes(int n) {
    if (n < 1024) return '$n B';
    const List<String> units = <String>['KB', 'MB', 'GB', 'TB'];
    double v = n.toDouble();
    int i = -1;
    do {
      v /= 1024;
      i++;
    } while (v >= 1024 && i < units.length - 1);
    final String num = v >= 100 || i == 0 ? v.round().toString() : v.toStringAsFixed(1);
    return '$num ${units[i]}';
  }

  /// "6,910".
  static String number(int n) => n.toString().replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (Match m) => ',',
  );

  /// Up to two initials ("Jordan Reyes" -> "JR").
  static String initials(String name) {
    final List<String> parts =
        name.trim().split(RegExp(r'\s+')).where((String s) => s.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    final String first = parts.first.substring(0, 1);
    final String last = parts.length > 1 ? parts.last.substring(0, 1) : '';
    return (first + last).toUpperCase();
  }
}
