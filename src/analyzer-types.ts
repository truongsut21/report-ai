// ===== Blog Post Analyzer Types =====

export interface ArticleAnalysis {
  url: string;
  title: string;
  meta: ArticleMeta;
  outline: OutlineItem[];
  sections: ContentSection[];
  images: ImageInfo[];
  tables: TableInfo[];
  links: LinkInfo[];
  stats: ArticleStats;
}

export interface ArticleMeta {
  author?: string;
  publishDate?: string;
  views?: string;
  rating?: string;
  breadcrumb: string[];
}

export interface OutlineItem {
  level: number;
  text: string;
  id: string;
}

export interface ContentSection {
  heading: string;
  level: number;
  id: string;
  content: ContentBlock[];
}

export interface ContentBlock {
  type:
    | 'paragraph'
    | 'list'
    | 'table'
    | 'image'
    | 'code'
    | 'blockquote'
    | 'featured-snippet'
    | 'heading';
  data: ParagraphData | ListData | TableData | ImageData | CodeData | BlockquoteData | FeaturedSnippetData | HeadingData;
}

export interface ParagraphData {
  text: string;
  html: string;
}

export interface ListData {
  ordered: boolean;
  items: string[];
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface ImageData {
  src: string;
  alt: string;
  caption?: string;
  width?: string;
  height?: string;
}

export interface CodeData {
  language?: string;
  code: string;
}

export interface BlockquoteData {
  text: string;
}

export interface FeaturedSnippetData {
  title: string;
  items: { text: string; href?: string }[];
}

export interface HeadingData {
  level: number;
  text: string;
  id: string;
}

export interface ImageInfo {
  src: string;
  alt: string;
  caption?: string;
}

export interface TableInfo {
  headers: string[];
  rows: string[][];
  context?: string; // heading gần nhất
}

export interface LinkInfo {
  href: string;
  text: string;
  type: 'internal' | 'external';
}

export interface ArticleStats {
  wordCount: number;
  paragraphCount: number;
  headingCount: { h1: number; h2: number; h3: number; h4: number };
  imageCount: number;
  tableCount: number;
  listCount: number;
  linkCount: { internal: number; external: number };
}
