import { type NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

// for index page
// /api/records

// for record page
// /api/${id}

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ tag: string }>;
  }
) {
  const { tag } = await params;

  revalidateTag(tag, "max");

  return NextResponse.json(
    {
      message: "Cache Invalidated",
      code: 1,
    },
    { status: 200 }
  );
}
