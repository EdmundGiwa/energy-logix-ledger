import { SafePassPermitDetail } from "@/components/safepass/SafePassPermitDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SafePassPermitDetail id={(await params).id} />;
}
