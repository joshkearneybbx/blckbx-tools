import { X } from 'lucide-react';
import { INPUT_CLASS, SECONDARY_BUTTON } from '../lib/styles';
import type { CustomField } from '../lib/types';

interface CustomFieldsEditorProps {
  value: CustomField[];
  onChange: (value: CustomField[]) => void;
}

export default function CustomFieldsEditor({ value, onChange }: CustomFieldsEditorProps) {
  const fields = value || [];

  const updateField = (id: string, key: keyof CustomField, nextValue: string) => {
    onChange(fields.map((field) => (field.id === id ? { ...field, [key]: nextValue } : field)));
  };

  const addField = () => {
    onChange([...fields, { id: `cf_${Date.now()}`, label: '', value: '' }]);
  };

  const removeField = (id: string) => {
    onChange(fields.filter((field) => field.id !== id));
  };

  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div key={field.id} className="grid grid-cols-[180px_1fr_40px] gap-2">
          <input
            type="text"
            value={field.label}
            onChange={(event) => updateField(field.id, 'label', event.target.value)}
            placeholder="Label"
            className={INPUT_CLASS}
          />
          <textarea
            value={field.value}
            onChange={(event) => updateField(field.id, 'value', event.target.value)}
            placeholder="Value"
            rows={1}
            className={INPUT_CLASS}
          />
          <button type="button" onClick={() => removeField(field.id)} className={SECONDARY_BUTTON} aria-label="Remove custom field">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={addField} className={SECONDARY_BUTTON}>
        + Add custom field
      </button>
    </div>
  );
}
