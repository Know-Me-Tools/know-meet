// TJ-ARCH-MOB-001 compliant
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../application/agents_repository.dart';
import '../../data/fixture_agents_repository.dart';
import '../../domain/registration_draft.dart';

part 'agents_providers.g.dart';

/// The agents registry adapter. Fixture data this phase (static screens);
/// tests and later phases override it.
@Riverpod(keepAlive: true)
AgentsRepository agentsRepository(Ref ref) => const FixtureAgentsRepository();

/// The registration in progress. Widgets render it and submit intent; the
/// option groups of steps 2 and 3 write through [RegistrationDraftController].
@Riverpod(keepAlive: true)
class RegistrationDraftController extends _$RegistrationDraftController {
  @override
  RegistrationDraft build() => const RegistrationDraft();

  void edit(RegistrationDraft Function(RegistrationDraft draft) change) =>
      state = change(state);
}
