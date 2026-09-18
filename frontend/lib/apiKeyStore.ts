export interface DevKeyRecord {
  id: number;
  prefix: string;
  created_at: string;
  usage_count: number;
}

export let devKeysStore: DevKeyRecord[] = [
  {
    id: 1,
    prefix: "wlk_prod",
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    usage_count: 1420,
  },
  {
    id: 2,
    prefix: "wlk_stag",
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    usage_count: 310,
  },
];

export function recordKeyUsage(keyOrPrefix?: string | null) {
  if (!keyOrPrefix) return;
  const prefix = keyOrPrefix.substring(0, 8);
  const target = devKeysStore.find((k) => k.prefix === prefix);
  if (target) {
    target.usage_count += 1;
  }
}

export function addDevKey(newKey: DevKeyRecord) {
  devKeysStore = [newKey, ...devKeysStore];
}

export function deleteDevKey(prefix: string) {
  devKeysStore = devKeysStore.filter((k) => k.prefix !== prefix);
}

