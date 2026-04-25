import { Facebook, Instagram, Linkedin, Music2, Twitter, Youtube, type LucideIcon } from 'lucide-react';
import { INPUT_CLASS } from '../lib/styles';
import type { SocialLinks } from '../lib/types';

const PLATFORMS: Array<{ key: keyof SocialLinks; label: string; placeholder: string; Icon: LucideIcon }> = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/handle', Icon: Instagram },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/page', Icon: Facebook },
  { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/handle', Icon: Twitter },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@handle', Icon: Music2 },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/name', Icon: Linkedin },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@channel', Icon: Youtube },
];

interface SocialLinksEditorProps {
  value: SocialLinks;
  onChange: (value: SocialLinks) => void;
}

export default function SocialLinksEditor({ value, onChange }: SocialLinksEditorProps) {
  const setField = (key: keyof SocialLinks, nextValue: string) => {
    const next = { ...(value || {}) };
    if (nextValue.trim()) next[key] = nextValue;
    else delete next[key];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {PLATFORMS.map(({ key, label, placeholder, Icon }) => {
        const fieldValue = value?.[key] || '';
        const invalid = fieldValue.trim().length > 0 && !/^https?:\/\//i.test(fieldValue.trim());
        return (
          <div key={key} className="space-y-1">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6B6865]">
              <Icon className="h-4 w-4" />
              {label}
            </label>
            <input
              type="url"
              value={fieldValue}
              onChange={(event) => setField(key, event.target.value)}
              placeholder={placeholder}
              className={INPUT_CLASS}
            />
            {invalid && <p className="text-xs text-[#6B6865]">Please paste the full URL.</p>}
          </div>
        );
      })}
    </div>
  );
}
