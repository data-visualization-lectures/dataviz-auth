import { Metadata } from "next";

export const metadata: Metadata = {
    title: "利用規約",
};

export default function TermsPage() {
    return (
        <div className="w-full flex justify-center">
            <div className="w-full max-w-5xl px-5 py-10 flex flex-col gap-8">
                <h1 className="text-3xl font-bold">利用規約</h1>
                <p>（ここに利用規約が入ります）</p>
            </div>
        </div>
    );
}
