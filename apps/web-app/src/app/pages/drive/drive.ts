import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  TuiButton,
  TuiDialogService,
  TuiIcon,
  TuiLink,
  TuiNotificationService,
} from '@taiga-ui/core';
import { TuiProgressBar } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { DriveService } from '../../services/drive.service';
import { Item } from '../../models/item.model';
import { FileSizePipe } from '../../pipes/file-size.pipe';
import {
  CreateFolderDialog,
} from '../../dialogs/create-folder-dialog';
import {
  ShareDialog,
  type ShareDialogData,
} from '../../dialogs/share-dialog';

@Component({
  selector: 'app-drive',
  templateUrl: './drive.html',
  styleUrl: './drive.scss',
  imports: [
    DatePipe,
    FileSizePipe,
    TuiButton,
    TuiIcon,
    TuiLink,
    TuiProgressBar,
  ],
})
export class Drive implements OnInit {
  private driveService = inject(DriveService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialogs = inject(TuiDialogService);
  private notifications = inject(TuiNotificationService);

  items = signal<Item[]>([]);
  breadcrumbs = signal<Item[]>([]);
  loading = signal(false);
  currentFolderId = signal('root');

  // Upload state
  uploading = signal(false);
  uploadFileName = signal('');
  uploadProgress = signal(0);

  folders = computed(() =>
    this.items()
      .filter((i) => i.type === 'folder')
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  files = computed(() =>
    this.items()
      .filter((i) => i.type === 'file')
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const folderId = params.get('folderId') || 'root';
      this.currentFolderId.set(folderId);
      this.loadItems(folderId);
    });
  }

  async loadItems(parentId = 'root') {
    this.loading.set(true);
    try {
      const items = await this.driveService.listItems(parentId);
      this.items.set(items);

      if (parentId !== 'root') {
        const crumbs = await this.driveService.getBreadcrumbs(parentId);
        this.breadcrumbs.set(crumbs);
      } else {
        this.breadcrumbs.set([]);
      }
    } catch {
      this.notifications
        .open('Erro ao carregar itens', { appearance: 'negative' })
        .subscribe();
    } finally {
      this.loading.set(false);
    }
  }

  // --- Navigation ---

  navigateToFolder(item: Item) {
    this.router.navigate(['/drive', item.id]);
  }

  navigateToRoot() {
    this.router.navigate(['/drive']);
  }

  navigateToBreadcrumb(item: Item) {
    this.router.navigate(['/drive', item.id]);
  }

  // --- Create Folder ---

  openCreateFolder() {
    this.dialogs
      .open<string>(new PolymorpheusComponent(CreateFolderDialog), {
        dismissible: true,
        size: 's',
      })
      .subscribe((name) => {
        if (name) {
          this.doCreateFolder(name);
        }
      });
  }

  private async doCreateFolder(name: string) {
    try {
      const parentId =
        this.currentFolderId() === 'root'
          ? undefined
          : this.currentFolderId();
      await this.driveService.createFolder(name, parentId);
      this.notifications
        .open(`Pasta "${name}" criada`, { appearance: 'positive' })
        .subscribe();
      this.loadItems(this.currentFolderId());
    } catch {
      this.notifications
        .open('Erro ao criar pasta', { appearance: 'negative' })
        .subscribe();
    }
  }

  // --- Upload ---

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const fileList = input.files;
    if (!fileList?.length) return;

    for (let i = 0; i < fileList.length; i++) {
      await this.uploadFile(fileList[i]);
    }

    input.value = '';
    this.loadItems(this.currentFolderId());
  }

  private async uploadFile(file: File) {
    this.uploadFileName.set(file.name);
    this.uploadProgress.set(0);
    this.uploading.set(true);

    try {
      const parentId =
        this.currentFolderId() === 'root'
          ? undefined
          : this.currentFolderId();

      const { uploadUrl } = await this.driveService.requestUpload(
        file.name,
        file.type || 'application/octet-stream',
        file.size,
        parentId,
      );

      this.uploadProgress.set(40);
      await this.driveService.uploadToS3(uploadUrl, file);
      this.uploadProgress.set(100);

      this.notifications
        .open(`"${file.name}" enviado com sucesso`, {
          appearance: 'positive',
        })
        .subscribe();
    } catch {
      this.notifications
        .open(`Erro ao enviar "${file.name}"`, { appearance: 'negative' })
        .subscribe();
    } finally {
      setTimeout(() => this.uploading.set(false), 800);
    }
  }

  // --- Download ---

  async downloadFile(item: Item) {
    try {
      const { url } = await this.driveService.getDownloadUrl(item.id);
      window.open(url, '_blank');
    } catch {
      this.notifications
        .open('Erro ao gerar link de download', { appearance: 'negative' })
        .subscribe();
    }
  }

  // --- Share ---

  openShareDialog(item: Item) {
    this.dialogs
      .open<void>(new PolymorpheusComponent(ShareDialog), {
        data: { itemId: item.id, itemName: item.name } satisfies ShareDialogData,
        dismissible: true,
        size: 's',
      })
      .subscribe();
  }

  // --- Delete ---

  async deleteItem(item: Item) {
    const label = item.type === 'folder' ? 'pasta' : 'arquivo';

    this.dialogs
      .open<boolean>(`Tem certeza que deseja excluir ${label} "${item.name}"?`, {
        label: 'Confirmar exclusão',
        size: 's',
        data: { yes: 'Excluir', no: 'Cancelar' },
      })
      .subscribe(async () => {
        await this.doDelete(item);
      });
  }

  private async doDelete(item: Item) {
    try {
      await this.driveService.deleteItem(item.id);
      this.notifications
        .open(`"${item.name}" excluído`, { appearance: 'positive' })
        .subscribe();
      this.loadItems(this.currentFolderId());
    } catch {
      this.notifications
        .open('Erro ao excluir item', { appearance: 'negative' })
        .subscribe();
    }
  }

  // --- Helpers ---

  getFileIcon(item: Item): string {
    if (item.type === 'folder') return '@tui.folder';

    const mime = item.mimeType || '';
    if (mime.startsWith('image/')) return '@tui.image';
    if (mime.startsWith('video/')) return '@tui.video';
    if (mime.startsWith('audio/')) return '@tui.music';
    if (mime.includes('pdf')) return '@tui.file-text';
    if (mime.includes('spreadsheet') || mime.includes('excel'))
      return '@tui.table';
    if (mime.includes('zip') || mime.includes('compressed'))
      return '@tui.archive';
    return '@tui.file';
  }
}
