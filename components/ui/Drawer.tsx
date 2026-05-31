"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Edge the panel is anchored to. Default "right". */
  side?: "left" | "right";
  /** Allow drag-resizing the panel width. Right side only. Default false. */
  resizable?: boolean;
  /** localStorage key used to persist the resized width. */
  storageKey?: string;
  /** Initial width in px when not resizable or no persisted value. Default 480. */
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  /** Render the dimmed backdrop. Default true. */
  showBackdrop?: boolean;
  /** Surface + border classes for the panel. Default "bg-surface border-border". */
  panelClassName?: string;
  ariaLabel?: string;
  children: ReactNode;
}

export function Drawer({
  open,
  onClose,
  side = "right",
  resizable = false,
  storageKey,
  defaultWidth = 480,
  minWidth = 360,
  maxWidth = 900,
  showBackdrop = true,
  panelClassName = "bg-surface border-border",
  ariaLabel,
  children,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [width, setWidth] = useState(defaultWidth);
  const [dragging, setDragging] = useState(false);

  const canResize = resizable && side === "right";

  // Load persisted width after hydration to avoid SSR mismatch.
  useEffect(() => {
    if (canResize && storageKey) {
      try {
        const stored = window.localStorage.getItem(storageKey);
        const n = stored ? parseInt(stored, 10) : NaN;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!Number.isNaN(n)) setWidth(Math.min(maxWidth, Math.max(minWidth, n)));
      } catch {}
    }
    setHydrated(true);
  }, [canResize, storageKey, minWidth, maxWidth]);

  // Esc to close (mirrors Modal.tsx pattern).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus management: focus the panel on open, restore focus on close.
  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement;
      const t = setTimeout(() => panelRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    if (previouslyFocused.current instanceof HTMLElement) {
      previouslyFocused.current.focus();
    }
  }, [open]);

  const onResizePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!canResize) return;
      e.preventDefault();
      setDragging(true);
    },
    [canResize]
  );

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: PointerEvent) {
      // Right-anchored: width grows as the pointer moves left from the viewport edge.
      const next = Math.min(maxWidth, Math.max(minWidth, window.innerWidth - e.clientX));
      setWidth(next);
    }
    function onUp() {
      setDragging(false);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, minWidth, maxWidth]);

  // Persist width when a drag completes.
  useEffect(() => {
    if (!dragging && canResize && storageKey && hydrated) {
      try {
        window.localStorage.setItem(storageKey, String(width));
      } catch {}
    }
  }, [dragging, canResize, storageKey, hydrated, width]);

  if (!open || typeof document === "undefined") return null;

  const isRight = side === "right";

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      {showBackdrop && (
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />
      )}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`absolute top-0 bottom-0 ${
          isRight ? "right-0" : "left-0"
        } flex max-w-full flex-col overflow-hidden shadow-2xl outline-none ${
          isRight ? "border-l" : "border-r"
        } ${panelClassName} ${
          dragging ? "" : isRight ? "animate-slide-in-right" : "animate-slide-in-left"
        }`}
        style={
          canResize
            ? { width: hydrated ? width : defaultWidth }
            : { width: side === "left" ? "min(20rem, 85vw)" : defaultWidth }
        }
      >
        {canResize && (
          <div
            onPointerDown={onResizePointerDown}
            className="absolute left-0 top-0 z-10 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-accent/30 transition-colors"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panel"
          />
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
