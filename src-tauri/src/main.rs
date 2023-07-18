// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Make some noise via cpal.
#![allow(clippy::precedence)]
// for MIDI, thanks to Till (https://till.md/)
use midir::{Ignore, MidiInput, MidiInputConnection};
use serde::Serialize;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{Manager, Window, Wry};

#[derive(Default)]
pub struct MidiState {
    pub input: Mutex<Option<MidiInputConnection<()>>>,
}

#[derive(Clone, Serialize)]
struct MidiMessage {
    message: Vec<u8>,
}


use assert_no_alloc::*;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{FromSample, SizedSample};
use fundsp::hacker::*;

#[cfg(debug_assertions)] // required when disable_release is set (default)
#[global_allocator]
static A: AllocDisabler = AllocDisabler;


// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    println!("Hello, {}!", name);
    format!("Hello, {}! You've been greeted from Rust!", name)
}



#[tauri::command]
fn list_midi_connections() -> HashMap<usize, String> {
    let midi_in = MidiInput::new("piano-trainer-input");
    match midi_in {
        Ok(midi_in) => {
            let mut midi_connections = HashMap::new();
            for (i, p) in midi_in.ports().iter().enumerate() {
                let port_name = midi_in.port_name(p);
                match port_name {
                    Ok(port_name) => {
                        midi_connections.insert(i, port_name);
                    }
                    Err(e) => {
                        println!("Error getting port name: {}", e);
                    }
                }
            }
            midi_connections
        }
        Err(_) => HashMap::new(),
    }
}

#[tauri::command]
fn open_midi_connection(
    midi_state: tauri::State<'_, MidiState>,
    window: Window<Wry>,
    input_idx: usize,
) {
    let handle = Arc::new(window).clone();
    let midi_in = MidiInput::new("continuous-piano-roll-input");
    match midi_in {
        Ok(mut midi_in) => {
            midi_in.ignore(Ignore::None);
            let midi_in_ports = midi_in.ports();
            let port = midi_in_ports.get(input_idx);
            match port {
                Some(port) => {
                    let midi_in_conn = midi_in.connect(
                        port,
                        "midir",
                        move |_, message, _| {
                            handle
                                .emit_all(
                                    "midi_message",
                                    MidiMessage {
                                        message: message.to_vec(),
                                    },
                                )
                                .map_err(|e| {
                                    println!("Error sending midi message: {}", e);
                                })
                                .ok();
                        },
                        (),
                    );
                    match midi_in_conn {
                        Ok(midi_in_conn) => {
                            midi_state.input.lock().unwrap().replace(midi_in_conn);
                        }
                        Err(e) => {
                            println!("Error: {}", e);
                        }
                    }
                }
                None => {
                    println!("No port found at index {}", input_idx);
                }
            }
        }
        Err(e) => println!("Error: {}", e),
    }
}
#[tauri::command]
fn beep() {
    let host = cpal::default_host();

    let device = host
        .default_output_device()
        .expect("Failed to find a default output device");
    let config = device.default_output_config().unwrap();

    match config.sample_format() {
        cpal::SampleFormat::F32 => run::<f32>(&device, &config.into()).unwrap(),
        cpal::SampleFormat::I16 => run::<i16>(&device, &config.into()).unwrap(),
        cpal::SampleFormat::U16 => run::<u16>(&device, &config.into()).unwrap(),
        _ => panic!("Unsupported format"),
    }
    fn run<T>(device: &cpal::Device, config: &cpal::StreamConfig) -> Result<(), anyhow::Error>
    where
        T: SizedSample + FromSample<f64>,
    {
        let sample_rate = config.sample_rate.0 as f64;
        let channels = config.channels as usize;

        let c = 0.2 * (organ_hz(midi_hz(57.0)) + organ_hz(midi_hz(61.0)) + organ_hz(midi_hz(64.0)));

        let c = c >> pan(0.0);

        let c = c >> (chorus(0, 0.0, 0.01, 0.2) | chorus(1, 0.0, 0.01, 0.2));


        let mut c = c
            >> (declick() | declick())
            >> (dcblock() | dcblock())
            //>> (multipass() & 0.2 * reverb_stereo(10.0, 3.0))
            >> limiter_stereo((1.0, 5.0));
        //let mut c = c * 0.1;

        c.set_sample_rate(sample_rate);
        c.allocate();

        let mut next_value = move || assert_no_alloc(|| c.get_stereo());

        let err_fn = |err| eprintln!("an error occurred on stream: {}", err);

        let stream = device.build_output_stream(
            config,
            move |data: &mut [T], _: &cpal::OutputCallbackInfo| {
                write_data(data, channels, &mut next_value)
            },
            err_fn,
            None,
        )?;
        stream.play()?;
        // stream does not block the calling thread but I dont't know how to keep the sound beyond the scope of this function
        std::thread::sleep(std::time::Duration::from_millis(4000));

        Ok(())
    }

    fn  write_data<T>(output: &mut [T], channels: usize, next_sample: &mut dyn FnMut() -> (f64, f64))
    where
        T: SizedSample + FromSample<f64>,
    {
        for frame in output.chunks_mut(channels) {
            let sample = next_sample();
            let left = T::from_sample(sample.0);
            let right: T = T::from_sample(sample.1);

            for (channel, sample) in frame.iter_mut().enumerate() {
                if channel & 1 == 0 {
                    *sample = left;
                } else {
                    *sample = right;
                }
            }
        }
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            beep,
            open_midi_connection,
            list_midi_connections
        ])
        .manage(MidiState {
            ..Default::default()
        }).setup(|app| {
            #[cfg(debug_assertions)] // only include this code on debug builds
            {
              let window = app.get_window("main").unwrap();
              window.open_devtools();
              window.close_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
