import { getLocale, t } from "@/lib/i18n.server";

export default async function AuthCodeError() {
    const locale = await getLocale();
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
            <h1 className="text-2xl font-bold mb-4">{t(locale, "authError.title")}</h1>
            <p className="mb-4">
                {t(locale, "authError.body")}
            </p>
            <a
                href="/auth/login"
                className="text-blue-500 hover:text-blue-700 underline hover:no-underline"
            >
                {t(locale, "authError.backToLogin")}
            </a>
        </div>
    );
}
