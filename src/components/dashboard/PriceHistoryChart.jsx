import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function PriceHistoryChart({
  priceHistory,
  nationalBenchmark,
  regionalBenchmark,
}) {
  const chartData = useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) return [];

    return priceHistory.map((item, idx) => ({
      date: new Date(item.fetchedAt).toLocaleDateString('no-NO', {
        month: 'short',
        day: 'numeric',
      }),
      price: item.priceNok,
      national: nationalBenchmark?.priceNok,
      regional: regionalBenchmark?.[0]?.priceNok,
    }));
  }, [priceHistory, nationalBenchmark, regionalBenchmark]);

  if (chartData.length === 0) {
    return <p className="text-xs text-slate-600">Ingen prisr historikk</p>;
  }

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            stroke="#64748b"
            interval={Math.floor(chartData.length / 5)}
          />
          <YAxis tick={{ fontSize: 12 }} stroke="#64748b" domain="dataMin-0.5" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
            }}
            formatter={(value) => (value ? value.toFixed(2) : 'N/A')}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#2563eb"
            dot={false}
            name="Din pris"
            isAnimationActive={false}
          />
          {nationalBenchmark && (
            <Line
              type="monotone"
              dataKey="national"
              stroke="#94a3b8"
              dot={false}
              name="Nasjonalt snitt"
              strokeDasharray="5 5"
              isAnimationActive={false}
            />
          )}
          {regionalBenchmark && (
            <Line
              type="monotone"
              dataKey="regional"
              stroke="#10b981"
              dot={false}
              name="Regionalt snitt"
              strokeDasharray="3 3"
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}