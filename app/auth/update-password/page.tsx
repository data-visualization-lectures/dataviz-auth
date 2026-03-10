import { UpdatePasswordForm } from "@/components/update-password-form";
import { getLocale } from "@/lib/i18n.server";

export default async function Page() {
  const locale = await getLocale();
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <UpdatePasswordForm locale={locale} />
      </div>
    </div>
  );
}
