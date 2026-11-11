// Gate 16.4: polls VoiceOver's `content of last phrase` and appends each change as one JSON line.
//   osascript -l JavaScript vo-poll.js <out.jsonl> <stop-file>
// Stops when <stop-file> exists. Only changes are logged; identical consecutive phrases collapse
// (a limitation: VoiceOver repeating the same phrase is not visible to this poller).
ObjC.import('Foundation');
function run(argv) {
  const out = argv[0], stop = argv[1];
  const vo = Application('VoiceOver');
  const fm = $.NSFileManager.defaultManager;
  if (!fm.fileExistsAtPath(out)) fm.createFileAtPathContentsAttributes(out, $(), $());
  const fh = $.NSFileHandle.fileHandleForWritingAtPath(out);
  fh.seekToEndOfFile;
  let last = null, polls = 0, errors = 0;
  const write = (o) => { fh.writeData($(JSON.stringify(o) + '\n').dataUsingEncoding($.NSUTF8StringEncoding)); };
  write({ t: Date.now(), kind: 'start' });
  while (!fm.fileExistsAtPath(stop)) {
    let p;
    try { p = vo.lastPhrase.content(); } catch (e) { errors += 1; p = 'ERROR: ' + e.message; }
    polls += 1;
    if (p !== last) { write({ t: Date.now(), phrase: p }); last = p; }
    delay(0.08);
  }
  write({ t: Date.now(), kind: 'stop', polls: polls, errors: errors });
  fh.closeFile;
}
