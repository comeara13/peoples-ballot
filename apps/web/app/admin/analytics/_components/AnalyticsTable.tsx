"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc, type RouterOutput } from "@/lib/trpc";
import { TAG_TYPE_STYLES } from "../../_components/shared";

// Must match UNKNOWN_ZIP in apps/api/src/analyticsScoring.ts.
const UNKNOWN_ZIP = "UNKNOWN";

type IdeaScoreRow = RouterOutput["analytics"]["ideaScores"][number] & { rank: number };

const columnHelper = createColumnHelper<IdeaScoreRow>();

function ideaText(row: IdeaScoreRow) {
  return row.translations.find((t) => t.language === "en")?.text ?? "—";
}

const columns = [
  columnHelper.accessor("rank", {
    header: "Rank",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor(ideaText, {
    id: "idea",
    header: "Idea (EN)",
    cell: (info) => <span className="line-clamp-2">{info.getValue()}</span>,
  }),
  columnHelper.accessor("tags", {
    header: "Tags",
    enableSorting: false,
    cell: (info) => (
      <div className="flex flex-wrap gap-1">
        {info.getValue().map((tag) => (
          <span
            key={tag.id}
            className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${TAG_TYPE_STYLES[tag.type] ?? "bg-gray-100 text-gray-600"}`}
          >
            {tag.name}
          </span>
        ))}
      </div>
    ),
  }),
  columnHelper.accessor("score", {
    header: "Score",
    cell: (info) => (
      <span className="font-mono text-gray-900">{info.getValue().toFixed(1)}%</span>
    ),
  }),
  columnHelper.accessor("wins", {
    header: "Wins",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("losses", {
    header: "Losses",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("voteCount", {
    header: "Votes",
    cell: (info) => info.getValue(),
  }),
];

function ZipFilter({
  bankId,
  selectedZips,
  onToggle,
}: {
  bankId: string;
  selectedZips: string[];
  onToggle: (zip: string) => void;
}) {
  const { data, isLoading } = trpc.analytics.zipOptions.useQuery({ ideaBankId: bankId });

  if (isLoading) return <p className="text-sm text-gray-600 mb-4">Loading zip filters…</p>;
  if (!data || (data.zips.length === 0 && data.unknownCount === 0)) return null;

  return (
    <div className="mb-4 p-3 border border-gray-200 rounded-lg bg-white">
      <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Filters</h2>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700 w-12 shrink-0">Zip</span>
        {data.zips.map((z) => (
          <label key={z.zip} className="flex items-center gap-1.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={selectedZips.includes(z.zip)}
              onChange={() => onToggle(z.zip)}
            />
            {z.zip} <span className="text-gray-600">({z.count})</span>
          </label>
        ))}
        {data.unknownCount > 0 && (
          <label className="flex items-center gap-1.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={selectedZips.includes(UNKNOWN_ZIP)}
              onChange={() => onToggle(UNKNOWN_ZIP)}
            />
            Unknown <span className="text-gray-600">({data.unknownCount})</span>
          </label>
        )}
        {selectedZips.length === 0 && (
          <span className="text-xs text-gray-600">No filter — showing all votes</span>
        )}
      </div>
    </div>
  );
}

export function AnalyticsTable({ bankId }: { bankId: string }) {
  const [selectedZips, setSelectedZips] = useState<string[]>([]);
  const [sorting, setSorting] = useState<SortingState>([{ id: "rank", desc: false }]);

  function toggleZip(zip: string) {
    setSelectedZips((prev) => (prev.includes(zip) ? prev.filter((z) => z !== zip) : [...prev, zip]));
  }

  const { data, isLoading, isFetching, error } = trpc.analytics.ideaScores.useQuery(
    { ideaBankId: bankId, zipCodes: selectedZips.length > 0 ? selectedZips : undefined },
    { placeholderData: keepPreviousData },
  );

  const rankedData: IdeaScoreRow[] = useMemo(
    () => (data ?? []).map((row, i) => ({ ...row, rank: i + 1 })),
    [data],
  );

  const table = useReactTable({
    data: rankedData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div>
      <ZipFilter bankId={bankId} selectedZips={selectedZips} onToggle={toggleZip} />

      {isLoading && <p className="text-sm text-gray-600">Loading ideas…</p>}
      {error && <p className="text-sm text-red-600">Error: {error.message}</p>}

      {!isLoading && !error && (
        <div className="relative">
          {isFetching && (
            <div className="absolute -top-6 right-0 text-xs text-gray-600 flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              Updating…
            </div>
          )}
          <div
            className={`overflow-x-auto border border-gray-200 rounded-lg bg-white transition-opacity ${isFetching ? "opacity-60" : ""}`}
          >
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-gray-200">
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="text-left px-3 py-2 whitespace-nowrap">
                        {header.column.getCanSort() ? (
                          <button
                            onClick={header.column.getToggleSortingHandler()}
                            className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wide hover:text-gray-900"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <span aria-hidden="true">
                              {{ asc: "▲", desc: "▼" }[header.column.getIsSorted() as string] ?? ""}
                            </span>
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 last:border-0">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 text-gray-800 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
                {rankedData.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-3 py-6 text-center text-gray-600">
                      No ideas match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
