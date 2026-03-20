import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Fuel, TrendingDown, TrendingUp, Minus, Star } from "lucide-react";
import SharePriceButton from "@/components/shared/SharePriceButton";
import { isStationPriceDisplayEligible } from "@/utils/fuelPriceEligibility";
import { formatDistanceToNow, format } from "date-fns";
import { nb } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const fuelTypeLabel = {
  gasoline_95: "Bensin 95",
  gasoline_98: "Bensin 98",
  diesel: "Diesel",
  bensin_95: "Bensin 95",
  bensin_98: "Bensin 98",
  diesel_premium: "Diesel+",
  other: "Annet",
};

const fuelColors = {
  gasoline_95: "#16a34a",
  gasoline_98: "#2563eb",
  diesel: "#d97706",
  bensin_95: "#16a34a",
  bensin_98: "#2563eb",
  diesel_premium: "#9333ea",
};

const sourceLabel = {
  GooglePlaces: { text: "Google", color: "bg-blue-100 text-blue-700" },
  user_reported: { text: "Brukerpris", color: "bg-green-100 text-green-700" },
  FuelFinder: { text: "FuelFinder", color: "bg-orange-100 text-orange-700" },
  GlobalPetrolPrices: { text: "GPP", color: "bg-slate-100 text-slate-600" },
};

const priceTypeLabel = {
  station_level: "Stasjonsnivå",
  user_reported: "Brukerrapportert",
  national_average: "Nasjonalt snitt",
};

export default function StationDetails() {
  const params = new URLSearchParams(window.location.search);
  const stationId = params.get("stationId");

  const [station, setStation] = useState(null);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [favLoading, setFavLoading] = useState(false);

  useEffect(() => {
    if (!stationId) return;
    Promise.all([
      base44.entities.Station.filter({ id: stationId }),
      base44.entities.FuelPrice.filter({ stationId }, "-fetchedAt", 200),
    ]).then(([stationRes, pricesRes]) => {
      setStation(stationRes[0] || null);
      // Apply shared base display-eligibility contract; stationId is already
      // enforced at query level, so the remaining checks add plausibility,
      // aggregate-type exclusion, and match-status safety.
      setPrices(pricesRes.filter(isStationPriceDisplayEligible));
    }).finally(() => setLoading(false));

    base44.auth.isAuthenticated().then(async (auth) => {
      if (auth) {
        const u = await base44.auth.me();
        setUser(u);
        const favs = await base44.entities.UserFavoriteStation.filter({ created_by: u.email });
        setFavorites(favs);
      }
    });
  }, [stationId]);

  const isFavorite = (fuelType) =>
    favorites.some(f => f.station === stationId && f.fuelType === fuelType);

  const toggleFavorite = async (fuelType) => {
    if (!user) return;
    setFavLoading(true);
    const existing = favorites.find(f => f.station === stationId && f.fuelType === fuelType);
    if (existing) {
      await base44.entities.UserFavoriteStation.delete(existing.id);
      setFavorites(prev => prev.filter(f => f.id !== existing.id));
    } else {
      const created = await base44.entities.UserFavoriteStation.create({
        station: stationId,
        fuelType,
      });
      setFavorites(prev => [...prev, created]);
      // Opprett price_drop-varsling automatisk
      await base44.entities.UserPriceAlert.create({
        station: stationId,
        fuelType,
        alertType: 'price_drop',
        isActive: true,
        isUnread: false,
      });
    }
    setFavLoading(false);
  };

  if (!stationId) {
    return <div className="max-w-2xl mx-auto p-6 text-slate-500">Ingen stasjon valgt.</div>;
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 flex items-center gap-2 text-slate-400">
        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        Laster stasjon…
      </div>
    );
  }

  if (!station) {
    return <div className="max-w-2xl mx-auto p-6 text-slate-500">Fant ikke stasjonen.</div>;
  }

  // Group prices by fuel type — latest per type
  const latestByFuel = {};
  prices.forEach((p) => {
    if (!latestByFuel[p.fuelType] || new Date(p.fetchedAt) > new Date(latestByFuel[p.fuelType].fetchedAt)) {
      latestByFuel[p.fuelType] = p;
    }
  });

  // Build chart data: sort by fetchedAt, group by date + fuelType
  const chartByDate = {};
  [...prices].sort((a, b) => new Date(a.fetchedAt) - new Date(b.fetchedAt)).forEach((p) => {
    const dateKey = format(new Date(p.fetchedAt), "dd.MM");
    if (!chartByDate[dateKey]) chartByDate[dateKey] = { date: dateKey };
    // Keep cheapest per fuel per date
    if (!chartByDate[dateKey][p.fuelType] || p.priceNok < chartByDate[dateKey][p.fuelType]) {
      chartByDate[dateKey][p.fuelType] = p.priceNok;
    }
  });
  const chartData = Object.values(chartByDate);
  const fuelTypesInChart = [...new Set(prices.map((p) => p.fuelType))];

  // Price trend (last 2 obs per fuel type)
  const trendByFuel = {};
  fuelTypesInChart.forEach((ft) => {
    const sorted = prices.filter((p) => p.fuelType === ft).sort((a, b) => new Date(b.fetchedAt) - new Date(a.fetchedAt));
    if (sorted.length >= 2) {
      const diff = sorted[0].priceNok - sorted[1].priceNok;
      trendByFuel[ft] = diff;
    }
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Station Header */}
      <Card className="shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800">{station.name}</h1>
              {station.chain && (
                <p className="text-sm text-slate-500 mt-0.5">{station.chain}</p>
              )}
              {(station.address || station.city) && (
                <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                  <MapPin size={13} />
                  {[station.address, station.city].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1 items-end">
              {station.region && (
                <Badge variant="outline" className="text-xs">{station.region}</Badge>
              )}
              {station.stationType && station.stationType !== "standard" && (
                <Badge variant="outline" className="text-xs text-slate-500">{station.stationType}</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current prices */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Fuel size={16} className="text-green-600" />
            Siste kjente priser
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(latestByFuel).length === 0 ? (
            <p className="text-sm text-slate-400 py-2">Ingen prisdata tilgjengelig for denne stasjonen.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {Object.entries(latestByFuel).map(([ft, p]) => {
                const src = sourceLabel[p.sourceName] || { text: p.sourceName, color: "bg-slate-100 text-slate-500" };
                const timeAgo = p.fetchedAt
                  ? formatDistanceToNow(new Date(p.fetchedAt), { addSuffix: true, locale: nb })
                  : null;
                const trend = trendByFuel[ft];
                const TrendIcon = trend === undefined ? null : trend < -0.005 ? TrendingDown : trend > 0.005 ? TrendingUp : Minus;
                const trendColor = trend < -0.005 ? "text-green-600" : trend > 0.005 ? "text-red-500" : "text-slate-400";

                return (
                  <div key={ft} className="flex items-center gap-3 py-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-700">{fuelTypeLabel[ft] || ft}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${src.color}`}>{src.text}</span>
                        <span className="text-xs text-slate-400">{priceTypeLabel[p.priceType] || p.priceType}</span>
                        {timeAgo && (
                          <span className="text-xs text-slate-400 flex items-center gap-0.5">
                            <Clock size={10} /> {timeAgo}
                          </span>
                        )}
                        {p.confidenceScore != null && (
                          <span className="text-xs text-slate-400">
                            Tillitt: {Math.round(p.confidenceScore * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      {TrendIcon && <TrendIcon size={14} className={trendColor} />}
                      {user && (
                        <button
                          onClick={() => toggleFavorite(ft)}
                          disabled={favLoading}
                          title={isFavorite(ft) ? "Fjern favoritt og varsel" : "Legg til som favoritt og aktiver prisvarsel"}
                          className="text-slate-300 hover:text-yellow-400 transition-colors"
                        >
                          <Star
                            size={16}
                            className={isFavorite(ft) ? "fill-yellow-400 text-yellow-400" : ""}
                          />
                        </button>
                      )}
                      <SharePriceButton
                        stationId={stationId}
                        stationName={station.name}
                        priceNok={p.priceNok}
                        fuelType={ft}
                      />
                      <div>
                        <p className="text-lg font-bold text-slate-800">{p.priceNok.toFixed(2)}</p>
                        <p className="text-xs text-slate-400">kr/l</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price history chart */}
      {chartData.length >= 2 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Prisutvikling</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} width={40} unit=" kr" />
                <Tooltip formatter={(v) => `${v?.toFixed(2)} kr/l`} />
                <Legend formatter={(v) => fuelTypeLabel[v] || v} />
                {fuelTypesInChart.map((ft) => (
                  <Line
                    key={ft}
                    type="monotone"
                    dataKey={ft}
                    stroke={fuelColors[ft] || "#94a3b8"}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Full price log */}
      {prices.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Alle observasjoner ({prices.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {prices.map((p) => {
                const src = sourceLabel[p.sourceName] || { text: p.sourceName, color: "bg-slate-100 text-slate-500" };
                const fetchedText = p.fetchedAt
                  ? format(new Date(p.fetchedAt), "dd.MM.yyyy HH:mm")
                  : "—";
                return (
                  <div key={p.id} className="flex items-center gap-2 py-2 text-xs">
                    <span className="text-slate-500 w-24 shrink-0">{fetchedText}</span>
                    <span className="text-slate-600 w-20 shrink-0">{fuelTypeLabel[p.fuelType] || p.fuelType}</span>
                    <span className="font-semibold text-slate-800 w-14 shrink-0">{p.priceNok.toFixed(2)} kr</span>
                    <span className={`px-1.5 py-0.5 rounded-full font-medium ${src.color}`}>{src.text}</span>
                    {p.confidenceScore != null && (
                      <span className="text-slate-400 ml-auto">{Math.round(p.confidenceScore * 100)}% tillit</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}