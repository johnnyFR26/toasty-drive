import { Component, inject, signal } from '@angular/core';
import { TuiButton, TuiIcon, TuiNotificationService, TuiTextfield, type TuiDialogContext } from '@taiga-ui/core';
import { TuiButtonLoading } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
import { ShareService } from '../services/share.service';

export interface ShareDialogData {
  itemId: string;
  itemName: string;
}

@Component({
  imports: [TuiButton, TuiButtonLoading, TuiIcon, TuiTextfield],
  template: `
    <h2 class="tui-text_h4" style="margin: 0 0 0.5rem">Compartilhar</h2>
    <p style="color: var(--tui-text-secondary); margin: 0 0 1.5rem">
      {{ context.data.itemName }}
    </p>

    @if (!shareLink()) {
      <div style="display: flex; justify-content: flex-end; gap: 0.5rem">
        <button
          tuiButton
          appearance="outline"
          (click)="context.completeWith(undefined)"
        >
          Cancelar
        </button>
        <button
          tuiButton
          [loading]="generating()"
          (click)="generateLink()"
        >
          <tui-icon icon="@tui.link" />
          Gerar Link
        </button>
      </div>
    } @else {
      <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem">
        <tui-textfield style="flex: 1">
          <input tuiInput [value]="shareLink()" readonly />
        </tui-textfield>
        <button tuiButton appearance="outline" (click)="copyLink()">
          <tui-icon icon="@tui.copy" />
          Copiar
        </button>
      </div>

      <div style="display: flex; justify-content: flex-end">
        <button tuiButton (click)="context.completeWith(undefined)">
          Fechar
        </button>
      </div>
    }
  `,
})
export class ShareDialog {
  protected readonly context =
    injectContext<TuiDialogContext<void, ShareDialogData>>();

  private shareService = inject(ShareService);
  private notifications = inject(TuiNotificationService);

  shareLink = signal('');
  generating = signal(false);

  async generateLink() {
    this.generating.set(true);
    try {
      const share = await this.shareService.createShare(
        this.context.data.itemId,
      );
      const baseUrl = window.location.origin;
      this.shareLink.set(`${baseUrl}/share/${share.id}`);
    } catch {
      this.notifications
        .open('Erro ao gerar link de compartilhamento', {
          appearance: 'negative',
        })
        .subscribe();
    } finally {
      this.generating.set(false);
    }
  }

  copyLink() {
    navigator.clipboard.writeText(this.shareLink());
    this.notifications
      .open('Link copiado!', { appearance: 'positive' })
      .subscribe();
  }
}
