"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { duplicateCampaign } from "@/app/admin/emails/actions";

type Props = {
  campaignId: string;
};

export function AdminEmailDuplicateButton({ campaignId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="underline disabled:opacity-60"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await duplicateCampaign(campaignId);
          if (!result.success) {
            window.alert(result.error);
            return;
          }
          router.push(`/admin/emails/${result.campaignId}/edit`);
          router.refresh();
        });
      }}
    >
      複製
    </button>
  );
}
