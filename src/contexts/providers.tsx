"use client";

import { ThemeProvider } from "@/contexts/theme-provider";
import { AuthProvider } from "@/contexts/auth-provider";
import { StoreProvider } from "@/store/store-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <StoreProvider>
        <AuthProvider>{children}</AuthProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}
