import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json({ error: "Pairing status was removed in v2." }, { status: 410 });
}
