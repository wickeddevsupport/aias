<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your Vector Maestro app

This contains everything you need to run the app and the in-house AI service.

## Run Locally (Dev)

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. (Optional) Set `VITE_AI_API_BASE=http://localhost:3000` in `.env.local` if you want the UI to call the local AI server.
3. Run the UI:
   `npm run dev`
4. In a second terminal, run the in-house AI server:
   `npm run start`

## Production (Single Server)

1. Build the frontend:
   `npm run build`
2. Start the combined server (serves `dist/` and `/api/ai/*`):
   `npm run start`
