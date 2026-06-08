export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { put } = await import("@vercel/blob");
    const form = await req.formData();
    const file = form.get("file") as File;
    if (!file) return Response.json({ error: "No file" }, { status: 400 });

    const blob = await put(file.name, file, { access: "public" });
    return Response.json({ url: blob.url, name: file.name, type: file.type });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Upload failed: ${message}` }, { status: 500 });
  }
}
