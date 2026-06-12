// Legacy route — pitches consolidated onto the singular /pitch tree.
import { redirect } from "next/navigation";

export default function LegacyPitchesIndexRedirect() {
  redirect("/pitch");
}
