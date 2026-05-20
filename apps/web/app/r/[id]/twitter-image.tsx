import { generateReceiptOgImage, size, contentType } from "./og-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "VDM Nexus — Signed inference receipt";
export { size, contentType };

export default async function TwitterImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return generateReceiptOgImage(id);
}
