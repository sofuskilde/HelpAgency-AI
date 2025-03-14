# Help Agency - PR & Kommunikations Platform

## Projektbeskrivelse
En skræddersyet platform udviklet specifikt til Help agency - et dansk PR- og kommunikationsbureau. Platformen er designet til at optimere og strømline PR- og kommunikationsprocesser med en komplet dansk brugergrænseflade.

For the AI, we are using Gemini!

## Teknisk Stack
- Next.js 14.2.7
- TypeScript
- Tailwind CSS med komponenter fra Radix UI
- Shadcn
- Vercel AI SDK (@ai-sdk/openai, @ai-sdk/anthropic)
- Firebase v10.13.0
- React 18
- Framer Motion for animationer
- Zod for validering

## Hovedfunktioner
- Google Authentication
- Voice Recording & Transcription (Deepgram)
- Billede upload og håndtering
- Chat interface
- Markdown understøttelse med syntax highlighting

## Projektstruktur
```
src/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
├── components/
│   ├── chat/
│   ├── ui/
│   ├── ImageUpload.tsx
│   ├── VoiceRecorder.tsx
│   ├── SignInWithGoogle.tsx
│   └── logo.tsx
├── hooks/
└── lib/
```

## Nøglekomponenter
- Chat Interface (components/chat/)
- UI Komponenter (components/ui/)
- Billede Upload Håndtering (ImageUpload.tsx)
- Stemmeoptager (VoiceRecorder.tsx)
- Google Authentication (SignInWithGoogle.tsx)

## Integrerede AI & API Services
- Google AI (@google/generative-ai)
- Deepgram for tale-til-tekst
- Replicate for billedgenerering
- Firebase for backend

## UI Framework
- Tailwind CSS med custom animationer
- Radix UI komponenter:
  - Dialog
  - Separator
  - Slot
  - Tooltip
- Framer Motion for avancerede animationer
- Tailwind Typography plugin

## Udviklings Værktøjer
- ESLint
- PostCSS
- TypeScript
- Tailwind CSS
- Next.js App Router

## Sikkerhed
- Firebase Authentication
- Environment Variables (.env.local)
- TypeScript type checking
- Zod schema validering

## Vedligeholdelse
- Automatisk linting
- Type checking
- Dependency management via npm
- Next.js build optimering

---

Dette dokument afspejler den aktuelle implementering af Help agency platformen og opdateres løbende med nye ændringer og tilføjelser.
