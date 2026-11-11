import type { Metadata } from "next";
import { BookDemo } from "@/components/demo/BookDemo";
import { BRAND } from "@/lib/brand";
import { isSegment } from "@/lib/demo";

export const metadata: Metadata = {
  title: `Book a demo · ${BRAND.name}`,
  description: "Tell us what your energy company runs and book a tailored Offshora walkthrough with only the modules you need.",
};

export default async function BookDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { segment } = await searchParams;
  return <BookDemo initialSegment={isSegment(segment) ? segment : null} />;
}
