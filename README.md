# microtonal piano roll

More info about the project is still in my to-do

for now, read from https://autotel.co/portfolio/2022-12-19-piano-roll

dev usage:

* install node js & npm
* cd to the project dir
* run `npm install`
* run `npm run dev`


## Features

### Notes
### Automation points
### Loops
### Traces
A trace is whatever can be placed on the timeline; namely notes, automation points and loops. Traces share some properties and are grouped together as to make the manipulation of all these different things more consistent. During the development of any new timeline-oriented feature, the objective is to create as few new user interaction logics as possible, and instead use the logics that already exist.

## Visibility and editability

### Notes & Layers

Notes can belong to a layers. Layers associate note events with different synthesizer channels, thus allowing polytimbrality. Layers can be used aswell as means of separating notes by arbitrary criteria and make editing easier. One example use of this, is to create a layer for the overall harmonic structure of the song, and a second layer for decorations & details. This approach would make it easier for the user to select only decorative events, or only structure events thanks to the fact that layers can be made invisible,

### Per-note modulations

So far, there is only one possible per-note modulation, which is *velocity*. Each voice handles this parameter differently. With any luck, some other per-note modulations will be introduced.

While on modulation mode, note tones nor time can be edited, only the per-note modulations can be modified.

### Automations

Some synthesizer voice parameters can be automated through time. An automatable parameter can be recognized when it presents an orange glow upon click, while on automation mode.
On automation mode, only the automation points can be edited.

### Wording for developers

* Visible: The trace falls within the view in the screen, and is not made invisible due to layer invisiblity or different tool being chosen.
* Displayable: The trace would be visible if it was in the view screen; meaning that it's displayed by layer and tool, but it's not necessarily rendered (it might be off-screen).
* Greyed


