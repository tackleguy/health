import type {
  ImportResult,
  RawTrailRecord,
  SourceAdapterConfig,
} from "../types";

export interface DataSourceAdapter {
  readonly name: string;
  download(config: SourceAdapterConfig): Promise<unknown>;
  parse(raw: unknown): Promise<RawTrailRecord[]>;
}

export abstract class BaseAdapter implements DataSourceAdapter {
  abstract readonly name: string;

  abstract download(config: SourceAdapterConfig): Promise<unknown>;

  abstract parse(raw: unknown): Promise<RawTrailRecord[]>;

  protected log(message: string) {
    console.log(`[${this.name}] ${message}`);
  }
}

export type AdapterFactory = (name: string) => DataSourceAdapter | null;

export function emptyImportResult(): ImportResult {
  return {
    processed: 0,
    stored: 0,
    failed: 0,
    errors: [],
    mergeCandidates: [],
  };
}
