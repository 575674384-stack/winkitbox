import { AlertTriangle, Check, X } from "lucide-react";

export type ConfirmDialogOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "normal" | "danger";
};

export function ConfirmDialog({
  options,
  onResolve,
}: {
  options?: ConfirmDialogOptions;
  onResolve: (confirmed: boolean) => void;
}) {
  if (!options) {
    return null;
  }

  const danger = options.tone === "danger";

  return (
    <div className="confirm-overlay" role="presentation">
      <section
        aria-modal="true"
        className={`confirm-dialog ${danger ? "danger" : ""}`}
        role="dialog"
      >
        <div className="confirm-icon">
          <AlertTriangle size={22} />
        </div>
        <div className="confirm-copy">
          <h3>{options.title}</h3>
          <p>{options.message}</p>
        </div>
        <div className="confirm-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => onResolve(false)}
          >
            <X size={15} />
            {options.cancelLabel ?? "取消"}
          </button>
          <button
            className={danger ? "primary-button danger" : "primary-button"}
            type="button"
            onClick={() => onResolve(true)}
          >
            <Check size={15} />
            {options.confirmLabel ?? "确认"}
          </button>
        </div>
      </section>
    </div>
  );
}
