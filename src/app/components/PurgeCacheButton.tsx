"use client";

import { useState } from "react";

type PurgeCacheButtonProps = {
  tag: string;
};

export default function PurgeCacheButton({ tag }: PurgeCacheButtonProps) {
  const [{ status, message }, setState] = useState<{
    status: "idle" | "loading" | "success" | "error";
    message: string | null;
  }>({ status: "idle", message: null });

  async function handleClick() {
    if (status === "loading") {
      return;
    }

    setState({ status: "loading", message: null });

    try {
      const response = await fetch(`/api/${encodeURIComponent(tag)}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setState({
          status: "error",
          message: data.message ?? "Failed to purge cache",
        });
        return;
      }

      setState({
        status: "success",
        message: data.message ?? "Cache invalidated",
      });
    } catch {
      setState({ status: "error", message: "Failed to purge cache" });
    }
  }

  const isLoading = status === "loading";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="cursor-pointer inline-flex items-center rounded-lg border border-red-300 bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:border-red-900/60 dark:bg-red-600 dark:hover:bg-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-black"
      >
        {isLoading ? "Purging…" : "Purge cache"}
      </button>

      {message ? (
        <span
          className={[
            "text-xs font-medium",
            status === "error"
              ? "text-red-600 dark:text-red-400"
              : "text-zinc-600 dark:text-zinc-400",
          ].join(" ")}
        >
          {message}
        </span>
      ) : null}
    </div>
  );
}
