import { request } from "./api";

export interface AssetCategoryItem {
  id: string;
  label: string;
}

export interface AssetTypeItem {
  id: string;
  categoryId: string;
  label: string;
}

export interface AssetNameItem {
  id: string;
  typeId: string;
  label: string;
}

export interface AssetCategoryData {
  id: string;
  _id: string;

  categories: AssetCategoryItem[];
  types: AssetTypeItem[];
  names: AssetNameItem[];

  createdAt?: string;
  updatedAt?: string;
}

export interface CategoriesResponse {
  categories: AssetCategoryItem[];
}

export interface TypesResponse {
  types: AssetTypeItem[];
}

export interface NamesResponse {
  names: AssetNameItem[];
}

export const assetCategoryApi = {
  /**
   * Get complete category/type/name data.
   *
   * GET /asset-categories
   */
  getAll: () =>
    request<AssetCategoryData>("/asset-categories", {
      method: "GET",
    }),

  /**
   * Get only categories.
   *
   * GET /asset-categories/categories
   */
  getCategories: () =>
    request<CategoriesResponse>("/asset-categories/categories", {
      method: "GET",
    }),

  /**
   * Get types belonging to a category.
   *
   * GET /asset-categories/categories/:categoryId/types
   */
  getTypesByCategoryId: (categoryId: string) =>
    request<TypesResponse>(
      `/asset-categories/categories/${encodeURIComponent(categoryId)}/types`,
      {
        method: "GET",
      },
    ),

  /**
   * Get names belonging to a type.
   *
   * GET /asset-categories/types/:typeId/names
   */
  getNamesByTypeId: (typeId: string) =>
    request<NamesResponse>(
      `/asset-categories/types/${encodeURIComponent(typeId)}/names`,
      {
        method: "GET",
      },
    ),
};