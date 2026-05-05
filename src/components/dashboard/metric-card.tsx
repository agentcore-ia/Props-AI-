import { ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Metric } from "@/lib/mock-data";

export function MetricCard({ metric }: { metric: Metric }) {
  return (
    <Card className="rounded-[28px] border-0 bg-card shadow-sm">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
          {metric.delta ? (
            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <ArrowUpRight className="size-3.5" />
              {metric.delta}
            </div>
          ) : null}
        </div>
        <div>
          <p className="text-3xl font-semibold tracking-tight">{metric.value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{metric.hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}
