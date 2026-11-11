// TJ-ARCH-MOB-001 compliant

/// SMS length and segment count (prototype settings.html `smsStats`): GSM-7
/// text fits 160 characters in one segment and 153 per segment when split;
/// anything else uses 70 / 67.
final class SmsStats {
  const SmsStats._(this.length, this.segments, this.limit, this.gsm);

  factory SmsStats.of(String text) {
    final bool gsm = RegExp(r'^[\x20-\x7E\n]*$').hasMatch(text);
    final int single = gsm ? 160 : 70;
    final int multi = gsm ? 153 : 67;
    final int segments = text.length <= single ? 1 : (text.length / multi).ceil();
    final int limit = segments == 1 ? single : multi * segments;
    return SmsStats._(text.length, segments, limit, gsm);
  }

  final int length;
  final int segments;
  final int limit;
  final bool gsm;

  String get segmentLabel => segments == 1 ? '1 segment' : '$segments segments';
}

/// Fills `{meeting}`, `{host}` and `{date}` placeholders.
String fillTemplate(String template, {required String meeting, required String host, required String date}) =>
    template
        .replaceAll('{meeting}', meeting)
        .replaceAll('{host}', host)
        .replaceAll('{date}', date);

const List<String> _days = <String>['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const List<String> _months = <String>[
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/// "Tue, Nov 10" (km.js `fmt.day`).
String formatDay(DateTime t) => '${_days[t.weekday - 1]}, ${_months[t.month - 1]} ${t.day}';

/// "4:30 PM" (km.js `fmt.time`).
String formatTime(DateTime t) {
  final int h = t.hour % 12 == 0 ? 12 : t.hour % 12;
  final String m = t.minute.toString().padLeft(2, '0');
  return '$h:$m ${t.hour < 12 ? 'AM' : 'PM'}';
}

/// "45 min" or "1 h" (km.js `fmt.mins`).
String formatMinutes(int minutes) {
  if (minutes < 60) return '$minutes min';
  final int h = minutes ~/ 60;
  final int m = minutes % 60;
  return m == 0 ? '$h h' : '$h h $m min';
}
