# Emoji Guide for Game Messages

Use these icons consistently when adding Unicode to player-facing messages. The goal is to keep the UI readable and avoid changing the tone of the game from message to message.

## Core Conventions

- Use one primary emoji per message unless the message has two distinct parts.
- Put the emoji at the start of the message when it acts like a status header.
- Use an emoji only when it adds meaning, not just decoration.
- Prefer the same icon for the same event every time.

## Recommended Icons

| Message | Suggested icon |
| --- | --- |
| Chance header | 🎲 |
| Becomes/grows stronger | 💪 |
| Fungus | 🍄 |
| Rats | 🐀 |
| Locusts | 🦗 |
| Fire / no-game disaster | 🔥 |
| No game | 🚫🦌 |
| Spearhead breaks | 🔱💥 |
| Basket breaks | 🧺💥 |
| Give grain | 🌾 |
| Give basket | 🧺 |
| Give spearhead | 🔱 |
| Injury | 🤕 |
| Sickness | 🤢 |

## Predator Attack Icons

Use a predator emoji when the message names the attacking animal.

- Hyena: 🐕
- Leopard: 🐆
- Bear: 🐻
- Alligator: 🐊
- Wolf: 🐺
- Vulture or generic bird attack: 🦅

If the message is about a generic animal attack, use the predator that matches the location when the code already knows it. If there is no specific predator, keep the message plain.

## Hunt Result Icons

Use animal icons that match the actual hunt result text when practical.

- Small game / rabbit / hare: 🐇
- Rodent / squirrel / small animal: 🐿️
- Fish: 🐟
- Deer / antelope / gazelle / buck / doe: 🦌
- Buffalo / large herd animal: 🦬
- Bear / large predator: 🐻

If the hunt result is generic, keep it simple with the base hunt message and skip the emoji rather than forcing a weak match.

## Gather Result Icons

Use plant, grain, and food icons that match the gathered resource.

- Grain: 🌾
- Roots / tubers / yams: 🥕 or 🫚
- Mushrooms: 🍄
- Wild vegetables: 🌿 or 🥬
- Berries / fruit: 🫐 or 🍓
- Nuts: 🌰
- Grubs: 🐛
- Eggs: 🥚

## Suggested Mapping For Existing Messages

- `Chance X:` -> 🎲
- `X grows stronger.` -> 💪
- `Fungus! ...` -> 🍄
- `Rats! ...` -> 🐀
- `Locusts! ...` -> 🦗
- `FIRE! ...` -> 🔥
- `No game.` -> 🚫🦌
- `The spearhead broke!` -> 🔱💥
- `basket breaks.` -> 🧺💥
- `gives ... grain` -> 🌾
- `gives ... basket` -> 🧺
- `gives ... spearhead` -> 🔱

## Notes

- Keep punctuation and emoji order stable. For example, `🍄 Fungus!` is better than mixing emoji placement across similar messages.
- Avoid adding multiple emojis when one will do the job.
- If a message already has strong wording, use the emoji only as a light marker.