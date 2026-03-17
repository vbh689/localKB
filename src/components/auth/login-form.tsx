"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LoginState = {
  error: string | null;
  pending: boolean;
};

export function LoginForm() {
  const router = useRouter();
  const [state, setState] = useState<LoginState>({
    error: null,
    pending: false,
  });

  async function handleSubmit(formData: FormData) {
    setState({
      error: null,
      pending: true,
    });

    const payload = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      setState({
        error: result?.error ?? "Dang nhap that bai. Vui long thu lai.",
        pending: false,
      });
      return;
    }

    router.push("/");
    router.refresh();

    setState({
      error: null,
      pending: false,
    });
  }

  return (
    <form
      action={handleSubmit}
      className="glass-panel w-full rounded-[2rem] p-5 md:p-6"
    >
      <div className="space-y-2">
        <p className="font-mono text-sm uppercase tracking-[0.24em] text-accent-strong">
          Dang nhap noi bo
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Truy cap LocalKB
        </h1>
        <p className="max-w-lg text-sm leading-7 text-muted">
          Su dung tai khoan duoc admin cap de vao wiki, FAQ va cac quy trinh noi
          bo cua cong ty.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Email</span>
          <input
            required
            type="email"
            name="email"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-accent"
            placeholder="admin@localkb.internal"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Mat khau</span>
          <input
            required
            minLength={8}
            type="password"
            name="password"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-accent"
            placeholder="Nhap mat khau"
          />
        </label>
      </div>

      {state.error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={state.pending}
        className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-accent px-5 py-3 font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
      >
        {state.pending ? "Dang dang nhap..." : "Dang nhap"}
      </button>
    </form>
  );
}

