import { Component, inject, signal, OnInit } from '@angular/core';
import { TuiButton, TuiIcon, TuiLoader, type TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { DriveService } from '../services/drive.service';

export interface ImagePreviewData {
  itemId: string;
  itemName: string;
}

@Component({
  imports: [TuiButton, TuiIcon, TuiLoader],
  styles: `
    :host {
      display: block;
    }

    .preview-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .preview-title {
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      margin-right: 0.5rem;
    }

    .preview-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      background: var(--tui-background-neutral-1);
      border-radius: var(--tui-radius-l);
      overflow: hidden;
    }

    .preview-container img {
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
      display: block;
    }

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 2rem;
      color: var(--tui-text-secondary);
    }

    .error-state tui-icon {
      font-size: 2.5rem;
    }

    .preview-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1rem;
    }
  `,
  template: `
    <div class="preview-header">
      <h2 class="tui-text_h5 preview-title">{{ context.data.itemName }}</h2>
    </div>

    <div class="preview-container">
      @if (loading()) {
        <tui-loader />
      } @else if (error()) {
        <div class="error-state">
          <tui-icon icon="@tui.image-off" />
          <span>Não foi possível carregar a imagem</span>
        </div>
      } @else {
        <img
          [src]="imageUrl()"
          [alt]="context.data.itemName"
          (error)="onImageError()"
        />
      }
    </div>

    <div class="preview-footer">
      @if (imageUrl() && !error()) {
        <button tuiButton appearance="outline" (click)="download()">
          <tui-icon icon="@tui.download" />
          Download
        </button>
      }
      <button tuiButton (click)="context.completeWith(undefined)">
        Fechar
      </button>
    </div>
  `,
})
export class ImagePreviewDialog implements OnInit {
  protected readonly context =
    injectContext<TuiDialogContext<void, ImagePreviewData>>();
  private driveService = inject(DriveService);

  protected loading = signal(true);
  protected error = signal(false);
  protected imageUrl = signal('');

  async ngOnInit() {
    try {
      const { url } = await this.driveService.getDownloadUrl(
        this.context.data.itemId,
      );
      this.imageUrl.set(url);
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  protected onImageError(): void {
    this.error.set(true);
  }

  protected download(): void {
    window.open(this.imageUrl(), '_blank');
  }
}
