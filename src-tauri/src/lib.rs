use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
struct Adapter { name: String, memory_mib: Option<u64>, temperature_c: Option<u64>, supported: bool, note: String }

// NVIDIA's supported command-line telemetry API is used for adapter discovery
// and thermal guard visibility. The web UI deliberately never uses privileged
// controls or changes power/clock settings.
#[tauri::command]
fn scan_adapters() -> Vec<Adapter> {
    let output = Command::new("nvidia-smi")
        .args(["--query-gpu=name,memory.total,temperature.gpu", "--format=csv,noheader,nounits"])
        .output();
    match output {
        Ok(result) if result.status.success() => result.stdout.split(|b| *b == b'\n').filter_map(|line| {
            let text = String::from_utf8_lossy(line); let parts: Vec<_> = text.split(',').map(str::trim).collect();
            if parts.len() != 3 || parts[0].is_empty() { return None; }
            Some(Adapter { name: parts[0].to_string(), memory_mib: parts[1].parse().ok(), temperature_c: parts[2].parse().ok(), supported: true, note: "NVIDIA telemetry available".to_string() })
        }).collect(),
        _ => vec![Adapter { name: "No supported adapter found".to_string(), memory_mib: None, temperature_c: None, supported: false, note: "Install an NVIDIA driver with nvidia-smi, or use the sample receipt.".to_string() }]
    }
}

pub fn run() { tauri::Builder::default().invoke_handler(tauri::generate_handler![scan_adapters]).run(tauri::generate_context!()).expect("error while running VRAM Burn-in Kit"); }

