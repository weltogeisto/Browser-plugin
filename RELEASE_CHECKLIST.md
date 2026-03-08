# Release Checklist

## Build
- [ ] `npm install` or `pnpm install`
- [ ] build completes without errors
- [ ] manifest loads in Chrome

## Install
- [ ] extension loads via `Load unpacked`
- [ ] side panel opens from toolbar action

## Core flow
- [ ] selected text appears in side panel
- [ ] settings save correctly
- [ ] remote-send notice blocks first compare until acknowledged
- [ ] two selected providers can be chosen
- [ ] compare run returns outputs or clean isolated errors
- [ ] winner selection works
- [ ] history persists after panel reload

## Hardening
- [ ] excluded page blocks compare clearly
- [ ] truncation notice appears for long text
- [ ] export markdown works
- [ ] copy winner works
