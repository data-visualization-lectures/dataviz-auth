import { SignUpForm } from "@/components/sign-up-form";
import { Suspense } from "react";
import { getLocale } from "@/lib/i18n.server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return redirect("/account");

    const locale = await getLocale();
    return (
        <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
            <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-sm">
                    <SignUpForm locale={locale} />
                </div>
            </div>
        </Suspense>
    );
}
