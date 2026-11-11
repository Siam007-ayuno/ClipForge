import axios from "axios";
import {
  AuthResponse,
  Project,
  RightsConfirmation,
  User,
  Clip,
  Transcript,
  ClipDetail,
  ClipEditUpdate,
} from "../types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "/api/v1" : "http://127.0.0.1:8000/api/v1");

export const apiClient = axios.create({
  baseURL: API_BASE,
});

// Attach JWT token from localStorage if in browser
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("clipforge_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Automatic token refresh / recovery interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !originalRequest?.url?.includes("/auth/login") &&
      !originalRequest?.url?.includes("/auth/register")
    ) {
      originalRequest._retry = true;
      if (typeof window !== "undefined") {
        localStorage.removeItem("clipforge_token");
        localStorage.removeItem("clipforge_user");
        try {
          const res = await axios.post(
            `${API_BASE}/auth/login`,
            { email: "demo@clipforge.ai", password: "DemoPassword123!" }
          );
          if (res.data?.access_token) {
            localStorage.setItem("clipforge_token", res.data.access_token);
            localStorage.setItem("clipforge_user", JSON.stringify(res.data.user));
            originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
            return apiClient(originalRequest);
          }
        } catch {
          // If demo login also fails, ignore
        }
      }
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const apiAuth = {
  async register(email: string, password: string, fullName?: string): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>("/auth/register", {
      email,
      password,
      full_name: fullName,
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("clipforge_token", res.data.access_token);
      localStorage.setItem("clipforge_user", JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("clipforge_token", res.data.access_token);
      localStorage.setItem("clipforge_user", JSON.stringify(res.data.user));
    }
    return res.data;
  },

  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("clipforge_token");
      localStorage.removeItem("clipforge_user");
    }
  },

  getCurrentUser(): User | null {
    if (typeof window !== "undefined") {
      const data = localStorage.getItem("clipforge_user");
      if (data) {
        try {
          return JSON.parse(data);
        } catch {
          return null;
        }
      }
    }
    return null;
  },

  async ensureAuthenticated(): Promise<User> {
    const existing = this.getCurrentUser();
    const token = typeof window !== "undefined" ? localStorage.getItem("clipforge_token") : null;
    if (existing && token) {
      try {
        const validated = await this.fetchMe();
        return validated;
      } catch {
        this.logout();
      }
    }

    try {
      const res = await this.login("demo@clipforge.ai", "DemoPassword123!");
      return res.user;
    } catch {
      const reg = await this.register("demo@clipforge.ai", "DemoPassword123!", "Demo Creator");
      return reg.user;
    }
  },

  async fetchMe(): Promise<User> {
    const res = await apiClient.get<User>("/auth/me");
    if (typeof window !== "undefined") {
      localStorage.setItem("clipforge_user", JSON.stringify(res.data));
    }
    return res.data;
  },
};

// Rights Confirmation API
export const apiRights = {
  async confirm(
    sourceType: "upload" | "youtube",
    identifier: string,
    agreedText: string,
    projectId?: string
  ): Promise<RightsConfirmation> {
    const res = await apiClient.post<RightsConfirmation>("/rights/confirm", {
      source_type: sourceType,
      identifier,
      agreed_text: agreedText,
      project_id: projectId,
    });
    return res.data;
  },
};

// Chunked Upload API
export const apiUpload = {
  async initUpload(filename: string, totalSize: number, totalChunks: number, mimeType = "video/mp4") {
    const res = await apiClient.post<{ upload_id: string; chunk_size: number; total_chunks: number }>(
      "/uploads/init",
      {
        filename,
        total_size: totalSize,
        total_chunks: totalChunks,
        mime_type: mimeType,
      }
    );
    return res.data;
  },

  async uploadChunk(uploadId: string, chunkIndex: number, chunkBlob: Blob, onProgress?: (p: number) => void) {
    const formData = new FormData();
    formData.append("upload_id", uploadId);
    formData.append("chunk_index", chunkIndex.toString());
    formData.append("chunk", chunkBlob, `chunk_${chunkIndex}.part`);

    const res = await apiClient.post("/uploads/chunk", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (event.total && onProgress) {
          onProgress(event.loaded / event.total);
        }
      },
    });
    return res.data;
  },

  async completeUpload(
    uploadId: string,
    filename: string,
    totalChunks: number,
    rightsConfirmationId: string,
    projectTitle?: string
  ) {
    const res = await apiClient.post<{ project_id: string; storage_key: string; file_size_bytes: number }>(
      "/uploads/complete",
      {
        upload_id: uploadId,
        filename,
        total_chunks: totalChunks,
        rights_confirmation_id: rightsConfirmationId,
        project_title: projectTitle,
      }
    );
    return res.data;
  },
};

// Projects API
export const apiProjects = {
  async list(): Promise<Project[]> {
    const res = await apiClient.get<Project[]>("/projects");
    return res.data;
  },

  async get(id: string): Promise<Project> {
    const res = await apiClient.get<Project>(`/projects/${id}`);
    return res.data;
  },

  async importUrl(url: string, rightsConfirmationId: string, title?: string): Promise<Project> {
    const res = await apiClient.post<Project>("/projects/import-url", {
      url,
      rights_confirmation_id: rightsConfirmationId,
      title,
    });
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  },

  async renderAll(id: string, resolution = "1080p"): Promise<{ status: string; clips_count: number }> {
    const res = await apiClient.post(`/projects/${id}/render-all`, null, {
      params: { resolution },
    });
    return res.data;
  },
};

// Clips & Rendering API
export const apiClips = {
  async getDetail(clipId: string): Promise<ClipDetail> {
    const res = await apiClient.get<ClipDetail>(`/clips/${clipId}`);
    return res.data;
  },

  async updateEdit(clipId: string, payload: ClipEditUpdate): Promise<ClipDetail> {
    const res = await apiClient.put<ClipDetail>(`/clips/${clipId}/edit`, payload);
    return res.data;
  },

  async render(clipId: string, resolution = "1080p"): Promise<Clip> {
    const res = await apiClient.post<Clip>(`/clips/${clipId}/render`, null, {
      params: { resolution },
    });
    return res.data;
  },

  async reRender(clipId: string, resolution = "1080p"): Promise<Clip> {
    const res = await apiClient.post<Clip>(`/clips/${clipId}/re-render`, null, {
      params: { resolution },
    });
    return res.data;
  },

  async uploadAsset(
    clipId: string,
    assetType: "music" | "watermark",
    file: File
  ): Promise<{ asset_type: string; storage_path: string; url: string }> {
    const formData = new FormData();
    formData.append("asset_type", assetType);
    formData.append("file", file);
    const res = await apiClient.post(`/clips/${clipId}/upload-asset`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  async getStatus(clipId: string): Promise<{
    clip_id: string;
    status: string;
    progress: number;
    video_url?: string | null;
    thumbnail_url?: string | null;
    error_message?: string | null;
  }> {
    const res = await apiClient.get(`/clips/${clipId}/status`);
    return res.data;
  },
};

// AI Pipeline & Clips API
export const apiPipeline = {
  async triggerProcess(projectId: string): Promise<Project> {
    const res = await apiClient.post<Project>(`/projects/${projectId}/process`);
    return res.data;
  },

  async getProgress(projectId: string) {
    const res = await apiClient.get<{
      status: string;
      progress: number;
      error_message?: string;
      clips_count: number;
    }>(`/projects/${projectId}/progress`);
    return res.data;
  },

  async getClips(projectId: string): Promise<Clip[]> {
    const res = await apiClient.get<Clip[]>(`/projects/${projectId}/clips`);
    return res.data;
  },

  async getTranscript(projectId: string): Promise<Transcript> {
    const res = await apiClient.get<Transcript>(`/projects/${projectId}/transcript`);
    return res.data;
  },
};


// Export, Downloads & Sharing API
export const apiExport = {
  getClipDownloadUrl(clipId: string, resolution = "1080p"): string {
    return `${API_BASE}/clips/${clipId}/download?resolution=${resolution}`;
  },

  getSrtDownloadUrl(clipId: string): string {
    return `${API_BASE}/clips/${clipId}/captions/srt`;
  },

  getProjectZipUrl(projectId: string, resolution = "1080p"): string {
    return `${API_BASE}/projects/${projectId}/download-all?resolution=${resolution}`;
  },

  async downloadClipMp4(clipId: string, title: string, resolution = "1080p"): Promise<void> {
    const res = await apiClient.get(`/clips/${clipId}/download`, {
      params: { resolution },
      responseType: "blob",
    });
    const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: "video/mp4" }));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.setAttribute("download", `${title.replace(/[^\w\s-]/g, "").slice(0, 30)}_${resolution}.mp4`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  },

  async downloadClipSrt(clipId: string, title: string): Promise<void> {
    const res = await apiClient.get(`/clips/${clipId}/captions/srt`, {
      responseType: "blob",
    });
    const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: "application/x-subrip" }));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.setAttribute("download", `${title.replace(/[^\w\s-]/g, "").slice(0, 30)}.srt`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  },

  async downloadProjectZip(projectId: string, projectTitle: string, resolution = "1080p"): Promise<void> {
    const res = await apiClient.get(`/projects/${projectId}/download-all`, {
      params: { resolution },
      responseType: "blob",
    });
    const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: "application/zip" }));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.setAttribute("download", `${projectTitle.replace(/[^\w\s-]/g, "").slice(0, 30)}_clips.zip`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  },

  async getSocialCopy(clipId: string): Promise<{
    hook_title: string;
    description: string;
    hashtags: string;
    hashtags_list: string[];
    full_copy: string;
  }> {
    const res = await apiClient.get(`/clips/${clipId}/social-copy`);
    return res.data;
  },

  async createShareLink(clipId: string): Promise<{
    clip_id: string;
    share_token: string;
    share_url: string;
    expires_at: string;
    views_count: number;
  }> {
    const res = await apiClient.post(`/clips/${clipId}/share`);
    return res.data;
  },

  async getPublicShare(token: string): Promise<any> {
    const res = await axios.get(`${API_BASE}/share/${token}`);
    return res.data;
  },
};

// Compliance, Reporting & DMCA API
export const apiReports = {
  async submit(data: {
    report_type: string;
    target_type: string;
    target_id?: string;
    target_url?: string;
    reporter_name: string;
    reporter_email: string;
    original_work_url?: string;
    description: string;
    good_faith_statement: boolean;
  }): Promise<any> {
    const res = await apiClient.post("/reports", data);
    return res.data;
  },

  async list(status?: string): Promise<any[]> {
    const res = await apiClient.get("/reports", { params: { status } });
    return res.data;
  },

  async update(reportId: string, status: string, notes?: string): Promise<any> {
    const res = await apiClient.patch(`/reports/${reportId}`, {
      status,
      resolution_notes: notes,
    });
    return res.data;
  },
};

// Admin & Data Retention API
export const apiAdmin = {
  async triggerCleanup(retentionDays = 30, dryRun = false): Promise<any> {
    const res = await apiClient.post("/admin/cleanup", null, {
      params: { retention_days: retentionDays, dry_run: dryRun },
    });
    return res.data;
  },
};
