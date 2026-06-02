import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { moments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { MomentForm } from "@/components/moment-form";

export default async function EditMomentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const moment = await db.query.moments.findFirst({ where: eq(moments.id, id) });
  if (!moment) notFound();

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/moments/${id}`} className="text-sm text-apple-gray-400 hover:text-apple-black transition-colors">
          ← {moment.name}
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Edit Moment</h1>
      <MomentForm
        mode="edit"
        defaultValues={{
          id: moment.id,
          name: moment.name,
          startDate: moment.startDate,
          endDate: moment.endDate,
          category: moment.category,
          description: moment.description,
          hook: moment.hook,
          score: moment.score,
          notes: moment.notes,
        }}
      />
    </div>
  );
}
