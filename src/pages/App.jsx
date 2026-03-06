import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "../Layout";
import { ThemeProvider } from "../components/ThemeProvider";
import { TabStateProvider } from "../components/mobile/TabStateProvider";
import PageNotFound from "@/lib/PageNotFound";

// Import all pages
import Dashboard from "./Dashboard";
import Statistics from "./Statistics";
import LogPrice from "./LogPrice";
import Settings from "./Settings";

// Dynamically import other pages as needed
const pageComponents = {
  Dashboard,
  Statistics,
  LogPrice,
  Settings,
};

export default function App() {
  return (
    <ThemeProvider>
      <TabStateProvider>
        <BrowserRouter>
        <Routes>
          {Object.entries(pageComponents).map(([name, Component]) => (
            <Route
              key={name}
              path={name === "Dashboard" ? "/" : `/${name.toLowerCase()}`}
              element={
                <Layout currentPageName={name}>
                  <Component />
                </Layout>
              }
            />
          ))}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
        </BrowserRouter>
      </TabStateProvider>
    </ThemeProvider>
  );
}