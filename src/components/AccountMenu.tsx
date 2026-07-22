import { useState } from "react";


interface AccountMenuProps {
  email: string | undefined;
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}


export default function AccountMenu({ email, onSignOut, onDeleteAccount }: AccountMenuProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);


  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteAccount();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Deletion failed. Try again.");
      setDeleting(false);
    }
  };


  return (
    <div className="fixed top-4 right-4 flex flex-col items-end gap-2 z-10">
      <div className="reading text-xs text-muted-onink">{email}</div>
      <div className="flex gap-3">
        <button
          onClick={() => onSignOut()}
          className="reading text-xs tracking-[0.1em] text-muted-onink hover:text-brass-dim transition-colors"
        >
          SIGN OUT
        </button>
        <button
          onClick={() => setConfirming(true)}
          className="reading text-xs tracking-[0.1em] text-signal hover:opacity-80 transition-opacity"
        >
          DELETE ACCOUNT
        </button>
      </div>


      {confirming && (
        <div className="w-72 rounded-lg border border-ink-line bg-ink-panel p-4 text-left">
          <p className="text-sm text-ink-text mb-3">
            This permanently deletes your account and every scan stored under it. This can't be undone.
          </p>
          {deleteError && <p className="text-signal text-xs mb-2">{deleteError}</p>}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setConfirming(false)}
              className="reading text-xs tracking-[0.1em] text-muted-onink hover:text-ink-text transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="reading text-xs tracking-[0.1em] text-signal hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {deleting ? "DELETING..." : "CONFIRM DELETE"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
