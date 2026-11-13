export interface Share {
  id: string;         // also serves as the share token
  itemId: string;     // folder or file being shared
  ownerId: string;    // who created the share
  expiresAt?: string; // ISO 8601, optional
  isActive: boolean;
  createdAt: string;  // ISO 8601
}
