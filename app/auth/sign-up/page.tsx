import { Suspense } from "react";

export default function Page() {
    return (
        <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
            <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-sm text-center">
                    <p className="text-xl font-semibold">サービス開始までお待ちください</p>
                </div>
            </div>
        </Suspense>
    );
}
