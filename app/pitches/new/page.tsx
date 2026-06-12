// Legacy route — the standalone manual pitch builder was retired.
// New pitches now start from a moment (calendar) or a merchant.
import { redirect } from "next/navigation";

export default function LegacyNewPitchRedirect() {
  redirect("/calendar");
}
