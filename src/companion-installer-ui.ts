function replaceDirectText(node: HTMLElement, from: string, to: string) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim() === from) {
      child.textContent = ` ${to}`;
      return true;
    }
  }
  return false;
}

const PENDING_COMPANION_KEY = 'spmt:companion-bootstrap';

type PendingCompanionLink = { launchUrl: string; expiresAt: number };

function readPendingCompanionLink(): PendingCompanionLink | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(PENDING_COMPANION_KEY) || 'null') as PendingCompanionLink | null;
    if (!value?.launchUrl || Number(value.expiresAt || 0) <= Date.now()) {
      sessionStorage.removeItem(PENDING_COMPANION_KEY);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function addConnectCompanionButton(downloadButton: HTMLElement) {
  const pending = readPendingCompanionLink();
  const existing = downloadButton.parentElement?.querySelector<HTMLButtonElement>('[data-companion-connect]');
  if (!pending) {
    existing?.remove();
    return;
  }
  if (existing || !downloadButton.parentElement) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.companionConnect = 'true';
  button.className = downloadButton.className;
  button.textContent = 'Connect installed Companion';
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    window.location.href = pending.launchUrl;
  });
  downloadButton.parentElement.appendChild(button);
}

async function beginTenantLinkedCompanionDownload(event: Event, button: HTMLElement) {
  event.preventDefault();
  event.stopImmediatePropagation();
  if (button.dataset.companionDownloadBusy === 'true') return;
  button.dataset.companionDownloadBusy = 'true';
  const previousText = button.textContent || 'Download installer';
  button.textContent = 'Preparing tenant link…';
  try {
    const response = await fetch('/api/spmt/api/companion/bootstrap', {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.launchUrl || !payload?.downloadUrl) {
      throw new Error(payload?.error || 'Sign in to SpaceMountain before downloading your tenant-linked Companion.');
    }
    sessionStorage.setItem(PENDING_COMPANION_KEY, JSON.stringify({
      launchUrl: String(payload.launchUrl),
      expiresAt: Date.now() + Math.max(300, Number(payload.expiresIn || 3600)) * 1000,
    }));
    addConnectCompanionButton(button);
    const download = document.createElement('a');
    download.href = String(payload.downloadUrl);
    download.download = 'SpaceMountain-Companion-Setup.exe';
    document.body.appendChild(download);
    download.click();
    download.remove();
    button.textContent = 'Download installer again';
  } catch (error) {
    button.textContent = previousText;
    window.alert(error instanceof Error ? error.message : 'Companion download could not be prepared.');
  } finally {
    button.dataset.companionDownloadBusy = 'false';
  }
}

export function installCompanionInstallerUiPatch() {
  const marker = '__spaceMountainCompanionInstallerUiInstalled';
  const host = window as typeof window & Record<string, unknown>;
  if (host[marker]) return;
  host[marker] = true;

  const patch = () => {
    document.querySelectorAll<HTMLElement>('a, button').forEach((node) => {
      const text = node.textContent?.trim() || '';
      if (text === 'Download unsigned ZIP') {
        node.textContent = 'Download installer';
      } else if (text === 'Unsigned ZIP') {
        replaceDirectText(node, 'Unsigned ZIP', 'Download installer');
      }

      const title = node.getAttribute('title') || '';
      if (title.startsWith('Download the unsigned portable ') && title.endsWith(' ZIP')) {
        node.setAttribute(
          'title',
          title.replace('Download the unsigned portable ', 'Download the unsigned ').replace(/ ZIP$/, ' installer'),
        );
      }
      const companionDownload = title.includes('Companion') && (title.includes('installer') || title.endsWith(' ZIP'));
      if (companionDownload && node.dataset.companionTenantLinked !== 'true') {
        node.dataset.companionTenantLinked = 'true';
        node.addEventListener('click', (event) => void beginTenantLinkedCompanionDownload(event, node), true);
      }
      if (companionDownload) addConnectCompanionButton(node);
    });
  };

  patch();
  const observer = new MutationObserver(patch);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
