"use client";

import type { DashboardSummary } from "@/lib/work/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  normal: "#9ca3af",
  low: "#3b82f6",
};

const CHART_CARD =
  "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

interface Props {
  summary: DashboardSummary;
}

export function DashboardCharts({ summary }: Props) {
  const { byStatus, byPriority, byAssignee, completedPerDayLast30 } = summary;

  // Status chart data
  const statusData = byStatus.map((s) => ({
    name: s.status_name ?? "No status",
    count: s.count,
    color: s.status_color ?? "#9ca3af",
  }));

  // Priority chart data
  const priorityData = byPriority.filter((p) => p.count > 0);

  // Assignee chart data
  const assigneeData = byAssignee.map((a) => ({
    name: a.assignee_name ?? a.assignee_email ?? a.assignee_id.slice(0, 8),
    count: a.count,
  }));

  // Completed per day
  const lineData = completedPerDayLast30.map((d) => ({
    date: d.date.slice(5), // MM-DD
    count: d.count,
  }));

  return (
    <div className="space-y-4">
      {/* Row 2: Status + Priority */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Tasks by status */}
        <div className={CHART_CARD}>
          <h2 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            Tasks by status
          </h2>
          {statusData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                layout="vertical"
                data={statusData}
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {statusData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tasks by priority */}
        <div className={CHART_CARD}>
          <h2 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            Tasks by priority
          </h2>
          {priorityData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={priorityData}
                  dataKey="count"
                  nameKey="priority"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  label={({ name, percent }) =>
                    `${name ?? ""} ${percent != null ? (percent * 100).toFixed(0) : 0}%`
                  }
                  labelLine={false}
                >
                  {priorityData.map((entry, idx) => (
                    <Cell key={idx} fill={PRIORITY_COLORS[entry.priority] ?? "#9ca3af"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                {priorityData.length > 4 && <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />}
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 3: Assignee + Completed per day */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Tasks by assignee */}
        <div className={CHART_CARD}>
          <h2 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            Top assignees (open tasks)
          </h2>
          {assigneeData.length === 0 ? (
            <EmptyChart message="No assigned tasks" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                layout="vertical"
                data={assigneeData}
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Completed per day */}
        <div className={CHART_CARD}>
          <h2 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            Completed per day — last 30 days
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={lineData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function EmptyChart({ message = "No data" }: { message?: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-zinc-400">
      {message}
    </div>
  );
}
