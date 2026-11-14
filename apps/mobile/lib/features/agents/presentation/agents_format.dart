// TJ-ARCH-MOB-001 compliant
import '../domain/agent.dart';

const List<String> _days = <String>['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const List<String> _months = <String>[
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/// "Wed, Oct 14" (km.js `fmt.day`). Reads the wall-clock fields as written.
String formatDay(DateTime d) => '${_days[d.weekday % 7]}, ${_months[d.month - 1]} ${d.day}';

/// "4:46 PM" (km.js `fmt.time`).
String formatTime(DateTime d) {
  final int h = d.hour % 12 == 0 ? 12 : d.hour % 12;
  final String m = d.minute.toString().padLeft(2, '0');
  return '$h:$m ${d.hour < 12 ? 'AM' : 'PM'}';
}

/// "Wed, Oct 14 · 4:46 PM" (km.js `fmt.date`).
String formatDate(DateTime d) => '${formatDay(d)} · ${formatTime(d)}';

/// "Today" / "Tomorrow" / "Yesterday" / "Mon, Oct 12" (km.js `fmt.relDay`).
String formatRelDay(DateTime d, DateTime now) {
  final DateTime a = DateTime(now.year, now.month, now.day);
  final DateTime b = DateTime(d.year, d.month, d.day);
  final int diff = (b.difference(a).inHours / 24).round();
  if (diff == 0) return 'Today';
  if (diff == 1) return 'Tomorrow';
  if (diff == -1) return 'Yesterday';
  return formatDay(d);
}

/// "46 min" / "1 h 12 min" (km.js `fmt.mins`).
String formatMinutes(int min) {
  if (min < 60) return '$min min';
  final int rest = min % 60;
  return '${min ~/ 60} h${rest == 0 ? '' : ' $rest min'}';
}

/// The live meeting started ~18 minutes before [now], rounded down to five
/// minutes (km.js `buildData` `liveStart`).
DateTime liveMeetingStart(DateTime now) {
  const int fiveMin = 5 * 60 * 1000;
  final int ms = now.millisecondsSinceEpoch - 18 * 60 * 1000;
  return DateTime.fromMillisecondsSinceEpoch(ms - ms % fiveMin, isUtc: now.isUtc);
}

/// Registry row text for the latest dispatch (prototype `lastDispatchedText`).
String lastDispatchedText(List<AgentDispatchRecord> records, DateTime now) {
  if (records.isEmpty) return 'Not dispatched yet';
  final AgentDispatchRecord first = records.first;
  if (first.outcome == DispatchOutcome.live) return 'In a meeting now';
  final DateTime? date = first.date;
  return date == null ? 'Not dispatched yet' : 'Last dispatched ${formatRelDay(date, now)}';
}
