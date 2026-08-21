import AppShell from "@/components/AppShell";
import LeagueGuide from "@/components/LeagueGuide";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-14">
      <AppShell rules={<LeagueGuide />} />
    </main>
  );
}
