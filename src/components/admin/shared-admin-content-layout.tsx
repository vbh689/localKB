import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type SharedAdminContentLayoutProps = {
  sidebar: ReactNode;
  content: ReactNode;
};

export function SharedAdminContentLayout({
  sidebar,
  content,
}: SharedAdminContentLayoutProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-4">
      <div className="grid gap-4 xl:col-span-1 xl:auto-rows-max">{sidebar}</div>
      <div className="grid gap-6 xl:col-span-3">{content}</div>
    </section>
  );
}

type SharedAdminContentPanelOwnProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  variant?: "sidebar" | "content";
};

type SharedAdminContentPanelProps<T extends ElementType> =
  SharedAdminContentPanelOwnProps<T> &
  Omit<
    ComponentPropsWithoutRef<T>,
    keyof SharedAdminContentPanelOwnProps<T> | "className" | "children"
  >;

export function SharedAdminContentPanel<T extends ElementType = "div">({
  as,
  children,
  className,
  variant = "content",
  ...props
}: SharedAdminContentPanelProps<T>) {
  const Component = as ?? "div";
  const baseClassName =
    variant === "sidebar"
      ? "glass-panel rounded-[1.6rem] p-5"
      : "glass-panel rounded-[1.8rem] p-6";

  return (
    <Component
      className={className ? `${baseClassName} ${className}` : baseClassName}
      {...props}
    >
      {children}
    </Component>
  );
}
