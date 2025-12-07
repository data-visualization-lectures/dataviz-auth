// app/billing/cancel/page.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function BillingCancelPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">決済がキャンセルされました</CardTitle>
            <CardDescription>
              料金は発生していません。必要であれば、もう一度お試しください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild>
              <Link href="/account">アカウントページへ戻る</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}