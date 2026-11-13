import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../dynamo/dynamo.service';
import { ItemsService } from '../items/items.service';
import { Share } from './entities/share.entity';
import { CreateShareDto } from './dto/create-share.dto';
import { Item } from '../items/entities/item.entity';

@Injectable()
export class SharesService {
  private tableName: string;

  constructor(
    private readonly dynamo: DynamoService,
    private readonly items: ItemsService,
    private readonly config: ConfigService,
  ) {
    this.tableName = this.config.get<string>('aws.dynamodb.sharesTable');
  }

  async createShare(ownerId: string, dto: CreateShareDto): Promise<Share> {
    // Verify the item exists and belongs to the user
    await this.items.getItemOrFail(dto.itemId, ownerId);

    const now = new Date().toISOString();
    const share: Share = {
      id: uuidv4(),
      itemId: dto.itemId,
      ownerId,
      expiresAt: dto.expiresAt || undefined,
      isActive: true,
      createdAt: now,
    };

    await this.dynamo.put({
      TableName: this.tableName,
      Item: share,
    });

    return share;
  }

  async getShare(shareId: string): Promise<Share> {
    const result = await this.dynamo.get({
      TableName: this.tableName,
      Key: { id: shareId },
    });

    const share = result.Item as Share | undefined;

    if (!share) {
      throw new NotFoundException('Share link not found');
    }

    if (!share.isActive) {
      throw new ForbiddenException('Share link is disabled');
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      throw new ForbiddenException('Share link has expired');
    }

    return share;
  }

  async getSharesByOwner(ownerId: string): Promise<Share[]> {
    const result = await this.dynamo.query({
      TableName: this.tableName,
      IndexName: 'ByOwnerId',
      KeyConditionExpression: 'ownerId = :oid',
      ExpressionAttributeValues: { ':oid': ownerId },
    });

    return (result.Items as Share[]) || [];
  }

  async getSharesByItem(itemId: string): Promise<Share[]> {
    const result = await this.dynamo.query({
      TableName: this.tableName,
      IndexName: 'ByItemId',
      KeyConditionExpression: 'itemId = :iid',
      ExpressionAttributeValues: { ':iid': itemId },
    });

    return (result.Items as Share[]) || [];
  }

  /**
   * Access shared content. Returns the shared item and its children (if folder).
   */
  async accessShare(shareId: string): Promise<{ item: Item; children: Item[] }> {
    const share = await this.getShare(shareId);
    const item = await this.items.getItemById(share.itemId);

    if (!item) {
      throw new NotFoundException('Shared item no longer exists');
    }

    let children: Item[] = [];
    if (item.type === 'folder') {
      children = await this.items.listItemsByParent(item.id);
    }

    return { item, children };
  }

  /**
   * Get download URL for a file inside a shared folder.
   */
  async getSharedFileDownload(
    shareId: string,
    fileId: string,
  ): Promise<{ url: string; fileName: string }> {
    const share = await this.getShare(shareId);
    const item = await this.items.getItemById(share.itemId);

    if (!item) {
      throw new NotFoundException('Shared item no longer exists');
    }

    // If the share is directly for the file
    if (item.id === fileId && item.type === 'file') {
      return this.items.getDownloadUrl(fileId);
    }

    // If the share is for a folder, check if the file is inside it
    if (item.type === 'folder') {
      const file = await this.items.getItemById(fileId);
      if (!file || file.type !== 'file') {
        throw new NotFoundException('File not found');
      }

      // Verify the file is inside the shared folder (direct child)
      if (file.parentId === share.itemId) {
        return this.items.getDownloadUrl(fileId);
      }
    }

    throw new ForbiddenException('File is not part of this share');
  }

  async deactivateShare(shareId: string, ownerId: string): Promise<void> {
    const result = await this.dynamo.get({
      TableName: this.tableName,
      Key: { id: shareId },
    });

    const share = result.Item as Share | undefined;
    if (!share || share.ownerId !== ownerId) {
      throw new NotFoundException('Share not found');
    }

    await this.dynamo.update({
      TableName: this.tableName,
      Key: { id: shareId },
      UpdateExpression: 'SET isActive = :active',
      ExpressionAttributeValues: { ':active': false },
    });
  }

  async deleteShare(shareId: string, ownerId: string): Promise<void> {
    const result = await this.dynamo.get({
      TableName: this.tableName,
      Key: { id: shareId },
    });

    const share = result.Item as Share | undefined;
    if (!share || share.ownerId !== ownerId) {
      throw new NotFoundException('Share not found');
    }

    await this.dynamo.delete({
      TableName: this.tableName,
      Key: { id: shareId },
    });
  }
}
