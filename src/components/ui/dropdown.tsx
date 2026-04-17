import type * as React from 'react';

type DropdownOption<T extends string | number> = {
  label: string;
  value: T;
};

type DropdownProps<T extends string | number> = {
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  hideLabel?: boolean;
  className?: string;
  selectClassName?: string;
  ariaLabel?: string;
};

const CHEVRON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10l5 5l5 -5" /></svg>`;

export function DropdownField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  hideLabel = false,
  className = '',
  selectClassName = '',
  ariaLabel,
}: DropdownProps<T>) {
  return (
    <label className={`ui-dropdown${className ? ` ${className}` : ''}`}>
      {hideLabel ? null : <span className="ui-dropdown__label">{label}</span>}
      <span className="ui-dropdown__control">
        <select
          className={`ui-dropdown__select${selectClassName ? ` ${selectClassName}` : ''}`}
          aria-label={ariaLabel ?? label}
          value={String(value)}
          onChange={(event) => {
            const nextValue = options.find(
              (option) => String(option.value) === event.target.value,
            )?.value;

            if (nextValue !== undefined) {
              onChange(nextValue);
            }
          }}
        >
          {options.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
        <span
          className="ui-dropdown__icon"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: CHEVRON_SVG }}
        />
      </span>
    </label>
  );
}
