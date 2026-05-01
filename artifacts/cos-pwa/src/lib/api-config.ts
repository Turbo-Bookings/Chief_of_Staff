const _appBase = new URL(import.meta.env.BASE_URL, window.location.href);
export const API_ORIGIN = _appBase.origin;

export function storageObjectUrl(objectPath: string): string {
  return `${API_ORIGIN}/api/storage/objects/${objectPath}`;
}
