// // hooks/useArticles.ts

// import { useState, useEffect, useCallback } from 'react';
// import { articleService } from '../../services/article.service';
// import {
//   Article,
//   ArticleFilters,
//   PaginatedResponse,
//   CreateArticleDto,
//   UpdateArticleDto,
// } from '@/types/article.types';

// interface UseArticlesOptions {
//   autoLoad?: boolean;
//   initialFilters?: ArticleFilters;
// }

// export const useArticles = (options: UseArticlesOptions = {}) => {
//   const { autoLoad = true, initialFilters = {} } = options;

//   const [articles, setArticles] = useState<Article[]>([]);
//   const [total, setTotal] = useState(0);
//   const [page, setPage] = useState(1);
//   const [limit, setLimit] = useState(10);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [filters, setFilters] = useState<ArticleFilters>(initialFilters);

//   const loadArticles = useCallback(async () => {
//     setIsLoading(true);
//     setError(null);

//     try {
//       const response: PaginatedResponse<Article> = await articleService.getArticles({
//         ...filters,
//         page,
//         limit,
//       });

//       setArticles(response.data);
//       setTotal(response.total);
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors du chargement des articles');
//       console.error('Error loading articles:', err);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [filters, page, limit]);

//   useEffect(() => {
//     if (autoLoad) {
//       loadArticles();
//     }
//   }, [autoLoad, loadArticles]);

//   const createArticle = useCallback(async (data: CreateArticleDto): Promise<Article> => {
//     setError(null);
//     try {
//       const article = await articleService.createArticle(data);
//       await loadArticles(); // Recharger la liste
//       return article;
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors de la création de l\'article');
//       throw err;
//     }
//   }, [loadArticles]);

//   const updateArticle = useCallback(async (id: number, data: UpdateArticleDto): Promise<Article> => {
//     setError(null);
//     try {
//       const article = await articleService.updateArticle(id, data);
//       await loadArticles(); // Recharger la liste
//       return article;
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors de la mise à jour de l\'article');
//       throw err;
//     }
//   }, [loadArticles]);

//   const deleteArticle = useCallback(async (id: number): Promise<void> => {
//     setError(null);
//     try {
//       await articleService.deleteArticle(id);
//       await loadArticles(); // Recharger la liste
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors de la suppression de l\'article');
//       throw err;
//     }
//   }, [loadArticles]);

//   const likeArticle = useCallback(async (id: number): Promise<void> => {
//     setError(null);
//     try {
//       await articleService.likeArticle(id);
//       // Mettre à jour localement
//       setArticles(prev =>
//         prev.map(article =>
//           article.id === id
//             ? { ...article, likes: article.likes + 1 }
//             : article
//         )
//       );
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors du like de l\'article');
//       throw err;
//     }
//   }, []);

//   const updateFilters = useCallback((newFilters: Partial<ArticleFilters>) => {
//     setFilters(prev => ({ ...prev, ...newFilters }));
//     setPage(1); // Reset à la première page
//   }, []);

//   const nextPage = useCallback(() => {
//     if (page * limit < total) {
//       setPage(prev => prev + 1);
//     }
//   }, [page, limit, total]);

//   const previousPage = useCallback(() => {
//     if (page > 1) {
//       setPage(prev => prev - 1);
//     }
//   }, [page]);

//   const goToPage = useCallback((newPage: number) => {
//     if (newPage >= 1 && newPage <= Math.ceil(total / limit)) {
//       setPage(newPage);
//     }
//   }, [total, limit]);

//   return {
//     // Data
//     articles,
//     total,
//     page,
//     limit,
//     isLoading,
//     error,
//     filters,
    
//     // Actions
//     loadArticles,
//     createArticle,
//     updateArticle,
//     deleteArticle,
//     likeArticle,
//     updateFilters,
    
//     // Pagination
//     nextPage,
//     previousPage,
//     goToPage,
//     setLimit,
    
//     // Computed
//     hasNextPage: page * limit < total,
//     hasPreviousPage: page > 1,
//     totalPages: Math.ceil(total / limit),
//   };
// };

// // hooks/useArticle.ts

// export const useArticle = (id: number | null) => {
//   const [article, setArticle] = useState<Article | null>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const loadArticle = useCallback(async () => {
//     if (!id) return;

//     setIsLoading(true);
//     setError(null);

//     try {
//       const data = await articleService.getArticle(id);
//       setArticle(data);
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors du chargement de l\'article');
//       console.error('Error loading article:', err);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [id]);

//   useEffect(() => {
//     loadArticle();
//   }, [loadArticle]);

//   const updateArticle = useCallback(async (data: UpdateArticleDto): Promise<Article> => {
//     if (!id) throw new Error('No article ID provided');

//     setError(null);
//     try {
//       const updatedArticle = await articleService.updateArticle(id, data);
//       setArticle(updatedArticle);
//       return updatedArticle;
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors de la mise à jour de l\'article');
//       throw err;
//     }
//   }, [id]);

//   const deleteArticle = useCallback(async (): Promise<void> => {
//     if (!id) throw new Error('No article ID provided');

//     setError(null);
//     try {
//       await articleService.deleteArticle(id);
//       setArticle(null);
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors de la suppression de l\'article');
//       throw err;
//     }
//   }, [id]);

//   const likeArticle = useCallback(async (): Promise<void> => {
//     if (!id) throw new Error('No article ID provided');

//     setError(null);
//     try {
//       const updatedArticle = await articleService.likeArticle(id);
//       setArticle(updatedArticle);
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors du like de l\'article');
//       throw err;
//     }
//   }, [id]);

//   const incrementViews = useCallback(async (): Promise<void> => {
//     if (!id) return;

//     try {
//       await articleService.incrementViews(id);
//       if (article) {
//         setArticle({ ...article, views: article.views + 1 });
//       }
//     } catch (err: any) {
//       console.error('Error incrementing views:', err);
//     }
//   }, [id, article]);

//   return {
//     article,
//     isLoading,
//     error,
//     loadArticle,
//     updateArticle,
//     deleteArticle,
//     likeArticle,
//     incrementViews,
//   };
// };

// // hooks/useCategories.ts

// import { Category } from '@/types/article.types';

// export const useCategories = () => {
//   const [categories, setCategories] = useState<Category[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const loadCategories = useCallback(async () => {
//     setIsLoading(true);
//     setError(null);

//     try {
//       const data = await articleService.getCategories();
//       setCategories(data);
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors du chargement des catégories');
//       console.error('Error loading categories:', err);
//     } finally {
//       setIsLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     loadCategories();
//   }, [loadCategories]);

//   return {
//     categories,
//     isLoading,
//     error,
//     loadCategories,
//   };
// };

// // hooks/useTags.ts

// import { Tag } from '@/types/article.types';

// export const useTags = () => {
//   const [tags, setTags] = useState<Tag[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const loadTags = useCallback(async () => {
//     setIsLoading(true);
//     setError(null);

//     try {
//       const data = await articleService.getTags();
//       setTags(data);
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors du chargement des tags');
//       console.error('Error loading tags:', err);
//     } finally {
//       setIsLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     loadTags();
//   }, [loadTags]);

//   return {
//     tags,
//     isLoading,
//     error,
//     loadTags,
//   };
// };

// // hooks/useFileUpload.ts

// export const useFileUpload = () => {
//   const [isUploading, setIsUploading] = useState(false);
//   const [progress, setProgress] = useState(0);
//   const [error, setError] = useState<string | null>(null);

//   const uploadFile = useCallback(async (file: File) => {
//     setIsUploading(true);
//     setProgress(0);
//     setError(null);

//     try {
//       // Simuler la progression
//       const progressInterval = setInterval(() => {
//         setProgress(prev => Math.min(prev + 10, 90));
//       }, 100);

//       const mediaDto = await articleService.uploadFile(file);

//       clearInterval(progressInterval);
//       setProgress(100);

//       return mediaDto;
//     } catch (err: any) {
//       setError(err.message || 'Erreur lors de l\'upload du fichier');
//       throw err;
//     } finally {
//       setIsUploading(false);
//       setTimeout(() => setProgress(0), 1000);
//     }
//   }, []);

//   return {
//     uploadFile,
//     isUploading,
//     progress,
//     error,
//   };
// };