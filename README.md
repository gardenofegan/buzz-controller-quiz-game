# 🕹️ Buzz Arcade Quiz

A retro-arcade themed multiplayer quiz game for up to 4 players using PlayStation Buzz controllers, built with Electron.

![Buzz Controllers](https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Buzz_controllers.jpg/320px-Buzz_controllers.jpg)

## Features

- **4-Player Multiplayer** - Compete head-to-head with friends
- **Buzz Controller Support** - Full support for PlayStation Buzz USB controllers
- **LED Feedback** - Controller LEDs light up during gameplay
- **First Buzzer Bonus** - Race to buzz in first for bonus points (or penalties!)
- **Retro Arcade Style** - CRT scanlines, neon colors, and classic arcade aesthetics
- **Custom Questions** - Easily create your own quiz content

## Quick Start

```bash
# Install dependencies
npm install

# Run the game
npm start

# Run with DevTools open
npm start -- --dev
```

## Requirements

- Node.js 18+
- PlayStation Buzz USB controllers (optional - keyboard also works)
- Windows/macOS/Linux

## Controls

### Buzz Controllers

| Button | Lobby | During Question | After Selection |
|--------|-------|-----------------|-----------------|
| 🔴 Red Buzzer | Join game | Buzz in first! | Lock in answer |
| 🔵 Blue | Start sequence | Select answer 1 | Change answer |
| 🟠 Orange | Start sequence | Select answer 2 | Change answer |
| 🟢 Green | Start sequence | Select answer 3 | Change answer |
| 🟡 Yellow | Start sequence | Select answer 4 | Change answer |

### Keyboard (Player 1)

| Key | Action |
|-----|--------|
| `J` | Join game (lobby) |
| `1` or `B` | Select Blue answer |
| `2` or `O` | Select Orange answer |
| `3` or `G` | Select Green answer |
| `4` or `Y` | Select Yellow answer |
| `Enter` or `Space` | Lock in answer |
| `F11` | Toggle fullscreen |

## How to Play

1. **Join Phase**: Press the red buzzer to join (LED lights up)
2. **Start Game**: Enter the color sequence 🔵→🟠→🟢→🟡 to begin
3. **Answer Questions**: 
   - Press 🔴 to buzz in first (flash = you're first!)
   - Select your answer with a color button
   - Press 🔴 again to lock in
4. **Scoring**: First correct buzzer gets bonus points. First wrong buzzer loses points!
5. **Winner**: Highest score at the end wins (LED victory flash!)

## LED Behavior

| Event | LED State |
|-------|-----------|
| Join in lobby | ON (shows who's playing) |
| Question appears | All OFF |
| First buzz-in | FLASH (you're first!) |
| Lock in answer | ON solid |
| Between questions | All OFF |
| Winner | FLASH then stays ON |

## Customizing Questions

Edit `quiz.json` to add your own questions:

```json
{
    "quizTitle": "My Custom Quiz",
    "questions": [
        {
            "id": 1,
            "question": "What is the capital of France?",
            "answers": {
                "blue": "London",
                "orange": "Berlin",
                "green": "Paris",
                "yellow": "Madrid"
            },
            "correct": "green",
            "points": 100
        }
    ]
}
```

### Question Format

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique question ID |
| `question` | string | The question text |
| `answers` | object | Four answers keyed by color: `blue`, `orange`, `green`, `yellow` |
| `correct` | string | The correct answer color |
| `points` | number | Points awarded for correct answer |

### Tips for Good Questions

- Keep questions concise (they need to fit on screen)
- Keep answers short (1-3 words is ideal)
- Vary difficulty and topics for more fun
- 10-20 questions is a good game length

## Project Structure

```
buzz-controller-quiz-game/
├── main.js                    # Electron main process
├── preload.js                 # IPC bridge
├── renderer.js                # UI controller
├── index.html                 # Game UI
├── quiz.json                  # Questions data
├── styles/
│   └── main.css              # Retro arcade styles
└── modules/
    ├── game-state.js         # Game state management
    ├── quiz-engine.js        # Question logic
    ├── gamepad-manager.js    # Controller input
    └── buzz-led-controller.js # LED control via HID
```

## Troubleshooting

### Controllers not detected?
- Ensure Buzz controllers are plugged in before starting
- Try unplugging and replugging the USB
- Check Device Manager (Windows) for the device

### LEDs not working?
- The game will log `[BuzzLED] Found Buzz controller` if detected
- Some Buzz controller variants may have different USB IDs
- Check console output for LED-related messages

### Game won't start?
- Make sure `quiz.json` exists and is valid JSON
- Run with `npm start -- --dev` to see error messages

## License

MIT
