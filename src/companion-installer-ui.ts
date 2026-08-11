function replaceDirectText(node: HTMLElement, from: string, to: string) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim() === from) {
      child.textContent = ` ${to}`;
      return true;
    }
  }
  return false;
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
    });
  };

  patch();
  const observer = new MutationObserver(patch);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
