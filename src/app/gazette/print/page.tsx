import Gazette from "@/components/Gazette";

// A chrome-free view of one week's paper, for the Wednesday editor routine to
// screenshot and email. Same <Gazette> component the site uses - no week picker,
// no nav - on the newsprint-grey backdrop, so the image is just the sheet.
//
//   /gazette/print          -> the latest completed week
//   /gazette/print?week=9    -> that specific week
export const dynamic = "force-dynamic";

export default async function GazettePrintPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const sp = await searchParams;
  const asked = Number(sp?.week);
  const week = Number.isInteger(asked) && asked > 0 ? asked : null;

  return (
    <main className="min-h-screen bg-[#d9d3c3] py-6">
      <Gazette fixedWeek={week} bare />
    </main>
  );
}
