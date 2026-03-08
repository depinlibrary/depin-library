import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Search } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import ProjectLogo from "@/components/ProjectLogo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CompareWithButtonProps {
  currentProjectId: string;
  currentProjectName: string;
}

const CompareWithButton = ({ currentProjectId, currentProjectName }: CompareWithButtonProps) => {
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = projects
    .filter((p) => p.id !== currentProjectId)
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 6);

  const handleSelect = useCallback((projectId: string) => {
    setOpen(false);
    setSearch("");
    setActiveIndex(-1);
    navigate(`/compare?a=${currentProjectId}&b=${projectId}`);
  }, [currentProjectId, navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (filtered.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filtered.length) {
          handleSelect(filtered[activeIndex].id);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  }, [filtered, activeIndex, handleSelect]);

  // Reset active index when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setActiveIndex(-1);
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSearch(""); setActiveIndex(-1); } }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Compare
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end" onKeyDown={handleKeyDown}>
        <div className="border-b border-border p-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Compare <span className="font-medium text-foreground">{currentProjectName}</span> with…
          </p>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-8 pl-8 text-sm"
              autoFocus
              role="combobox"
              aria-expanded={open}
              aria-controls="compare-listbox"
              aria-activedescendant={activeIndex >= 0 ? `compare-option-${activeIndex}` : undefined}
              aria-label={`Search projects to compare with ${currentProjectName}`}
            />
          </div>
        </div>
        <div
          aria-live="assertive"
          aria-atomic="true"
          className="sr-only"
        >
          {activeIndex >= 0 && activeIndex < filtered.length
            ? `${filtered[activeIndex].name}, ${filtered[activeIndex].category}, ${activeIndex + 1} of ${filtered.length}`
            : filtered.length === 0 && search
              ? "No projects found"
              : ""
          }
        </div>
        <div ref={listRef} className="max-h-56 overflow-y-auto p-1.5" role="listbox" id="compare-listbox" aria-label="Projects to compare">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">No projects found</p>
          ) : (
            filtered.map((p, i) => (
              <button
                key={p.id}
                id={`compare-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onClick={() => handleSelect(p.id)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
                  i === activeIndex ? "bg-secondary" : "hover:bg-secondary"
                }`}
              >
                <ProjectLogo logoUrl={p.logo_url} logoEmoji={p.logo_emoji} name={p.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.category} · {p.blockchain}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CompareWithButton;
