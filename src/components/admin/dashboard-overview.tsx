"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  DollarSign,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const trafficData = [
  { day: "Mon", visitors: 1240, orders: 86 },
  { day: "Tue", visitors: 1680, orders: 104 },
  { day: "Wed", visitors: 1520, orders: 96 },
  { day: "Thu", visitors: 1940, orders: 128 },
  { day: "Fri", visitors: 2260, orders: 142 },
  { day: "Sat", visitors: 2480, orders: 156 },
  { day: "Sun", visitors: 2140, orders: 133 },
];

const metrics = [
  {
    title: "Total Users",
    value: "12,490",
    change: "+18.2%",
    trend: "up" as const,
    description: "Compared to last month",
    icon: Users,
  },
  {
    title: "New Orders",
    value: "324",
    change: "+9.4%",
    trend: "up" as const,
    description: "Strong order growth this week",
    icon: ShoppingBag,
  },
  {
    title: "Revenue",
    value: "Rp 48.2M",
    change: "+12.8%",
    trend: "up" as const,
    description: "Stable monetization performance",
    icon: DollarSign,
  },
  {
    title: "Refund Rate",
    value: "1.8%",
    change: "-0.6%",
    trend: "down" as const,
    description: "Lower than previous week",
    icon: CreditCard,
  },
];

const activities = [
  {
    title: "New premium order completed",
    detail: "Order #CM-24018 was finalized by the operations team.",
    time: "5 minutes ago",
    type: "Completed",
  },
  {
    title: "12 new users registered",
    detail: "Most signups came from the referral campaign landing page.",
    time: "18 minutes ago",
    type: "Growth",
  },
  {
    title: "Revenue target is ahead",
    detail: "Current weekly revenue is 14% above the projected benchmark.",
    time: "1 hour ago",
    type: "Insight",
  },
  {
    title: "Inventory sync finished",
    detail: "Catalog and stock data were refreshed successfully.",
    time: "2 hours ago",
    type: "System",
  },
];

const topChannels = [
  { name: "Instagram Ads", value: "38%", amount: "4,742 visits" },
  { name: "Organic Search", value: "27%", amount: "3,365 visits" },
  { name: "Referral Program", value: "19%", amount: "2,371 visits" },
  { name: "Direct", value: "16%", amount: "1,998 visits" },
];

function TrendPill({ trend, value }: { trend: "up" | "down"; value: string }) {
  const Icon = trend === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
        trend === "up"
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-600",
      )}
    >
      <Icon className="size-3" />
      <span>{value}</span>
    </div>
  );
}

export function DashboardOverview() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(
          ({ title, value, change, trend, description, icon: Icon }) => (
            <Card
              key={title}
              className="border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardDescription className="text-xs font-medium text-slate-500">
                      {title}
                    </CardDescription>
                    <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
                      {value}
                    </CardTitle>
                  </div>
                  <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-500">
                    <Icon className="size-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3 pt-0">
                <TrendPill trend={trend} value={change} />
                <p className="text-right text-xs text-slate-500 truncate">
                  {description}
                </p>
              </CardContent>
            </Card>
          ),
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)]">
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold tracking-tight text-slate-900">
                  Traffic Overview
                </CardTitle>
                <Badge className="rounded-md bg-indigo-50 text-indigo-700 border-indigo-100 px-2 py-0 text-[10px] hover:bg-indigo-100">
                  Live
                </Badge>
              </div>
              <CardDescription className="text-sm text-slate-500">
                Daily visitors and converted orders across the last 7 days.
              </CardDescription>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:w-auto">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Visitors
                </p>
                <p className="mt-1 text-xl font-bold">13.2K</p>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-indigo-900 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                  Orders
                </p>
                <p className="mt-1 text-xl font-bold">845</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="h-96 pt-6">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trafficData}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="visitors-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#4f46e5"
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="100%"
                        stopColor="#4f46e5"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="orders-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#0f172a"
                        stopOpacity={0.1}
                      />
                      <stop
                        offset="100%"
                        stopColor="#0f172a"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="#e2e8f0"
                    strokeDasharray="4 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    width={42}
                  />
                  <Tooltip
                    cursor={{
                      stroke: "#4f46e5",
                      strokeWidth: 1,
                      strokeDasharray: "4 4",
                    }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#ffffff",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    labelStyle={{
                      color: "#0f172a",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stroke="#94a3b8"
                    fill="url(#orders-fill)"
                    strokeWidth={2}
                    activeDot={{ r: 4, fill: "#64748b", stroke: "#fff", strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="#4f46e5"
                    fill="url(#visitors-fill)"
                    strokeWidth={3}
                    activeDot={{ r: 5, fill: "#4f46e5", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full animate-pulse rounded-xl border border-slate-100 bg-slate-50" />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold tracking-tight text-slate-900">
                    Recent Activity
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm text-slate-500">
                    Highlights from today’s admin operations.
                  </CardDescription>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 border border-slate-100">
                  <Activity className="size-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-0 pt-0">
              {activities.map((activity, index) => (
                <div
                  key={activity.title}
                  className={cn(
                    "flex gap-4 py-4",
                    index !== activities.length - 1 &&
                      "border-b border-slate-100",
                  )}
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <Sparkles className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {activity.title}
                      </p>
                      <Badge
                        variant="outline"
                        className="rounded-md border-slate-200 bg-slate-50 px-1.5 py-0 text-[10px] text-slate-500"
                      >
                        {activity.type}
                      </Badge>
                    </div>
                    <p className="text-sm leading-snug text-slate-600">
                      {activity.detail}
                    </p>
                    <p className="text-xs font-medium text-slate-400">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg font-bold tracking-tight text-slate-900">
                Top Channels
              </CardTitle>
              <CardDescription className="text-sm text-slate-500">
                Main acquisition sources for this week.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              {topChannels.map((channel, index) => (
                <div key={channel.name} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{channel.name}</p>
                      <p className="text-xs text-slate-500">{channel.amount}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {channel.value}
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        index === 0
                          ? "bg-indigo-600"
                          : index === 1
                            ? "bg-slate-400"
                            : index === 2
                              ? "bg-indigo-300"
                              : "bg-slate-200",
                      )}
                      style={{ width: channel.value }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
