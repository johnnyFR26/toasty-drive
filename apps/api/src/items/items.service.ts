import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../dynamo/dynamo.service';
import { StorageService } from '../storage/storage.service';
import { Item } from './entities/item.entity';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RequestUploadDto } from './dto/request-upload.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  private tableName: string;

  constructor(
    private readonly dynamo: DynamoService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {
    this.tableName = this.config.get<string>('aws.dynamodb.itemsTable');
  }

  async createFolder(ownerId: string, dto: CreateFolderDto): Promise<Item> {
    const parentId = dto.parentId || 'root';

    // If parentId is not root, verify parent exists and belongs to user
    if (parentId !== 'root') {
      await this.getItemOrFail(parentId, ownerId);
    }

    const now = new Date().toISOString();
    const item: Item = {
      id: uuidv4(),
      ownerId,
      parentId,
      type: 'folder',
      name: dto.name,
      createdAt: now,
      updatedAt: now,
      ownerParent: `${ownerId}#${parentId}`,
      sortKey: `folder#${dto.name}`,
    };

    await this.dynamo.put({
      TableName: this.tableName,
      Item: item,
    });

    return item;
  }

  async requestUpload(
    ownerId: string,
    dto: RequestUploadDto,
  ): Promise<{ item: Item; uploadUrl: string }> {
    const parentId = dto.parentId || 'root';

    if (parentId !== 'root') {
      await this.getItemOrFail(parentId, ownerId);
    }

    const id = uuidv4();
    const s3Key = `${ownerId}/${id}/${dto.name}`;
    const now = new Date().toISOString();

    const item: Item = {
      id,
      ownerId,
      parentId,
      type: 'file',
      name: dto.name,
      s3Key,
      size: dto.size,
      mimeType: dto.mimeType,
      createdAt: now,
      updatedAt: now,
      ownerParent: `${ownerId}#${parentId}`,
      sortKey: `file#${dto.name}`,
    };

    await this.dynamo.put({
      TableName: this.tableName,
      Item: item,
    });

    const uploadUrl = await this.storage.getUploadUrl(s3Key, dto.mimeType);

    return { item, uploadUrl };
  }

  async getDownloadUrl(
    id: string,
    ownerId?: string,
  ): Promise<{ url: string; fileName: string }> {
    const item = ownerId
      ? await this.getItemOrFail(id, ownerId)
      : await this.getItemById(id);

    if (!item || item.type !== 'file' || !item.s3Key) {
      throw new NotFoundException('File not found');
    }

    const url = await this.storage.getDownloadUrl(item.s3Key, item.name);
    return { url, fileName: item.name };
  }

  async listItems(ownerId: string, parentId = 'root'): Promise<Item[]> {
    const ownerParent = `${ownerId}#${parentId}`;

    const result = await this.dynamo.query({
      TableName: this.tableName,
      IndexName: 'ByOwnerParent',
      KeyConditionExpression: 'ownerParent = :op',
      ExpressionAttributeValues: { ':op': ownerParent },
    });

    return (result.Items as Item[]) || [];
  }

  async getItemOrFail(id: string, ownerId: string): Promise<Item> {
    const result = await this.dynamo.get({
      TableName: this.tableName,
      Key: { id },
    });

    const item = result.Item as Item | undefined;

    if (!item || item.ownerId !== ownerId) {
      throw new NotFoundException(`Item ${id} not found`);
    }

    return item;
  }

  async getItemById(id: string): Promise<Item | undefined> {
    const result = await this.dynamo.get({
      TableName: this.tableName,
      Key: { id },
    });

    return result.Item as Item | undefined;
  }

  async updateItem(
    id: string,
    ownerId: string,
    dto: UpdateItemDto,
  ): Promise<Item> {
    const item = await this.getItemOrFail(id, ownerId);

    const updates: Partial<Item> = {};
    const now = new Date().toISOString();

    if (dto.name) {
      updates.name = dto.name;
      updates.sortKey = `${item.type}#${dto.name}`;
    }

    if (dto.parentId) {
      if (dto.parentId !== 'root') {
        await this.getItemOrFail(dto.parentId, ownerId);
      }
      updates.parentId = dto.parentId;
      updates.ownerParent = `${ownerId}#${dto.parentId}`;
    }

    updates.updatedAt = now;

    const expressionParts: string[] = [];
    const expressionValues: Record<string, unknown> = {};
    const expressionNames: Record<string, string> = {};

    Object.entries(updates).forEach(([key, value], i) => {
      expressionParts.push(`#k${i} = :v${i}`);
      expressionValues[`:v${i}`] = value;
      expressionNames[`#k${i}`] = key;
    });

    const result = await this.dynamo.update({
      TableName: this.tableName,
      Key: { id },
      UpdateExpression: `SET ${expressionParts.join(', ')}`,
      ExpressionAttributeValues: expressionValues,
      ExpressionAttributeNames: expressionNames,
      ReturnValues: 'ALL_NEW',
    });

    return result.Attributes as Item;
  }

  async deleteItem(id: string, ownerId: string): Promise<void> {
    const item = await this.getItemOrFail(id, ownerId);

    // If it's a folder, recursively delete contents
    if (item.type === 'folder') {
      const children = await this.listItems(ownerId, id);
      for (const child of children) {
        await this.deleteItem(child.id, ownerId);
      }
    }

    // If it's a file, delete from S3
    if (item.type === 'file' && item.s3Key) {
      await this.storage.deleteObject(item.s3Key);
    }

    await this.dynamo.delete({
      TableName: this.tableName,
      Key: { id },
    });
  }

  /**
   * List all items inside a folder (including nested) for share access.
   * Does not require ownerId — used for public share links.
   */
  async listItemsByParent(parentId: string): Promise<Item[]> {
    const result = await this.dynamo.query({
      TableName: this.tableName,
      IndexName: 'ByParentId',
      KeyConditionExpression: 'parentId = :pid',
      ExpressionAttributeValues: { ':pid': parentId },
    });

    return (result.Items as Item[]) || [];
  }

  async getBreadcrumbs(itemId: string, ownerId: string): Promise<Item[]> {
    const breadcrumbs: Item[] = [];
    let currentId = itemId;

    while (currentId && currentId !== 'root') {
      const item = await this.getItemOrFail(currentId, ownerId);
      breadcrumbs.unshift(item);
      currentId = item.parentId;
    }

    return breadcrumbs;
  }
}
