🕹️ Project: Buzz Arcade Instructions
Project Overview
The goal is to build a cross-platform desktop application that acts as a retro-themed quiz engine. The app must interface with USB Buzz controllers (detected as a single HID gamepad) and provide a high-contrast, "dancing" UI inspired by classic arcade games.

Technical Stack
Framework: Electron (Node.js) to ensure cross-platform compatibility and easy TV output.

Frontend: HTML5, CSS3 (Tailwind CSS for styling), and JavaScript.

Input: Web Gamepad API for handling the Buzz controller hardware.

Data Structure: Local JSON files for quiz content.

Phase 1: Environment & Hardware Initialization
Step 1.1: Initialize a new Electron project with a standard main.js and index.html structure.

Step 1.2: Implement a Hardware Tester module. Use window.addEventListener("gamepadconnected", ...) to detect the Buzz controllers.

Step 1.3: Map the buttons. Note that the four physical controllers share one USB connection and appear as a single device with 20 buttons.

Button Mapping: Identify which button indices correspond to the Blue (Top), Orange, Green, and Yellow (Bottom) buttons for each of the four players.

Phase 2: UI/UX Development (The "Retro Arcade" Look)
Step 2.1: Design a layout that matches the vertical button layout of the Buzz controllers (Blue, Orange, Green, Yellow) to ensure the UI is intuitive.

Step 2.2: Use high-contrast colors and large, pixelated fonts (e.g., "Press Start 2P") for maximum readability on a TV.

Step 2.3: Add "delightful" CSS animations.

Components: Buttons should "shake" when selected, scores should "pulse" on update, and questions should "slide" in.

Step 2.4: Include a scoreboard and a "Time Left" progress bar at the bottom of the screen.

Phase 3: The JSON Quiz Engine
Step 3.1: Create a loader that reads a quiz.json file located in the root directory.

Step 3.2: Ensure the JSON structure follows this format to allow for easy generation:

JSON

{
  "quizTitle": "Example Quiz",
  "questions": [
    {
      "id": 1,
      "question": "What is the capital of Indiana?",
      "answers": {
        "blue": "Indianapolis",
        "orange": "Lawrenceburg",
        "green": "Bloomington",
        "yellow": "Fort Wayne"
      },
      "correct": "blue",
      "points": 100
    }
  ]
}
(Note: Using local context like Lawrenceburg, IN)

Phase 4: Game Logic & State Management
Step 4.1: Build a state machine with the following phases:

Lobby: Players press the Red Buzzer to join.

Question Reveal: Display text and images.

Buzz-In Logic: Detect the first player to press a button and lock out others for a short duration.

Verification: Check the selected color against the "correct" key in the JSON.

Scoreboard: Update points and animate the winner's podium.

Phase 5: TV Tuning & Final Polish
Step 5.1: Implement a "Full Screen" toggle on launch.

Step 5.2: Test on both the Windows Surface Pro 9 and MacBook Air to ensure consistent performance.

Step 5.3: Optimize font sizes for viewing from 10 feet away.