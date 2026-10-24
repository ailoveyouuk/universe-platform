"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PRODUCT_GROUPS_NON_PHARMA, type ProductCatalogMatch } from "@universe/types";
import { Button } from "@universe/ui";
import { PRODUCT_DATABASE_URL, ProductCreateForm } from "../../../components/ProductCreateForm";

const NON_PHARMA_CATEGORIES = PRODUCT_GROUPS_NON_PHARMA;

/**
 * Add Product — reached from the landing page's "+ Add Product" button. Writes to the shared, central catalogue
 * (the same ProductMaster the Product Database app manages) via POST /product-catalog. Since 2026-10-18 (step 3b) a product is
 * added as a variant of a family (generic product + strength/pack size/barcodes), with duplicate refusal, using the shared
 * ProductCreateForm that the project line "add product" also uses. Pharmaceutical context locks the category.
 */
export default function AddProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPharma = searchParams.get("context") === "PHARMACEUTICAL";
  const [created, setCreated] = useState<ProductCatalogMatch | null>(null);
  const [formKey, setFormKey] = useState(0);

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 720 }}>
      <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 22, color: "var(--u-ink)", margin: "0 0 6px" }}>Add Product</h1>
      <p style={{ color: "var(--u-ink-secondary)", fontSize: 13.5, marginBottom: 20 }}>
        Adds {isPharma ? "a pharmaceutical" : "a non-pharmaceutical"} product to the shared Universe catalogue as a variant of a product family, so it is the same record in project lines, Quality Assurance approvals and the Product Database.
      </p>
      {created && (
        <div style={{ border: "1px solid var(--u-border)", borderRadius: 8, padding: "10px 14px", fontSize: 13.5, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span><strong>{created.name}</strong> was added to the catalogue.</span>
          <span style={{ display: "flex", gap: 8 }}>
            <a href={`${PRODUCT_DATABASE_URL}/products/detail?id=${created.id}`} target="_blank" rel="noreferrer"><Button type="button" variant="secondary">Open in Product Database</Button></a>
            <Button type="button" variant="secondary" onClick={() => { setCreated(null); setFormKey((k) => k + 1); }}>Add another</Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/")}>Back to Dashboard</Button>
          </span>
        </div>
      )}
      <ProductCreateForm
        key={formKey}
        lockedCategory={isPharma ? "PHARMACEUTICALS" : undefined}
        categoryOptions={isPharma ? undefined : NON_PHARMA_CATEGORIES}
        onCreated={setCreated}
        onUseExisting={(id) => window.open(`${PRODUCT_DATABASE_URL}/products/detail?id=${id}`, "_blank")}
        onCancel={() => router.push("/")}
      />
      <p style={{ fontSize: 12, marginTop: 16 }}><Link href="/">Back to Dashboard</Link></p>
    </div>
  );
}
