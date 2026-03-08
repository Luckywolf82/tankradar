import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import PriceHistoryChart from './PriceHistoryChart';

export default function FavoriteStationCard({
  favorite,
  priceHistory,
  nationalBenchmark,
  regionalBenchmark,
  onRefresh,
}) {
  const [expanded, setExpanded] = useState(false);

  const latestPrice = priceHistory[0];
  const diff =
    latestPrice && nationalBenchmark
      ? (latestPrice.priceNok - nationalBenchmark.priceNok).toFixed(2)
      : null;
  const diffPercent = diff
    ? ((diff / nationalBenchmark.priceNok) * 100).toFixed(1)
    : null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <CardTitle className="text-sm font-semibold text-slate-900">
              {favorite.stationName}
            </CardTitle>
            {favorite.stationChain && (
              <p className="text-xs text-slate-500 mt-1">{favorite.stationChain}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">{favorite.fuelType}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Latest price */}
        {latestPrice ? (
          <div className="bg-blue-50 rounded p-3">
            <p className="text-xs text-slate-600 mb-1">Siste pris</p>
            <p className="text-2xl font-bold text-slate-900">{latestPrice.priceNok.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {new Date(latestPrice.fetchedAt).toLocaleDateString('no-NO')}
            </p>
          </div>
        ) : (
          <div className="bg-slate-50 rounded p-3">
            <p className="text-xs text-slate-600">Ingen prisdata tilgjengelig</p>
          </div>
        )}

        {/* National benchmark comparison */}
        {nationalBenchmark && latestPrice && (
          <div className="bg-slate-50 rounded p-3">
            <p className="text-xs text-slate-600 mb-1">vs. Landsgjenomsnitt</p>
            <div className="flex items-baseline gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {diff > 0 ? '+' : ''}
                {diff} NOK
              </p>
              <p className={`text-xs font-medium ${diff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {diff > 0 ? '+' : ''}
                {diffPercent}%
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Snitt: {nationalBenchmark.priceNok.toFixed(2)} NOK
            </p>
          </div>
        )}

        {/* Regional benchmark comparison (premium) */}
        {regionalBenchmark && latestPrice && (
          <div className="bg-green-50 rounded p-3 border border-green-200">
            <p className="text-xs text-slate-600 mb-1">vs. Regionalgjennomsnitt</p>
            <p className="text-sm font-semibold text-green-700">
              {latestPrice.priceNok < regionalBenchmark[0]?.priceNok
                ? 'Billigere enn region'
                : 'Dyrere enn region'}
            </p>
            {regionalBenchmark[0] && (
              <p className="text-xs text-slate-500 mt-1">
                Region snitt: {regionalBenchmark[0].priceNok.toFixed(2)} NOK
              </p>
            )}
          </div>
        )}

        {/* Locked premium badge if no regional benchmark access */}
        {!regionalBenchmark && (
          <div className="bg-slate-100 rounded p-3 border border-slate-300">
            <p className="text-xs text-slate-600">
              🔒 Regionalsammenlikning er en premium-funksjon
            </p>
          </div>
        )}

        {/* Expandable price history */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-xs font-medium text-blue-600 hover:text-blue-700 py-2"
        >
          <span>
            {priceHistory.length} prisoppføringer -{' '}
            {priceHistory.length > 0
              ? `${new Date(priceHistory[priceHistory.length - 1].fetchedAt).toLocaleDateString('no-NO')}`
              : 'ingen data'}
          </span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* Expanded price history chart */}
        {expanded && priceHistory.length > 0 && (
          <div className="border-t border-slate-200 pt-3">
            <PriceHistoryChart
              priceHistory={priceHistory}
              nationalBenchmark={nationalBenchmark}
              regionalBenchmark={regionalBenchmark}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}