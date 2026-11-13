import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  TuiButton,
  TuiIcon,
  TuiLink,
  TuiNotificationService,
} from '@taiga-ui/core';
import { TuiProgressBar } from '@taiga-ui/kit';

import { ShareService } from '../../services/share.service';
import { Item } from '../../models/item.model';
import { FileSizePipe } from '../../pipes/file-size.pipe';

@Component({
  selector: 'app-shared-view',
  templateUrl: './shared-view.html',
  styleUrl: './shared-view.scss',
  imports: [
    DatePipe,
    FileSizePipe,
    TuiButton,
    TuiIcon,
    TuiLink,
    TuiProgressBar,
  ],
})
export class SharedView implements OnInit {
  private route = inject(ActivatedRoute);
  private shareService = inject(ShareService);
  private notifications = inject(TuiNotificationService);

  sharedItem = signal<Item | null>(null);
  children = signal<Item[]>([]);
  loading = signal(true);
  error = signal('');
  shareId = '';

  folders = computed(() =>
    this.children().filter((i) => i.type === 'folder'),
  );

  files = computed(() =>
    this.children().filter((i) => i.type === 'file'),
  );

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.shareId = params.get('shareId') || '';
      this.loadSharedContent();
    });
  }

  async loadSharedContent() {
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.shareService.accessShare(this.shareId);
      this.sharedItem.set(result.item);
      this.children.set(result.children);
    } catch (e: unknown) {
      const err = e as { error?: { message?: string } };
      this.error.set(err.error?.message || 'Link inválido ou expirado');
    } finally {
      this.loading.set(false);
    }
  }

  async downloadFile(item: Item) {
    try {
      const { url } = await this.shareService.getSharedFileDownload(
        this.shareId,
        item.id,
      );
      window.open(url, '_blank');
    } catch {
      this.notifications
        .open('Erro ao gerar download', { appearance: 'negative' })
        .subscribe();
    }
  }

  async downloadSharedFile() {
    const item = this.sharedItem();
    if (item?.type === 'file') {
      await this.downloadFile(item);
    }
  }

  getFileIcon(item: Item): string {
    const mime = item.mimeType || '';
    if (mime.startsWith('image/')) return '@tui.image';
    if (mime.startsWith('video/')) return '@tui.video';
    if (mime.startsWith('audio/')) return '@tui.music';
    if (mime.includes('pdf')) return '@tui.file-text';
    return '@tui.file';
  }
}
