# 🎙️ Ramya's Voice Agent

A real-time AI voice agent built using **React, Node.js, Express.js, and the Google Gemini Live API**.

The project allows users to communicate with an AI assistant using their **microphone or text input** and receive **real-time AI responses with voice output**.

---

## 🚀 Project Overview

Ramya's Voice Agent is a web-based real-time voice assistant.

The application connects a React frontend with a Node.js backend and uses the Gemini Live API for real-time AI interaction.

The main goal of this project is to understand and build a real-time voice AI application using a frontend, backend, temporary authentication, microphone input, audio processing, and AI-generated voice responses.

---

## ✨ Features

### 🎙️ Real-Time Voice Interaction
Users can speak through their microphone and communicate with the AI agent in real time.

### 🔊 AI Voice Responses
The AI generates audio responses that are played directly in the browser.

### 💬 Text Input
Users can also type messages instead of speaking.

### 🤖 Custom AI Identity
The assistant is configured as:

**"Ramya's Voice Agent"**

The agent can introduce itself when the user greets it or asks about its identity.
The agent name and greeting can be customized by modifying the AI instructions in the project code. Users can change the name to their preferred name or project name.

### 🖥️ Custom Web Interface
The project includes a custom React interface for interacting with the voice agent.

### 📡 Real-Time Communication
The application uses the Gemini Live API to support real-time interaction instead of treating every message as a separate traditional request.

### 🔐 Backend API Key Protection
The permanent Gemini API key is kept on the backend instead of exposing it directly in the frontend.

### 📝 Conversation Events
The interface displays user and assistant interaction events so the conversation can be followed through the UI.

---

## 🏗️ Architecture

The application follows this basic flow:

```text
                 🎙️ Microphone
                       │
                       ▼
              React Frontend
             (localhost:5173)
                       │
                       │ Request temporary token
                       ▼
               Node.js Backend
              (localhost:3001)
                       │
                       │ Uses Gemini API key
                       ▼
              Temporary Token
                       │
                       ▼
             Gemini Live API
                       │
                       ▼
              🤖 AI Response
                       │
                       ▼
                🔊 Voice Output


🧰 Technologies Used
Frontend
React
Vite
JavaScript
HTML
CSS
Backend
Node.js
Express.js
CORS
dotenv
AI
Google Gemini Live API
@google/genai
Development Tools
npm
Git
GitHub
Command Prompt
📁 Project Structure
voice-agent/
│
├── frontend/
│   ├── src/
│   │   └── App.js
│   └── ...
│
├── backend/
│   ├── server.js
│   └── ...
│
├── .gitignore
├── LICENSE
└── README.md

Environment files containing API keys are kept locally and are not included in this repository.

🔐 API Key Security

The permanent Gemini API key should not be placed directly inside the frontend source code.

Instead, the backend uses the API key to create a temporary authentication token for the frontend.

The basic flow is:

Permanent Gemini API Key
          │
          ▼
     Node.js Backend
          │
          ▼
   Temporary Token
          │
          ▼
      Frontend
          │
          ▼
    Gemini Live API

For security reasons, API keys and environment files are intentionally excluded from this GitHub repository.

Never upload your personal API key to GitHub.

⚙️ Local Setup
1. Clone the repository
git clone YOUR_GITHUB_REPOSITORY_URL

Then open the project folder:

cd voice-agent
2. Install frontend dependencies

Open Command Prompt inside the frontend folder:

cd frontend
npm install

This installs the packages required by the React/Vite application.

3. Install backend dependencies

Open another Command Prompt window and go to the backend folder:

cd backend
npm install

This installs the Node.js backend dependencies.

4. Configure the Gemini API key

Create your local environment file in the backend folder.

Add your own Gemini API key there.

Example:

GEMINI_API_KEY=YOUR_GEMINI_API_KEY

Do not use or copy someone else's API key.

The environment file should remain local and should never be uploaded to GitHub.

▶️ Running the Project

The frontend and backend run separately during development.

Start the Backend

From the backend folder:

node server.js

The backend runs on:

http://localhost:3001
Start the Frontend

From the frontend folder:

npm run dev

Vite will provide a local URL, normally:

http://localhost:5173

Open that URL in your browser.

🎤 How the Voice Interaction Works
The user opens the web application.
The user allows microphone access.
The frontend requests a temporary token from the backend.
The backend uses the securely stored Gemini API key.
The frontend connects to the Gemini Live API.
The microphone captures the user's voice.
Audio data is sent to the AI service.
Gemini processes the conversation.
The AI generates a response.
The response audio is played through the browser.
Conversation events are displayed in the interface.
🎯 Purpose of the Project

This project was created as a hands-on implementation of a real-time AI voice application.

Through this project, I explored:

Real-time AI communication
Voice input and output
Microphone access in web applications
Audio processing in JavaScript
Frontend and backend communication
API authentication
Temporary tokens
Gemini Live API integration
React application development
Node.js backend development
🔮 Possible Future Improvements

Some possible improvements for future versions include:

Better audio processing using AudioWorklet
Improved conversation history
More advanced agent instructions
Multiple AI personalities
Language selection
Voice selection
Conversation export
User authentication
Cloud deployment
Mobile-friendly improvements
Reusable voice-agent component
Integration with coding and learning tools
📌 Important Note

This project is currently intended for development and learning purposes.

Users running the project locally should provide their own Gemini API credentials and configure them locally.

API keys should never be committed to the repository.

👩‍💻 Author

Ramya Sree

Built as a hands-on project to explore real-time AI voice agents and modern web development.
