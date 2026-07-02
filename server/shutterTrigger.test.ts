import { describe, expect, it, vi } from "vitest";
import { SHUTTER_TRIGGER_KEYS, handleGlobalShutterKeydown, shouldHandleShutterKeydown } from "../client/src/lib/shutterTrigger";

describe("shutterTrigger helpers", () => {
  it("keeps Space and the other configured giant-button fallback keys enabled", () => {
    expect(SHUTTER_TRIGGER_KEYS).toEqual(["Enter", "NumpadEnter", " ", "Spacebar", "F13"]);
  });

  it("fires the shutter callback and prevents default on a Space keydown from the camera area", () => {
    const onTrigger = vi.fn();
    const preventDefault = vi.fn();

    const handled = handleGlobalShutterKeydown(
      {
        key: " ",
        target: { tagName: "div" },
        preventDefault,
      },
      onTrigger,
    );

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it("does not fire the shutter when an input field is focused", () => {
    const onTrigger = vi.fn();
    const preventDefault = vi.fn();

    const handled = handleGlobalShutterKeydown(
      {
        key: " ",
        target: { tagName: "input" },
        preventDefault,
      },
      onTrigger,
    );

    expect(handled).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("does not fire the shutter when Space is pressed on an interactive control", () => {
    expect(
      shouldHandleShutterKeydown({
        key: " ",
        target: {
          tagName: "button",
          closest: () => true,
        },
      }),
    ).toBe(false);
  });

  it("ignores repeated or modified key presses", () => {
    expect(shouldHandleShutterKeydown({ key: " ", repeat: true, target: { tagName: "div" } })).toBe(false);
    expect(shouldHandleShutterKeydown({ key: " ", ctrlKey: true, target: { tagName: "div" } })).toBe(false);
    expect(shouldHandleShutterKeydown({ key: "Escape", target: { tagName: "div" } })).toBe(false);
  });
});
