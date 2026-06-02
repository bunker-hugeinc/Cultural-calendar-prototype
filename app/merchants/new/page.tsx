import type { Metadata } from "next";
import Link from "next/link";
import { MerchantForm } from "@/components/merchant-form";

export const metadata: Metadata = { title: "New Merchant" };

export default function NewMerchantPage() {
  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/merchants" className="text-sm text-apple-gray-400 hover:text-apple-black transition-colors">
          ← Merchant Catalog
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">New Merchant</h1>
      <MerchantForm mode="create" />
    </div>
  );
}
