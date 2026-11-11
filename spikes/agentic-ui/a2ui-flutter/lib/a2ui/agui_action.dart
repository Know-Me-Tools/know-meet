import 'package:a2ui_core/a2ui_core.dart';

/// The A2UI action as the harness logs it (`LoggedA2uiAction`): timestamp,
/// catalogId and metadata dropped so actions compare deterministically.
Map<String, Object?> actionCore(A2uiRendererAction action) => {
  'name': action.name,
  'surfaceId': action.surfaceId,
  'sourceComponentId': action.sourceComponentId,
  'context': action.context,
};

/// AG-UI `forwardedProps` for a new run that returns [action] to the agent,
/// in the shape `@assistant-ui/react-ag-ui@0.1.2` sends (contract.md, section 1).
Map<String, Object?> toAgUiForwardedProps(A2uiRendererAction action) => {
  'a2uiAction': {'userAction': action.toJson()},
};
