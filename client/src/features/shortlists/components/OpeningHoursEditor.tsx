import { X } from 'lucide-react';
import { INPUT_CLASS, SECONDARY_BUTTON } from '../lib/styles';
import type { OpeningHoursEntry } from '../lib/types';

interface OpeningHoursEditorProps {
  value: OpeningHoursEntry[];
  onChange: (value: OpeningHoursEntry[]) => void;
}

export default function OpeningHoursEditor({ value, onChange }: OpeningHoursEditorProps) {
  const rows = value || [];

  const updateRow = (index: number, field: keyof OpeningHoursEntry, nextValue: string) => {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: nextValue } : row)));
  };

  const addRow = () => {
    onChange([...rows, { days: '', opens: '09:00', closes: '17:00' }]);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={`${row.days}-${index}`} className="grid grid-cols-[1fr_120px_120px_40px] gap-2">
          <input
            type="text"
            value={row.days}
            onChange={(event) => updateRow(index, 'days', event.target.value)}
            placeholder="Mon-Fri"
            className={INPUT_CLASS}
          />
          <input
            type="time"
            value={row.opens}
            onChange={(event) => updateRow(index, 'opens', event.target.value)}
            className={INPUT_CLASS}
          />
          <input
            type="time"
            value={row.closes}
            onChange={(event) => updateRow(index, 'closes', event.target.value)}
            className={INPUT_CLASS}
          />
          <button type="button" onClick={() => removeRow(index)} className={SECONDARY_BUTTON} aria-label="Remove hours">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow} className={SECONDARY_BUTTON}>
        + Add hours
      </button>
    </div>
  );
}
