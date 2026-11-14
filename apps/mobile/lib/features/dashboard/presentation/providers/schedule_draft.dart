// TJ-ARCH-MOB-001 compliant
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'schedule_draft.g.dart';

/// The "Schedule a meeting" form's options (prototype defaults: record,
/// transcription, summary and dial-in on; waiting room off; Scribe and the
/// user's dot Iris picked).
final class ScheduleDraft {
  const ScheduleDraft({
    this.title = '',
    this.record = true,
    this.transcribe = true,
    this.sendSummary = true,
    this.dialIn = true,
    this.waitingRoom = false,
    this.agentIds = const <String>{'scribe'},
    this.bringIris = true,
  });

  final String title;
  final bool record;
  final bool transcribe;
  final bool sendSummary;
  final bool dialIn;
  final bool waitingRoom;
  final Set<String> agentIds;
  final bool bringIris;

  ScheduleDraft copyWith({
    String? title,
    bool? record,
    bool? transcribe,
    bool? sendSummary,
    bool? dialIn,
    bool? waitingRoom,
    Set<String>? agentIds,
    bool? bringIris,
  }) => ScheduleDraft(
    title: title ?? this.title,
    record: record ?? this.record,
    transcribe: transcribe ?? this.transcribe,
    sendSummary: sendSummary ?? this.sendSummary,
    dialIn: dialIn ?? this.dialIn,
    waitingRoom: waitingRoom ?? this.waitingRoom,
    agentIds: agentIds ?? this.agentIds,
    bringIris: bringIris ?? this.bringIris,
  );
}

/// Draft state of the schedule form. Widgets render it and call these
/// intents; nothing is submitted in the static-screen phase.
@riverpod
class ScheduleDraftController extends _$ScheduleDraftController {
  @override
  ScheduleDraft build() => const ScheduleDraft();

  void setTitle(String v) => state = state.copyWith(title: v);

  void setRecord(bool v) => state = state.copyWith(record: v);

  void setTranscribe(bool v) => state = state.copyWith(transcribe: v);

  void setSendSummary(bool v) => state = state.copyWith(sendSummary: v);

  void setDialIn(bool v) => state = state.copyWith(dialIn: v);

  void setWaitingRoom(bool v) => state = state.copyWith(waitingRoom: v);

  void setBringIris(bool v) => state = state.copyWith(bringIris: v);

  void toggleAgent(String id, bool on) => state = state.copyWith(
    agentIds: on
        ? <String>{...state.agentIds, id}
        : state.agentIds.where((String a) => a != id).toSet(),
  );
}
