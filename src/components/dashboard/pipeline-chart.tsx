"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { pipelineData } from "@/lib/mock-data";

export function PipelineChart() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-[280px] w-full animate-pulse rounded-[24px] bg-muted/60" />;
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={pipelineData} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="leadFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#dbe4f0" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <Tooltip
            cursor={{ stroke: "#2563eb", strokeOpacity: 0.2 }}
            contentStyle={{
              borderRadius: 16,
              border: "1px solid #dbe4f0",
              boxShadow: "0 20px 50px -30px rgba(15, 23, 42, 0.4)",
            }}
          />
          <Area type="monotone" dataKey="leads" stroke="#2563eb" strokeWidth={3} fill="url(#leadFill)" />
          <Area type="monotone" dataKey="cierres" stroke="#0f172a" strokeWidth={2} fillOpacity={0} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
