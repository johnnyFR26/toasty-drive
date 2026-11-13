import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Item, UploadResponse, DownloadResponse } from '../models/item.model';

const API = '/api';
const USER_ID = 'demo-user'; // Replace with real auth

function headers(): HttpHeaders {
  return new HttpHeaders({ 'x-user-id': USER_ID });
}

@Injectable({ providedIn: 'root' })
export class DriveService {
  private http = inject(HttpClient);

  async listItems(parentId = 'root'): Promise<Item[]> {
    return firstValueFrom(
      this.http.get<Item[]>(`${API}/items`, {
        headers: headers(),
        params: { parentId },
      }),
    );
  }

  async getItem(id: string): Promise<Item> {
    return firstValueFrom(
      this.http.get<Item>(`${API}/items/${id}`, { headers: headers() }),
    );
  }

  async getBreadcrumbs(id: string): Promise<Item[]> {
    return firstValueFrom(
      this.http.get<Item[]>(`${API}/items/${id}/breadcrumbs`, {
        headers: headers(),
      }),
    );
  }

  async createFolder(name: string, parentId?: string): Promise<Item> {
    return firstValueFrom(
      this.http.post<Item>(
        `${API}/items/folders`,
        { name, parentId },
        { headers: headers() },
      ),
    );
  }

  async requestUpload(
    name: string,
    mimeType: string,
    size: number,
    parentId?: string,
  ): Promise<UploadResponse> {
    return firstValueFrom(
      this.http.post<UploadResponse>(
        `${API}/items/upload`,
        { name, mimeType, size, parentId },
        { headers: headers() },
      ),
    );
  }

  async uploadToS3(url: string, file: File): Promise<void> {
    await firstValueFrom(
      this.http.put(url, file, {
        headers: new HttpHeaders({ 'Content-Type': file.type }),
      }),
    );
  }

  async getDownloadUrl(id: string): Promise<DownloadResponse> {
    return firstValueFrom(
      this.http.get<DownloadResponse>(`${API}/items/${id}/download`, {
        headers: headers(),
      }),
    );
  }

  async renameItem(id: string, name: string): Promise<Item> {
    return firstValueFrom(
      this.http.patch<Item>(
        `${API}/items/${id}`,
        { name },
        { headers: headers() },
      ),
    );
  }

  async moveItem(id: string, parentId: string): Promise<Item> {
    return firstValueFrom(
      this.http.patch<Item>(
        `${API}/items/${id}`,
        { parentId },
        { headers: headers() },
      ),
    );
  }

  async deleteItem(id: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${API}/items/${id}`, { headers: headers() }),
    );
  }
}
