import type { Metadata } from "next";
import Link from "next/link";
import { MomentForm } from "@/components/moment-form";

export const metadata: Metadata = { title: "New Moment" };

export default function NewMomentPage() {
  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">New Moment</h1>
      <MomentForm mode="create" />
    </div>
  );
}
