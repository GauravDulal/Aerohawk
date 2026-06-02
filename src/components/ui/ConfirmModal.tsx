'use client';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  subtitle,
  body,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--grey)', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {body}
          </p>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={onCancel}>Cancel</button>
            <button className="btn-confirm" onClick={() => { onConfirm(); onCancel(); }}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
