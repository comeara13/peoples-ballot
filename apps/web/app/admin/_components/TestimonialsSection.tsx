"use client";

import { trpc } from "@/lib/trpc";

export function PartyTestimonialsSection({ partyId }: { partyId: string }) {
  const { data, isLoading } = trpc.testimonials.listForParty.useQuery({ partyId });

  return (
    <div>
      {isLoading && <p className="text-sm text-gray-600">Loading…</p>}

      {!isLoading && !data?.length && (
        <p className="text-sm text-gray-600">No testimonials yet.</p>
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((t) => (
            <div key={t.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{t.text}</p>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(t.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BankTestimonialsSection({ ideaBankId }: { ideaBankId: string }) {
  const { data, isLoading } = trpc.testimonials.listForBank.useQuery({ ideaBankId });

  return (
    <div>
      {isLoading && <p className="text-sm text-gray-600">Loading…</p>}

      {!isLoading && !data?.length && (
        <p className="text-sm text-gray-600">No testimonials yet.</p>
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((t) => (
            <div key={t.id} className="border border-gray-200 rounded-lg p-4 bg-white">
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
          ))}
        </div>
      )}
    </div>
  );
}
