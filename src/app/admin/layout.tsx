import type { ReactNode } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AdminHeader } from "@/components/layout/admin-header";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <div className="flex min-h-dvh flex-col">
          <AdminHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-10 print:max-w-none print:p-0">
            {children}
          </main>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
