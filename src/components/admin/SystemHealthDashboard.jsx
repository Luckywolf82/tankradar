import React from "react";
import SystemHealthPanel from "./SystemHealthPanel";
import DataSourceStatus from "./DataSourceStatus";

export default function SystemHealthDashboard() {
  return (
    <div className="space-y-6">
      <SystemHealthPanel />
      <div className="border-t pt-6">
        <DataSourceStatus />
      </div>
    </div>
  );
}