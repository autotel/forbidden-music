# microtonal piano roll

More info https://autotel.co/portfolio/2022-12-19-piano-roll

## Getting started

### Video introduction tutorial

<iframe width="560" height="315" src="https://www.youtube.com/embed/kFopR8sAikg?si=8xvVJdTZCAQzstWB&amp;start=173" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>


### Step by step

* open https://autotel.co/forbidden-music
* click on the viewport (the screen area where a grid appears). This should introduce a note.
* click on the viewport and drag horizontally to the right. This should introduce a second note with length.
* while holding `control` key, click on the viewport and drag diagonally. This creates a range selection, which you can use to select the notes.
* after selecting the notes, press `alt` key and drag the notes up and down. This duplicates the notes
* locate in the panel at the right, the *constraints* section buttons. Activate some of the snap buttons which are colored in yellow or orange. This will make the notes snap to different grids. Some grids are based on existing notes, while other grids are absolute. Try introducing and modifying notes, and notice how the behavior changes according to your selection.
* hover the mouse over a snap selection button, and read the short description.


### Available tone constraints (or snaps)

#### `Custom` Custom frequency table

Constrains the notes to frequencies (or octaves) determined by a list. The list can be edited by clicking on the pencil icon.

#### `1EDO` Octaves only

Constrains the notes to squares of a the fundmental frequency.

#### `7EDO` 7 Equal temperament
#### `10EDO` 10 Equal temperament
#### `12EDO` 12 Equal temperament
#### `19EDO` 19 Equal temperament
#### `22EDO` 22 Equal temperament
#### `24EDO` 24 Equal temperament
#### `48EDO` 48 Equal temperament

All these are equal temperament constraints.

#### `a×b` Hertz multiples

Constrains the notes to integer multiples of existing notes.

#### `a/b` Hertz divisions

Constrains the notes to simple divisions of existing notes.

#### `3x` Thirds

Constrains the notes to a third, or three times any of the existing notes.

#### `5x` Fourths

Constrains the notes to a fifth, or five times any of the existing notes.

#### `7x` Seventh

Constrains the notes to a seventh, or seven times any of the existing notes.

#### `⋮ EDO` Arbitrary EDO

Constrains the notes to a custom equal temperament. The equal temperament is determined by the two lowest notes. The lowest note determines the fundamental frequency, and the second lowest note determines the interval.

#### `⋮ Hz` Arbitrary Hertz

Constrains the notes to a regular grid of frequencies. The grid is determined by the two lowest notes. The lowest note determines the fundamental frequency, and the second lowest note determines the interval. 

The tone between each consecutive interval, is thus, inversely proportional to tone; because tone is mapped logarithmically. This means that intervals get smaller, the higher up in the scale.


### Available time constraints (or snaps)

#### `1×` Time integers

Notes are restricted to integer time units.

#### `T × 1/4` Time fourths

Notes are restricted to 1/4ths of the integer time units.

#### `T × 1/5` Time fifths

Notes are restricted to 1/5ths of the integer time units.

#### `T × 1/3` Time fifths

Notes are restricted to 1/3rds of the integer time units.

#### `T × 1/b` Time fractions

Notes are restricted to simple fractions of the time of other existing note starting times.

#### `=` Equal start times

Notes are restricted to the same starting time of other existing notes.

#### `⋯ T` Arbitrary time grid

Notes are restricted to a custom time grid. The grid is determined by the two earliest notes. The earliest note determines the base time, and the second note determines the interval.

### Constraints domain modifiers

When a composition grows, amount of possible snap points (on relative tone constraints) might become too many. These constraints help reducing the scope of the harmony for snapping.

#### `Monly` Only with muted notes

Take only into consideration muted notes for snapping. This can be handy, for example, as a way to separate structural notes determine from others.

#### `Simultaneous` Only with simultaneous notes

Take only into consideration notes that are present at the same time of the snap target note. This can be handy on harmonies that evolve; where the harmony of the past might no longer apply.

#### `In view` Only with notes in view

Take only into consideration notes that are visible on the screen.

#### `== layer` Only with notes in the same layer

This button is present only if 'layers' feature is active. Take only into consideration notes that are in the same layer than the snap target note.

#### `!= layer` Only with notes in different layers

This button is present only if 'layers' feature is active. Take only into consideration notes that are in a different layer than the snap target note.

## Dev getting started

dev usage:

* install node js & npm
* cd to the project dir
* run `npm install`
* run `npm run dev`

## Visibility and editability

### Notes & Layers

Notes can belong to a layers. Layers associate note events with different synthesizer channels, thus allowing polytimbrality. Layers can be used aswell as means of separating notes by arbitrary criteria and make editing easier. One example use of this, is to create a layer for the overall harmonic structure of the song, and a second layer for decorations & details. This approach would make it easier for the user to select only decorative events, or only structure events thanks to the fact that layers can be made invisible,

### Per-note modulations

So far, there is only one possible per-note modulation, which is *velocity*. Each voice handles this parameter differently. With any luck, some other per-note modulations will be introduced.

While on modulation mode, note tones nor time can be edited, only the per-note modulations can be modified.

### Automations

Some synthesizer voice parameters can be automated through time. An automatable parameter can be recognized when it presents an orange glow upon click, while on automation mode.
On automation mode, only the automation points can be edited.

