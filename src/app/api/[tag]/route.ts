import { type NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

// for index page
// /api/records

// for record page
// /api/${id}

// utils/purgeByUrl.ts

interface PurgeResponse {
  success: boolean;
  errors?: Array<{ code: number; message: string }>;
  messages?: string[];
}

export type PurgeErrorCode =
  | "MISSING_CREDENTIALS"
  | "INVALID_URL"
  | "CLOUDFLARE_ERROR"
  | "INVALID_CLOUDFLARE_RESPONSE"
  | "NETWORK_ERROR";

export type PurgeResult =
  | { ok: true }
  | {
      ok: false;
      code: PurgeErrorCode;
      message: string;
      httpStatus: number;
      cloudflareErrors?: Array<{ code: number; message: string }>;
    };

/**
 * Purges a single specific URL from the Cloudflare CDN cache.
 * Strictly accepts a single string instead of an array.
 */
export const purgeSingleUrl = async (
  urlToPurge: string
): Promise<PurgeResult> => {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!zoneId || !apiToken) {
    return {
      ok: false,
      code: "MISSING_CREDENTIALS",
      message:
        "Cloudflare credentials are not configured (CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN).",
      httpStatus: 503,
    };
  }

  if (typeof urlToPurge !== "string" || !urlToPurge.trim()) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "urlToPurge must be a non-empty string.",
      httpStatus: 400,
    };
  }

  const endpoint = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ files: [urlToPurge] }),
    });

    let data: PurgeResponse;
    try {
      data = (await response.json()) as PurgeResponse;
    } catch {
      return {
        ok: false,
        code: "INVALID_CLOUDFLARE_RESPONSE",
        message:
          "Cloudflare returned a response that could not be parsed as JSON.",
        httpStatus: 502,
      };
    }

    if (data.success) {
      return { ok: true };
    }

    const cfErrors = data.errors ?? [];
    const firstMessage =
      cfErrors[0]?.message ?? "Cloudflare purge_cache reported failure.";

    return {
      ok: false,
      code: "CLOUDFLARE_ERROR",
      message: firstMessage,
      httpStatus: response.ok ? 502 : response.status,
      cloudflareErrors: cfErrors,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error during purge.";

    return {
      ok: false,
      code: "NETWORK_ERROR",
      message,
      httpStatus: 502,
    };
  }
};

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ tag: string }>;
  }
) {
  const { tag } = await params;

  if (typeof tag !== "string" || !tag.trim()) {
    return NextResponse.json(
      {
        tag,
        purgedUrl: null,
        error: {
          code: "INVALID_TAG",
          message: "Route tag must be a non-empty string.",
        },
      },
      {
        status: 400,
      }
    );
  }

  const errors: Array<{ step: string; code: string; message: string }> = [];
  let worstStatus = 200;

  const bumpStatus = (next: number) => {
    if (next > worstStatus) {
      worstStatus = next;
    }
  };

  try {
    revalidateTag(tag, "max");
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error during tag revalidation.";

    errors.push({
      step: "revalidateTag",
      code: "REVALIDATE_TAG_FAILED",
      message,
    });
    bumpStatus(500);
  }

  const purgedUrl =
    tag === "records"
      ? "https://ts.asyncawaits.com"
      : `https://ts.asyncawaits.com/${tag}`;

  const purge = await purgeSingleUrl(purgedUrl);

  if (!purge.ok) {
    errors.push({
      step: "purgeSingleUrl",
      code: purge.code,
      message: purge.message,
    });
    bumpStatus(purge.httpStatus);
  }

  if (errors.length > 0) {
    return NextResponse.json(
      {
        tag,
        purgedUrl,
        message: "One or more steps failed.",
        errors,
        ...(purge.ok === false && purge.cloudflareErrors
          ? { cloudflareErrors: purge.cloudflareErrors }
          : {}),
      },
      {
        status: worstStatus,
      }
    );
  }

  return NextResponse.json(
    {
      tag,
      purgedUrl,
      message: "Cache Invalidated",
      code: 1,
    },
    {
      status: 200,
    }
  );
}
