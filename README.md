# Gemini Chat Dashboard

A bring-your-own-key Gemini chat dashboard with local persistence and PWA support.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- IndexedDB for API keys and conversations
- PWA (installable, offline shell via service worker)

## Getting started

```bash
npm install
npm run generate:icons
npm run dev
```

Open `http://localhost:5173`.

## Usage

1. Open **Settings** and paste your [Gemini API key](https://aistudio.google.com/apikey).
2. Choose a model from the header dropdown.
3. Start chatting or generating.

Your API key is stored locally in IndexedDB and sent directly from your browser to Google's Gemini API.

## Models

| Category | Models |
|----------|--------|
| Chat | Gemini 3.6 Flash, Gemini 3.1 Pro |
| Image | Nano Banana Pro, Nano Banana 2, Nano Banana 2 Lite |
| Music | Lyria 3 Pro, Lyria 3 Clip |
| Video | Veo 3.1, Veo 3.1 Lite |

## Build

```bash
npm run build
npm run preview
```

## Project structure

```text
src/
  components/     Chat UI and shared components
  hooks/          Conversation and preference hooks
  layout/         App shell and sidebar
  pages/          Chat and settings pages
  providers/      Shared React context
  services/       Gemini API client and model registry
  storage/        IndexedDB layer
```
