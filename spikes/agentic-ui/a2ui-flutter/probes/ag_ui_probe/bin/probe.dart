// c16 gate 16.7 throwaway probe (spike VLBV exception). Not product code.
//
// (SseParser is not exported by ag_ui 0.3.0, so the exported SseClient.parseStream is used.)
// Streams harness scenarios from the mock AG-UI server (:4317) two ways:
//   stock   - package:ag_ui 0.3.0 AgUiClient.runAgent, unmodified.
//   adapter - package:ag_ui SseParser + BaseEvent.fromJson for decoding, with
//             our own POST transport (Last-Event-ID retry, resume body) and the
//             raw JSON map kept beside the typed event (for RUN_FINISHED.outcome).
// Prints one JSON line per (mode, scenario) result.
import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:ag_ui/ag_ui.dart';
import 'package:http/http.dart' as http;

const base = 'http://127.0.0.1:4317';

Future<Map<String, dynamic>> scenarioFile(String id) async {
  final res = await http.get(Uri.parse('$base/scenarios/$id'));
  return (jsonDecode(res.body) as Map<String, dynamic>)['scenario']
      as Map<String, dynamic>;
}

Future<Map<String, dynamic>> sessionSummary(String session) async {
  final res = await http.get(Uri.parse('$base/sessions/$session'));
  return jsonDecode(res.body) as Map<String, dynamic>;
}

String sessionId(String mode, String scenario) =>
    'probe-$mode-${scenario.replaceAll('/', '_')}-${DateTime.now().microsecondsSinceEpoch}';

/// Minimal transcript fold: enough to compare text, tool and interrupt outcomes.
class Fold {
  final texts = <String, StringBuffer>{};
  final order = <String>[];
  final toolArgs = <String, StringBuffer>{};
  final toolResults = <String, String>{};
  final eventTypes = <String>[];
  final errors = <String>[];
  Map<String, dynamic>? outcome;
  String status = 'idle';

  void apply(BaseEvent e, Map<String, dynamic>? raw) {
    eventTypes.add(e.eventType.value);
    switch (e) {
      case RunStartedEvent():
        status = 'running';
      case TextMessageStartEvent(:final messageId):
        texts.putIfAbsent(messageId, StringBuffer.new);
        if (!order.contains(messageId)) order.add(messageId);
      case TextMessageContentEvent(:final messageId, :final delta):
        texts.putIfAbsent(messageId, StringBuffer.new).write(delta);
      case ToolCallStartEvent(:final toolCallId):
        toolArgs.putIfAbsent(toolCallId, StringBuffer.new);
      case ToolCallArgsEvent(:final toolCallId, :final delta):
        toolArgs.putIfAbsent(toolCallId, StringBuffer.new).write(delta);
      case ToolCallResultEvent(:final toolCallId, :final content):
        toolResults[toolCallId] = content;
      case RunFinishedEvent():
        final o = raw?['outcome'];
        outcome = o is Map<String, dynamic> ? o : null;
        status = outcome?['type'] == 'interrupt' ? 'interrupted' : 'finished';
      case RunErrorEvent():
        status = 'error';
      default:
        break;
    }
  }

  Map<String, dynamic> toJson() => {
        'status': status,
        'messages': {for (final id in order) id: texts[id].toString()},
        'toolArgs': {for (final e in toolArgs.entries) e.key: e.value.toString()},
        'toolResults': toolResults,
        'outcomeType': outcome?['type'],
        'interruptIds': [
          for (final i in (outcome?['interrupts'] as List? ?? const []))
            (i as Map)['id']
        ],
        'eventCount': eventTypes.length,
        'errors': errors,
      };
}

List<Message> userMessages(Map<String, dynamic> sc) => [
      UserMessage(id: 'user-1', content: sc['userPrompt'] as String),
    ];

// ---------------------------------------------------------------- stock mode

Future<Map<String, dynamic>> stockRun(String scenario) async {
  final sc = await scenarioFile(scenario);
  final session = sessionId('stock', scenario);
  final client = AgUiClient(
    config: AgUiClientConfig(baseUrl: base, requestTimeout: const Duration(seconds: 20)),
  );
  final fold = Fold();
  final sw = Stopwatch()..start();
  String? terminal;
  final done = Completer<void>();
  final sub = client
      .runAgent(
        '$base/agui/$scenario?session=$session',
        SimpleRunAgentInput(
          threadId: 'thread-probe',
          runId: 'run-probe-1',
          messages: userMessages(sc),
        ),
      )
      .listen(
        (e) => fold.apply(e, null),
        onError: (Object err) => fold.errors.add(err.runtimeType.toString() + ': ' + err.toString().split('\n').first),
        onDone: () => done.complete(),
        cancelOnError: false,
      );
  await done.future.timeout(const Duration(seconds: 60), onTimeout: () {
    terminal = 'timeout';
    sub.cancel();
  });
  sw.stop();
  await client.close();
  return {
    'mode': 'stock',
    'scenario': scenario,
    'ms': sw.elapsedMilliseconds,
    if (terminal != null) 'terminal': terminal,
    'fold': fold.toJson(),
    'server': await sessionSummary(session),
  };
}

// -------------------------------------------------------------- adapter mode

/// One HTTP attempt; returns the last SSE id seen and whether the run settled.
Future<({String? lastId, bool settled, String? error})> attempt(
  Uri url,
  Map<String, dynamic> body,
  String? lastEventId,
  Fold fold,
) async {
  final client = http.Client();
  String? lastId = lastEventId;
  var settled = false;
  try {
    final req = http.Request('POST', url)
      ..headers['Content-Type'] = 'application/json'
      ..headers['Accept'] = 'text/event-stream'
      ..body = jsonEncode(body);
    if (lastEventId != null) req.headers['Last-Event-ID'] = lastEventId;
    final res = await client.send(req);
    if (res.statusCode != 200) {
      return (lastId: lastId, settled: false, error: 'HTTP ${res.statusCode}');
    }
    await for (final msg in SseClient().parseStream(res.stream)) {
      if (msg.id != null) lastId = msg.id;
      final data = msg.data;
      if (data == null || data.isEmpty) continue;
      Map<String, dynamic> raw;
      try {
        raw = jsonDecode(data) as Map<String, dynamic>;
      } catch (_) {
        fold.errors.add('invalid-json');
        continue;
      }
      try {
        final event = BaseEvent.fromJson(raw);
        fold.apply(event, raw);
        if (event is RunFinishedEvent || event is RunErrorEvent) settled = true;
      } catch (err) {
        fold.errors.add('decode:${raw['type']}');
      }
    }
    return (lastId: lastId, settled: settled, error: null);
  } catch (err) {
    return (lastId: lastId, settled: settled, error: err.runtimeType.toString());
  } finally {
    client.close();
  }
}

/// Runs one AG-UI run with up to 3 Last-Event-ID reconnects.
Future<int> adapterRun(Uri url, Map<String, dynamic> body, Fold fold, List<String> log) async {
  String? lastId;
  var requests = 0;
  for (var i = 0; i <= 3; i++) {
    requests++;
    final r = await attempt(url, body, lastId, fold);
    log.add('attempt ${i + 1}: lastId=${r.lastId} settled=${r.settled} error=${r.error}');
    if (r.settled) break;
    lastId = r.lastId;
  }
  return requests;
}

Future<Map<String, dynamic>> adapterScenario(String scenario) async {
  final sc = await scenarioFile(scenario);
  final session = sessionId('adapter', scenario);
  final url = Uri.parse('$base/agui/$scenario?session=$session');
  final fold = Fold();
  final log = <String>[];
  final messages = [for (final m in userMessages(sc)) m.toJson()];
  Map<String, dynamic> body(String runId, [List<Map<String, dynamic>>? resume]) => {
        'threadId': 'thread-probe',
        'runId': runId,
        'messages': messages,
        'tools': const [],
        'context': const [],
        'state': const <String, dynamic>{},
        'forwardedProps': const <String, dynamic>{},
        if (resume != null) 'resume': resume,
      };
  final sw = Stopwatch()..start();
  var requests = await adapterRun(url, body('run-probe-1'), fold, log);
  // HITL: approve every pending interrupt (what the keyboard approve would do).
  if (fold.status == 'interrupted') {
    final resume = [
      for (final i in (fold.outcome?['interrupts'] as List))
        {'interruptId': (i as Map)['id'], 'status': 'resolved', 'payload': {'approved': true}},
    ];
    log.add('resume: ${jsonEncode(resume)}');
    requests += await adapterRun(url, body('run-probe-2', resume), fold, log);
  }
  sw.stop();
  return {
    'mode': 'adapter',
    'scenario': scenario,
    'ms': sw.elapsedMilliseconds,
    'requests': requests,
    'log': log,
    'fold': fold.toJson(),
    'expected': sc['expected'],
    'server': await sessionSummary(session),
  };
}

Future<void> main(List<String> args) async {
  const core = ['long-markdown', 'hitl-approve', 'disconnect-reconnect-replay'];
  const extra = ['malformed-out-of-order', 'reasoning-subagents-snapshot'];
  final out = <Map<String, dynamic>>[];
  for (final s in [...core, ...extra]) {
    out.add(await stockRun(s));
  }
  for (final s in core) {
    out.add(await adapterScenario(s));
  }
  for (final r in out) {
    stdout.writeln(jsonEncode(r));
  }
  exit(0);
}
