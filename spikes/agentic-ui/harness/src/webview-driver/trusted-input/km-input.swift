// Trusted (OS-level) input for the Tauri spike shell on macOS (gate 16.4).
// WKWebView has no WebDriver, so key presses and pointer clicks are synthesised as
// CoreGraphics events, which WebKit sees as isTrusted == true. Needs the Accessibility
// permission for the calling process (AXIsProcessTrusted).
//
//   swiftc -O km-input.swift -o <out>/km-input
//   km-input trusted                       -> {"trusted":true}
//   km-input window <pid>                  -> {"x":..,"y":..,"w":..,"h":..} (largest layer-0 window, global points)
//   km-input front <pid>                   -> activates the app, prints the frontmost pid afterwards
//   km-input frontmost                     -> {"pid":..}
//   km-input key <keycode> [mods]          mods: comma list of cmd,shift,opt,ctrl
//   km-input type <text>                   types each character as a unicode key event
//   km-input click <x> <y>                 left click at a global point (points)
// Key/type/click events go to the HID tap, i.e. the frontmost key window; the runner
// activates the target app and checks the frontmost pid before each action.
import AppKit
import ApplicationServices

func out(_ s: String) { FileHandle.standardOutput.write((s + "\n").data(using: .utf8)!) }
func fail(_ s: String) -> Never { FileHandle.standardError.write((s + "\n").data(using: .utf8)!); exit(2) }

/// Modifier name -> (flag, virtual key code of the left-hand modifier key).
let modifierKeys: [String: (CGEventFlags, CGKeyCode)] = [
  "cmd": (.maskCommand, 55), "shift": (.maskShift, 56), "opt": (.maskAlternate, 58), "ctrl": (.maskControl, 59),
]

func modifiers(_ spec: String) -> [(CGEventFlags, CGKeyCode)] {
  spec.split(separator: ",").map { m in
    guard let k = modifierKeys[String(m)] else { fail("unknown modifier \(m)") }
    return k
  }
}

let source = CGEventSource(stateID: .hidSystemState)
let pause: useconds_t = 25_000

func post(_ code: CGKeyCode, down: Bool, flags f: CGEventFlags) {
  guard let e = CGEvent(keyboardEventSource: source, virtualKey: code, keyDown: down) else { fail("no key event") }
  e.flags = f
  e.post(tap: .cghidEventTap)
  usleep(pause)
}

/// Presses real modifier keys around the key so the HID modifier state is released afterwards.
func key(_ code: CGKeyCode, _ mods: [(CGEventFlags, CGKeyCode)]) {
  var f: CGEventFlags = []
  for (flag, modCode) in mods {
    f.insert(flag)
    post(modCode, down: true, flags: f)
  }
  post(code, down: true, flags: f)
  post(code, down: false, flags: f)
  for (flag, modCode) in mods.reversed() {
    f.remove(flag)
    post(modCode, down: false, flags: f)
  }
}

func typeText(_ text: String) {
  for scalar in text.utf16 {
    var c = scalar
    guard let down = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: true),
          let up = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: false) else { fail("no key event") }
    down.keyboardSetUnicodeString(stringLength: 1, unicodeString: &c)
    up.keyboardSetUnicodeString(stringLength: 1, unicodeString: &c)
    // Explicit: otherwise the events inherit modifier state from the source (e.g. a preceding cmd+A).
    down.flags = []
    up.flags = []
    down.post(tap: .cghidEventTap)
    usleep(15_000)
    up.post(tap: .cghidEventTap)
    usleep(15_000)
  }
}

func click(_ p: CGPoint) {
  for type in [CGEventType.mouseMoved, .leftMouseDown, .leftMouseUp] {
    guard let e = CGEvent(mouseEventSource: source, mouseType: type, mouseCursorPosition: p, mouseButton: .left) else { fail("no mouse event") }
    e.post(tap: .cghidEventTap)
    usleep(type == .mouseMoved ? 40_000 : 30_000)
  }
}

func window(of pid: pid_t) -> CGRect? {
  guard let raw = CGWindowListCopyWindowInfo([.optionAll], kCGNullWindowID) as? [[String: Any]] else { return nil }
  var best: CGRect? = nil
  for w in raw where (w[kCGWindowOwnerPID as String] as? pid_t) == pid && (w[kCGWindowLayer as String] as? Int) == 0 {
    guard let b = w[kCGWindowBounds as String] as? [String: CGFloat] else { continue }
    let r = CGRect(x: b["X"] ?? 0, y: b["Y"] ?? 0, width: b["Width"] ?? 0, height: b["Height"] ?? 0)
    if best == nil || r.width * r.height > best!.width * best!.height { best = r }
  }
  return best
}

func frontmostPid() -> pid_t { NSWorkspace.shared.frontmostApplication?.processIdentifier ?? 0 }

let args = Array(CommandLine.arguments.dropFirst())
guard let cmd = args.first else { fail("usage: km-input trusted|window|front|frontmost|key|type|click ...") }
switch cmd {
case "trusted":
  out("{\"trusted\":\(AXIsProcessTrusted())}")
case "window":
  guard args.count == 2, let pid = pid_t(args[1]), let r = window(of: pid) else { fail("window <pid>: not found") }
  out("{\"x\":\(r.origin.x),\"y\":\(r.origin.y),\"w\":\(r.width),\"h\":\(r.height)}")
case "front":
  guard args.count == 2, let pid = pid_t(args[1]), let app = NSRunningApplication(processIdentifier: pid) else { fail("front <pid>") }
  if frontmostPid() != pid { app.activate(options: [.activateAllWindows]) }
  for _ in 0..<40 where frontmostPid() != pid { usleep(25_000) }
  out("{\"pid\":\(frontmostPid())}")
case "frontmost":
  out("{\"pid\":\(frontmostPid())}")
case "key":
  guard args.count >= 2, let code = CGKeyCode(args[1]) else { fail("key <keycode> [mods]") }
  key(code, modifiers(args.count > 2 ? args[2] : ""))
case "type":
  guard args.count == 2 else { fail("type <text>") }
  typeText(args[1])
case "click":
  guard args.count == 3, let x = Double(args[1]), let y = Double(args[2]) else { fail("click <x> <y>") }
  click(CGPoint(x: x, y: y))
default:
  fail("unknown command \(cmd)")
}
