import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";

export function Header() {
    return (
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
            <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
                <div className="flex gap-5 items-center font-semibold">
                    <Link href={"/"}>dataviz.jp</Link>
                    {/* Desktop Menu */}
                    <div className="hidden md:flex gap-6 ml-4">
                        <Link href={"/faq"} className="font-normal hover:underline">よくある質問</Link>
                        <Link href={"/pricing"} className="font-normal hover:underline">価格</Link>
                        <Link href={"/terms"} className="font-normal hover:underline">利用規約</Link>
                        <a href="https://forms.gle/UJL643uYbWXV2ZoM7" target="_blank" rel="noopener noreferrer" className="font-normal hover:underline">お問い合わせ</a>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {!hasEnvVars ? (
                        <EnvVarWarning />
                    ) : (
                        <Suspense>
                            <AuthButton />
                        </Suspense>
                    )}

                    {/* Mobile/Tablet Menu */}
                    <div className="md:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Menu className="h-6 w-6" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right">
                                <SheetHeader>
                                    <SheetTitle>Menu</SheetTitle>
                                </SheetHeader>
                                <div className="flex flex-col gap-4 mt-8">
                                    <Link href={"/faq"} className="text-lg font-medium hover:underline">よくある質問</Link>
                                    <Link href={"/pricing"} className="text-lg font-medium hover:underline">価格</Link>
                                    <Link href={"/terms"} className="text-lg font-medium hover:underline">利用規約</Link>
                                    <a href="https://forms.gle/UJL643uYbWXV2ZoM7" target="_blank" rel="noopener noreferrer" className="text-lg font-medium hover:underline">お問い合わせ</a>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </nav>
    );
}
