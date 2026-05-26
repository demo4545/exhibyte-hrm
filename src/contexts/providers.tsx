"use client";

import { ThemeProvider } from "@/contexts/theme-provider";
import { AuthProvider } from "@/contexts/auth-provider";
import { InactiveAccountFetchGuard } from "@/contexts/inactive-account-fetch-guard";
import { StoreProvider } from "@/store/store-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <StoreProvider>
        <InactiveAccountFetchGuard>
          <AuthProvider>{children}</AuthProvider>
        </InactiveAccountFetchGuard>
      </StoreProvider>
    </ThemeProvider>
  );
}
