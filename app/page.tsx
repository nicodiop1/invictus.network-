"use client";

import { useEffect, useState } from "react";
import { BrokerApp } from "./components/broker-app";
import { InstallAppScreen } from "./components/install-app-screen";

function isStandaloneDisplay(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    nav.standalone === true
  );
}

export default function Home() {
  const [isAppMode, setIsAppMode] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only environment detection
    setIsAppMode(isStandaloneDisplay());
  }, []);

  return isAppMode ? <BrokerApp /> : <InstallAppScreen />;
}
