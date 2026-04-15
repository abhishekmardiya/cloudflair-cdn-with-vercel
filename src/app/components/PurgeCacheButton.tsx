"use client";

import { useState } from "react";
import { toast } from "sonner";

type PurgeCacheButtonProps = {
  tag: string;
};

const bodyAsText = (text: string): string => {
  if (!text) {
    return "(empty body)";
  }

  try {
    const parsed: unknown = JSON.parse(text);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return text;
  }
};

export default function PurgeCacheButton({ tag }: PurgeCacheButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Clearing cache…", { duration: Infinity });

    try {
      const response = await fetch(`/api/${encodeURIComponent(tag)}`, {
        method: "GET",
        cache: "no-store",
      });

      const text = await response.text();
      const description = [
        `${response.status} ${response.statusText}`,
        "",
        bodyAsText(text),
      ].join("\n");

      toast.dismiss(toastId);

      if (response.ok) {
        toast.success("OK", { description });
        return;
      }

      toast.error("Error", { description });
    } catch (error: unknown) {
      toast.dismiss(toastId);
      const message = error instanceof Error ? error.message : String(error);
      toast.error("Request failed", { description: message });
    } finally {
      setIsLoading(false);
    }
  }

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
    </div>
  );
}
