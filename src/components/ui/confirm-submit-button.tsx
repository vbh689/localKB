"use client";

import { useRef } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  confirmMessage: string;
  disabled?: boolean;
  type?: "submit";
};

export function ConfirmSubmitButton({
  children,
  className,
  confirmMessage,
  disabled = false,
  type = "submit",
}: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={buttonRef}
      type={type}
      disabled={disabled}
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        const form = buttonRef.current?.form;

        if (!form) {
          return;
        }

        event.preventDefault();
        form.requestSubmit(buttonRef.current ?? undefined);
      }}
    >
      {children}
    </button>
  );
}
