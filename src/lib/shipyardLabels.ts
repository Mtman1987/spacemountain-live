export type ShipyardAppStatus = 'installed' | 'available' | 'disabled' | 'planned' | 'unknown';

export function getShipyardStatusLabel(status: ShipyardAppStatus) {
  switch (status) {
    case 'installed':
      return 'Installed';
    case 'available':
      return 'Available';
    case 'disabled':
      return 'Disabled';
    case 'planned':
      return 'Planned';
    default:
      return 'Unknown';
  }
}

export function getShipyardActionLabel(status: ShipyardAppStatus) {
  switch (status) {
    case 'installed':
      return 'Launch';
    case 'available':
      return 'Install';
    case 'disabled':
      return 'Enable';
    case 'planned':
      return 'Preview';
    default:
      return 'Open';
  }
}

export function getShipyardStatusFromApp(app: { installed?: boolean; enabled?: boolean; status?: string | null }): ShipyardAppStatus {
  if (app.status === 'planned') return 'planned';
  if (app.installed && app.enabled === false) return 'disabled';
  if (app.installed) return 'installed';
  if (app.status === 'available' || app.status === 'connected' || app.status === 'bridge-ready') return 'available';
  return 'unknown';
}
