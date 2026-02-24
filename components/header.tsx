import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

export function Header() {
    return (
        <header className="w-full">
            <nav className="w-full flex justify-center h-12 bg-[#111] text-[#ddd] shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
                <div className="w-full max-w-5xl flex justify-between items-center px-4 text-sm">
                    <div className="flex items-center font-semibold">
                        <Link href={"/"} className="text-white tracking-[0.5px]">dataviz.jp</Link>
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

            <div className="w-full flex justify-center bg-[rgb(51,51,51)] text-[#ddd] border-t border-[#444] shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
                <div className="w-full max-w-5xl flex items-center gap-3 px-4 py-2">
                    <Link
                        href="https://auth.dataviz.jp/"
                        className="inline-flex items-center rounded border border-[rgb(36,36,36)] bg-[rgb(32,32,32)] px-3 py-1 text-[13px] text-[#ddd] transition-colors hover:border-[rgb(44,44,44)] hover:bg-[rgb(48,48,48)] hover:text-white"
                    >
                        保存プロジェクト一覧
                    </Link>
                    <Link
                        href="https://auth.dataviz.jp/account"
                        className="inline-flex items-center rounded border border-[rgb(36,36,36)] bg-[rgb(32,32,32)] px-3 py-1 text-[13px] text-[#ddd] transition-colors hover:border-[rgb(44,44,44)] hover:bg-[rgb(48,48,48)] hover:text-white"
                    >
                        アカウント情報
                    </Link>
                </div>
            </div>
        </header>
    );
}
