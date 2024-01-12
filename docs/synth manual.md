# How to modify the timbres

The panel at the right has a *sounds* group, which offers few options to select and edit the sounds that are used to play the notes.

## Step by step

* Expand the *sounds* group by clicking on the sounds word, in the panel at the right.
* The sounds panel will display one or many black horizontal rectangles containing small white text labels. Each rectangle controls one parameter of the sound.
* The first rectangle should have arrows pointing to the left and right on either side of the rectangle. Click on one of those arrows to change the synth sound. Try how the different options sound and choose one that you like.

## Synths and their parameters

### Sine

Pure sine wave synth, without parameters so far.

### External MIDI synth

Send MIDI data to an external synth. It sends a midi note together with a pitch bend note, so that you can play mono synths microtonally. It also sends different voices to different channels, so that you can set it up polifonically. However, it has not been implemented in an MPE compliant way yet. 

* **output**: The MIDI output port to send the MIDI data to. If there are none available, this option will not respond.

### Samplers

Samplers are presented as different synth engines. They have different sets of sounds, but they all share the same parameters.

* **Level**: The volume of the sampler.
* **Loading progress** (read only) Shows the progress of loading the samples. The sampler will make-do with the currently loaded samples, and of course it will sound better once all the samples are loaded.
* **Attack, Decay, Sustain, Release**: The ADSR envelope of the sampler.
* **Velocity to start point, seconds**: Control the extent to which the velocity of the note will determine how far from the beginning of the sample the playback will start. 
    * The higher the velocity times the value of this setting, the closer to the beginning of the sample the playback will start. 
    * Since all of the existing samplers so far utilize sounds with fast attack and no sustain, this setting results in a sample starting with less volume the later it's starting point it is. 
    * If this explanation is too dense, try placing a series of identical notes in a row, setting each of the notes with a lower velocity than the previous one, and set this parameter to maximum; then try setting it to minimum and compare the results. 
<!-- 
You should be able to copy this text and paste it in the viewport.

``` json
[{"octave":4.994410692816959,"time":1,"mute":false,"timeEnd":1,"velocity":1,"layer":0},{"octave":4.994410692816959,"time":2,"mute":false,"timeEnd":2,"velocity":0.947469066366704,"layer":0},{"octave":4.994410692816959,"time":3,"mute":false,"timeEnd":3,"velocity":0.852980877390326,"layer":0},{"octave":4.994410692816959,"time":4,"mute":false,"timeEnd":4,"velocity":0.7719910011248592,"layer":0},{"octave":4.994410692816959,"time":5,"mute":false,"timeEnd":5,"velocity":0.6865016872890888,"layer":0},{"octave":4.994410692816959,"time":6,"mute":false,"timeEnd":6,"velocity":0.605511811023622,"layer":0},{"octave":4.994410692816959,"time":7,"mute":false,"timeEnd":7,"velocity":0.5200224971878513,"layer":0},{"octave":4.994410692816959,"time":8,"mute":false,"timeEnd":8,"velocity":0.4300337457817771,"layer":0}]
``` -->

#### Glockenspiel
Samples from: https://freesound.org/people/cabled_mess/packs/19827/
Press the "credits" button in the sampler to see more info.
#### Hohner Pianet
Samples from: https://freesound.org/people/tarane468/packs/26137/
Press the "credits" button in the sampler to see more info.
#### Nylon Strings
Samples from: https://freesound.org/people/Kyster/packs/7397/
Press the "credits" button in the sampler to see more info.
#### (CPX) test-tone

*This is an experimental sampler that triggers more than one sample at once, it does not have parameters yet.*

### Karplus

Karplus-Strong synthesis is a technique that uses a delay line with a feedback loop to create a sound similar to a plucked string. In this feedback loop, there is a boxcar-filter and a form of limiter.

* **Boxcar K** The frequency of low-pass filtering. 1 is no filtering, 0 is maximum filtering.
* **Filter wet** The amount of filtering applied to the signal. 1 is 100% filtered, 0 bypasses the filter.
* **Feedback** The feedback multiplier. High feedback values can lead to distorted and difficult to control sounds. However, when the filter is removing a lot of sound, you might need to increase the feedback to compensate.
* **Exciter attack** The attack time of the exciter. The exciter is a noise generator that is fed into the feedback loop.
* **Exciter decay** The decay time of the exciter. If you set it to 0, the sound will sustain throughout the duration of the whole note.
* **Exciter level** The level of the exciter.
* **Level to feedback relation** Controls a sort of compressor that is chained in the feedback loop. The amount of feedback can be affected by inverse proportion to the on-going volume of the feedback loop. In this way, the feedback loop controls the dynamics of the feedback to counteract an ever-increasing or insufficient amount of feedback. This level determines by how much.
* **Exciter -> detune** Controls how much to detune the notes based on the level of the exciter; this way it is possible to introduce a bit of imperfection to the sound. Double clicking, or middle button clicking on the slider will reset it to 0.
* **Amp -> detune** Controls how much to detune the notes based on how loud the feedback  of the amp is; this way it is possible to introduce a bit of imperfection to the sound. Double clicking, or middle button clicking on the slider will reset it to 0.