// Gate 16.1 window-state stager for the Tauri spike shell (macOS).
//
//   swiftc -O gates/scripts/window-stage.swift -o gates/bin/window-stage
//   gates/bin/window-stage --mode focused|unfocused|occluded|minimised --owner <process name>
//
// Puts the target app's window into a controlled state, re-asserts it every second and prints
// one JSON line per second with what CoreGraphics reports (no Accessibility needed to observe):
//   focused    the target app is frontmost (re-activated if it loses focus);
//   unfocused  this helper is frontmost with a small window that does not overlap the target; when
//              another app's window covers the target, the target is activated (raised) and focus
//              is handed straight back to this helper ("repair-raise" in the log);
//   occluded   this helper is frontmost with an opaque floating-level window covering the target
//              plus a margin (--style borderless: the whole screen), so other apps taking focus cannot
//              uncover it;
//   minimised  the target window is minimised through Accessibility (AXMinimized) when this
//              process is trusted; otherwise the target app is hidden (NSRunningApplication.hide)
//              and the log says so ("method":"hide-fallback").
import AppKit
import ApplicationServices

struct Args {
  var mode = ""
  var owner = ""
  /// occluded only: "titled" (default) covers the target plus 60 px; "borderless" covers the whole screen.
  var style = "titled"
}

func parseArgs() -> Args {
  var a = Args()
  var it = CommandLine.arguments.dropFirst().makeIterator()
  while let k = it.next() {
    let v = it.next() ?? ""
    if k == "--mode" { a.mode = v } else if k == "--owner" { a.owner = v } else if k == "--style" { a.style = v }
  }
  guard ["focused", "unfocused", "occluded", "minimised"].contains(a.mode), !a.owner.isEmpty else {
    FileHandle.standardError.write("usage: window-stage --mode focused|unfocused|occluded|minimised --owner <name>\n".data(using: .utf8)!)
    exit(2)
  }
  return a
}

struct Win {
  let owner: String
  let pid: pid_t
  let layer: Int
  let rect: CGRect
}

/// On-screen windows, front to back.
func onScreenWindows() -> [Win] {
  guard let raw = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else { return [] }
  return raw.compactMap { w in
    guard let b = w[kCGWindowBounds as String] as? [String: CGFloat] else { return nil }
    let rect = CGRect(x: b["X"] ?? 0, y: b["Y"] ?? 0, width: b["Width"] ?? 0, height: b["Height"] ?? 0)
    return Win(owner: w[kCGWindowOwnerName as String] as? String ?? "", pid: w[kCGWindowOwnerPID as String] as? pid_t ?? 0,
               layer: w[kCGWindowLayer as String] as? Int ?? 0, rect: rect)
  }
}

/// The target's largest normal-layer window, on screen or not.
func targetWindow(owner: String) -> Win? {
  guard let raw = CGWindowListCopyWindowInfo([.optionAll], kCGNullWindowID) as? [[String: Any]] else { return nil }
  let wins: [Win] = raw.compactMap { w in
    guard (w[kCGWindowOwnerName as String] as? String) == owner, (w[kCGWindowLayer as String] as? Int) == 0,
          let b = w[kCGWindowBounds as String] as? [String: CGFloat] else { return nil }
    let rect = CGRect(x: b["X"] ?? 0, y: b["Y"] ?? 0, width: b["Width"] ?? 0, height: b["Height"] ?? 0)
    return Win(owner: owner, pid: w[kCGWindowOwnerPID as String] as? pid_t ?? 0, layer: 0, rect: rect)
  }
  return wins.max { $0.rect.width * $0.rect.height < $1.rect.width * $1.rect.height }
}

/// Normal-layer windows of any app, plus this helper's own (floating) occluder.
func countsAsCover(_ w: Win) -> Bool {
  w.layer == 0 || w.pid == ProcessInfo.processInfo.processIdentifier
}

/// Owners of normal-layer windows above the target that intersect it.
func coveringOwners(of target: Win, in wins: [Win]) -> [String] {
  guard let idx = wins.firstIndex(where: { $0.owner == target.owner && $0.layer == 0 && $0.rect.width > 100 }) else { return [] }
  let r = wins[idx].rect
  return Array(Set(wins[..<idx].filter { countsAsCover($0) && $0.rect.intersects(r) && $0.rect.width > 20 }.map { $0.owner })).sorted()
}

/// Fraction of the target rect covered by normal-layer windows above it (40 x 24 sample grid).
func coverage(of target: Win, in wins: [Win]) -> Double? {
  guard let idx = wins.firstIndex(where: { $0.owner == target.owner && $0.layer == 0 && $0.rect.width > 100 }) else { return nil }
  let above = wins[..<idx].filter { countsAsCover($0) && $0.rect.width > 20 && $0.rect.height > 20 }
  let r = wins[idx].rect
  var covered = 0
  let nx = 40, ny = 24
  for i in 0..<nx {
    for j in 0..<ny {
      let p = CGPoint(x: r.minX + (CGFloat(i) + 0.5) * r.width / CGFloat(nx), y: r.minY + (CGFloat(j) + 0.5) * r.height / CGFloat(ny))
      if above.contains(where: { $0.rect.contains(p) }) { covered += 1 }
    }
  }
  return Double(covered) / Double(nx * ny)
}

/// CG (top-left origin) rect to AppKit (bottom-left origin) screen coordinates.
func appKitRect(_ r: CGRect) -> NSRect {
  let h = NSScreen.screens.first?.frame.height ?? 0
  return NSRect(x: r.minX, y: h - r.maxY, width: r.width, height: r.height)
}

final class Stager: NSObject {
  let args: Args
  var helperWindow: NSWindow?
  var minimiseMethod = "none"
  var actions: [String] = []

  init(args: Args) { self.args = args }

  func makeWindow(frame: NSRect, title: String, borderless: Bool = false) -> NSWindow {
    let w = NSWindow(contentRect: frame, styleMask: borderless ? [.borderless] : [.titled], backing: .buffered, defer: false)
    w.title = title
    w.isOpaque = true
    w.backgroundColor = NSColor(calibratedWhite: 0.85, alpha: 1)
    w.isReleasedWhenClosed = false
    w.makeKeyAndOrderFront(nil)
    return w
  }

  func stage(target: Win) {
    switch args.mode {
    case "occluded":
      if helperWindow == nil {
        let borderless = args.style == "borderless"
        let frame = borderless ? (NSScreen.screens.first?.frame ?? .zero) : appKitRect(target.rect.insetBy(dx: -60, dy: -60))
        let w = makeWindow(frame: frame, title: "gate 16.1 occluder", borderless: borderless)
        w.level = .floating
        helperWindow = w
      }
      activateSelf()
    case "unfocused":
      if helperWindow == nil {
        let screen = NSScreen.screens.first?.frame ?? .zero
        let size = CGSize(width: 240, height: 120)
        // Bottom-left or bottom-right corner, whichever is outside the target rect.
        let candidates = [CGRect(x: 8, y: screen.height - size.height - 80, width: size.width, height: size.height),
                          CGRect(x: screen.width - size.width - 8, y: screen.height - size.height - 80, width: size.width, height: size.height)]
        let spot = candidates.first { !$0.intersects(target.rect) } ?? candidates[0]
        helperWindow = makeWindow(frame: appKitRect(spot), title: "gate 16.1 focus holder")
      }
      if let c = coverage(of: target, in: onScreenWindows()), c > 0 {
        let ok = NSRunningApplication(processIdentifier: target.pid)?.activate(options: []) ?? false
        actions.append("repair-raise:\(ok)")
        RunLoop.main.run(until: Date(timeIntervalSinceNow: 0.15))
        NSApp.activate(ignoringOtherApps: true)
        helperWindow?.makeKeyAndOrderFront(nil)
      }
      activateSelf()
    case "focused":
      if NSWorkspace.shared.frontmostApplication?.processIdentifier != target.pid {
        let ok = NSRunningApplication(processIdentifier: target.pid)?.activate(options: []) ?? false
        actions.append("activate-target:\(ok)")
      }
    default:
      minimise(target: target)
    }
  }

  func activateSelf() {
    if NSWorkspace.shared.frontmostApplication?.processIdentifier != ProcessInfo.processInfo.processIdentifier {
      NSApp.activate(ignoringOtherApps: true)
      helperWindow?.makeKeyAndOrderFront(nil)
      actions.append("activate-helper")
    }
  }

  func minimise(target: Win) {
    if AXIsProcessTrusted() {
      let app = AXUIElementCreateApplication(target.pid)
      var value: CFTypeRef?
      if AXUIElementCopyAttributeValue(app, kAXWindowsAttribute as CFString, &value) == .success, let wins = value as? [AXUIElement] {
        for w in wins {
          var minimized: CFTypeRef?
          AXUIElementCopyAttributeValue(w, kAXMinimizedAttribute as CFString, &minimized)
          if (minimized as? Bool) != true {
            AXUIElementSetAttributeValue(w, kAXMinimizedAttribute as CFString, kCFBooleanTrue)
            actions.append("ax-minimise")
          }
        }
        minimiseMethod = "ax-minimised"
        return
      }
    }
    minimiseMethod = "hide-fallback"
    if let app = NSRunningApplication(processIdentifier: target.pid), !app.isHidden {
      actions.append("hide:\(app.hide())")
    }
  }

  @objc func tick() {
    guard let target = targetWindow(owner: args.owner) else {
      emit(["event": "waiting-for-target"])
      return
    }
    stage(target: target)
    let wins = onScreenWindows()
    let front = NSWorkspace.shared.frontmostApplication
    let targetApp = NSRunningApplication(processIdentifier: target.pid)
    var rec: [String: Any] = [
      "mode": args.mode,
      "frontmost": front?.localizedName ?? "?",
      "frontmostIsTarget": front?.processIdentifier == target.pid,
      "targetOnScreen": wins.contains { $0.owner == args.owner && $0.layer == 0 },
      "targetHidden": targetApp?.isHidden ?? false,
      "targetRect": [target.rect.minX, target.rect.minY, target.rect.width, target.rect.height],
      "axTrusted": AXIsProcessTrusted(),
      "actions": actions,
    ]
    if let c = coverage(of: target, in: wins) { rec["coverage"] = (c * 1000).rounded() / 1000 }
    rec["coveredBy"] = coveringOwners(of: target, in: wins)
    if args.mode == "minimised" { rec["method"] = minimiseMethod }
    if args.mode == "occluded" { rec["style"] = args.style }
    actions = []
    emit(rec)
  }

  func emit(_ rec: [String: Any]) {
    var r = rec
    r["t"] = Int(Date().timeIntervalSince1970 * 1000)
    if let data = try? JSONSerialization.data(withJSONObject: r, options: [.sortedKeys]), let s = String(data: data, encoding: .utf8) {
      print(s)
      fflush(stdout)
    }
  }
}

let args = parseArgs()
let app = NSApplication.shared
app.setActivationPolicy(args.mode == "unfocused" || args.mode == "occluded" ? .regular : .accessory)
let stager = Stager(args: args)
signal(SIGTERM) { _ in exit(0) }
let timer = Timer(timeInterval: 1.0, target: stager, selector: #selector(Stager.tick), userInfo: nil, repeats: true)
RunLoop.main.add(timer, forMode: .common)
app.run()
