import { LoginForm } from "@/components/login-form";
import { Suspense } from "react";
import { getLocale } from "@/lib/i18n.server";

export default async function Page() {
  const locale = await getLocale();
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm locale={locale} />
        </div>
      </div>
    </Suspense>
  );
}
