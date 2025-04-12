export interface StorageConfig {
  prefix?: string;
  encryption?: boolean;
}

export interface StorageItem<T> {
  key: string;
  value: T;
  expiresAt?: number;
} 