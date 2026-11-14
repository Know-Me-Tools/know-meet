// TJ-ARCH-MOB-001 compliant
import '../domain/agent.dart';
import '../domain/dot.dart';

/// Port for the agents registry, dots and their history. The static-screen
/// phase uses the fixture adapter; a contracts-backed adapter replaces it
/// when the registry API exists.
abstract interface class AgentsRepository {
  /// Every agent, the system Concierge included.
  List<Agent> agents();

  Agent? agent(String id);

  /// Most recent first.
  List<AgentDispatchRecord> dispatches(String agentId);

  /// The managed LiveKit project URL meetings run on.
  String get managedProjectUrl;

  /// The signed-in person's dot.
  Dot myDot();

  /// Another participant's dot visible in shared meetings.
  Dot sharedDot();

  /// The signed-in person's dot memories, most recent first.
  List<DotMemory> memories();
}
