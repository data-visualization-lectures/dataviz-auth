"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import {
  trackSignupCompleted,
  trackSignupStarted,
} from "@/lib/analytics/events";

export function SignUpForm({
  locale,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { locale: Locale }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo =
    searchParams.get("redirect_to") ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("redirect_to")
      : null);
  const redirectQuery = redirectTo
    ? `?redirect_to=${encodeURIComponent(redirectTo)}`
    : "";

  useEffect(() => {
    trackSignupStarted();
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError(t(locale, "signUp.passwordMismatch"));
      setIsLoading(false);
      return;
    }

    try {
      // FormDataを作成
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      if (redirectTo) {
        formData.append("redirectTo", redirectTo);
      }
      formData.append("locale", locale);

      // Server Actionを使用してサインアップ
      const { signUp } = await import("@/app/auth/actions");
      const result = await signUp(formData);

      if (result.error) {
        throw new Error(result.error);
      }

      trackSignupCompleted("email", !!result.isAcademia);
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t(locale, "signUp.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    try {
      const mainSiteUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://www.dataviz.jp";
      const pricingPath = locale === "en" ? "/en/pricing/" : "/pricing/";
      const nextParam = redirectTo || `${mainSiteUrl}${pricingPath}`;
      const localeQuery = `&signup_locale=${encodeURIComponent(locale)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            nextParam,
          )}${localeQuery}`,
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t(locale, "signUp.error"));
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t(locale, "signUp.title")}</CardTitle>
          <CardDescription>{t(locale, "signUp.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">{t(locale, "signUp.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">{t(locale, "signUp.password")}</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">{t(locale, "signUp.confirmPassword")}</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t(locale, "signUp.submitting") : t(locale, "signUp.submit")}
              </Button>
              <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                <span className="relative z-10 bg-background px-2 text-muted-foreground">
                  {t(locale, "signUp.or")}
                </span>
              </div>
              <Button
                variant="outline"
                type="button"
                className="w-full"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  aria-hidden="true"
                  focusable="false"
                  data-prefix="fab"
                  data-icon="google"
                  role="img"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 488 512"
                >
                  <path
                    fill="currentColor"
                    d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                  ></path>
                </svg>
                {t(locale, "signUp.google")}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              {t(locale, "signUp.hasAccount")}{" "}
              <Link
                href={`/auth/login${redirectQuery}`}
                className="underline underline-offset-4 hover:no-underline"
              >
                {t(locale, "signUp.loginLink")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
