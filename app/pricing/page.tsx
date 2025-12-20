import { Metadata } from "next";

export const metadata: Metadata = {
    title: "価格",
};

export default function PricingPage() {
    return (
        <div className="w-full flex justify-center">
            <div className="w-full max-w-5xl px-5 py-5 flex flex-col gap-20">
                <h1 className="text-3xl font-bold">価格</h1>
                <p>（ここに価格表が入ります）</p>
            </div>
        </div>
    );
}
