import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import type { TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

@Component({
  imports: [FormsModule, TuiButton, TuiTextfield, TuiLabel],
  template: `
    <h2 class="tui-text_h4" style="margin: 0 0 1rem">Nova Pasta</h2>

    <label tuiLabel>
      Nome da pasta
      <tui-textfield>
        <input
          tuiInput
          [(ngModel)]="folderName"
          (keydown.enter)="confirm()"
          autofocus
        />
      </tui-textfield>
    </label>

    <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem">
      <button tuiButton appearance="outline" (click)="context.completeWith('')">
        Cancelar
      </button>
      <button tuiButton (click)="confirm()">Criar</button>
    </div>
  `,
})
export class CreateFolderDialog {
  protected readonly context = injectContext<TuiDialogContext<string>>();
  protected folderName = '';

  confirm() {
    const name = this.folderName.trim();
    if (name) {
      this.context.completeWith(name);
    }
  }
}
