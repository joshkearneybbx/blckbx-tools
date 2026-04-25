export interface Shortlist {
  id: string;
  collectionId: string;
  user: string;
  name: string;
  customUrlSlug: string;
  status: 'draft' | 'published';
  clientName?: string;
  assistantName: string;
  assistantEmail: string;
  introMessage?: string;
  coverImage?: string;
  coverImageUrl?: string;
  viewMode: 'cards' | 'table';
  isTemplate: boolean;
  templateName?: string;
  templateDescription?: string;
  created: string;
  updated: string;
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface OpeningHoursEntry {
  days: string;
  opens: string;
  closes: string;
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  linkedin?: string;
  youtube?: string;
}

export interface ShortlistOption {
  id: string;
  collectionId: string;
  shortlist: string;
  name: string;
  website?: string;
  rating?: string;
  phone?: string;
  email?: string;
  address?: string;
  quote?: string;
  included?: string;
  notes?: string;
  openingHours?: OpeningHoursEntry[];
  socialLinks?: SocialLinks;
  customFields?: CustomField[];
  images: string[];
  primaryImage?: string;
  sourceUrl?: string;
  sourceType: 'manual' | 'autofill';
  displayOrder: number;
  visible: boolean;
  created: string;
  updated: string;
}

export interface AutofillResponse {
  success: boolean;
  source: string;
  error?: string;
  data?: {
    name: string | null;
    website: string | null;
    rating: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    quote: string | null;
    included: string | null;
    notes: string | null;
    openingHours: OpeningHoursEntry[];
    socialLinks: SocialLinks;
    images: string[];
  };
}
