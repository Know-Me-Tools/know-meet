// TJ-ARCH-MOB-001 compliant
import 'agent.dart';

/// The four registration steps (prototype `STEPS`).
const List<String> registrationSteps = <String>[
  'Identity',
  'Worker & dispatch',
  'Permissions & knowledge',
  'Test & finish',
];

/// An agent registration in progress. Secrets are never part of it: the
/// prototype keeps the API key and secret in memory only.
final class RegistrationDraft {
  const RegistrationDraft({
    this.name = '',
    this.role = '',
    this.description = '',
    this.glyph = '',
    this.project = AgentProject.managed,
    this.agentName = '',
    this.media = AgentMedia.speak,
    this.knowledge = AgentKnowledge.shared,
    this.dispatch = AgentDispatch.me,
    this.autoJoin = AgentAutoJoin.never,
    this.tag = '',
  });

  final String name;
  final String role;
  final String description;
  final String glyph;
  final AgentProject project;
  final String agentName;
  final AgentMedia media;
  final AgentKnowledge knowledge;
  final AgentDispatch dispatch;
  final AgentAutoJoin autoJoin;
  final String tag;

  RegistrationDraft copyWith({
    AgentProject? project,
    AgentMedia? media,
    AgentKnowledge? knowledge,
    AgentDispatch? dispatch,
    AgentAutoJoin? autoJoin,
  }) => RegistrationDraft(
    name: name,
    role: role,
    description: description,
    glyph: glyph,
    project: project ?? this.project,
    agentName: agentName,
    media: media ?? this.media,
    knowledge: knowledge ?? this.knowledge,
    dispatch: dispatch ?? this.dispatch,
    autoJoin: autoJoin ?? this.autoJoin,
    tag: tag,
  );
}

/// A required field a step still needs before the connection test can run.
final class DraftIssue {
  const DraftIssue({required this.step, required this.field, required this.message});

  /// 1-based step that holds the field.
  final int step;
  final String field;
  final String message;
}

final RegExp _glyph = RegExp(r'^[A-Za-z0-9]{2}$');
final RegExp _slug = RegExp(r'^[a-z0-9]+(?:-[a-z0-9]+)*$');

/// Blocking issues across steps 1-3 (prototype `stepErrors`, the checks a
/// static draft can fail; own-project credentials are entered per visit).
List<DraftIssue> draftIssues(RegistrationDraft d) {
  final List<DraftIssue> out = <DraftIssue>[];
  final String name = d.name.trim();
  final String glyph = d.glyph.trim();
  final String agentName = d.agentName.trim();
  if (name.isEmpty) {
    out.add(const DraftIssue(
      step: 1,
      field: 'Name',
      message: 'Give the agent a name people will see in the meeting.',
    ));
  }
  if (glyph.isEmpty) {
    out.add(const DraftIssue(
      step: 1,
      field: 'Glyph letters',
      message: 'Enter two letters or digits for the agent tile, e.g. “SC”.',
    ));
  } else if (!_glyph.hasMatch(glyph)) {
    out.add(const DraftIssue(
      step: 1,
      field: 'Glyph letters',
      message: 'Use exactly 2 letters or digits — no spaces or symbols.',
    ));
  }
  if (agentName.isEmpty) {
    out.add(const DraftIssue(
      step: 2,
      field: 'agent_name',
      message: 'Enter the agent_name your worker registers with.',
    ));
  } else if (!_slug.hasMatch(agentName)) {
    out.add(const DraftIssue(
      step: 2,
      field: 'agent_name',
      message: 'Use lowercase letters, numbers and single hyphens only, e.g. “scribe-notes”.',
    ));
  }
  if (d.autoJoin == AgentAutoJoin.tagged && d.tag.trim().isEmpty) {
    out.add(const DraftIssue(
      step: 3,
      field: 'Meeting tag',
      message: 'Enter the meeting tag that should bring this agent in, e.g. “workshop”.',
    ));
  }
  return out;
}
