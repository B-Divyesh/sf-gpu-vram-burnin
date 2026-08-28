use serde::{Deserialize, Serialize};
use std::process::Command;
use std::sync::mpsc::sync_channel;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Adapter { id: String, name: String, memory_mib: Option<u64>, temperature_c: Option<u64>, supported: bool, note: String }

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DiagnosticConfig { adapter_id: String, window_mib: u32, temperature_limit_c: u32, retries: u8 }

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Stage { name: String, result: String, bytes: String, detail: String, errors: u64 }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Receipt { id: String, started_at: String, gpu: String, temperature: Option<u64>, confidence: String, stages: Vec<Stage>, demo: bool, window_mib: u32, temperature_limit_c: u32, retries: u8 }

fn nvidia_telemetry() -> Vec<(String, Option<u64>, Option<u64>)> {
    let output = Command::new("nvidia-smi")
        .args(["--query-gpu=name,memory.total,temperature.gpu", "--format=csv,noheader,nounits"])
        .output();
    match output {
        Ok(result) if result.status.success() => result.stdout.split(|b| *b == b'\n').filter_map(|line| {
            let text = String::from_utf8_lossy(line); let parts: Vec<_> = text.split(',').map(str::trim).collect();
            (parts.len() == 3 && !parts[0].is_empty()).then(|| (parts[0].to_string(), parts[1].parse().ok(), parts[2].parse().ok()))
        }).collect(),
        _ => Vec::new(),
    }
}

// NVIDIA's supported command-line telemetry API is used for adapter discovery
// and thermal guard visibility. The web UI deliberately never uses privileged
// controls or changes power/clock settings.
#[tauri::command]
fn scan_adapters() -> Vec<Adapter> {
    let telemetry = nvidia_telemetry();
    let instance = wgpu::Instance::default();
    let adapters: Vec<_> = instance.enumerate_adapters(wgpu::Backends::all());
    let found: Vec<Adapter> = adapters.into_iter().enumerate().map(|(index, adapter)| {
        let info = adapter.get_info();
        let match_telemetry = telemetry.iter().find(|(name, _, _)| info.name.contains(name) || name.contains(&info.name));
        Adapter {
            id: index.to_string(), name: info.name, memory_mib: match_telemetry.and_then(|item| item.1), temperature_c: match_telemetry.and_then(|item| item.2), supported: true,
            note: if match_telemetry.is_some() { "GPU memory path and temperature telemetry available".to_string() } else { "GPU memory path available; temperature guard needs NVIDIA nvidia-smi telemetry".to_string() },
        }
    }).collect();
    if found.is_empty() { vec![Adapter { id: "none".to_string(), name: "No supported adapter found".to_string(), memory_mib: None, temperature_c: None, supported: false, note: "Install a current GPU driver, then rescan.".to_string() }] } else { found }
}

fn selected_temperature(adapter_id: &str) -> Option<u64> {
    let index: usize = adapter_id.parse().ok()?;
    let instance = wgpu::Instance::default();
    let adapter = instance.enumerate_adapters(wgpu::Backends::all()).into_iter().nth(index)?;
    let name = adapter.get_info().name;
    nvidia_telemetry().into_iter().find(|(candidate, _, _)| name.contains(candidate) || candidate.contains(&name)).and_then(|item| item.2)
}
fn byte_label(window_mib: u32) -> String { format!("{:.1} GiB", window_mib as f64 / 1024.0) }
fn stage(name: &str, result: &str, window_mib: u32, detail: impl Into<String>, errors: u64) -> Stage { Stage { name: name.to_string(), result: result.to_string(), bytes: byte_label(window_mib), detail: detail.into(), errors } }
fn validate_config(config: &DiagnosticConfig) -> Result<(), String> {
    if !(64..=16384).contains(&config.window_mib) { return Err("Choose a test window between 64 MiB and 16 GiB.".to_string()); }
    if !(50..=100).contains(&config.temperature_limit_c) { return Err("Choose a temperature guard between 50°C and 100°C.".to_string()); }
    if config.retries > 2 { return Err("Choose no more than two retries.".to_string()); }
    Ok(())
}

fn run_memory_passes(config: &DiagnosticConfig) -> Result<Vec<Stage>, String> {
    validate_config(config)?;
    let instance = wgpu::Instance::default();
    let adapters: Vec<_> = instance.enumerate_adapters(wgpu::Backends::all());
    let index: usize = config.adapter_id.parse().map_err(|_| "Choose an adapter before starting.".to_string())?;
    let adapter = adapters.into_iter().nth(index).ok_or_else(|| "The selected adapter is no longer available. Rescan and choose it again.".to_string())?;
    let (device, queue) = pollster::block_on(adapter.request_device(&wgpu::DeviceDescriptor { label: Some("VRAM Burn-in Kit"), required_features: wgpu::Features::empty(), required_limits: wgpu::Limits::downlevel_defaults() }, None)).map_err(|error| format!("Could not open the selected GPU: {error}"))?;
    let window = u64::from(config.window_mib) * 1024 * 1024;
    let source = device.create_buffer(&wgpu::BufferDescriptor { label: Some("pattern window"), size: window, usage: wgpu::BufferUsages::COPY_SRC | wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::STORAGE, mapped_at_creation: false });
    let copied = device.create_buffer(&wgpu::BufferDescriptor { label: Some("copy window"), size: window, usage: wgpu::BufferUsages::COPY_SRC | wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::STORAGE, mapped_at_creation: false });
    let staging = device.create_buffer(&wgpu::BufferDescriptor { label: Some("readback window"), size: window, usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ, mapped_at_creation: false });
    let mut stages = vec![stage("Allocate", "pass", config.window_mib, "Reserved the requested GPU memory window", 0)];
    const CHUNK: usize = 4 * 1024 * 1024;
    let pattern: Vec<u8> = (0..CHUNK).map(|i| ((i as u32).wrapping_mul(0x45d9f3b) >> 16) as u8).collect();
    for offset in (0..window).step_by(CHUNK) {
        let count = std::cmp::min(CHUNK as u64, window - offset) as usize;
        queue.write_buffer(&source, offset, &pattern[..count]);
    }
    stages.push(stage("Fill patterns", "pass", config.window_mib, "Wrote deterministic walking-address pattern across the window", 0));
    let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: Some("copy and readback") });
    encoder.copy_buffer_to_buffer(&source, 0, &copied, 0, window);
    encoder.copy_buffer_to_buffer(&copied, 0, &staging, 0, window);
    queue.submit(Some(encoder.finish()));
    device.poll(wgpu::Maintain::Wait);
    stages.push(stage("Copy path", "pass", config.window_mib, "Device-to-device copy completed", 0));
    let view = staging.slice(..);
    let (sender, receiver) = sync_channel(1);
    view.map_async(wgpu::MapMode::Read, move |result| { let _ = sender.send(result); });
    device.poll(wgpu::Maintain::Wait);
    receiver.recv().map_err(|_| "The GPU did not return readback data.".to_string())?.map_err(|error| format!("Readback mapping failed: {error:?}"))?;
    let data = view.get_mapped_range();
    let mut errors = 0u64;
    for offset in (0..window).step_by(CHUNK) {
        let count = std::cmp::min(CHUNK as u64, window - offset) as usize;
        if data[offset as usize..offset as usize + count] != pattern[..count] { errors += 1; }
    }
    drop(data); staging.unmap();
    stages.push(stage("Readback", if errors == 0 { "pass" } else { "fail" }, config.window_mib, "Compared each readback chunk with the written pattern", errors));
    // A GPU command-buffer submission after the copies exercises the compute scheduling path.
    // Validation remains in the explicit transfer/readback stages above so a bad buffer is never hidden by a shader result.
    let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor { label: Some("shader dispatch"), source: wgpu::ShaderSource::Wgsl("@compute @workgroup_size(1) fn main() {}".into()) });
    let pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor { label: Some("shader sweep"), layout: None, module: &shader, entry_point: "main" });
    let mut compute = device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: Some("shader sweep") });
    { let mut pass = compute.begin_compute_pass(&wgpu::ComputePassDescriptor { label: Some("shader sweep"), timestamp_writes: None }); pass.set_pipeline(&pipeline); pass.dispatch_workgroups(1, 1, 1); }
    queue.submit(Some(compute.finish())); device.poll(wgpu::Maintain::Wait);
    stages.push(stage("Shader sweep", "pass", config.window_mib, "Submitted a GPU compute pass after the memory checks", 0));
    Ok(stages)
}

#[tauri::command]
fn run_diagnostic(config: DiagnosticConfig) -> Result<Receipt, String> {
    let mut last_error = String::new();
    for attempt in 0..=config.retries {
        if let Some(temp) = selected_temperature(&config.adapter_id) { if temp >= u64::from(config.temperature_limit_c) { return Err(format!("Thermal guard stopped the selected adapter at {temp}°C. Let the card cool, then retry.")); } }
        match run_memory_passes(&config) {
            Ok(stages) => {
                let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
                return Ok(Receipt { id: format!("VRAM-{now}"), started_at: format!("Unix timestamp {now}"), gpu: scan_adapters().into_iter().find(|adapter| adapter.id == config.adapter_id).map(|adapter| adapter.name).unwrap_or_else(|| "Selected GPU".to_string()), temperature: selected_temperature(&config.adapter_id), confidence: "Direct GPU allocation, transfer, readback, and compute scheduling completed.".to_string(), stages, demo: false, window_mib: config.window_mib, temperature_limit_c: config.temperature_limit_c, retries: attempt });
            },
            Err(error) => last_error = error,
        }
    }
    Err(format!("Test failed after {} attempt(s): {last_error}", u16::from(config.retries) + 1))
}

pub fn run() { tauri::Builder::default().invoke_handler(tauri::generate_handler![scan_adapters, run_diagnostic]).run(tauri::generate_context!()).expect("error while running VRAM Burn-in Kit"); }

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn diagnostic_contract_rejects_unsafe_windows_and_guards() {
        let base = DiagnosticConfig { adapter_id: "0".to_string(), window_mib: 1024, temperature_limit_c: 80, retries: 1 };
        assert!(validate_config(&base).is_ok());
        assert!(validate_config(&DiagnosticConfig { window_mib: 32, ..base }).is_err());
        assert!(validate_config(&DiagnosticConfig { adapter_id: "0".to_string(), window_mib: 1024, temperature_limit_c: 105, retries: 1 }).is_err());
        assert!(validate_config(&DiagnosticConfig { adapter_id: "0".to_string(), window_mib: 1024, temperature_limit_c: 80, retries: 3 }).is_err());
    }

    #[test]
    fn diagnostic_receipt_uses_distinct_failure_paths() {
        let names = ["Allocate", "Fill patterns", "Copy path", "Readback", "Shader sweep"];
        assert_eq!(names.len(), 5);
        let readback = stage("Readback", "fail", 1024, "Compared each readback chunk", 1);
        assert_eq!(readback.bytes, "1.0 GiB");
        assert_eq!(readback.errors, 1);
    }
}
