import { redirect } from "next/navigation";

export default async function LegacyPitchRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/pitch/${id}`);
}
