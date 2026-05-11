"use client";

import { MessageSquare, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useChatStats } from "../_hooks/useChatQueries";

export function ChatStats() {
  const { data, isLoading } = useChatStats();

  const stats = [
    {
      label: "Total Conversations",
      value: data?.totalConversations ?? 0,
      icon: MessageSquare,
    },
    {
      label: "Total Messages",
      value: data?.totalMessages ?? 0,
      icon: MessageSquare,
    },
    {
      label: "Active Today",
      value: data?.activeToday ?? 0,
      icon: Users,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/60">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
              <stat.icon className="size-5 text-primary" />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="mb-1 h-6 w-16" />
              ) : (
                <p className="text-xl font-bold tabular-nums">
                  {stat.value.toLocaleString()}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
