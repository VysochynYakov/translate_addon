# AI Coding Rules

## Think Before Coding
State assumptions before implementation. Ask when uncertain. Never guess.

## Simplicity First
Write the minimum code that solves the problem. Do not add abstractions unless requested or clearly necessary.

## Surgical Changes
Do not touch code unrelated to the request. Every changed line must map back to the user's request.

## Targeted Execution
Convert vague instructions into testable success criteria before writing code.

## Current MVP Criteria
- A small floating button appears near the active editable field.
- Clicking the button translates the field text from Russian into the selected target language.
- The translated text replaces the original text in the same field.
- The user does not need to copy, paste, or open a separate translator.
- Settings include an OpenAI API key, target language, and model.
