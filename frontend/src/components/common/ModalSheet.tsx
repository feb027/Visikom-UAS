import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

let cachedDisplayTransitionSupport: boolean | undefined;

function canTransitionDisplay(): boolean {
  if (cachedDisplayTransitionSupport !== undefined) return cachedDisplayTransitionSupport;
  if (!window.CSS?.supports?.("transition-behavior", "allow-discrete") || !document.body) {
    return false;
  }
  const probe = document.createElement("div");
  probe.style.cssText = "transition: display 1s allow-discrete !important; display: block;";
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = "none";
  cachedDisplayTransitionSupport = getComputedStyle(probe).display === "block";
  probe.remove();
  return cachedDisplayTransitionSupport;
}

function supportsTopLayerExit(): boolean {
  return Boolean(window.CSS?.supports?.("overlay", "auto") && canTransitionDisplay());
}

interface ModalSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Dialog modal native <dialog> yang berlaku sebagai bottom-sheet pada ponsel
 * dan modal terpusat pada desktop, mendukung animasi slide-in & slide-out lintas peramban.
 */
export function ModalSheet({ open, onClose, title, children }: ModalSheetProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const closingRef = useRef(false);

  const closeAnimated = useCallback(async () => {
    const dialog = dialogRef.current;
    if (!dialog || !dialog.open || closingRef.current) return;
    closingRef.current = true;
    try {
      if (!supportsTopLayerExit()) {
        dialog.setAttribute("data-closing", "");
        const animations = dialog.getAnimations({ subtree: true });
        if (animations.length > 0) {
          await Promise.race([
            Promise.allSettled(animations.map((a) => a.finished)),
            new Promise<void>((r) => window.setTimeout(r, 400)),
          ]);
        }
        if (!dialog.hasAttribute("data-closing")) return;
        dialog.removeAttribute("data-closing");
      }
      if (dialog.open) {
        dialog.close();
      }
    } finally {
      closingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.removeAttribute("data-closing");
      dialog.showModal();
    } else if (!open && dialog.open) {
      void closeAnimated();
    }
  }, [open, closeAnimated]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.removeAttribute("data-closing");
      dialog.returnValue = "";
      onClose();
    };

    const handleCancel = (e: Event) => {
      e.preventDefault();
      void closeAnimated();
    };

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e) && dialog.open) {
        void closeAnimated();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointerup", onPointerUp);

    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, [onClose, closeAnimated]);

  return (
    <dialog
      ref={dialogRef}
      className="mydria-dialog"
      aria-labelledby={titleId}
      {...({ closedby: "any" } as Record<string, string>)}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-hairline)] px-5 py-3.5">
        <h2 id={titleId} className="m-0 text-base font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => void closeAnimated()}
          aria-label="Tutup dialog"
          className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full text-[var(--text-primary)] hover:bg-[var(--bg-recessed)]"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="overflow-y-auto px-5 py-4">{children}</div>
    </dialog>
  );
}
