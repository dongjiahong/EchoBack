import { HistoryRecord, NotebookEntry, WebDAVConfig, PageIndex, PagedData, PageMetadata } from "../types";

const BASE_DIR = "echoback";
const HISTORY_DIR = `${BASE_DIR}/history`;
const NOTEBOOK_DIR = `${BASE_DIR}/notebook`;
const PAGE_SIZE = 100;
const INDEX_VERSION = 2;

type DataType = 'history' | 'notebook';

export class WebDAVService {
  private config: WebDAVConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  loadConfig(): WebDAVConfig | null {
    const stored = localStorage.getItem("echoback_webdav");
    if (stored) {
      try {
        this.config = JSON.parse(stored);
      } catch (e) {
        console.error("Invalid WebDAV config", e);
      }
    }
    return this.config;
  }

  saveConfig(config: WebDAVConfig) {
    localStorage.setItem("echoback_webdav", JSON.stringify(config));
    this.config = config;
  }

  getConfig(): WebDAVConfig | null {
      return this.config;
  }

  private getHeaders() {
    if (!this.config) return {};
    const auth = btoa(`${this.config.username}:${this.config.password}`);
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };
  }

  private getBaseUrl(configOverride?: WebDAVConfig): string {
    const cfg = configOverride || this.config;

    if (cfg && (!cfg.url || cfg.url.trim() === '')) {
        return `${window.location.origin}/webdav-proxy/`;
    }

    if (cfg?.url) {
        return cfg.url.endsWith('/') ? cfg.url : `${cfg.url}/`;
    }

    return `${window.location.origin}/webdav-proxy/`;
  }

  private getUrl(path: string): string {
    if (!this.config) return "";
    return `${this.getBaseUrl()}${path}`;
  }

  async checkConnection(config?: WebDAVConfig): Promise<boolean> {
    const targetConfig = config || this.config;
    if (!targetConfig) return false;

    const auth = btoa(`${targetConfig.username}:${targetConfig.password}`);
    const headers = { 'Authorization': `Basic ${auth}` };
    const url = this.getBaseUrl(targetConfig);

    try {
      const response = await fetch(url, {
        method: 'PROPFIND',
        headers: {
            ...headers,
            'Depth': '0'
        }
      });
      return response.ok || response.status === 405;
    } catch (e) {
      console.error("WebDAV Connection failed", e);
      return false;
    }
  }

  // 创建目录（MKCOL）
  private async ensureDirectory(path: string): Promise<void> {
    if (!this.config?.enabled) return;

    try {
      const response = await fetch(this.getUrl(path), {
        method: 'MKCOL',
        headers: this.getHeaders(),
      });

      // 201 = Created, 405 = Already exists
      if (!response.ok && response.status !== 405) {
        console.warn(`Could not create directory ${path}: ${response.statusText}`);
      }
    } catch (e) {
      console.warn(`Error creating directory ${path}`, e);
    }
  }

  // 初始化目录结构
  private async initializeDirectories(): Promise<void> {
    await this.ensureDirectory(BASE_DIR);
    await this.ensureDirectory(HISTORY_DIR);
    await this.ensureDirectory(NOTEBOOK_DIR);
  }

  // 获取 PageIndex
  private async getPageIndex(type: DataType): Promise<PageIndex | null> {
    if (!this.config?.enabled) return null;

    const dir = type === 'history' ? HISTORY_DIR : NOTEBOOK_DIR;
    const url = this.getUrl(`${dir}/index.json`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get index: ${response.statusText}`);
      }

      return await response.json();
    } catch (e) {
      console.warn(`Could not fetch ${type} index from WebDAV`, e);
      return null;
    }
  }

  // 保存 PageIndex
  private async putPageIndex(type: DataType, index: PageIndex): Promise<void> {
    if (!this.config?.enabled) return;

    const dir = type === 'history' ? HISTORY_DIR : NOTEBOOK_DIR;
    const url = this.getUrl(`${dir}/index.json`);

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(index, null, 2),
      });

      if (!response.ok) {
        throw new Error(`Failed to save index: ${response.statusText}`);
      }
    } catch (e) {
      console.error(`Failed to upload ${type} index to WebDAV`, e);
      throw e;
    }
  }

  // 获取单个分页
  async getPage<T>(type: DataType, pageNumber: number): Promise<PagedData<T> | null> {
    if (!this.config?.enabled) return null;

    const dir = type === 'history' ? HISTORY_DIR : NOTEBOOK_DIR;
    const url = this.getUrl(`${dir}/page_${pageNumber}.json`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get page ${pageNumber}: ${response.statusText}`);
      }

      return await response.json();
    } catch (e) {
      console.warn(`Could not fetch ${type} page ${pageNumber} from WebDAV`, e);
      return null;
    }
  }

  // 保存单个分页
  private async putPage<T>(type: DataType, pageNumber: number, data: PagedData<T>): Promise<void> {
    if (!this.config?.enabled) return;

    const dir = type === 'history' ? HISTORY_DIR : NOTEBOOK_DIR;
    const url = this.getUrl(`${dir}/page_${pageNumber}.json`);

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data, null, 2),
      });

      if (!response.ok) {
        throw new Error(`Failed to save page ${pageNumber}: ${response.statusText}`);
      }
    } catch (e) {
      console.error(`Failed to upload ${type} page ${pageNumber} to WebDAV`, e);
      throw e;
    }
  }

  // 将数据分页
  private paginateRecords<T extends { timestamp: number }>(records: T[]): {
    pages: PagedData<T>[];
    index: PageIndex;
  } {
    const sorted = [...records].sort((a, b) => b.timestamp - a.timestamp);
    const pages: PagedData<T>[] = [];

    for (let i = 0; i < sorted.length; i += PAGE_SIZE) {
      const pageRecords = sorted.slice(i, i + PAGE_SIZE);
      pages.push({
        pageNumber: Math.floor(i / PAGE_SIZE),
        records: pageRecords,
      });
    }

    const index: PageIndex = {
      version: INDEX_VERSION,
      totalRecords: records.length,
      pageSize: PAGE_SIZE,
      totalPages: pages.length,
      lastSyncTime: Date.now(),
      pages: pages.map(p => ({
        pageNumber: p.pageNumber,
        recordCount: p.records.length,
        lastModified: Date.now(),
      })),
    };

    return { pages, index };
  }

  // 新的同步逻辑：分页方式
  async syncData(
    localHistory: HistoryRecord[],
    localNotebook: NotebookEntry[]
  ): Promise<{ history: HistoryRecord[], notebook: NotebookEntry[] }> {
    if (!this.config?.enabled) {
        return { history: localHistory, notebook: localNotebook };
    }

    // 确保目录存在
    await this.initializeDirectories();

    // 同步 History
    const history = await this.syncDataType<HistoryRecord>('history', localHistory);

    // 同步 Notebook
    const notebook = await this.syncDataType<NotebookEntry>('notebook', localNotebook);

    return { history, notebook };
  }

  private async syncDataType<T extends { id: string; timestamp: number }>(
    type: DataType,
    localRecords: T[]
  ): Promise<T[]> {
    // 1. 获取远程索引
    const remoteIndex = await this.getPageIndex(type);

    if (!remoteIndex) {
      // 远程无数据，上传本地数据
      console.log(`No remote ${type} found, uploading local data`);
      await this.uploadAllPages(type, localRecords);
      return localRecords;
    }

    // 2. 下载 page_0（最新数据）
    const remotePage0 = await this.getPage<T>(type, 0);
    const remotePage0Records = remotePage0?.records || [];

    // 3. 合并本地和 page_0（按 ID 去重）
    const recordMap = new Map<string, T>();
    [...remotePage0Records, ...localRecords].forEach(item => {
      recordMap.set(item.id, item);
    });

    const mergedRecords = Array.from(recordMap.values()).sort((a, b) => b.timestamp - a.timestamp);

    // 4. 如果合并后数据超过 PAGE_SIZE，需要重新分页
    if (mergedRecords.length > PAGE_SIZE) {
      // 下载所有远程页面，合并后重新分页
      const allRemoteRecords = await this.downloadAllPages<T>(type, remoteIndex);
      const allRecordMap = new Map<string, T>();
      [...allRemoteRecords, ...localRecords].forEach(item => {
        allRecordMap.set(item.id, item);
      });

      const allMerged = Array.from(allRecordMap.values());
      await this.uploadAllPages(type, allMerged);
      return allMerged;
    } else {
      // 只更新 page_0 即可
      const newPage0: PagedData<T> = {
        pageNumber: 0,
        records: mergedRecords,
      };

      await this.putPage(type, 0, newPage0);

      const newIndex: PageIndex = {
        version: INDEX_VERSION,
        totalRecords: mergedRecords.length,
        pageSize: PAGE_SIZE,
        totalPages: 1,
        lastSyncTime: Date.now(),
        pages: [{
          pageNumber: 0,
          recordCount: mergedRecords.length,
          lastModified: Date.now(),
        }],
      };

      await this.putPageIndex(type, newIndex);
      return mergedRecords;
    }
  }

  // 下载所有分页
  private async downloadAllPages<T>(type: DataType, index: PageIndex): Promise<T[]> {
    const allRecords: T[] = [];

    for (const pageMeta of index.pages) {
      const page = await this.getPage<T>(type, pageMeta.pageNumber);
      if (page) {
        allRecords.push(...page.records);
      }
    }

    return allRecords;
  }

  // 上传所有分页
  private async uploadAllPages<T extends { timestamp: number }>(type: DataType, records: T[]): Promise<void> {
    const { pages, index } = this.paginateRecords(records);

    // 并行上传所有页面
    await Promise.all(pages.map(page => this.putPage(type, page.pageNumber, page)));

    // 最后上传索引
    await this.putPageIndex(type, index);
  }

  // 推送变更（增量）
  async pushChanges(history: HistoryRecord[], notebook: NotebookEntry[]) {
      if (!this.config?.enabled) return;

      // 确保目录存在
      await this.initializeDirectories();

      // 推送 History
      await this.pushDataType('history', history);

      // 推送 Notebook
      await this.pushDataType('notebook', notebook);
  }

  private async pushDataType<T extends { timestamp: number }>(type: DataType, records: T[]): Promise<void> {
    const { pages, index } = this.paginateRecords(records);

    // 只上传 page_0（最新数据）
    if (pages.length > 0) {
      await this.putPage(type, 0, pages[0]);

      // 如果有多页，上传其他页面
      if (pages.length > 1) {
        await Promise.all(
          pages.slice(1).map(page => this.putPage(type, page.pageNumber, page))
        );
      }

      await this.putPageIndex(type, index);
    }
  }

  // 懒加载更多数据
  async loadMoreHistory(currentPage: number): Promise<HistoryRecord[]> {
    if (!this.config?.enabled) return [];

    const page = await this.getPage<HistoryRecord>('history', currentPage);
    return page?.records || [];
  }

  async loadMoreNotebook(currentPage: number): Promise<NotebookEntry[]> {
    if (!this.config?.enabled) return [];

    const page = await this.getPage<NotebookEntry>('notebook', currentPage);
    return page?.records || [];
  }
}

export const webdav = new WebDAVService();
