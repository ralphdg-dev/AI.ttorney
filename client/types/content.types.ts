export interface ContentSection {
  id: string;
  type: 'introduction' | 'section' | 'subsection' | 'list' | 'important_note';
  title_en: string;
  title_fil?: string;
  content_en: string;
  content_fil?: string;
  order: number;
  items_en?: string[];
  items_fil?: string[];
}

export interface StructuredArticle {
  id: number;
  title_en: string;
  title_fil?: string;
  summary_en: string;
  summary_fil?: string;
  sections: ContentSection[];
  category: string;
  imageUrl?: string;
  author?: string;
  created_at: string;
  updated_at?: string;
  is_verified?: boolean;
  verified_at?: string;
}
