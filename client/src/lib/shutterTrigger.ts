export const SHUTTER_TRIGGER_KEYS = ["Enter", "NumpadEnter", " ", "Spacebar", "F13"] as const;

export type ShutterTargetLike = {
  tagName?: string | null;
  isContentEditable?: boolean;
  closest?: (selector: string) => unknown;
};

export type ShutterKeyboardEventLike = {
  key: string;
  repeat?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  target?: EventTarget | ShutterTargetLike | null;
};

function asShutterTarget(target: EventTarget | ShutterTargetLike | null | undefined) {
  if (!target || typeof target !== "object") return null;
  return target as ShutterTargetLike;
}

function normalizeTagName(tagName?: string | null) {
  return String(tagName ?? "").toUpperCase();
}

export function isEditableTarget(target: EventTarget | ShutterTargetLike | null | undefined) {
  const normalizedTarget = asShutterTarget(target);
  if (!normalizedTarget) return false;
  const tagName = normalizeTagName(normalizedTarget.tagName);
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" || Boolean(normalizedTarget.isContentEditable);
}

export function isInteractiveControlTarget(target: EventTarget | ShutterTargetLike | null | undefined) {
  const normalizedTarget = asShutterTarget(target);
  if (!normalizedTarget) return false;
  const tagName = normalizeTagName(normalizedTarget.tagName);
  if (["BUTTON", "SUMMARY", "OPTION"].includes(tagName)) {
    return true;
  }
  if (tagName === "A" || tagName === "LABEL") {
    return true;
  }
  return Boolean(normalizedTarget.closest?.("[data-shutter-ignore='true'],button,a[href],label,[role='button'],[role='switch'],[role='tab'],[role='menuitem']"));
}

export function isShutterKeyboardEvent(event: ShutterKeyboardEventLike) {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
    return false;
  }
  return SHUTTER_TRIGGER_KEYS.includes(event.key as (typeof SHUTTER_TRIGGER_KEYS)[number]);
}

export function shouldHandleShutterKeydown(event: ShutterKeyboardEventLike) {
  if (!isShutterKeyboardEvent(event)) {
    return false;
  }
  if (isEditableTarget(event.target)) {
    return false;
  }
  if (isInteractiveControlTarget(event.target)) {
    return false;
  }
  return true;
}

export function handleGlobalShutterKeydown(
  event: ShutterKeyboardEventLike & { preventDefault?: () => void },
  onTrigger: () => void,
) {
  if (!shouldHandleShutterKeydown(event)) {
    return false;
  }
  event.preventDefault?.();
  onTrigger();
  return true;
}
