import { HaulTracDetail } from "@/components/haultrac/HaulTracDetail";

export default async function HaulTracDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HaulTracDetail id={id} />;
}
