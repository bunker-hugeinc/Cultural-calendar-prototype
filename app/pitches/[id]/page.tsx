import { redirect } from "next/navigation";

export default function LegacyPitchRedirect({ params }: { params: { id: string } }) {
  redirect(`/pitch/${params.id}`);
}
