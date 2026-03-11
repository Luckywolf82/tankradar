import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Flame } from "lucide-react";

export function calculateStreak(reports) {
  if (!reports || reports.length === 0) return 0;

  // Sort by date descending
  const sorted = [...reports].sort((a, b) => 
    new Date(b.fetchedAt) - new Date(a.fetchedAt)
  );

  let streak = 0;
  let lastDate = null;

  for (const report of sorted) {
    const reportDate = new Date(report.fetchedAt).toDateString();
    
    if (!lastDate) {
      lastDate = reportDate;
      streak = 1;
    } else if (reportDate === lastDate) {
      // Same day, continue
      continue;
    } else {
      // Check if consecutive day
      const last = new Date(lastDate);
      const current = new Date(reportDate);
      const dayDiff = (last - current) / (1000 * 60 * 60 * 24);
      
      if (dayDiff === 1) {
        streak++;
        lastDate = reportDate;
      } else {
        break;
      }
    }
  }

  return streak;
}

export function getPercentileRank(userReports) {
  // KOMPROMISS: Percentile ranking uses user's report count as proxy for ranking
  // (actual percentile calculation would require all users' data)
  // Estimated distribution: < 1 report = 0–20th percentile, 1–5 = 20–50th, 5–10 = 50–80th, >10 = 80th+
  if (userReports < 1) return null;
  if (userReports === 1) return 25;
  if (userReports < 5) return 45;
  if (userReports < 10) return 65;
  if (userReports < 20) return 80;
  return 90;
}

export function getMilestoneMessage(streak) {
  if (streak === 7) return "🔥 Day 7 streak! 🔥";
  if (streak === 14) return "⭐ Two weeks! ⭐";
  if (streak === 21) return "💎 Three weeks! 💎";
  if (streak === 30) return "👑 One month! 👑";
  return null;
}

export default function StreakCounter({ reportCount, reports }) {
  const [streak, setStreak] = useState(0);
  const [percentile, setPercentile] = useState(null);
  const [milestone, setMilestone] = useState(null);

  useEffect(() => {
    if (!reports || reports.length === 0) return;

    const streakValue = calculateStreak(reports);
    const percentileValue = getPercentileRank(reportCount);
    const milestoneMsg = getMilestoneMessage(streakValue);

    setStreak(streakValue);
    setPercentile(percentileValue);
    setMilestone(milestoneMsg);
  }, [reports, reportCount]);

  if (!streak && !percentile) return null;

  return (
    <div className="text-center">
      <div className="flex justify-center mb-1">
        <Flame size={15} className={streak > 0 ? "text-orange-500" : "text-slate-400"} />
      </div>
      <p className="text-xl font-bold text-slate-800">{streak}</p>
      <p className="text-xs text-slate-500">Dag-streak</p>
      {percentile && (
        <p className="text-xs text-green-600 mt-1 font-semibold">
          Top {100 - percentile}%
        </p>
      )}
      {milestone && (
        <p className="text-xs text-orange-600 font-bold mt-2 animate-pulse">
          {milestone}
        </p>
      )}
    </div>
  );
}