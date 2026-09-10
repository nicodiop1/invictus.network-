"use client";

import { ThemeProvider } from "next-themes";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import { PropsWithChildren } from "react";
import { ClusterProvider } from "./cluster-context";
import { AppClientProvider } from "../lib/client-provider";

export function Providers({ children }: PropsWithChildren) {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider attribute="class" defaultTheme="dark">
        <ClusterProvider>
          <AppClientProvider>{children}</AppClientProvider>
          <Toaster position="bottom-right" richColors />
        </ClusterProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
