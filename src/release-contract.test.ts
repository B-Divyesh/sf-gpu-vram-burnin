import { describe, expect, it } from 'vitest';
import workflow from '../.github/workflows/release.yml?raw';
import installer from '../public/install.sh?raw';

describe('desktop release contract', () => {
  it('builds every required platform before one checksummed publisher runs', () => {
    expect(workflow).toContain('target: x86_64-pc-windows-msvc');
    expect(workflow).toContain('target: aarch64-apple-darwin');
    expect(workflow).toContain('target: x86_64-apple-darwin');
    expect(workflow).toContain('target: x86_64-unknown-linux-gnu');
    expect(workflow).toContain('bundles: msi,nsis');
    expect(workflow).toContain('bundles: appimage,deb');
    expect(workflow).toContain('needs: build');
    expect(workflow).toContain('softprops/action-gh-release@v2');
    expect(workflow).toContain('SHA256SUMS');
    expect(workflow).toContain('latest.json');
    expect(workflow).toContain('mkdir publish-assets');
    expect(workflow).toContain('find . -maxdepth 1 -type f ! -name SHA256SUMS ! -name latest.json -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS');
    expect(workflow).toContain('! -name SHA256SUMS ! -name latest.json');
    expect(workflow).toContain('files: publish-assets/*');
  });

  it('verifies the asset named by GitHub before the Unix installer keeps it', () => {
    expect(installer).toContain('content-disposition');
    expect(installer).toContain('SHA256 check failed.');
    expect(installer).toContain('Release checksum is missing for this asset.');
  });
});
