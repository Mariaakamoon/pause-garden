# FINAL MASTER PROMPT — PAUSE GARDEN
## Build a complete, functional, vibrant student wellbeing website

Act as a senior UI/UX designer, frontend developer, accessibility specialist, and interaction designer. Build a complete, responsive, functional wellbeing website called **Pause Garden**, designed primarily for college students and teachers who need short, refreshing mental wellbeing breaks between classes, study sessions, assignments, and work.

This is not just a visual mockup. Build a usable website with working navigation, functional controls, real timers, interactive activities, audio playback, optional voice guidance, and persistent user data where appropriate.

If an existing Pause Garden project is available, inspect it first and improve the existing project. Preserve relevant existing content, structure, and working functionality. Do not unnecessarily replace it with an unrelated template.

---

# 1. CORE CONCEPT AND EXPERIENCE

Pause Garden is a small digital garden where people can pause, breathe, stretch, reset their attention, reflect, and return to their day feeling a little better.

The experience should feel:
- Calming without being boring.
- Colourful without being overwhelming.
- Friendly, youthful, welcoming, and inclusive.
- Nature-inspired, warm, polished, and slightly playful.
- Simple enough for a stressed student to use immediately.
- Visually rich and noticeably different from a generic SaaS dashboard.

Use organic shapes, soft gradients, subtle garden-inspired illustrations, gentle animations, spacious layouts, rounded corners, and clear typography.

Avoid:
- Beige-heavy or dull designs.
- Reusing the same card layout for every activity.
- Making every page a plain white screen with a coloured heading.
- Excessive gradients, clutter, tiny text, or too many floating decorations.
- Fake buttons, placeholder controls, nonfunctional timers, and simulated audio players that do not play sound.
- Overly clinical or medical-looking interfaces.

The user should be able to open the website, choose an activity, select a session duration, and begin within a few clicks.

# 2. VISUAL DESIGN SYSTEM

Use a cohesive palette inspired by plants, fresh air, water, sunshine, and flowers.

Primary palette:
- Garden green: #246B50
- Fresh botanical green: #63B98B
- Mint: #C7F0D8
- Aqua: #B9E9E8
- Sky blue: #A9D6F5
- Lavender: #D7C8FA
- Light lilac: #EEE6FF
- Peach: #FFC7A8
- Apricot: #FFE2C5
- Sunny yellow: #FFE99A
- Warm white: #FFFCF7
- Cloud white: #F4F8F5
- Main text: #263C35

Use dark garden green for important text and primary buttons. Maintain readable contrast and use the brighter colours mainly for backgrounds, illustrations, activity accents, and highlights.

Typography:
- Use a friendly, modern, highly readable sans-serif.
- Use expressive, confident headings.
- Use comfortable body text sizes and line spacing.
- Establish a consistent hierarchy for headings, instructions, labels, and buttons.

Visual elements:
- Organic blobs, leaf illustrations, small flowers, clouds, sun shapes, water ripples, soft shadows, and rounded panels.
- Subtle movement that makes the interface feel alive.
- Clear hover, focus, selected, disabled, loading, and error states.
- Consistent navigation and control styles across the website.

The overall brand must remain recognisably Pause Garden, but every activity should have its own distinctive visual atmosphere and screen composition.

# 3. WEBSITE STRUCTURE AND NAVIGATION

Create the following main areas.

## A. Home / Welcome page

Design a visually engaging homepage with:

1. A clear Pause Garden logo or wordmark.
2. A welcoming heading such as:
   “A little pause can change your day.”
3. Supporting copy:
   “Take a few minutes to breathe, stretch, reset, and reconnect with yourself.”
4. A prominent primary button: “Take a pause”.
5. A secondary action: “Explore activities”.
6. A daily wellbeing check-in that is optional and nonjudgmental.
7. An activity discovery section featuring all available activities.
8. A clearly visible entry point for “Calming Sounds”.
9. A simple section explaining that short breaks can fit into a busy day.
10. A small daily intention or gentle motivational message.
11. A personalised greeting when the user is signed in.
12. A visible sign-in or profile entry point.

Display the activities in a colourful, attractive layout. Use distinct illustrations, shapes, and compositions rather than identical cards with different icons.

Suggested activity descriptions:
- Breathing: “Slow down and find your rhythm.”
- Meditation: “Give your mind a quiet moment.”
- Yoga and Stretching: “Release tension from study hours.”
- Grounding: “Reconnect with the present moment.”
- Body Relaxation: “Unclench, soften, and let go.”
- Screen Break: “Rest your eyes and reset your focus.”
- Quiet Reflection: “Make space for your thoughts.”
- Gratitude Garden: “Notice the little things that matter.”

All activities must open their own dedicated experiences.

## B. Activities page

Create an activity library with clear categories, attractive visuals, and short descriptions.

Users must be able to explore and launch:
1. Breathing exercises.
2. Meditation.
3. Yoga and stretching.
4. Grounding exercises.
5. Body relaxation.
6. Screen breaks.
7. Quiet reflection.
8. Gratitude Garden.

Each activity must have its own dedicated interface, interactions, instructions, and completion state.

## C. Calming Sounds page or panel

Create a dedicated calming sound library that can also be accessed from the homepage and from within activities.

## D. My Garden / Progress page

Create a simple personal space showing completed activities, saved reflections where appropriate, gratitude notes, and gentle progress indicators.

Keep progress supportive and private. Do not introduce competitive leaderboards, public rankings, guilt-inducing streak warnings, or pressure to use the website every day.

## E. Authentication pages

Create sign-up, sign-in, sign-out, and account-related states where supported by the available backend.

## F. Profile and settings

Allow users to manage their preferences, sound settings, breathing voice guidance, and account options where implemented.

Use a responsive desktop navigation bar and a compact mobile navigation pattern. Keep navigation labels clear and consistent.

# 4. STRICT SESSION DURATION RULE — 3 TO 5 MINUTES ONLY

This is a mandatory functional requirement for all timed wellbeing activities.

**Every guided activity must offer only these three session durations:**
- 3 minutes
- 4 minutes
- 5 minutes

Do not offer 1-minute, 2-minute, 10-minute, or longer guided session options.

Use an attractive, clearly labelled duration selector. It can use segmented buttons, small duration cards, or another accessible control.

Requirements:
- Default to 3 minutes unless a particular activity requires a different sensible default.
- Let the user change the duration before starting.
- Clearly indicate the selected duration.
- Make the total countdown match the selected duration.
- Update progress indicators and completion estimates accordingly.
- Allow pause, resume, restart, and exit where appropriate.
- When restarting, reset the elapsed time and activity progress correctly.
- When exiting, provide a clear confirmation if the user might lose current progress.
- Stop timers when the session finishes or is exited.
- Do not let multiple timers run simultaneously.
- Do not let switching pages leave background timers running.
- Make timer logic accurate and robust; do not simply decrement a number using an unreliable repeated interval.
- Handle browser tab inactivity and mobile interruptions sensibly.

For activities that are not naturally countdown-based, such as writing gratitude notes, offer an optional 3-, 4-, or 5-minute guided experience. Users may save their notes early without being forced to wait for the timer.

The session timer must be a real working feature, not a decorative number.

# 5. DISTINCT ACTIVITY DESIGNS — DO NOT REUSE ONE TEMPLATE

This is one of the most important requirements.

Each activity must have its own visual identity, page layout, background treatment, illustration style, and interaction pattern. Maintain the same brand and navigation, but do not merely recolour the same screen.

## Activity 1: Breathing Garden

Visual identity:
- Aqua, mint, and soft blue.
- A large animated breathing orb or flower at the centre.
- A peaceful, open composition with subtle ripples, petals, or floating shapes.

Functionality:
- Offer 3-, 4-, and 5-minute sessions.
- Display a breathing orb that expands during inhalation and contracts during exhalation.
- Synchronise the animation, text cues, voice cues, and breathing phases.
- Display simple instructions such as “Breathe in slowly” and “Breathe out gently”.
- Use a comfortable, gentle pace. Avoid forced breath holds.
- Include Start, Pause/Resume, Restart, and Exit controls.
- Display elapsed time, remaining time, and session progress.
- Offer the optional voice guidance settings described in Section 7.
- Allow the user to practise with animation only, without any sound.

The breathing animation must respond to the actual session state. Pausing must freeze or settle the animation appropriately, and restarting must reset the breathing cycle.

## Activity 2: Meditation Sanctuary

Visual identity:
- Lavender, lilac, soft blue, and moonlit or early-morning tones.
- A peaceful sanctuary scene with a horizon, garden, floating particles, or soft atmospheric shapes.
- A spacious, immersive layout with fewer visible distractions.

Functionality:
- Offer 3-, 4-, and 5-minute sessions.
- Provide a short settling-in instruction.
- Show gentle prompts at suitable intervals, such as noticing the breath, allowing thoughts to pass, and returning attention without judgment.
- Keep the prompts brief and nonintrusive.
- Include a real timer, progress indicator, pause/resume, restart, and exit.
- Allow users to choose silence or optional calming background sounds.
- End with a gentle completion message.

Do not show a static timer on a generic card. Make this feel like entering a quiet place.

## Activity 3: Yoga and Stretching Studio

Visual identity:
- Fresh green, mint, and sunny yellow.
- A bright, energising movement-studio feel.
- An animated human figure or clear movement demonstration as the main visual element.

This activity must demonstrate actual movement. Do not use a static stock photograph as the only demonstration, a fake video player, or a decorative figure that never moves.

Implementation priority:
1. Use a real, accessible, appropriately licensed demonstration video if a suitable asset is available and can be played reliably.
2. Otherwise, create a clear animated human figure using SVG, CSS, or another implementation supported by the project. Animate the body parts needed for each stretch so that the movement is visibly understandable.
3. If neither can be implemented reliably, provide clear illustrated movement sequences and honest limitations. Do not pretend an unavailable video is working.

Include these routine options:
- 3-Minute Desk Stretch.
- 4-Minute Gentle Mobility.
- 5-Minute Full-Body Reset.
- Neck and Shoulder Release.
- Seated Study Break.

The last two routines must still obey the 3-, 4-, or 5-minute duration rule.

Include beginner-friendly movements such as:
- Gentle neck tilts.
- Shoulder rolls.
- Seated spinal twists.
- Side stretches.
- Gentle forward folds.
- Wrist and hand stretches.
- Relaxed shoulder release.

Yoga functionality:
- Show the current movement name.
- Show simple, step-by-step instructions.
- Display the current movement countdown.
- Display total session time remaining and total session progress.
- Provide Play/Pause, Restart, Previous movement, and Next movement controls where appropriate.
- Advance through movements automatically when their assigned duration ends.
- Synchronise the visual demonstration, instructions, and timeline.
- Adapt the movement sequence and time allocation to the selected total session duration.
- Let users pause and resume without losing their position.
- Ensure that the final movement ends with the overall session, rather than allowing the movement timer and session timer to drift apart.
- Make the controls usable on mobile screens.

Include a brief safety reminder: “Move gently, stay within a comfortable range, and stop if you feel pain, dizziness, or discomfort.” Avoid making medical claims.

## Activity 4: Grounding Garden

Visual identity:
- Sky blue, aqua, and mint.
- A playful, interactive sensory garden with leaves, stones, flowers, or gentle ripples.
- Use a different composition from the breathing and meditation screens.

Functionality:
- Offer 3-, 4-, and 5-minute sessions.
- Guide the user through a simple 3–2–1 sensory grounding exercise:
  - Notice 3 things you can see.
  - Notice 2 things you can feel.
  - Notice 1 thing you can hear.
- Allow the user to reveal each step and move forward when ready.
- Provide optional text-entry fields if the user wants to record what they noticed.
- Include progress feedback, timer controls, and a completion state.
- Let users skip writing and simply complete the activity.
- Do not use flashing effects, excessive motion, or overwhelming interactions.

Keep the language gentle and practical. Do not claim the activity will treat anxiety or any medical condition.

## Activity 5: Body Relaxation

Visual identity:
- Peach, apricot, coral, and warm pastel tones.
- A soft body silhouette or clearly labelled body-region illustration.
- A soothing, flowing composition that differs from all other activity screens.

Functionality:
- Offer 3-, 4-, and 5-minute sessions.
- Guide users through progressive relaxation, moving through selected body areas.
- Suggested sequence: forehead and jaw, shoulders, hands, abdomen, legs, and feet.
- Provide short prompts to notice tension and release it gently.
- Do not instruct users to tense muscles forcefully.
- Include a clear current-region indicator, progress feedback, timer controls, and completion state.
- Allow users to skip a body region if it feels uncomfortable.
- Avoid assuming that every user can perform the same physical actions.

## Activity 6: Screen Break

Visual identity:
- Airy sky blue, mint, and white.
- A minimal, uncluttered design with large readable instructions.
- A subtle window, sky, horizon, or leaf-inspired visual.

Functionality:
- Offer 3-, 4-, and 5-minute sessions.
- Guide users through a short sequence of screen-rest activities, for example:
  - Look away from the screen at a comfortable distant point.
  - Relax the jaw and shoulders.
  - Gently move the wrists and hands.
  - Stand or change position if comfortable.
  - Take a few natural, relaxed breaths.
- Include clear step progression and a real timer.
- Avoid forcing users to stare at the screen while resting their eyes.
- Provide an audio-friendly option for users who want to put the device aside.
- Do not require constant tapping to continue the session.

## Activity 7: Quiet Reflection

Visual identity:
- Lilac, light lavender, and warm white.
- A journal-inspired editorial layout with generous writing space.
- Use subtle paper textures or layered journal elements rather than the card design used elsewhere.

Functionality:
- Offer an optional 3-, 4-, or 5-minute reflection session.
- Display one gentle prompt at a time.
- Suggested prompts:
  - “What is taking up space in your mind right now?”
  - “What is one thing you can let go of for today?”
  - “What would make the next hour feel a little easier?”
  - “What do you need more of today?”
- Allow the user to type, edit, clear, and save their reflection.
- Allow the user to skip writing and finish early.
- Make the privacy status clear.
- Do not display private reflections publicly.
- Do not reuse the Gratitude Garden layout or colour treatment.

## Activity 8: Gratitude Garden

Visual identity:
- Peach, apricot, sunshine yellow, and botanical green.
- A warm, cheerful garden or collection of illustrated notes.
- A dedicated note-writing interface that is visually distinct from Quiet Reflection.

Functionality:
- Allow users to write one or more things they appreciate.
- Provide optional prompts such as:
  - “Something small that made me smile…”
  - “Someone I appreciated today…”
  - “Something about myself I am proud of…”
  - “A little thing I do not want to take for granted…”
- Allow adding, editing, saving, and deleting notes.
- Offer an optional 3-, 4-, or 5-minute guided gratitude session.
- Allow saving before the timer ends.
- Show previously saved notes privately to the user.
- Include an empty state that invites the user to start without pressuring them.
- Do not make gratitude feel mandatory or suggest that negative feelings are wrong.

# 6. CALMING SOUNDS — A REAL WORKING SOUND LIBRARY

Add a discoverable “Calming Sounds” feature on the homepage and within the activity experience.

Provide these sound categories when suitable audio assets are available:
1. Gentle rain.
2. Forest birds and nature.
3. Flowing water.
4. Ocean waves.
5. Soft wind.
6. Gentle instrumental music.
7. Silence / No sound.

Design:
- Use an attractive sound library with individual illustrated sound options.
- Use nature-inspired visuals and distinct icons.
- Clearly show the selected track.
- Include a compact player that can remain accessible while navigating between activities.
- Make the sound player visually cohesive with Pause Garden without taking over the screen.

Functional controls:
- Play.
- Pause.
- Resume.
- Stop.
- Track selection.
- Volume adjustment.
- Mute and unmute.
- Clear indication of the currently playing track.
- Playback error and unavailable-asset states.

Audio requirements:
- Use actual audio files or a reliable, appropriate audio source. Prefer properly licensed assets.
- Do not use empty buttons or pretend that a track is playing.
- Do not show a moving waveform or animated equaliser unless playback is genuinely active.
- Do not autoplay audio on page load.
- Start audio only after a user action, respecting browser autoplay restrictions.
- Ensure that selecting another track stops or replaces the previous track rather than layering tracks unintentionally.
- Prevent duplicate players from playing the same audio simultaneously.
- Provide a way to stop all background sound immediately.
- Allow users to choose whether background audio continues while moving between activities.
- Handle missing files, failed loading, and unsupported playback gracefully.
- If real audio files are not available, clearly identify which assets still need to be supplied. Do not silently substitute fake playback.

The “Silence / No sound” option must be a genuine choice, and every activity must remain fully usable without sound.

# 7. OPTIONAL BREATHING VOICE GUIDANCE

Add a voice-guidance option inside the Breathing Garden activity.

Voice guidance must be optional, easy to discover, and OFF by default unless the user has explicitly saved a preference.

Offer these modes:
1. Animation only — visual breathing guidance with no voice.
2. Voice + animation — spoken cues synchronised with the breathing orb.
3. Voice + calming sounds — spoken cues and optional ambience, with the animation remaining visible.

Voice controls:
- Enable or disable voice guidance.
- Choose a supported voice if the platform offers a suitable selection.
- Adjust voice volume where supported.
- Preview the voice before starting if practical.
- Change guidance mode before starting a session.
- Allow the user to turn the voice off during a session without restarting it.

Spoken cues should be short and calm, for example:
- “Breathe in slowly.”
- “Breathe out gently.”
- “Relax your shoulders.”
- “Let your breathing return to its natural rhythm.”

Synchronisation requirements:
- Match each spoken cue to the actual breathing phase.
- Do not speak instructions that contradict the animation.
- Do not repeatedly interrupt the user with unnecessary talking.
- Avoid forced breath holds.
- Pause voice cues when the session is paused.
- Resume cues in sync with the active breathing phase.
- Restart the cue sequence correctly when the session restarts.
- Stop all voice output when the user exits.
- Prevent overlapping or queued voice messages from speaking over one another.
- Ensure that background audio does not make the voice difficult to hear.

Implementation:
- Prefer real, appropriate voice recordings if available.
- Otherwise use browser text-to-speech where supported.
- Detect when voice support is unavailable and fall back to animation-only guidance.
- Do not claim that a real voice recording exists if the implementation uses text-to-speech.
- Explain the fallback briefly in the settings or help text where useful.

If background sound and voice guidance play together, reduce the background volume while a cue is spoken when practical. Keep separate controls for voice and ambience.

# 8. AUTHENTICATION AND ACCOUNT MANAGEMENT

Implement genuine authentication if the existing project has a configured backend.

First inspect the current project and its environment configuration. If an authentication backend already exists, use it rather than replacing it unnecessarily.

If no backend exists and the environment supports it, use Supabase authentication with a properly configured project.

Required states:
- Sign up.
- Sign in.
- Sign out.
- Loading.
- Invalid credentials.
- Validation errors.
- Successful authentication.
- Password reset where supported.
- Session persistence.
- Appropriate handling of expired or missing sessions.

Security requirements:
- Never hardcode secrets or expose private API keys.
- Use environment variables for configuration.
- Do not create fake login success.
- Do not store passwords in localStorage.
- Do not claim authentication is fully connected if credentials or backend configuration are missing.
- If setup requires external configuration, provide a clear list of the remaining steps.

The site must still allow any intended public activities to be explored without requiring an account unless the original project explicitly requires authentication first.

# 9. SAVING DATA AND PERSONAL PROGRESS

Implement real saving behaviour for user-created data.

Gratitude notes:
- Allow users to create, edit, view, and delete their own notes.
- For a local-only version, use localStorage appropriately and explain that notes are stored on that browser/device.
- If the project has an authenticated backend, store each user's notes securely and ensure users can access only their own data.
- Do not imply that localStorage data automatically syncs between devices.
- Include appropriate empty, saved, and error states.

Quiet reflections:
- Save only when the user explicitly chooses to save, unless a clearly disclosed autosave preference is implemented.
- Provide a way to delete saved reflections.
- Never publish private writing.

Progress:
- Track completed activities and session completion locally or in the configured backend.
- Record useful information such as activity type, selected duration, completion status, and completion date.
- Update the progress page based on actual recorded sessions.
- Do not increment progress just because a user opens an activity.
- Do not invent historical activity data.
- Provide a clear empty state for new users.

Privacy:
- Tell users where their data is stored.
- Avoid collecting unnecessary personal information.
- Do not send private journal entries or gratitude notes to external services without explicit, informed consent.
- Do not use sensitive personal writing to personalise advertisements or make health claims.

# 10. DAILY CHECK-IN AND PERSONALISATION

Create a small, optional daily check-in.

Example question:
“How are you feeling right now?”

Possible responses:
- Calm.
- Okay.
- Tired.
- Stressed.
- Overwhelmed.
- Not sure.

Use friendly icons or illustrations and gentle language. Allow the user to skip the check-in.

After the selection, offer a relevant activity as a suggestion without forcing the user into it.

Examples:
- Tired → Screen Break or Gentle Stretching.
- Stressed → Breathing Garden or Grounding Garden.
- Overwhelmed → Short Breathing Garden session.
- Not sure → Quiet Reflection.
- Calm or okay → Any activity the user prefers.

These are lightweight suggestions, not clinical assessments. Do not diagnose users, infer a mental health condition, or claim that an activity will treat a disorder.

If check-in history is saved, explain where it is stored and provide a way to clear it.

# 11. TIMER AND SESSION ENGINE

Build a reusable, reliable timer/session system that can be used by every activity without forcing all activities to share the same visual design.

Required behaviour:
- Start.
- Pause.
- Resume.
- Restart.
- Exit.
- Completion.
- Correct elapsed and remaining time.
- Correct progress percentage.
- No duplicate active timers.
- Cleanup when leaving an activity.
- Proper handling of interruptions and inactive browser tabs.
- No accidental completion events firing more than once.
- No timers continuing after a session has been cancelled.

Use a reliable time source to calculate elapsed time rather than assuming each interval fires precisely on schedule.

The interface must stay synchronised with the actual session state.

For yoga, synchronise the total session timer, current movement timer, and movement progression.

For breathing, synchronise the timer, breathing phases, animation, and voice cues.

For reflection and gratitude, do not prevent early saving or finishing just because a guided timer is active.

# 12. AUDIO ARCHITECTURE AND ACCESSIBILITY

Use one shared audio-management approach for background sounds and voice guidance.

It must:
- Avoid duplicate audio playback.
- Keep background ambience and voice guidance separately controllable.
- Stop or pause playback appropriately when requested.
- Respect the user's silence choice.
- Handle unavailable assets.
- Prevent old voice cues from continuing after an activity ends.
- Avoid abrupt audio restarts during navigation.
- Clean up media resources and event listeners when they are no longer needed.

Accessibility:
- Provide labels for all audio controls.
- Ensure keyboard navigation works.
- Provide visible focus states.
- Use accessible sliders for volume controls.
- Do not rely only on colour to show which sound is selected.
- Respect reduced-motion preferences.
- Do not autoplay voice instructions.
- Let users disable animations where practical.

# 13. COMPLETION EXPERIENCES

Every guided activity must have a dedicated completion state that matches its visual identity.

Examples:
- Breathing: “You made a little space to breathe.”
- Meditation: “A quiet moment, just for you.”
- Yoga: “You took time to move and reset.”
- Grounding: “You came back to the present.”
- Body Relaxation: “You gave yourself a moment to soften.”
- Screen Break: “A little distance from the screen can feel refreshing.”
- Reflection: “Thank you for taking a moment to check in.”
- Gratitude: “You made room for something worth appreciating.”

Completion screen requirements:
- Acknowledge the completed session without exaggerated claims.
- Show the actual duration completed.
- Offer “Back to Home” and “Try Another Activity”.
- Offer a restart option when appropriate.
- Update progress only after genuine completion.
- Avoid guilt if the user exits early.
- If the user exits before completion, allow them to leave without shaming messages.

# 14. RESPONSIVE DESIGN

The website must work on:
- Desktop computers.
- Laptops.
- Tablets.
- Mobile phones.

Mobile requirements:
- Use responsive layouts rather than simply shrinking desktop elements.
- Keep the main activity controls easy to reach.
- Make touch targets comfortably large.
- Ensure the breathing orb and yoga demonstration fit the viewport.
- Keep timers and instructions readable.
- Make the audio player usable without covering critical content.
- Prevent horizontal overflow.
- Support portrait orientation.
- Make keyboard and screen-reader navigation practical.

Desktop requirements:
- Use space effectively.
- Avoid excessively wide paragraphs.
- Use visual composition and illustrations to make the pages feel designed rather than stretched.

# 15. ACCESSIBILITY AND WELLBEING SAFEGUARDS

Follow accessible design practices:
- Strong text/background contrast.
- Semantic headings and buttons.
- Descriptive accessible labels.
- Keyboard navigation.
- Visible focus states.
- Appropriate screen-reader announcements for timer completion and important state changes.
- Reduced-motion support.
- No flashing animations.
- No audio autoplay.
- No essential instruction conveyed only through colour or sound.

Use inclusive, nonjudgmental language. Do not suggest that users are failing if they cannot relax or complete an activity.

For physical movements, advise users to remain within their comfortable range and stop if they experience pain, dizziness, or discomfort.

Pause Garden is a general wellbeing and self-care website, not a diagnostic or medical treatment service.

# 16. FUNCTIONAL IMPLEMENTATION REQUIREMENTS

Use the framework, architecture, and design tools already present in the project where possible. Avoid unnecessary rewrites.

Build reusable components where they genuinely help, such as:
- Navigation.
- Activity duration selector.
- Session timer.
- Session progress indicator.
- Activity completion screen.
- Shared audio manager.
- Voice-guidance controls.
- Sound player.
- Authentication forms.
- Saved-note interface.

However, do not let component reuse make all activity screens look identical. Reuse underlying logic while preserving distinct visual layouts.

Implementation standards:
- Use clean, maintainable code.
- Keep components organised.
- Handle errors and loading states.
- Avoid broken routes and dead buttons.
- Use available project assets where appropriate.
- Use suitable licensed assets for audio and video.
- Avoid unnecessary dependencies.
- Keep the interface performant.
- Do not leave prominent placeholder text or unfinished controls.
- Do not fabricate data or pretend external services are connected.

If any requested feature cannot be fully implemented because credentials, media files, or backend access are unavailable, implement the best honest fallback and clearly identify what is still needed.

# 17. REQUIRED TESTING BEFORE COMPLETION

Do not stop after generating the visual design. Test the actual interactions.

## General website
- Homepage navigation works.
- Every activity opens the correct page.
- Back and exit navigation work.
- The layout responds correctly to desktop and mobile sizes.
- No major console errors or broken routes remain.

## Duration and timers
- Every timed activity offers exactly 3, 4, and 5 minutes.
- No prohibited durations are available.
- Selecting a duration updates the actual session length.
- Pause and resume work correctly.
- Restart resets the session.
- Exit stops the timer.
- Completion occurs once, at the right time.
- Progress matches actual elapsed time.
- No timer keeps running in the background after exit.

## Breathing
- The orb expands and contracts.
- Animation and instructions remain synchronised.
- Voice guidance can be enabled and disabled.
- Voice cues do not overlap.
- Pausing and restarting keep voice and animation synchronised.
- Animation-only mode works with all audio disabled.

## Yoga
- A real video plays if a video asset is used.
- Otherwise, the animated figure visibly demonstrates the relevant movements.
- Current movement instructions and labels update.
- Movement transitions work.
- Previous and Next controls work where provided.
- The total timer and movement timeline stay synchronised.
- The sequence adapts to 3-, 4-, and 5-minute sessions.

## Calming sounds
- Real sound playback starts only after user interaction.
- Play, pause, resume, stop, track selection, volume, and mute work.
- Selecting a new track does not cause unintended overlapping audio.
- Silence stops background audio.
- Missing audio assets produce an honest fallback state.
- Navigation does not create duplicate players.

## Voice guidance
- The chosen guidance mode is respected.
- Voice is off by default unless explicitly configured otherwise.
- Browser text-to-speech works where supported.
- An appropriate fallback appears if voice support is unavailable.
- Voice cues stop on exit and pause appropriately.

## Saving and authentication
- Notes can be saved, edited, and deleted.
- Refreshing the page preserves local data when localStorage is used.
- The site clearly identifies local-only storage.
- Progress reflects actual completed sessions.
- Authentication does not falsely claim success.
- Missing backend configuration is clearly reported.
- Private data is not exposed to other users.

## Final quality check
- There are no fake buttons.
- There are no fake audio or video players.
- Every visible control has a real action.
- The eight activity screens are visually distinct.
- The website feels colourful, warm, polished, calming, and youthful.
- The interface remains understandable for someone using it for the first time.

# 18. FINAL DELIVERY EXPECTATIONS

Build the complete experience, not just a homepage.

Prioritise implementation in this order:
1. A polished homepage and working navigation.
2. Eight distinct activity experiences.
3. The strict 3–5 minute session system.
4. Working breathing animation and yoga movement demonstrations.
5. Real calming sound playback and optional breathing voice guidance.
6. Saving, progress tracking, and authentication where supported.
7. Responsive design, accessibility, and full interaction testing.

After implementation, provide a concise completion report stating:
- Which features are fully functional.
- Which audio/video assets are included and verified.
- Whether voice guidance uses recordings or browser text-to-speech.
- Whether authentication is connected to a real backend.
- Where data is stored.
- Which features still require configuration, assets, or testing.

**Final non-negotiable requirements:** Pause Garden must be colourful and visually engaging; all eight activities must have distinctly different interfaces; every guided session must obey the 3–5 minute duration limit; yoga must visibly demonstrate real movement; calming sounds must play actual audio; breathing voice guidance must be optional and synchronised; and the website must be functional rather than a static prototype.

Build with care, verify the interactions, and do not claim a feature works unless it has actually been implemented and tested.