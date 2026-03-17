"use client";

import { useRef } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  confirmMessage: string;
  disabled?: boolean;
  name?: string;
  type?: "submit";
  value?: string;
};

export function ConfirmSubmitButton({
  children,
  className,
  confirmMessage,
  disabled = false,
  name,
  type = "submit",
  value,
}: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={buttonRef}
      type={type}
      disabled={disabled}
      className={className}
      name={name}
      value={value}
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
