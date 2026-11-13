export type ItemType = 'folder' | 'file';

export interface Item {
  id: string;
  ownerId: string;
  parentId: string; // 'root' for top-level items
  type: ItemType;
  name: string;
  s3Key?: string;       // only for files
  size?: number;        // only for files, in bytes
  mimeType?: string;    // only for files
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
  ownerParent: string;  // composite key: `${ownerId}#${parentId}` for GSI
  sortKey: string;      // composite key: `${type}#${name}` for GSI sort
}
