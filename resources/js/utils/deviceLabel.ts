/**
 * SI-JAGA — deviceLabel.ts
 * Nama tampilan perangkat untuk operator. ID teknis (device_id) tetap
 * dipakai di database, API, dan firmware; pemetaan ke nama yang mudah
 * dibaca cukup diubah di sini.
 */

const DEVICE_LABELS: Record<string, string> = {
  'kotak-kunci-01': 'Kunci Sidik Jari',
  'kotak-kunci-cam-01': 'Kamera Kotak Kunci',
  'GUDANG-01': 'Sensor Gudang',
};

export function deviceLabel(deviceId: string): string {
  return DEVICE_LABELS[deviceId] ?? deviceId;
}
