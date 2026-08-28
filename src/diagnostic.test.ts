import { describe, expect, it } from 'vitest';
import { casefile, casefileHtml, makeSampleRun } from './diagnostic';

describe('casefile exports', () => {
  it('loads a complete bundled sample without a network request', () => {
    const run = makeSampleRun();
    expect(run.demo).toBe(true);
    expect(run.stages).toHaveLength(5);
    expect(run.stages.every(stage => stage.result === 'pass')).toBe(true);
  });

  it('exports the stages and result as JSON', () => {
    const receipt = JSON.parse(casefile(makeSampleRun()));
    expect(receipt.schema).toBe('gpu-vram-burnin.casefile/v1');
    expect(receipt.stages.map((stage: { name: string }) => stage.name)).toEqual([
      'Allocate', 'Fill patterns', 'Copy path', 'Readback', 'Shader sweep'
    ]);
  });

  it('exports a printable HTML receipt', () => {
    const output = casefileHtml(makeSampleRun());
    expect(output).toContain('<table>');
    expect(output).toContain('NVIDIA GeForce RTX 5080');
  });
});
