"use client";

type Props = {
  formId: string;
};

function setCheckedState(formId: string, checked: boolean) {
  const form = document.getElementById(formId);

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const checkboxes = form.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"][name="ids"]',
  );

  checkboxes.forEach((checkbox) => {
    checkbox.checked = checked;
  });
}

export function BulkSelectionControls({ formId }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setCheckedState(formId, true)}
        className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong"
      >
        Chọn tất cả
      </button>
      <button
        type="button"
        onClick={() => setCheckedState(formId, false)}
        className="rounded-full border border-line px-4 py-2 text-sm font-medium text-muted"
      >
        Bỏ chọn
      </button>
    </div>
  );
}
