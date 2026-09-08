# iPhone home-screen widget

`sisters-cafe-widget.js` is a [Scriptable](https://scriptable.app) script that
renders a live widget: today's tasks, the next 7 days of reminders, and today's
focus minutes — pulled from your cloud-synced data and decrypted on-device with
your passphrase (same scheme as the web app; Firebase only ever sees ciphertext).

## Requirements

- Cloud sync already enabled in the app (you have a passphrase and data is syncing).
- The free **Scriptable** app.

## Install (once, ~3 min)

1. App Store → install **Scriptable**.
2. Open Scriptable → tap **+** (top right) → delete the sample code.
3. Open `widget/sisters-cafe-widget.js` from this repo, copy the whole file, paste
   it in. Tap the title, rename the script to **sisters cafe**, Done.
4. Tap **▶** (bottom) to run it once. It prompts for your **sync passphrase** —
   enter the same one you use in the app. It's saved to this device's Keychain
   (not iCloud, not the script file). You'll see a widget preview.
5. Home screen → long-press an empty area → **+** → search **Scriptable** → pick a
   size → **Add Widget**.
6. Long-press the new widget → **Edit Widget**:
   - **Script** → **sisters cafe**
   - **When Interacting** → **Run Script** (or Open URL — either opens the app)
   - *(optional)* **Parameter** → a profile name, to pin the widget to that
     profile. Leave blank to follow whichever profile is active in the app.

Tap the widget any time to open the full app.

## Sizes

| size | shows |
|---|---|
| small | task count + next reminder + focus meter |
| medium | 3 tasks, 2 reminders, focus meter |
| large | 6 tasks, 5 reminders, focus meter |

## Refresh

iOS controls widget refresh timing (typically every 15–60 min); the script
requests a refresh every ~20 min. It's not real-time — that's an iOS limitation
for all widgets. Tap it to open the app for the live picture.

If the network fails it shows the last successful snapshot with an "⚠ offline"
note rather than an error.

## Changing the passphrase

Run the script from inside Scriptable again — it re-prompts and overwrites the
stored value.

## Updating the script

Paste a newer version over the old one in Scriptable. The Keychain passphrase and
your widgets stay put.
