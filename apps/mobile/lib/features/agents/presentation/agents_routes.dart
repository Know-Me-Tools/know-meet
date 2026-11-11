// TJ-ARCH-MOB-001 compliant
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import 'screens/agent_detail_screen.dart';
import 'screens/agents_registry_screen.dart';
import 'screens/concierge_screen.dart';
import 'screens/dot_screen.dart';
import 'screens/dots_screen.dart';
import 'screens/register_error_screen.dart';
import 'screens/register_wizard_screen.dart';
import 'widgets/agents_gate.dart';

AgentStatusFilter _status(GoRouterState state) {
  final String? q = state.uri.queryParameters['status'];
  return AgentStatusFilter.values.firstWhere(
    (AgentStatusFilter f) => f.name == q,
    orElse: () => AgentStatusFilter.all,
  );
}

Widget _registry(BuildContext context, GoRouterState state) => AgentsGated(
  title: 'Agents',
  builder: (BuildContext context) => AgentsRegistryScreen(status: _status(state)),
);

/// The agents routes (inside the app frame). Every route except the public
/// Concierge page renders the sign-in gate when nobody is signed in, under
/// the page title the prototype's `gated(title)` uses for that view.
List<RouteBase> get agentsRoutes => <RouteBase>[
  GoRoute(path: '/agents', builder: _registry),
  GoRoute(path: '/agents/registry', builder: _registry),
  GoRoute(
    path: '/agents/register/:step',
    builder: (BuildContext context, GoRouterState state) => AgentsGated(
      title: 'Register an agent',
      builder: (BuildContext context) => RegisterWizardScreen(
        step: int.tryParse(state.pathParameters['step'] ?? '') ?? 1,
      ),
    ),
  ),
  GoRoute(
    path: '/agents/register-error',
    builder: (BuildContext context, GoRouterState state) => AgentsGated(
      title: 'Connection test failed',
      builder: (BuildContext context) => const RegisterErrorScreen(),
    ),
  ),
  GoRoute(
    path: '/agents/detail/:id',
    builder: (BuildContext context, GoRouterState state) => AgentsGated(
      title: 'Agent details',
      builder: (BuildContext context) => AgentDetailScreen(
        agentId: state.pathParameters['id'] ?? '',
        tab: AgentDetailTab.parse(state.uri.queryParameters['tab']),
      ),
    ),
  ),
  GoRoute(
    path: '/agents/concierge',
    builder: (BuildContext context, GoRouterState state) => const ConciergeScreen(),
  ),
  GoRoute(
    path: '/agents/dots',
    builder: (BuildContext context, GoRouterState state) => AgentsGated(
      title: 'Your dots',
      builder: (BuildContext context) => const DotsScreen(),
    ),
  ),
  GoRoute(
    path: '/agents/dot/:id',
    builder: (BuildContext context, GoRouterState state) {
      final String id = state.pathParameters['id'] ?? '';
      return AgentsGated(
        title: id == 'iris' ? 'Iris' : 'Dot settings',
        builder: (BuildContext context) => DotScreen(dotId: id),
      );
    },
  ),
];
