"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Trophy, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RaceResult {
  id: string;
  name: string;
  series: string;
  distanceCategory: string;
  location: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  swimDistanceM: number;
  bikeDistanceM: number;
  runDistanceM: number;
  bikeElevationGainM: number | null;
  runElevationGainM: number | null;
  hasGpx: boolean;
  stats: {
    totalAthletes: number;
    medianFinishSec: number | null;
  } | null;
  typicalMonth: number | null;
  score: number;
}

interface RaceSearchComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onRaceSelect: (race: RaceResult) => void;
  onClear: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const SERIES_COLORS: Record<string, string> = {
  ironman: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  ironman703: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  t100: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  challenge:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

const SERIES_LABELS: Record<string, string> = {
  ironman: "IRONMAN",
  ironman703: "70.3",
  t100: "T100",
  challenge: "Challenge",
  other: "Other",
};

const MONTH_NAMES = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatFinishTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h${m.toString().padStart(2, "0")}m`;
}

function formatAthletes(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RaceSearchCombobox({
  value,
  onChange,
  onRaceSelect,
  onClear,
}: RaceSearchComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<RaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isRaceSelected, setIsRaceSelected] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Fetch results ──
  const fetchResults = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/races/search?q=${encodeURIComponent(query)}&limit=8`,
      );
      const data = await res.json();
      setResults(data.races || []);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Debounced search ──
  useEffect(() => {
    if (isRaceSelected) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length === 0) {
      // Show popular races when empty and focused
      if (isOpen) {
        fetchResults("");
      }
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchResults(value);
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, isOpen, isRaceSelected, fetchResults]);

  // ── Click outside ──
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Handlers ──
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsRaceSelected(false);
    setSelectedIndex(-1);
    if (!isOpen) setIsOpen(true);

    // If user clears the input, reset the race selection
    if (newValue === "") {
      onClear();
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (results.length === 0 && !isRaceSelected) {
      fetchResults(value);
    }
  };

  const handleSelect = (race: RaceResult) => {
    onChange(race.name);
    setIsRaceSelected(true);
    setIsOpen(false);
    setSelectedIndex(-1);
    onRaceSelect(race);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    const totalItems = results.length + 1; // +1 for "Custom race" option

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalItems);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        } else if (selectedIndex === results.length || value.length > 0) {
          // "Custom race" option or just press enter with text
          setIsOpen(false);
          setIsRaceSelected(false);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const showDropdown = isOpen && (results.length > 0 || isLoading || value.length > 0);

  return (
    <div className="relative">
      {/* Input */}
      <div className="relative">
        {isRaceSelected ? (
          <Trophy className="absolute left-3 top-2.5 h-5 w-5 text-primary" />
        ) : (
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
        )}
        <Input
          ref={inputRef}
          placeholder="Search races... (e.g. IRONMAN Dubai, Challenge Roth)"
          className={cn(
            "pl-10 pr-8",
            isRaceSelected && "border-primary/50 bg-primary/5",
          )}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground animate-spin" />
        ) : (
          <ChevronDown
            className={cn(
              "absolute right-3 top-2.5 h-5 w-5 text-muted-foreground transition-transform",
              isOpen && "rotate-180",
            )}
          />
        )}
      </div>

      {/* Selected race info badge */}
      {isRaceSelected && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            setIsRaceSelected(false);
            onClear();
            inputRef.current?.focus();
          }}
          className="mt-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear selection to search again
        </button>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg overflow-hidden"
          role="listbox"
        >
          {/* Loading state */}
          {isLoading && results.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              Searching races...
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="max-h-[320px] overflow-y-auto">
              {results.map((race, idx) => (
                <button
                  key={race.id}
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b border-border/50 last:border-b-0",
                    selectedIndex === idx && "bg-accent",
                  )}
                  onClick={() => handleSelect(race)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  role="option"
                  aria-selected={selectedIndex === idx}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {race.name}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded",
                            SERIES_COLORS[race.series] || SERIES_COLORS.other,
                          )}
                        >
                          {SERIES_LABELS[race.series] || race.distanceCategory}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {race.location}
                        </span>
                        {race.typicalMonth && (
                          <span>{MONTH_NAMES[race.typicalMonth]}</span>
                        )}
                        {race.stats?.totalAthletes && (
                          <span>
                            {formatAthletes(race.stats.totalAthletes)} athletes
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {race.stats?.medianFinishSec && (
                        <div className="text-xs text-muted-foreground">
                          ~{formatFinishTime(race.stats.medianFinishSec)}
                        </div>
                      )}
                      {race.hasGpx && (
                        <div className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                          GPX
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Custom race option */}
          {value.length > 0 && (
            <button
              type="button"
              className={cn(
                "w-full text-left px-3 py-2.5 hover:bg-accent transition-colors text-sm text-muted-foreground border-t border-border",
                selectedIndex === results.length && "bg-accent",
              )}
              onClick={() => {
                setIsOpen(false);
                setIsRaceSelected(false);
              }}
              onMouseEnter={() => setSelectedIndex(results.length)}
              role="option"
              aria-selected={selectedIndex === results.length}
            >
              Use &quot;{value}&quot; as custom race name
            </button>
          )}

          {/* Empty state */}
          {!isLoading && results.length === 0 && value.length > 2 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No races found. You can use the name as a custom race.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
