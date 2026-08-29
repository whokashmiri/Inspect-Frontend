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

export interface CreateCategoryResponse {
  category: AssetCategoryItem;
}

export interface CreateTypeResponse {
  type: AssetTypeItem;
}

export interface CreateNameResponse {
  name: AssetNameItem;
}

export const assetCategoryApi = {
  getAll: () =>
    request<AssetCategoryData>("/asset-categories", {
      method: "GET",
    }),

  getCategories: () =>
    request<CategoriesResponse>("/asset-categories/categories", {
      method: "GET",
    }),

  getTypesByCategoryId: (categoryId: string) =>
    request<TypesResponse>(
      `/asset-categories/categories/${encodeURIComponent(categoryId)}/types`,
      {
        method: "GET",
      },
    ),

  getNamesByTypeId: (typeId: string) =>
    request<NamesResponse>(
      `/asset-categories/types/${encodeURIComponent(typeId)}/names`,
      {
        method: "GET",
      },
    ),

 createCategory: (label: string) =>
  request<CreateCategoryResponse>(
    "/asset-categories/categories",
    {
      method: "POST",
      body: {
        label,
      },
    },
  ),

createType: (
  categoryId: string,
  label: string,
) =>
  request<CreateTypeResponse>(
    `/asset-categories/categories/${encodeURIComponent(categoryId)}/types`,
    {
      method: "POST",
      body: {
        label,
      },
    },
  ),

  createName: (
  typeId: string,
  label: string,
) =>
  request<CreateNameResponse>(
    `/asset-categories/types/${encodeURIComponent(typeId)}/names`,
    {
      method: "POST",
      body: {
        label,
      },
    },
  ),
};