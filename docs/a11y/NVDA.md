# NVDA Testing Guide for PaperRead

Follow these steps when validating the reader with NVDA 2023.3+ on Windows 11:

1. Launch NVDA and enable focus highlighting (`Insert+F2`, choose *Speech viewer* if you need an overlay).
2. Open PaperRead at `http://localhost:5173/reading.html?bookId=phase2-demo` in Firefox or Edge.
3. Use the following shortcuts to exercise core flows:
   - `H` / `Shift+H` to jump between headings (library header, reader toolbar).
   - `B` to cycle through buttons (provider select, bookmark toggle, search, annotations, etc.).
   - `Insert+Space` to toggle focus mode; once active, use `Space` to start/stop TTS playback and `Ctrl` to interrupt announcements.
   - `Shift+F10` on the selection toolbar to confirm context menu access (Note/Define/Quote/Share) is announced.
4. When a floating panel opens (search, annotations, quick settings), verify NVDA reads the dialog label, traps focus within the panel, and announces the close button. Press `Esc` to exit and confirm focus returns to the trigger control.
5. Record findings in `docs/a11y/READING_AUDIT.md` with the date, NVDA build, and any remediation items.

Tips:
- NVDA’s speech dictionary can be used to abbreviate repetitive strings such as “PaperRead navigation drawer”.
- Keep Windows high contrast off so Tailwind palette checks match target users.
- If keyboard focus becomes lost, press `Ctrl+Alt+Tab` to return to the browser, then `Insert+Tab` to have NVDA announce the current element.
