import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import { getLocale, t } from "@/lib/i18n.server";

export async function Header() {
    const locale = await getLocale();
    return (
        <header className="w-full">
            <nav
                className="w-full h-12 bg-[#111] text-[#ddd] shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: "14px" }}
            >
                <div className="w-full h-full flex justify-between items-center px-4">
                    <div className="flex items-center font-semibold">
                        <Link href="https://www.dataviz.jp/" className="text-white tracking-[0.5px] font-bold no-underline">{t(locale, "header.siteName")}</Link>
                    </div>

                    <div className="flex items-center gap-4">
                        {!hasEnvVars ? (
                            <EnvVarWarning />
                        ) : (
                            <Suspense>
                                <AuthButton />
                            </Suspense>
                        )}
                    </div>
                </div>
            </nav>

            <div className="w-full bg-[rgb(51,51,51)] text-[#ddd] border-t border-[#444] shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
                <div className="w-full flex items-center gap-3 px-4 py-2">
                    <Link
                        href="/"
                        className="inline-flex items-center rounded border border-[rgb(36,36,36)] bg-[rgb(32,32,32)] px-3 py-1 text-[13px] text-[#ddd] transition-colors hover:border-[rgb(44,44,44)] hover:bg-[rgb(48,48,48)] hover:text-white"
                    >
                        {t(locale, "header.navTools")}
                    </Link>
                    <Link
                        href="/data-library"
                        className="inline-flex items-center rounded border border-[rgb(36,36,36)] bg-[rgb(32,32,32)] px-3 py-1 text-[13px] text-[#ddd] transition-colors hover:border-[rgb(44,44,44)] hover:bg-[rgb(48,48,48)] hover:text-white"
                    >
                        {t(locale, "header.navDataLibrary")}
                    </Link>
                    <Link
                        href="/projects"
                        className="inline-flex items-center rounded border border-[rgb(36,36,36)] bg-[rgb(32,32,32)] px-3 py-1 text-[13px] text-[#ddd] transition-colors hover:border-[rgb(44,44,44)] hover:bg-[rgb(48,48,48)] hover:text-white"
                    >
                        {t(locale, "header.navProjects")}
                    </Link>
                    <Link
                        href="/account"
                        className="inline-flex items-center rounded border border-[rgb(36,36,36)] bg-[rgb(32,32,32)] px-3 py-1 text-[13px] text-[#ddd] transition-colors hover:border-[rgb(44,44,44)] hover:bg-[rgb(48,48,48)] hover:text-white"
                    >
                        {t(locale, "header.navAccount")}
                    </Link>
                </div>
            </div>
        </header>
    );
}
