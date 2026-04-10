"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

type MonthlyData = {
  month: string;
  count: number;
};

export function UserGrowthChart({ data }: { data: MonthlyData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="count"
          name="新規ユーザー数"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SubscriptionGrowthChart({ data }: { data: MonthlyData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="count"
          name="新規サブスクリプション数"
          stroke="#16a34a"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

type PlanData = {
  name: string;
  count: number;
};

const PLAN_COLORS = ["#2563eb", "#7c3aed", "#dc2626", "#ea580c", "#16a34a", "#0891b2"];

export function PlanDistributionChart({ data }: { data: PlanData[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">データなし</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 50)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" fontSize={12} allowDecimals={false} />
        <YAxis type="category" dataKey="name" fontSize={11} width={100} />
        <Tooltip />
        <Bar dataKey="count" name="件数">
          {data.map((_, i) => (
            <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

type TrialData = {
  label: string;
  value: number;
};

const TRIAL_COLORS = ["#16a34a", "#eab308", "#dc2626", "#2563eb"];

export function TrialBreakdownChart({ data }: { data: TrialData[] }) {
  const hasData = data.some((d) => d.value > 0);
  if (!hasData) {
    return <p className="text-sm text-muted-foreground py-8 text-center">データなし</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical" margin={{ left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" fontSize={12} allowDecimals={false} />
        <YAxis type="category" dataKey="label" fontSize={11} width={110} />
        <Tooltip />
        <Bar dataKey="value" name="件数">
          {data.map((_, i) => (
            <Cell key={i} fill={TRIAL_COLORS[i % TRIAL_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
