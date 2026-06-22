"use client";

import { trpc } from "@/lib/trpc";

function TestimonialCard({
  t,
}: {
  t: { id: string; text: string; createdAt: Date | string; partyName?: string | null };
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{t.text}</p>
      <div className="flex items-center gap-2 mt-2">
        {t.partyName && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {t.partyName}
          </span>
        )}
        <p className="text-xs text-gray-500">
          {new Date(t.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}

function TestimonialsList({
  data,
  isLoading,
}: {
  data: { id: string; text: string; createdAt: Date | string; partyName?: string | null }[] | undefined;
  isLoading: boolean;
}) {
  if (isLoading) return <p className="text-sm text-gray-600">Loading…</p>;
  if (!data?.length) return <p className="text-sm text-gray-600">No testimonials yet.</p>;
  return (
    <div className="space-y-3">
      {data.map((t) => (
        <TestimonialCard key={t.id} t={t} />
      ))}
    </div>
  );
}

export function PartyTestimonialsSection({ partyId }: { partyId: string }) {
  const { data, isLoading } = trpc.testimonials.listForParty.useQuery({ partyId });
  return <TestimonialsList data={data} isLoading={isLoading} />;
}

export function BankTestimonialsSection({ ideaBankId }: { ideaBankId: string }) {
  const { data, isLoading } = trpc.testimonials.listForBank.useQuery({ ideaBankId });
  return <TestimonialsList data={data} isLoading={isLoading} />;
}
