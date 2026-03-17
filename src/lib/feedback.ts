import { redirect } from "next/navigation";

export type Feedback = {
  message: string;
  status: "error" | "success";
};

export type SearchParamInput =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

function getValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function getFeedback(
  searchParams: SearchParamInput,
): Promise<Feedback | null> {
  const resolved = await searchParams;
  const status = getValue(resolved.status);
  const message = getValue(resolved.message);

  if (!status || !message) {
    return null;
  }

  if (status !== "success" && status !== "error") {
    return null;
  }

  return {
    message,
    status,
  };
}

export function redirectWithFeedback(
  redirectTo: string,
  feedback: Feedback,
): never {
  const [pathname, currentQuery] = redirectTo.split("?");
  const params = new URLSearchParams(currentQuery ?? "");
  params.set("status", feedback.status);
  params.set("message", feedback.message);
  redirect(`${pathname}?${params.toString()}`);
}

