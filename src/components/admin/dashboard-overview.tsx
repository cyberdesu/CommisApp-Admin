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
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        trend === "up"
          ? "border-orange-200 bg-orange-50 text-orange-700"
          : "border-black/10 bg-black text-white",
      )}
    >
      <Icon className="size-3.5" />
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
              className="border border-black/10 bg-white shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)]"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardDescription className="text-xs font-medium text-black/55">
                      {title}
                    </CardDescription>
                    <CardTitle className="text-3xl font-black tracking-tight text-black">
                      {value}
                    </CardTitle>
                  </div>
                  <div className="flex size-11 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600">
                    <Icon className="size-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3 pt-0">
                <TrendPill trend={trend} value={change} />
                <p className="text-right text-xs text-black/55">
                  {description}
                </p>
              </CardContent>
            </Card>
          ),
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)]">
        <Card className="border border-black/10 bg-white shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)]">
          <CardHeader className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-black tracking-tight text-black">
                  Traffic Overview
                </CardTitle>
                <Badge className="rounded-full bg-orange-500 px-2.5 text-white hover:bg-orange-500">
                  Live
                </Badge>
              </div>
              <CardDescription className="text-sm text-black/60">
                Daily visitors and converted orders across the last 7 days.
              </CardDescription>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:w-auto">
              <div className="rounded-2xl border border-black/10 bg-black px-4 py-3 text-white">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
                  Visitors
                </p>
                <p className="mt-1 text-xl font-black">13.2K</p>
              </div>
              <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-black">
                <p className="text-[11px] uppercase tracking-[0.18em] text-black/45">
                  Orders
                </p>
                <p className="mt-1 text-xl font-black">845</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="h-90 pt-6">
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
                        stopColor="#f97316"
                        stopOpacity={0.36}
                      />
                      <stop
                        offset="100%"
                        stopColor="#f97316"
                        stopOpacity={0.02}
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
                        stopColor="#111111"
                        stopOpacity={0.24}
                      />
                      <stop
                        offset="100%"
                        stopColor="#111111"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="#111111"
                    strokeDasharray="3 3"
                    vertical={false}
                    opacity={0.1}
                  />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#525252", fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#737373" }}
                    width={42}
                  />
                  <Tooltip
                    cursor={{
                      stroke: "#f97316",
                      strokeWidth: 1,
                      opacity: 0.35,
                    }}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid rgba(17,17,17,0.08)",
                      backgroundColor: "#ffffff",
                      boxShadow: "0 20px 50px -24px rgba(0,0,0,0.35)",
                    }}
                    labelStyle={{
                      color: "#111111",
                      fontWeight: 800,
                      marginBottom: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stroke="#111111"
                    fill="url(#orders-fill)"
                    strokeWidth={2}
                    activeDot={{ r: 4, fill: "#111111" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="#f97316"
                    fill="url(#visitors-fill)"
                    strokeWidth={3}
                    activeDot={{ r: 5, fill: "#f97316" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full animate-pulse rounded-2xl border border-black/10 bg-gradient-to-br from-orange-50 via-white to-zinc-100" />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="border border-black/10 bg-white shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)]">
            <CardHeader className="border-b border-black/10 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-black tracking-tight text-black">
                    Recent Activity
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm text-black/60">
                    Highlights from today’s admin operations.
                  </CardDescription>
                </div>
                <div className="flex size-10 items-center justify-center rounded-2xl bg-black text-white">
                  <Activity className="size-4.5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              {activities.map((activity, index) => (
                <div
                  key={activity.title}
                  className={cn(
                    "flex gap-3",
                    index !== activities.length - 1 &&
                      "border-b border-black/8 pb-4",
                  )}
                >
                  <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-orange-600">
                    <Sparkles className="size-4" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-black">
                        {activity.title}
                      </p>
                      <Badge
                        variant="outline"
                        className="rounded-full border-black/10 bg-white text-[10px] text-black/65"
                      >
                        {activity.type}
                      </Badge>
                    </div>
                    <p className="text-sm leading-6 text-black/60">
                      {activity.detail}
                    </p>
                    <p className="text-xs font-medium text-black/40">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-black/10 bg-white shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)]">
            <CardHeader className="border-b border-black/10 pb-4">
              <CardTitle className="text-lg font-black tracking-tight text-black">
                Top Channels
              </CardTitle>
              <CardDescription className="text-sm text-black/60">
                Main acquisition sources for this week.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              {topChannels.map((channel, index) => (
                <div key={channel.name} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-black">{channel.name}</p>
                      <p className="text-xs text-black/45">{channel.amount}</p>
                    </div>
                    <p className="text-sm font-black text-black">
                      {channel.value}
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/8">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        index === 0
                          ? "bg-orange-500"
                          : index === 1
                            ? "bg-black"
                            : index === 2
                              ? "bg-orange-300"
                              : "bg-black/35",
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
