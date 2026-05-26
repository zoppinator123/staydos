import { notFound } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/work/Sidebar";
import { DashboardCharts } from "@/components/work/DashboardCharts";
import { getDashboardSummary, getSpace } from "@/lib/work/actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getSpace(id);
  return { title: space ? `${space.name} · Dashboard · Staydos` : "Dashboard · Staydos" };
}

export default async function SpaceDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [space, summary] = await Promise.all([getSpace(id), getDashboardSummary({ spaceId: id })]);
  if (!space) notFound();

  const { counts } = summary;

  return (
    <>
      <Sidebar activeSpaceId={space.id} />
      <main className="flex-1 overflow-y-auto">
        <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: space.color }} />
            <div>
              <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {space.name}{" "}
                <span className="text-zinc-400 font-normal">· Dashboard</span>
              </h1>
              <p className="text-xs text-zinc-500">Space-level task overview.</p>
            </div>
          </div>
          <Link
            href={`/work/space/${space.id}`}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← Back to space
          </Link>
        </header>

        <div className="px-6 py-6 space-y-4">
          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <MetricCard label="Total" value={counts.total} />
            <MetricCard label="Open" value={counts.open} />
            <MetricCard label="Overdue" value={counts.overdue} accent="red" />
            <MetricCard label="Done this week" value={counts.completedThisWeek} accent="green" />
            <MetricCard label="My open" value={counts.myOpen} />
            <MetricCard label="Due today" value={counts.dueToday} accent="amber" />
          </div>

          {/* Charts */}
          <DashboardCharts summary={summary} />
        </div>
      </main>
    </>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "red" | "green" | "amber";
}) {
  const accentClass =
    accent === "red"
      ? "text-red-600 dark:text-red-400"
      : accent === "green"
        ? "text-emerald-600 dark:text-emerald-400"
        : accent === "amber"
          ? "text-amber-600 dark:text-amber-400"
          : "text-zinc-900 dark:text-zinc-100";

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${accentClass}`}>{value}</p>
    </div>
  );
}
