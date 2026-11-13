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
} from '@nestjs/common';
import { SharesService } from './shares.service';
import { CreateShareDto } from './dto/create-share.dto';
import { UserId } from '../common/decorators/user-id.decorator';

@Controller('shares')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  /** Create a new share link */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@UserId() userId: string, @Body() dto: CreateShareDto) {
    return this.sharesService.createShare(userId, dto);
  }

  /** List all shares created by the current user */
  @Get()
  listMyShares(@UserId() userId: string) {
    return this.sharesService.getSharesByOwner(userId);
  }

  /** List shares for a specific item */
  @Get('item/:itemId')
  getSharesForItem(
    @UserId() _userId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.sharesService.getSharesByItem(itemId);
  }

  /** Access shared content (public — no auth needed) */
  @Get('public/:shareId')
  accessShare(@Param('shareId') shareId: string) {
    return this.sharesService.accessShare(shareId);
  }

  /** Download a file from a shared folder (public — no auth needed) */
  @Get('public/:shareId/download/:fileId')
  downloadSharedFile(
    @Param('shareId') shareId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.sharesService.getSharedFileDownload(shareId, fileId);
  }

  /** Deactivate a share link */
  @Patch(':id/deactivate')
  deactivate(@UserId() userId: string, @Param('id') id: string) {
    return this.sharesService.deactivateShare(id, userId);
  }

  /** Delete a share link */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@UserId() userId: string, @Param('id') id: string) {
    return this.sharesService.deleteShare(id, userId);
  }
}
