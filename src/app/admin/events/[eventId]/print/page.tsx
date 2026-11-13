import { PrintSheet } from "@/components/events/print-sheet";

export default async function PrintPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return <PrintSheet eventId={eventId} />;
}
