import { NextResponse } from "next/server";

import {
  runDueRentAdjustments,
  validateRentAutomationSecret,
} from "@/lib/rent-automation";

export async function POST(request: Request) {
  const secret = request.headers.get("x-props-cron-secret");

  if (!validateRentAutomationSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await runDueRentAdjustments();
  return NextResponse.json(result);
}
