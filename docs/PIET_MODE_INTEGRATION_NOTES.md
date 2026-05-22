# Piet Mode Integration Notes

## Current Status

Piet Late Night Mode is currently controlled by a temporary in-page toggle for design/testing.

## Temporary Flags

`PIET_MODE_DEFAULT_ON = false`

The sidebar toggle stores the current testing choice in `localStorage` under `lemonteedFmPietMode`.

Remove the toggle persistence when ready to activate based on local visitor time.

## Final Time Logic

Piet Mode should activate between 11 PM and 5 AM using the visitor's browser local time.

```js
const hour = new Date().getHours();
const isPietMode = hour >= 23 || hour < 5;
```

## Segment Logic

Current segment is temporarily hardcoded to "Piet's Certified Correct Takes."

Final version should calculate current segment from local time:

* 11:00 PM - 12:00 AM: The Sign-On
* 12:00 AM - 1:30 AM: Static Breaks
* 1:30 AM - 3:00 AM: Piet's Certified Correct Takes
* 3:00 AM - 4:30 AM: Songs for People Still Awake
* 4:30 AM - 5:00 AM: Sunrise Shutdown

## Fake-Live Elements

The following are flavor-only, not real analytics:

* listener count
* signal status
* broadcast log
* Piet quote ticker

## Final Assets Needed

* optimized Piet hero artwork
* optional transparent Piet cutout
* optional night XP hill background
* optional mug/microphone supporting art
