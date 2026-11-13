import { Item } from './item.model';

export interface Share {
  id: string;
  itemId: string;
  ownerId: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface SharedContent {
  item: Item;
  children: Item[];
}
