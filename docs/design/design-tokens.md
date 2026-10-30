# Kivu Ferry: design tokens

Source: every value used in the 14 screens of the "Kivu Ferry pages" design. The file is `app/web/src/styles/tokens.css`, the only file allowed to contain raw values (hex, px, font names). Light is the default. Dark follows the system setting.

## Colour (light / dark)

| Token | Light | Dark | Used for |
|---|---|---|---|
| `bg` | #F4F6F5 | #0E1A20 | Page ground |
| `surface` | #FFFFFF | #15252D | Cards, header, inputs |
| `primary-soft` | #E3F1F3 | #12363D | Tinted tiles, active nav item |
| `fg` | #10212B | #E6EEF0 | Main text |
| `muted` | #4A5A63 | #A9B8BF | Secondary text, labels |
| `subtle` | #8A9BA3 | #7F9199 | Placeholders, filled-digit borders |
| `line` | #E2E8EA | #24363F | Card borders, header divider |
| `line-strong` | #CBD5D9 | #33464F | Input borders, taken seats |
| `line-soft` | #EEF2F3 | #1C2D35 | Table row dividers |
| `primary` | #0B5F6D | same | Buttons, hero, selected items |
| `primary-hover` | #08434D | #0E6E7E | Button hover |
| `on-primary` | #FFFFFF | same | Text on primary |
| `on-primary-muted` | #D6ECEF | same | Secondary text on the hero and ticket |
| `link` / `link-hover` | #0B5F6D / #08434D | #6FC3CF / #A6E1E8 | Links |
| `accent` / `on-accent` | #F2A65A / #10212B | same | Your seat, current step |

**Status** (background · text · strong):

| Status | Light | Dark |
|---|---|---|
| `success` (confirmed, active) | #E3F2E6 · #1F5129 · #2E6B3A | #173A22 · #8FD3A0 · #7CC48E |
| `warning` (pending, invited) | #FDF1E4 · #6B3A10 · #A3470F | #3A2A15 · #F2C08A · #F0A35E |
| `danger` (failed, 2FA off) | #F8E3E1 · #8E2A20 | #3D1F1C · #F0948A |
| `neutral` (expired, disabled) | #EEF2F3 · #4A5A63 | #1C2D35 · #A9B8BF |

## Type

| Group | Tokens |
|---|---|
| Font | `sans` Plus Jakarta Sans · `mono` JetBrains Mono (codes, references, OTP) |
| Size | `xs` 12 · `sm` 14 (secondary text, desktop body) · `base` 16 (mobile body, buttons, inputs) · `lg` 18 · `xl` 22 · `2xl` 26 · `3xl` 30 (hero): 2px steps up to 18, then 4px |
| Weight | `regular` 400 · `semibold` 600 · `bold` 700 · `extrabold` 800 |
| Line height | `tight` 1.15 (hero) · `snug` 1.4 · `normal` 1.5 |
| Letter spacing | `title` −0.4px · `hero` −0.6px · `caps` 0.4px · `code` 2px · `otp` 6px |

## Space

`0-5` 2 · `1` 4 · `1-5` 6 · `2` 8 · `2-5` 10 · `3` 12 · `3-5` 14 · `4` 16 · `5` 20 · `6` 24 · `7` 28 · `8` 32 · `10` 40 · `16` 64 · `24` 96 (px)

## Shape, sizes and layout

| Group | Tokens |
|---|---|
| Radius | `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 20 (ticket) · `hull` 48 (boat bow) · `pill` 999 · `round` 50% |
| Border | `border` 1px `line` · `border-strong` 1px `line-strong` · `border-width-strong` 1.5px (focused or selected) · `border-tear` 2px dashed (ticket stub) |
| Shadow | `raised`: the search form over the hero |
| Controls | `sm` 36 · `md` 44 (minimum touch target) · `lg` 48 (desktop) · `xl` 52 (mobile) · `2xl` 56 (code inputs) |
| Icons | `sm` 16 · `md` 20 · `lg` 24 · `xl` 28 (logo) · `tile` 52 · `status-circle` 88 · `qr-size` 160 |
| Layout | `page-width` 1280 (operations) · `auth-width` 420 (staff sign-in) · `stat-min` 180 |
| Focus | `focus-ring` 2px `link` · `focus-offset` 2px (new: the screens had no visible focus style) |

## Values merged to keep the scale small

| In the screens | Becomes | Where |
|---|---|---|
| 11px text | 12 (`xs`) | "FRONT" on the seat map |
| 13px text | 14 (`sm`) | Secondary text, labels, meta |
| 15px text | 16 (`base`) | Body text on mobile |
| 17px text | 18 (`lg`) | Route titles, brand, phone input |
| 20px text | 22 (`xl`) | Booking reference on the ticket |
| 24px text | 26 (`2xl`) | Staff page titles |
| −0.2px tracking | −0.4 (`title`) | Brand name |
| 1.2px tracking | 0.4 (`caps`) | "FRONT" |
| 9px, 10px, 14px radius | 8, 12, 16 | Tabs, inputs, cards |
| 50px height | 48 (`control-lg`) | Staff buttons |
| 5, 9, 18, 22px spacing | 4, 10, 20, 24 | Pills, staff forms, ticket |
| 22px, 26px icons | 24 | Back arrow, lock icon |
