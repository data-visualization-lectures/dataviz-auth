import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import { getLocale, t } from "@/lib/i18n.server";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;
  const locale = await getLocale();

  return (
    <>
      {params?.error ? (
        <p className="text-sm text-muted-foreground">
          {t(locale, "authError.codeError")}{params.error}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t(locale, "authError.unspecified")}
        </p>
      )}
    </>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const locale = await getLocale();
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {t(locale, "authError.genericTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense>
                <ErrorContent searchParams={searchParams} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
