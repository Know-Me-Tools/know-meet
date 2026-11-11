// JXA: front-to-back list of on-screen-layer-0 windows plus the target process's windows (including
// off-screen/minimised ones). CoreGraphics window info needs no Accessibility permission.
//   osascript -l JavaScript window-probe.js <owner-name>
ObjC.import("CoreGraphics");
ObjC.import("Foundation");
function run(argv) {
  const target = argv[0] || "";
  const opts = $.kCGWindowListOptionAll;
  const list = ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo(opts, $.kCGNullWindowID)));
  const out = [];
  for (const w of list) {
    const owner = w.kCGWindowOwnerName || "";
    const layer = w.kCGWindowLayer;
    const onscreen = w.kCGWindowIsOnscreen === 1 || w.kCGWindowIsOnscreen === true;
    const b = w.kCGWindowBounds || {};
    if (owner !== target && (!onscreen || layer !== 0)) continue;
    if ((b.Width || 0) < 50 || (b.Height || 0) < 50) continue;
    out.push({ owner, pid: w.kCGWindowOwnerPID, id: w.kCGWindowNumber, layer, onscreen, alpha: w.kCGWindowAlpha, x: b.X, y: b.Y, w: b.Width, h: b.Height });
  }
  return JSON.stringify(out);
}
