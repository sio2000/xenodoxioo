import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

type AdminPaginationBarProps = {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
};

/** Styled prev/next + page indicator for admin list sections. */
export function AdminPaginationBar({
  currentPage,
  totalPages,
  onPrev,
  onNext,
  className,
}: AdminPaginationBarProps) {
  const { t } = useLanguage();

  if (totalPages <= 1) return null;

  const pageLabel = t("admin.pageOf")
    .replace("{current}", String(currentPage))
    .replace("{total}", String(totalPages));

  return (
    <nav
      aria-label={pageLabel}
      className={cn("flex justify-center pt-2", className)}
    >
      <div
        className={cn(
          "inline-flex flex-wrap items-center justify-center gap-0.5 sm:gap-1",
          "rounded-xl border-2 border-primary/15 bg-gradient-to-b from-muted/40 to-muted/10",
          "px-1.5 py-1.5 shadow-md shadow-primary/5",
        )}
      >
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={onPrev}
          className={cn(
            "h-10 gap-1.5 rounded-lg px-4 font-semibold",
            "border border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary",
            "shadow-sm transition-all active:scale-[0.98]",
            "disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none",
          )}
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
          {t("admin.previous")}
        </Button>
        <span
          className={cn(
            "mx-1 min-w-[9.5rem] px-3 py-2 text-center text-sm font-semibold tabular-nums",
            "text-foreground border-x border-primary/10",
          )}
        >
          {pageLabel}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={onNext}
          className={cn(
            "h-10 gap-1.5 rounded-lg px-4 font-semibold",
            "border border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary",
            "shadow-sm transition-all active:scale-[0.98]",
            "disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none",
          )}
        >
          {t("admin.next")}
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
