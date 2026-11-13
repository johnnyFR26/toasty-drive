import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RequestUploadDto } from './dto/request-upload.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { UserId } from '../common/decorators/user-id.decorator';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  listItems(
    @UserId() userId: string,
    @Query('parentId') parentId?: string,
  ) {
    return this.itemsService.listItems(userId, parentId || 'root');
  }

  @Get(':id')
  getItem(@UserId() userId: string, @Param('id') id: string) {
    return this.itemsService.getItemOrFail(id, userId);
  }

  @Get(':id/breadcrumbs')
  getBreadcrumbs(@UserId() userId: string, @Param('id') id: string) {
    return this.itemsService.getBreadcrumbs(id, userId);
  }

  @Post('folders')
  @HttpCode(HttpStatus.CREATED)
  createFolder(@UserId() userId: string, @Body() dto: CreateFolderDto) {
    return this.itemsService.createFolder(userId, dto);
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  requestUpload(@UserId() userId: string, @Body() dto: RequestUploadDto) {
    return this.itemsService.requestUpload(userId, dto);
  }

  @Get(':id/download')
  getDownloadUrl(@UserId() userId: string, @Param('id') id: string) {
    return this.itemsService.getDownloadUrl(id, userId);
  }

  @Patch(':id')
  updateItem(
    @UserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.itemsService.updateItem(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteItem(@UserId() userId: string, @Param('id') id: string) {
    return this.itemsService.deleteItem(id, userId);
  }
}
