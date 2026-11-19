// TJ-ARCH-MOB-001 compliant

/**
 * A metronome for the recording's frames. A page timer in a background tab is slowed to
 * about once a second, which would turn a recording of a meeting into a slideshow the
 * moment the person switches tabs; a worker's timer is not slowed that way.
 */
interface TickScope {
  postMessage(message: "tick"): void;
  addEventListener(type: "message", listener: (event: MessageEvent<number | "stop">) => void): void;
}

const scope = self as unknown as TickScope;
let timer: ReturnType<typeof setInterval> | null = null;

scope.addEventListener("message", (event) => {
  if (timer !== null) clearInterval(timer);
  timer = null;
  if (event.data === "stop") return;
  timer = setInterval(() => scope.postMessage("tick"), event.data);
});
