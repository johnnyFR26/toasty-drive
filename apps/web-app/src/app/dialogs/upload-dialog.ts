import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import {
  TuiButton,
  TuiIcon,
  TuiNotificationService,
  type TuiDialogContext,
} from '@taiga-ui/core';
import { TuiFiles } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
import { DriveService } from '../services/drive.service';

export interface UploadDialogData {
  parentId?: string;
}

interface FileUploadState {
  file: File;
  state: 'loading' | 'normal' | 'error';
}

@Component({
  imports: [ReactiveFormsModule, TuiButton, TuiIcon, TuiFiles],
  template: `
    <h2 class="tui-text_h4" style="margin: 0 0 1rem">Upload de Arquivos</h2>

    @if (!uploadStarted()) {
      <label tuiInputFiles>
        <input
          tuiInputFiles
          [formControl]="control"
          [multiple]="true"
        />
      </label>

      @if (control.value?.length) {
        <tui-files class="tui-space_top-2">
          @for (file of control.value; track file) {
            <tui-file
              [file]="file"
              (remove)="removeFile(file)"
            />
          }
        </tui-files>
      }

      <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem">
        <button tuiButton appearance="outline" (click)="cancel()">
          Cancelar
        </button>
        <button
          tuiButton
          [disabled]="!control.value?.length"
          (click)="startUpload()"
        >
          <tui-icon icon="@tui.upload" />
          Enviar
        </button>
      </div>
    } @else {
      <tui-files>
        @for (item of fileStates(); track item.file) {
          <tui-file
            [file]="item.file"
            [state]="item.state"
          />
        }
      </tui-files>

      <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem">
        <button
          tuiButton
          [disabled]="uploading()"
          (click)="close()"
        >
          {{ uploading() ? 'Enviando...' : 'Fechar' }}
        </button>
      </div>
    }
  `,
})
export class UploadDialog {
  protected readonly context =
    injectContext<TuiDialogContext<boolean, UploadDialogData>>();
  private driveService = inject(DriveService);
  private notifications = inject(TuiNotificationService);

  protected readonly control = new FormControl<File[]>([]);

  protected uploadStarted = signal(false);
  protected uploading = signal(false);
  protected fileStates = signal<FileUploadState[]>([]);

  protected removeFile(file: File): void {
    this.control.setValue(
      this.control.value?.filter((f) => f !== file) ?? [],
    );
  }

  protected cancel(): void {
    this.context.completeWith(false);
  }

  protected close(): void {
    this.context.completeWith(true);
  }

  protected async startUpload(): Promise<void> {
    const files = this.control.value;
    if (!files?.length) return;

    this.uploadStarted.set(true);
    this.uploading.set(true);

    const states: FileUploadState[] = files.map((file) => ({
      file,
      state: 'loading' as const,
    }));
    this.fileStates.set([...states]);

    const parentId = this.context.data.parentId;

    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        const mimeType = file.type || 'application/octet-stream';
        const { uploadUrl } = await this.driveService.requestUpload(
          file.name,
          mimeType,
          file.size,
          parentId,
        );
        await this.driveService.uploadToS3(uploadUrl, file, mimeType);

        states[i] = { ...states[i], state: 'normal' };
        this.fileStates.set([...states]);
      } catch {
        states[i] = { ...states[i], state: 'error' };
        this.fileStates.set([...states]);
      }
    }

    this.uploading.set(false);

    const successCount = states.filter((s) => s.state === 'normal').length;
    const errorCount = states.filter((s) => s.state === 'error').length;

    if (errorCount === 0) {
      this.notifications
        .open(
          successCount === 1
            ? 'Arquivo enviado com sucesso'
            : `${successCount} arquivos enviados com sucesso`,
          { appearance: 'positive' },
        )
        .subscribe();
    } else if (successCount > 0) {
      this.notifications
        .open(
          `${successCount} enviado(s), ${errorCount} com erro`,
          { appearance: 'negative' },
        )
        .subscribe();
    } else {
      this.notifications
        .open('Erro ao enviar arquivos', { appearance: 'negative' })
        .subscribe();
    }
  }
}
