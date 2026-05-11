"use client";

import { cn } from "@/lib/utils";
import type { PlatformRevenueCurrencyBreakdown } from "@/lib/user-finance.types";
import { fmtMoney, parseMoney, pct } from "../_lib/helpers";
import type { Aggregate } from "../_lib/types";
import { FlowLegend } from "./primitives";

export function RevenueDistribution({
  aggregate,
  paypalTotal,
  distributionTotal,
  sortedRevenue,
  isLoading,
}: {
  aggregate: Aggregate;
  paypalTotal: number;
  distributionTotal: number;
  sortedRevenue: PlatformRevenueCurrencyBreakdown[];
  isLoading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">
            Revenue distribution
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Bagaimana gross volume {aggregate.currency} terpecah jadi artist
            payout, biaya PayPal, dan admin net.
          </p>
        </div>
        <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
          {aggregate.currency}
        </span>
      </div>

      <div className="mb-4 flex h-3.5 overflow-hidden rounded-full bg-zinc-200/70">
        <div
          className="h-full bg-sky-500"
          style={{
            width: `${Math.max(pct(aggregate.artistPayouts, distributionTotal), aggregate.artistPayouts > 0 ? 2 : 0)}%`,
          }}
        />
        <div
          className="h-full bg-rose-500"
          style={{
            width: `${Math.max(pct(paypalTotal, distributionTotal), paypalTotal > 0 ? 2 : 0)}%`,
          }}
        />
        <div
          className="h-full bg-emerald-500"
          style={{
            width: `${Math.max(pct(aggregate.adminNet, distributionTotal), aggregate.adminNet > 0 ? 2 : 0)}%`,
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FlowLegend
          tone="sky"
          label="Artist payout"
          percent={pct(aggregate.artistPayouts, distributionTotal)}
          amount={fmtMoney(aggregate.artistPayouts, aggregate.currency)}
        />
        <FlowLegend
          tone="rose"
          label="PayPal fees"
          percent={pct(paypalTotal, distributionTotal)}
          amount={fmtMoney(paypalTotal, aggregate.currency)}
        />
        <FlowLegend
          tone="emerald"
          label="Admin net"
          percent={pct(aggregate.adminNet, distributionTotal)}
          amount={fmtMoney(aggregate.adminNet, aggregate.currency)}
        />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border/70 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <th className="py-2.5 pr-3 text-left font-semibold">Currency</th>
              <th className="px-3 py-2.5 text-right font-semibold">Gross</th>
              <th className="px-3 py-2.5 text-right font-semibold">
                Website fee
              </th>
              <th className="px-3 py-2.5 text-right font-semibold">PayPal</th>
              <th className="px-3 py-2.5 text-right font-semibold">
                Admin net
              </th>
              <th className="py-2.5 pl-3 text-right font-semibold">Margin</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {isLoading && sortedRevenue.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-xs text-muted-foreground"
                >
                  Loading…
                </td>
              </tr>
            ) : sortedRevenue.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-xs text-muted-foreground"
                >
                  Belum ada revenue data.
                </td>
              </tr>
            ) : (
              sortedRevenue.map((r, i) => {
                const g = parseMoney(r.grossVolume);
                const wf = parseMoney(r.platformFees);
                const ppFee =
                  parseMoney(r.paymentPaypalFees) +
                  parseMoney(r.payoutPaypalFees);
                const net = parseMoney(r.adminNetProfit);
                const m = wf > 0 ? (net / wf) * 100 : 0;
                const isEmpty = g === 0;
                return (
                  <tr
                    key={r.currency}
                    className="border-b border-border/40 last:border-b-0 hover:bg-muted/40"
                  >
                    <td className="py-2.5 pr-3">
                      <span className="font-sans font-semibold text-foreground">
                        {r.currency}
                      </span>
                      {i === 0 && !isEmpty && (
                        <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          primary
                        </span>
                      )}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 text-right",
                        isEmpty && "text-muted-foreground/60",
                      )}
                    >
                      {fmtMoney(g, r.currency)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 text-right",
                        isEmpty && "text-muted-foreground/60",
                      )}
                    >
                      {fmtMoney(wf, r.currency)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 text-right",
                        isEmpty && "text-muted-foreground/60",
                      )}
                    >
                      {isEmpty ? (
                        fmtMoney(0, r.currency)
                      ) : (
                        <span className="inline-flex rounded-md bg-rose-50 px-1.5 py-0.5 text-rose-800">
                          {fmtMoney(ppFee, r.currency)}
                        </span>
                      )}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 text-right",
                        isEmpty && "text-muted-foreground/60",
                      )}
                    >
                      {isEmpty ? (
                        fmtMoney(0, r.currency)
                      ) : (
                        <span className="inline-flex rounded-md bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-800">
                          {fmtMoney(net, r.currency)}
                        </span>
                      )}
                    </td>
                    <td
                      className={cn(
                        "py-2.5 pl-3 text-right",
                        isEmpty && "text-muted-foreground/60",
                      )}
                    >
                      {isEmpty ? "—" : `${m.toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
