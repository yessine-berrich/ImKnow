export interface PublicationSearchResult {
  id: number;
  title: string;
  contentPreview: string;
  author: {
    id: number;
    firstName: string;
    lastName: string;
    profileImage: string | null;
  };
  category: {
    id: number;
    name: string;
  } | null;
  tags: Array<{
    id: number;
    name: string;
  }>;
  media?: Array<{
    id: number;
    url: string;
    filename: string;
    mimetype: string;
    type: string;
    size?: number;
  }>;
  viewsCount: number;
  likesCount: number;
  similarity?: number;
  createdAt: Date;
}

export interface CategorySearchResult {
  id: number;
  name: string;
  description: string | null;
  publicationsCount: number;
}

export interface TagSearchResult {
  id: number;
  name: string;
  publicationsCount: number;
}

export interface UserSearchResult {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profileImage: string | null;
  bio: string | null;
  department: string | null;
  country: string | null;
}

export interface GlobalSearchResult {
  query: string;
  publications: PublicationSearchResult[];
  categories: CategorySearchResult[];
  tags: TagSearchResult[];
  users: UserSearchResult[];
  totalResults: number;
}
