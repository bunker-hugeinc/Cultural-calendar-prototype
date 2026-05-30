import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { merchants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { MerchantForm } from "@/components/merchant-form";

export default async function EditMerchantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const merchant = await db.query.merchants.findFirst({ where: eq(merchants.id, id) });
  if (!merchant) notFound();

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/merchants/${id}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← {merchant.name}
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Edit Merchant</h1>
      <MerchantForm
        mode="edit"
        defaultValues={{
          id: merchant.id,
          name: merchant.name,
          category: merchant.category,
          seasonalNotes: merchant.seasonalNotes,
          notes: merchant.notes,
        }}
      />
    </div>
  );
}
