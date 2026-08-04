# Loan Workflow — Frontend

The React frontend for the Loan Workflow app, an AI-powered loan platform. It talks to the Spring Boot backend for applications, decisions, payments, and the AI copilot.

## Stack

- React 19
- Vite
- TypeScript
- Tailwind CSS v4

## Getting started

```bash
npm install
npm run dev
```

The dev server runs at http://localhost:5173.

## Backend

The app expects the backend at http://localhost:8080. Override it with the `VITE_API_BASE` environment variable (see `.env`):

```
VITE_API_BASE=http://localhost:8080
```

## Demo notes

There is no authentication — this is a demo. Role is a client-side toggle in the top-right header that switches between **Customer** and **Northline · Staff** views; both read and write the same backend records.

## More

For full monorepo setup (backend + AI underwriter), see the root [`../README.md`](../README.md).
