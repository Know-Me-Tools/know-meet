// TJ-ARCH-MOB-001 compliant
// Public surface of the meeting_room feature: the room layout with media
// stubbed (meet.room, meet.room-guest). Panels, #start and #ended are out of
// scope this phase (decision D-2).
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import 'presentation/screens/meeting_room_screen.dart';

export 'application/realtime_room_port.dart';
export 'domain/room_snapshot.dart';

/// Full-screen routes, outside the app frame.
List<RouteBase> get meetingRoomRoutes => <RouteBase>[
  GoRoute(
    path: '/meet',
    redirect: (BuildContext context, GoRouterState state) =>
        '/meet/room-guest',
  ),
  GoRoute(
    path: '/meet/room',
    builder: (BuildContext context, GoRouterState state) =>
        const MeetingRoomScreen(guest: false),
  ),
  GoRoute(
    path: '/meet/room-guest',
    builder: (BuildContext context, GoRouterState state) =>
        const MeetingRoomScreen(guest: true),
  ),
];
