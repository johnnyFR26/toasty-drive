import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Share, SharedContent } from '../models/share.model';
import { DownloadResponse } from '../models/item.model';

const API = '/api';
const USER_ID = 'demo-user';

function headers(): HttpHeaders {
  return new HttpHeaders({ 'x-user-id': USER_ID });
}

@Injectable({ providedIn: 'root' })
export class ShareService {
  private http = inject(HttpClient);

  async createShare(itemId: string, expiresAt?: string): Promise<Share> {
    return firstValueFrom(
      this.http.post<Share>(
        `${API}/shares`,
        { itemId, expiresAt },
        { headers: headers() },
      ),
    );
  }

  async listMyShares(): Promise<Share[]> {
    return firstValueFrom(
      this.http.get<Share[]>(`${API}/shares`, { headers: headers() }),
    );
  }

  async getSharesForItem(itemId: string): Promise<Share[]> {
    return firstValueFrom(
      this.http.get<Share[]>(`${API}/shares/item/${itemId}`, {
        headers: headers(),
      }),
    );
  }

  /** Public endpoint — no auth required */
  async accessShare(shareId: string): Promise<SharedContent> {
    return firstValueFrom(
      this.http.get<SharedContent>(`${API}/shares/public/${shareId}`),
    );
  }

  /** Public endpoint — no auth required */
  async getSharedFileDownload(
    shareId: string,
    fileId: string,
  ): Promise<DownloadResponse> {
    return firstValueFrom(
      this.http.get<DownloadResponse>(
        `${API}/shares/public/${shareId}/download/${fileId}`,
      ),
    );
  }

  async deactivateShare(shareId: string): Promise<void> {
    return firstValueFrom(
      this.http.patch<void>(`${API}/shares/${shareId}/deactivate`, null, {
        headers: headers(),
      }),
    );
  }

  async deleteShare(shareId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${API}/shares/${shareId}`, {
        headers: headers(),
      }),
    );
  }
}
