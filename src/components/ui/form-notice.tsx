import type { Feedback } from "@/lib/feedback";

type Props = {
  feedback: Feedback | null;
};

export function FormNotice({ feedback }: Props) {
  if (!feedback) {
    return null;
  }

  const style =
    feedback.status === "success"
      ? "border-green-200 bg-green-50 text-green-800"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${style}`}>
      {feedback.message}
    </div>
  );
}

