// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Make some noise via cpal.
#![allow(clippy::precedence)]
// for MIDI, thanks to Till (https://till.md/)
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{FromSample, Sample, SizedSample, SupportedStreamConfig};
use fundsp::hacker::*;
use midir::{Ignore, MidiInput, MidiInputConnection};
use serde::Serialize;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager, Window, Wry};
#[derive(Default)]
pub struct MidiState {
    pub input: Mutex<Option<MidiInputConnection<()>>>,
}

#[derive(Clone, Serialize)]
struct MidiMessage {
    message: Vec<u8>,
}

// #[cfg(debug_assertions)] // required when disable_release is set (default)
// #[global_allocator]
// static A: AllocDisabler = AllocDisabler;

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
                                .emit(
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
fn trigger(_window: Window<Wry>, frequency: f32, amplitude: f32) {
    // let (_host, device, config) = host_device_setup().expect("could not setup host device");
    // let stream = sr_select_make_stream(device, config).expect("could not make stream");

    // stream.play().expect("play didnt work");

    let mut voice = VOICE_STATE.lock().unwrap();
    voice.oscillator.frequency_hz = frequency;
    voice.oscillator.amplitude = amplitude;
    voice.trigger();
}

fn main() -> anyhow::Result<()> {
    let (_host, device, config) = host_device_setup()?;
    let stream = sr_select_make_stream(device, config)?;

    stream.play()?;

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            trigger,
            open_midi_connection,
            list_midi_connections
        ])
        .manage(MidiState {
            ..Default::default()
        })
        .setup(|app| {
            #[cfg(debug_assertions)] // only include this code on debug builds
            {
                if let Some(window) = app.get_webview_window("main") {
                    //   window.open_devtools();
                    //   window.close_devtools();
                    window
                        .set_title("autotel - nondiscrete piano roll")
                        .expect("window title could not be set");
                } else {
                    println!("Warning: main window not found in setup; title not set");
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}

pub enum Waveform {
    Sine,
    Square,
    Saw,
    Triangle,
}

pub struct Oscillator {
    pub sample_rate: f32,
    pub waveform: Waveform,
    pub current_sample_index: f32,
    pub frequency_hz: f32,
    pub amplitude: f32,
}

impl Oscillator {
    fn advance_sample(&mut self) {
        self.current_sample_index = (self.current_sample_index + 1.0) % self.sample_rate;
    }

    fn set_waveform(&mut self, waveform: Waveform) {
        self.waveform = waveform;
    }

    fn calculate_sine_output_from_freq(&self, freq: f32) -> f32 {
        let two_pi = 2.0 * std::f32::consts::PI;
        (self.current_sample_index * freq * two_pi / self.sample_rate).sin()
    }

    fn is_multiple_of_freq_above_nyquist(&self, multiple: f32) -> bool {
        self.frequency_hz * multiple > self.sample_rate / 2.0
    }

    fn sine_wave(&mut self) -> f32 {
        self.advance_sample();
        self.calculate_sine_output_from_freq(self.frequency_hz)
    }

    fn generative_waveform(&mut self, harmonic_index_increment: i32, gain_exponent: f32) -> f32 {
        self.advance_sample();
        let mut output = 0.0;
        let mut i = 1;
        while !self.is_multiple_of_freq_above_nyquist(i as f32) {
            let gain = 1.0 / (i as f32).powf(gain_exponent);
            output += gain * self.calculate_sine_output_from_freq(self.frequency_hz * i as f32);
            i += harmonic_index_increment;
        }
        output
    }

    fn square_wave(&mut self) -> f32 {
        self.generative_waveform(2, 1.0)
    }

    fn saw_wave(&mut self) -> f32 {
        self.generative_waveform(1, 1.0)
    }

    fn triangle_wave(&mut self) -> f32 {
        self.generative_waveform(2, 2.0)
    }

    fn tick(&mut self) -> f32 {
        self.advance_sample();
        match self.waveform {
            Waveform::Sine => self.sine_wave() * self.amplitude,
            Waveform::Square => self.square_wave() * self.amplitude,
            Waveform::Saw => self.saw_wave() * self.amplitude,
            Waveform::Triangle => self.triangle_wave() * self.amplitude,
        }
    }
}

#[derive(Debug)]
pub struct VeryBasicVoice {
    pub oscillator: Oscillator,
    pub decay_time: f32,
    pub in_use: bool,
    pub envelope_countdown: f32,
    pub envelope_duration: f32,
}

impl VeryBasicVoice {
    fn set_waveform(&mut self, waveform: Waveform) {
        self.oscillator.set_waveform(waveform);
    }
    fn trigger(&mut self) {
        self.in_use = true;
        self.envelope_countdown = self.envelope_duration;
        //
        if self.oscillator.amplitude == 0.0 {
            self.oscillator.amplitude = 0.2;
        }
    }
    fn tick(&mut self) -> f32 {
        if !self.in_use {
            return 0.0;
        }
        self.envelope_countdown -= 1.0 / self.oscillator.sample_rate;
        let delta_gain =
            self.oscillator.amplitude / (self.decay_time * self.oscillator.sample_rate);
        if self.envelope_countdown <= 0.0 {
            self.in_use = false;
            self.envelope_countdown = 0.;
        }
        self.oscillator.amplitude -= delta_gain;
        if self.oscillator.amplitude < 0.0 {
            self.oscillator.amplitude = 0.0;
        }
        self.oscillator.tick()
    }
}

pub fn new_very_basic_voice (sample_rate: f32) -> VeryBasicVoice {
    let ret = VeryBasicVoice {
        oscillator: Oscillator {
            waveform: Waveform::Sine,
            sample_rate: sample_rate,
            current_sample_index: 0.0,
            frequency_hz: 110.0,
            amplitude: 0.2,
        },
        decay_time: 0.8,
        in_use: false,
        envelope_countdown: 0.,
        envelope_duration: 1.,
    };
    ret
}

impl std::fmt::Debug for Oscillator {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Oscillator")
            .field("sample_rate", &self.sample_rate)
            .field("current_sample_index", &self.current_sample_index)
            .field("frequency_hz", &self.frequency_hz)
            .field("amplitude", &self.amplitude)
            .finish()
    }
}


pub fn host_device_setup(
) -> Result<(cpal::Host, cpal::Device, cpal::SupportedStreamConfig), anyhow::Error> {
    let host = cpal::default_host();

    let device = host
        .default_output_device()
        .ok_or_else(|| anyhow::Error::msg("Default output device is not available"))?;
    println!("Output device : {}", device.name()?);

    let config = device.default_output_config()?;
    println!("Default output config : {:?}", config);

    Ok((host, device, config))
}

pub fn sr_select_make_stream(
    device: cpal::Device,
    config: SupportedStreamConfig,
) -> Result<cpal::Stream, anyhow::Error>
where
{
    match config.sample_format() {
        cpal::SampleFormat::I8 => make_stream::<i8>(&device, &config.into()),
        cpal::SampleFormat::I16 => make_stream::<i16>(&device, &config.into()),
        cpal::SampleFormat::I32 => make_stream::<i32>(&device, &config.into()),
        cpal::SampleFormat::I64 => make_stream::<i64>(&device, &config.into()),
        cpal::SampleFormat::U8 => make_stream::<u8>(&device, &config.into()),
        cpal::SampleFormat::U16 => make_stream::<u16>(&device, &config.into()),
        cpal::SampleFormat::U32 => make_stream::<u32>(&device, &config.into()),
        cpal::SampleFormat::U64 => make_stream::<u64>(&device, &config.into()),
        cpal::SampleFormat::F32 => make_stream::<f32>(&device, &config.into()),
        cpal::SampleFormat::F64 => make_stream::<f64>(&device, &config.into()),
        sample_format => Err(anyhow::Error::msg(format!(
            "Unsupported sample format '{sample_format}'"
        ))),
    }
}

// static mut VOICE_STATE: VeryBasicVoice = VeryBasicVoice {
//     oscillator: Oscillator {
//         waveform: Waveform::Sine,
//         sample_rate: 44100.0,
//         current_sample_index: 0.0,
//         frequency_hz: 110.0,
//         amplitude: 0.2,
//     },
//     decay_time: 0.8,
//     in_use: false,
//     envelope_countdown: 0.,
//     envelope_duration: 1.,
// };

// mutex voice_state
lazy_static::lazy_static! {
    static ref VOICE_STATE: Mutex<VeryBasicVoice> = Mutex::new(new_very_basic_voice(44100.0));
}


pub fn make_stream<T>(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
) -> Result<cpal::Stream, anyhow::Error>
where
    T: SizedSample + FromSample<f32>,
{
    let num_channels = config.channels as usize;

    let err_fn = |err| eprintln!("Error building output sound stream: {}", err);

    let time_at_start = std::time::Instant::now();
    println!("Time at start: {:?}", time_at_start);

    // difficult to pass in a reference to voice_state
    // because who knows what the lib will do with the closure?
    let stream = device.build_output_stream(
        config,
        move |output: &mut [T], _: &cpal::OutputCallbackInfo| {
            process_frame(output,  num_channels)
        },
        err_fn,
        None,
    )?;

    Ok(stream)
}

fn process_frame<SampleType>(
    output: &mut [SampleType],
    num_channels: usize,
) where
    SampleType: Sample + FromSample<f32>,
{

    let mut synth = VOICE_STATE.lock().unwrap();

    for frame in output.chunks_mut(num_channels) {
        let value: SampleType = SampleType::from_sample(synth.tick());
        // copy the same value to all channels
        for sample in frame.iter_mut() {
            *sample = value;
        }
    }
}
