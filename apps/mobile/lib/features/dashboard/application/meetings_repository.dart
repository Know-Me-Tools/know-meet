// TJ-ARCH-MOB-001 compliant
import '../domain/invite_delivery.dart';
import '../domain/meeting.dart';

/// Port for the dashboard's meeting data. The static-screen phase backs it
/// with the prototype's sample data (data/fixture_meetings_repository.dart);
/// the BFF adapter replaces it when meetings become real.
abstract interface class MeetingsRepository {
  /// Display name of the account owner (decides "Hosting" vs "Invited").
  String get ownerName;

  /// Every meeting, sorted by start, placed relative to [now].
  List<Meeting> meetings(DateTime now);

  /// Every invite sent for [meetings].
  List<InviteDelivery> deliveries(DateTime now);

  /// Calendar accounts.
  List<CalendarConnection> calendars();

  /// Public dial-in numbers.
  List<DialInNumber> dialInNumbers();

  AgentSummary? agent(String id);

  DotSummary? dot(String id);

  /// The selectable registered agents (Concierge excluded).
  List<AgentSummary> dispatchableAgents();

  /// When the calendars last synced.
  DateTime lastSynced(DateTime now);
}
