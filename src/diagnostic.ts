export type StageName = 'Allocate' | 'Fill patterns' | 'Copy path' | 'Readback' | 'Shader sweep';
export type Result = 'pass' | 'retry' | 'fail' | 'pending';

export interface Stage { name: StageName; result: Result; bytes: string; detail: string; errors: number }
export interface RunReceipt { id: string; startedAt: string; gpu: string; temperature: number; confidence: string; stages: Stage[]; demo: boolean }

export const sampleStages: Stage[] = [
  { name: 'Allocate', result: 'pass', bytes: '8.0 GiB', detail: 'Reserved test window', errors: 0 },
  { name: 'Fill patterns', result: 'pass', bytes: '24.0 GiB', detail: 'Walking bits, checkerboard, address', errors: 0 },
  { name: 'Copy path', result: 'pass', bytes: '16.0 GiB', detail: 'Device copies agree', errors: 0 },
  { name: 'Readback', result: 'pass', bytes: '8.0 GiB', detail: 'Host comparison agrees', errors: 0 },
  { name: 'Shader sweep', result: 'pass', bytes: '12.0 GiB', detail: 'Compute reads agree', errors: 0 }
];

export function makeSampleRun(): RunReceipt {
  return {
    id: 'SAMPLE-5080-2408', startedAt: '2026-08-28T12:40:00.000Z', gpu: 'NVIDIA GeForce RTX 5080',
    temperature: 63, confidence: 'High for this bounded 8 GiB window', stages: structuredClone(sampleStages), demo: true
  };
}

export function casefile(run: RunReceipt) {
  return JSON.stringify({
    schema: 'gpu-vram-burnin.casefile/v1',
    created_at: new Date().toISOString(),
    product: 'VRAM Burn-in Kit',
    limitation: 'This receipt reports this test window. It does not certify hardware health.',
    ...run
  }, null, 2);
}

export function casefileHtml(run: RunReceipt) {
  const rows = run.stages.map(s => `<tr><td>${s.name}</td><td>${s.result}</td><td>${s.bytes}</td><td>${s.errors}</td><td>${s.detail}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>VRAM casefile ${run.id}</title><style>body{font:16px system-ui;max-width:780px;margin:40px auto;color:#17222a}table{border-collapse:collapse;width:100%}td,th{padding:10px;border-bottom:1px solid #bbb;text-align:left}</style><h1>VRAM test casefile</h1><p><b>${run.gpu}</b> · ${run.startedAt} · ${run.temperature}°C</p><p>${run.confidence}</p><table><thead><tr><th>Stage</th><th>Result</th><th>Window</th><th>Errors</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table><p>This receipt does not certify hardware health.</p></html>`;
}

export function download(content: string, name: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 200);
}
