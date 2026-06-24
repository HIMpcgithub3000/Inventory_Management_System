import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { CenterSpinner, EmptyState, ErrorState, SkeletonRows } from "./ui";

/**
 * Columns: [{ key, header, align, sortable, sortValue(row), render(row), className }]
 * Rows are pre-filtered by the page; this handles sort + pagination + selection.
 */
export default function DataTable({
  columns,
  data,
  loading,
  error,
  onRetry,
  rowKey = (r) => r.id,
  onRowClick,
  selectable = false,
  selected = [],
  onSelectedChange,
  pageSize = 8,
  empty,
  initialSort,
}) {
  const [sort, setSort] = useState(initialSort || { key: null, dir: "asc" });
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort.key) return data || [];
    const col = columns.find((c) => c.key === sort.key);
    const val = col?.sortValue || ((r) => r[sort.key]);
    return [...(data || [])].sort((a, b) => {
      const av = val(a), bv = val(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [data, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize);

  const toggleSort = (key) => {
    setPage(0);
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  };

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.includes(rowKey(r)));
  const togglePageAll = () => {
    const ids = pageRows.map(rowKey);
    onSelectedChange(allOnPageSelected ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])]);
  };
  const toggleOne = (id) => onSelectedChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  if (loading) return <SkeletonRows rows={pageSize} cols={columns.length} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!data || data.length === 0) return empty || <EmptyState title="Nothing here yet" />;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-brand-100">
              {selectable && (
                <th className="th w-10 pr-0">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded border-brand-300 text-brand-600 focus:ring-brand-500/30"
                    checked={allOnPageSelected}
                    onChange={togglePageAll}
                    aria-label="Select all on page"
                  />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} className={`th ${c.align === "right" ? "text-right" : ""}`}>
                  {c.sortable ? (
                    <button
                      onClick={() => toggleSort(c.key)}
                      className={`group inline-flex items-center gap-1 transition hover:text-brand-600 ${
                        c.align === "right" ? "flex-row-reverse" : ""
                      }`}
                      aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    >
                      {c.header}
                      {sort.key === c.key ? (
                        sort.dir === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 text-brand-300 opacity-0 transition group-hover:opacity-100" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {pageRows.map((row) => {
              const id = rowKey(row);
              const isSel = selected.includes(id);
              return (
                <tr
                  key={id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`row-hover ${onRowClick ? "cursor-pointer" : ""} ${isSel ? "bg-brand-50" : ""}`}
                >
                  {selectable && (
                    <td className="td pr-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border-brand-300 text-brand-600 focus:ring-brand-500/30"
                        checked={isSel}
                        onChange={() => toggleOne(id)}
                        aria-label="Select row"
                      />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={`td ${c.align === "right" ? "text-right" : ""} ${c.className || ""}`}>
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length > pageSize && (
        <div className="flex items-center justify-between gap-3 border-t border-brand-100 px-4 py-3 text-sm text-brand-500">
          <span className="tnum text-xs">
            {clampedPage * pageSize + 1}–{Math.min((clampedPage + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button className="btn-icon h-8 w-8" disabled={clampedPage === 0} onClick={() => setPage(clampedPage - 1)} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="tnum px-2 text-xs">
              {clampedPage + 1} / {pageCount}
            </span>
            <button
              className="btn-icon h-8 w-8"
              disabled={clampedPage >= pageCount - 1}
              onClick={() => setPage(clampedPage + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
