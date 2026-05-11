"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminOrderAnalytics } from "@/lib/user-orders.types";
import { formatVolumeSummary } from "../_lib/helpers";

export function AnalyticsSection({
  analytics,
}: {
  analytics: AdminOrderAnalytics | undefined;
}) {
  if (!analytics) return null;

  return (
    <section className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
      <Card className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-zinc-900">
            Top Artist-Client Pairs
          </CardTitle>
          <CardDescription>
            Pairing yang paling sering repeat order.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {analytics.topPairs.length > 0 ? (
            analytics.topPairs.map((item) => (
              <div
                key={`${item.artist.id}-${item.client.id}`}
                className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3"
              >
                <p className="text-sm font-semibold text-zinc-900">
                  @{item.client.username} → @{item.artist.username}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {item.orderCount} orders
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {formatVolumeSummary(item.grossVolume)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-400">No pair data yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-zinc-900">
            Top Artists
          </CardTitle>
          <CardDescription>
            Artist dengan order volume paling tinggi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {analytics.topArtists.length > 0 ? (
            analytics.topArtists.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    @{item.username}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.orderCount} orders
                  </p>
                </div>
                <p className="text-xs text-zinc-400">
                  {formatVolumeSummary(item.grossVolume)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-400">No artist data yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-zinc-900">
            Top Clients
          </CardTitle>
          <CardDescription>
            Client dengan jumlah order paling banyak.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {analytics.topClients.length > 0 ? (
            analytics.topClients.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    @{item.username}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.orderCount} orders
                  </p>
                </div>
                <p className="text-xs text-zinc-400">
                  {formatVolumeSummary(item.grossVolume)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-400">No client data yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-zinc-900">
            Top Services
          </CardTitle>
          <CardDescription>
            Jasa yang paling sering dipakai admin scope saat ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {analytics.topServices.length > 0 ? (
            analytics.topServices.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3"
              >
                <p className="text-sm font-semibold text-zinc-900">
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  by @{item.artist.username} · {item.orderCount} orders
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {item.categories.join(", ")}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {formatVolumeSummary(item.grossVolume)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-400">No service data yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-zinc-900">
            Popular Categories
          </CardTitle>
          <CardDescription>
            Kategori layanan yang paling banyak dipakai.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {analytics.topCategories.length > 0 ? (
            analytics.topCategories.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {item.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.orderCount} orders · {item.serviceCount} services
                  </p>
                </div>
                <p className="text-xs text-zinc-400">
                  {formatVolumeSummary(item.grossVolume)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-400">No category data yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-zinc-900">
            Order Types
          </CardTitle>
          <CardDescription>Distribusi source order saat ini.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {analytics.sources.length > 0 ? (
            analytics.sources.map((item) => (
              <div
                key={item.source}
                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {item.source}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.orderCount} orders
                  </p>
                </div>
                <p className="text-xs text-zinc-400">
                  {formatVolumeSummary(item.grossVolume)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-400">No source data yet.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
