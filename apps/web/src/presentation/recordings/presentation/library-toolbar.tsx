// TJ-ARCH-MOB-001 compliant
// recordings.html library toolbar: search (labelled, leading icon), "Show"
// segmented filter, "Sort by" native select and "View" segmented grid/list.
// Segments carry a check when pressed (state is never colour alone).
import { Input } from "@know-meet/ui/components/input";
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { NativeSelect, NativeSelectOption } from "@know-meet/ui/components/native-select";
import { ToggleGroup, ToggleGroupItem } from "@know-meet/ui/components/toggle-group";
import { useId } from "react";
import type { LibraryFilter, LibraryLayout, LibrarySort } from "../domain/recording-details";

export interface LibraryControls {
  readonly q: string;
  readonly filter: LibraryFilter;
  readonly sort: LibrarySort;
  readonly layout: LibraryLayout;
}

interface Option<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly icon?: KmIconName;
}

const FILTERS: readonly Option<LibraryFilter>[] = [
  { value: "all", label: "All" },
  { value: "shared", label: "Shared with me" },
  { value: "mine", label: "Mine" },
];

const SORTS: readonly Option<LibrarySort>[] = [
  { value: "new", label: "Newest first" },
  { value: "old", label: "Oldest first" },
  { value: "long", label: "Longest first" },
  { value: "title", label: "Title A–Z" },
];

const LAYOUTS: readonly Option<LibraryLayout>[] = [
  { value: "grid", label: "Grid", icon: "film" },
  { value: "list", label: "List", icon: "menu" },
];

function SegmentedField<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  readonly label: string;
  readonly options: readonly Option<T>[];
  readonly value: T;
  readonly onChange: (next: T) => void;
}) {
  const labelId = useId();
  return (
    <div className="grid min-w-0 gap-1.5">
      <span id={labelId} className="text-sm font-semibold">
        {label}
      </span>
      <ToggleGroup
        aria-labelledby={labelId}
        value={[value]}
        onValueChange={(next) => {
          const picked = options.find((option) => next.includes(option.value));
          if (picked !== undefined) onChange(picked.value);
        }}
      >
        {options.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.icon === undefined ? null : <KmIcon name={option.icon} className="size-4" />}
            <span>{option.label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

export function LibraryToolbar({
  controls,
  onChange,
}: {
  readonly controls: LibraryControls;
  readonly onChange: (next: LibraryControls) => void;
}) {
  return (
    <div className="mb-s4 flex flex-wrap items-end gap-x-s4 gap-y-s3">
      <div className="grid min-w-0 flex-[1_1_260px] gap-1.5">
        <label htmlFor="rec-q" className="text-sm font-semibold">
          Search recordings
        </label>
        <div className="relative">
          <Input
            id="rec-q"
            type="search"
            placeholder="Title or participant"
            autoComplete="off"
            value={controls.q}
            onChange={(event) => onChange({ ...controls, q: event.target.value })}
            className="peer pl-[42px]"
          />
          <KmIcon
            name="search"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-on-control peer-focus-visible:text-on-focus"
          />
        </div>
      </div>
      <SegmentedField
        label="Show"
        options={FILTERS}
        value={controls.filter}
        onChange={(filter) => onChange({ ...controls, filter })}
      />
      <div className="grid min-w-0 gap-1.5">
        <label htmlFor="rec-sort" className="text-sm font-semibold">
          Sort by
        </label>
        <NativeSelect
          id="rec-sort"
          className="w-auto"
          value={controls.sort}
          onChange={(event) => {
            const sort = SORTS.find((option) => option.value === event.target.value);
            if (sort !== undefined) onChange({ ...controls, sort: sort.value });
          }}
        >
          {SORTS.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <SegmentedField
        label="View"
        options={LAYOUTS}
        value={controls.layout}
        onChange={(layout) => onChange({ ...controls, layout })}
      />
    </div>
  );
}
