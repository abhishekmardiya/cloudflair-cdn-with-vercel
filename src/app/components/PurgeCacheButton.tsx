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
        className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-600 dark:focus-visible:ring-offset-black"
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
