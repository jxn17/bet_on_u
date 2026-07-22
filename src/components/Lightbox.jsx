import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Full-screen image viewer. Tap the backdrop, the X, or press Esc to close.
export default function Lightbox({ src, alt = "", onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-night/92 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 grid h-11 w-11 place-items-center border-2 border-cream bg-night text-cream transition-colors hover:border-acid hover:bg-acid hover:text-night"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] max-w-full border-2 border-cream object-contain"
      />
    </div>,
    document.body
  );
}
