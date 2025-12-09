export interface GitStatus {
  exists: boolean;
  summary: string;
  modified: string[];
  untracked: string[];
  raw?: string;
}
