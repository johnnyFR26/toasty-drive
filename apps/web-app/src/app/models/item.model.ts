export type ItemType = 'folder' | 'file';

export interface Item {
  id: string;
  ownerId: string;
  parentId: string;
  type: ItemType;
  name: string;
  s3Key?: string;
  size?: number;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
  ownerParent: string;
  sortKey: string;
}

export interface UploadResponse {
  item: Item;
  uploadUrl: string;
}

export interface DownloadResponse {
  url: string;
  fileName: string;
}
