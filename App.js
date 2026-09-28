import { useRef, useState } from "react";
import { GoogleGenAI, Modality } from "@google/genai";

function App() {
  const [status, setStatus] = useState("Ready");
  const [isConnected, setIsConnected] = useState(false);
  const [inputText, setInputText] = useState("");
  const [events, setEvents] = useState([]);

  const sessionRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);

  const playbackContextRef = useRef(null);
  const nextPlaybackTimeRef = useRef(0);

  // Keeps track of the current AI response
  const currentAssistantEventRef = useRef(null);

  function addEvent(type, text) {
    const id = Date.now() + Math.random();

    setEvents((prev) => [
      ...prev,
      {
        id,
        type,
        text,
      },
    ]);

    return id;
  }

  async function startVoiceAgent() {
    try {
      setStatus("Getting secure token...");
      addEvent("system", "Getting secure Gemini token...");

      const response = await fetch(
        "http://localhost:3001/token"
      );

      const data = await response.json();

      if (!data.token) {
        throw new Error("Token was not received");
      }

      const ai = new GoogleGenAI({
        apiKey: data.token,
      });

      setStatus("Connecting...");
      addEvent("system", "Connecting to Gemini Live...");
           const session = await ai.live.connect({
  model: "gemini-3.8-live",

  config: {
    responseModalities: [Modality.AUDIO],

    systemInstruction: {
      parts: [
        {
          text: `
You are Ramya's Voice Agent.

Your name is Ramya's Voice Agent.
You are Ramya's personal AI voice assistant.

When someone asks:
- When the user says "Hi", "Hello", "Hey", or any simple greeting,
  respond naturally by introducing yourself.
- Your greeting should start with:
  "Hi! I am Ramya's Voice Agent."
- You can then add a short friendly question such as:
  "How can I help you today?"
- "Who are you?"
- "What is your name?"
- "Who made you?"
- "What assistant are you?"

Introduce yourself as Ramya's Voice Agent.

Be friendly, helpful, natural, and concise.
Do not claim to be a human.
`,
        },
      ],
    },

    inputAudioTranscription: {},
    outputAudioTranscription: {},
  },

  callbacks: {
            
          onopen: () => {
            console.log("Gemini Live connected");

            setStatus("Connected");
            setIsConnected(true);

            addEvent(
              "system",
              "Gemini Live connected"
            );
          },

          onmessage: async (message) => {
            console.log(
              "Gemini message:",
              message
            );

            const serverContent =
              message.serverContent;

            /*
             * USER TRANSCRIPTION
             */
            if (
              serverContent?.inputTranscription?.text
            ) {
              const text =
                serverContent.inputTranscription.text;

              addEvent("user", text);
            }

            /*
             * AI TRANSCRIPTION
             *
             * Gemini sends the response in
             * multiple streaming chunks.
             *
             * Instead of creating a new event
             * for every chunk, we create ONE
             * event and keep updating it.
             */
            if (
              serverContent?.outputTranscription?.text
            ) {
              const text =
                serverContent.outputTranscription.text;

              if (
                !currentAssistantEventRef.current
              ) {
                // First chunk of this AI response
                const id = addEvent(
                  "assistant",
                  text
                );

                currentAssistantEventRef.current =
                  id;
              } else {
                // Additional chunks go into
                // the SAME event
                setEvents((prev) =>
                  prev.map((event) =>
                    event.id ===
                    currentAssistantEventRef.current
                      ? {
                          ...event,
                          text:
                            event.text + text,
                        }
                      : event
                  )
                );
              }
            }

            /*
             * AI finished this response
             */
            if (serverContent?.turnComplete) {
              currentAssistantEventRef.current =
                null;
            }

            /*
             * GEMINI AUDIO RESPONSE
             */
            const parts =
              serverContent?.modelTurn?.parts;

            if (!parts) return;

            for (const part of parts) {
              if (part.inlineData?.data) {
                await playAudio(
                  part.inlineData.data
                );
              }
            }
          },

          onerror: (error) => {
            console.error(
              "Gemini error:",
              error
            );

            setStatus("Connection error");

            addEvent(
              "error",
              "Gemini connection error"
            );
          },

          onclose: () => {
            console.log(
              "Gemini Live disconnected"
            );

            setStatus("Disconnected");
            setIsConnected(false);

            currentAssistantEventRef.current =
              null;

            addEvent(
              "system",
              "Gemini Live disconnected"
            );
          },
        },
      });

      sessionRef.current = session;

      await startMicrophone(session);

      addEvent(
        "system",
        "Microphone started"
      );
    } catch (error) {
      console.error(error);

      setStatus("Something went wrong");

      addEvent(
        "error",
        error.message
      );
    }
  }

  /*
   * MICROPHONE
   */
  async function startMicrophone(session) {
    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

    streamRef.current = stream;

    const audioContext =
      new AudioContext({
        sampleRate: 16000,
      });

    audioContextRef.current =
      audioContext;

    const source =
      audioContext.createMediaStreamSource(
        stream
      );

    const processor =
      audioContext.createScriptProcessor(
        4096,
        1,
        1
      );

    processorRef.current =
      processor;

    processor.onaudioprocess = (event) => {
      const inputData =
        event.inputBuffer.getChannelData(0);

      const pcmData =
        new Int16Array(
          inputData.length
        );

      for (
        let i = 0;
        i < inputData.length;
        i++
      ) {
        const sample =
          Math.max(
            -1,
            Math.min(
              1,
              inputData[i]
            )
          );

        pcmData[i] =
          sample < 0
            ? sample * 32768
            : sample * 32767;
      }

      const base64Audio =
        arrayBufferToBase64(
          pcmData.buffer
        );

      session.sendRealtimeInput({
        audio: {
          data: base64Audio,
          mimeType:
            "audio/pcm;rate=16000",
        },
      });
    };

    source.connect(processor);

    processor.connect(
      audioContext.destination
    );

    console.log(
      "Microphone started"
    );
  }

  /*
   * PLAY GEMINI AUDIO
   */
  async function playAudio(
    base64Audio
  ) {
    if (
      !playbackContextRef.current
    ) {
      playbackContextRef.current =
        new AudioContext({
          sampleRate: 24000,
        });
    }

    const audioContext =
      playbackContextRef.current;

    if (
      audioContext.state ===
      "suspended"
    ) {
      await audioContext.resume();
    }

    const binaryString =
      atob(base64Audio);

    const bytes =
      new Uint8Array(
        binaryString.length
      );

    for (
      let i = 0;
      i < binaryString.length;
      i++
    ) {
      bytes[i] =
        binaryString.charCodeAt(i);
    }

    const pcm16 =
      new Int16Array(
        bytes.buffer
      );

    const audioBuffer =
      audioContext.createBuffer(
        1,
        pcm16.length,
        24000
      );

    const channelData =
      audioBuffer.getChannelData(0);

    for (
      let i = 0;
      i < pcm16.length;
      i++
    ) {
      channelData[i] =
        pcm16[i] / 32768;
    }

    const source =
      audioContext.createBufferSource();

    source.buffer =
      audioBuffer;

    source.connect(
      audioContext.destination
    );

    const currentTime =
      audioContext.currentTime;

    if (
      nextPlaybackTimeRef.current <
      currentTime
    ) {
      nextPlaybackTimeRef.current =
        currentTime;
    }

    source.start(
      nextPlaybackTimeRef.current
    );

    nextPlaybackTimeRef.current +=
      audioBuffer.duration;
  }

  /*
   * CONVERT AUDIO TO BASE64
   */
  function arrayBufferToBase64(
    buffer
  ) {
    let binary = "";

    const bytes =
      new Uint8Array(buffer);

    for (
      let i = 0;
      i < bytes.byteLength;
      i++
    ) {
      binary += String.fromCharCode(
        bytes[i]
      );
    }

    return btoa(binary);
  }

  /*
   * SEND TEXT MESSAGE
   */
  function sendTextMessage() {
    const text =
      inputText.trim();

    if (
      !text ||
      !sessionRef.current
    ) {
      return;
    }

    addEvent(
      "user",
      text
    );

    sessionRef.current.sendRealtimeInput({
      text,
    });

    setInputText("");
  }

  /*
   * STOP VOICE AGENT
   */
  function stopVoiceAgent() {
    if (
      processorRef.current
    ) {
      processorRef.current.disconnect();

      processorRef.current =
        null;
    }

    if (
      audioContextRef.current
    ) {
      audioContextRef.current.close();

      audioContextRef.current =
        null;
    }

    if (
      streamRef.current
    ) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current =
        null;
    }

    if (
      sessionRef.current
    ) {
      sessionRef.current.close();

      sessionRef.current =
        null;
    }

    currentAssistantEventRef.current =
      null;

    setIsConnected(false);
    setStatus("Ready");

    addEvent(
      "system",
      "Session stopped"
    );
  }

  /*
   * NEW SESSION
   */
  function newSession() {
    stopVoiceAgent();

    setEvents([]);
    setInputText("");
    setStatus("Ready");

    currentAssistantEventRef.current =
      null;
  }

  return (
    <div className="app">

      {/* TOP BAR */}

      <header className="topbar">

        <div className="brand">

          <button className="iconButton">
            ☰
          </button>

          <div className="brandIcon">
            ◉
          </div>

          <span>
            Agent Development Kit
          </span>

        </div>

        <div className="topControls">

          <div className="agentSelect">
            🤖 Ramya's Voice Agent ▾
          </div>

          <button
            className="newSession"
            onClick={newSession}
          >
            ＋ New Session
          </button>

          <div className="profile">
            ●
          </div>

        </div>

      </header>


      {/* MAIN */}

      <div className="main">

        {/* SIDEBAR */}

        <aside className="sidebar">

          <div className="sidebarItem active">
            Info
          </div>

          <div className="sidebarItem">
            State
          </div>

          <div className="sidebarItem">
            Artifacts
          </div>

          <div className="sidebarItem">
            Evals
          </div>

        </aside>


        {/* CONTENT */}

        <main className="content">

          {/* TABS */}

          <div className="tabs">

            <button className="tab activeTab">
              Events
            </button>

            <button className="tab">
              Traces
            </button>

            <button className="filter">
              ＋ Filter
            </button>

          </div>


          {/* EVENTS */}

          <div className="events">

            {events.length === 0 ? (

              <div className="emptyState">

                <div className="emptyIcon">
                  🎙️
                </div>

                <h2>
                  Start your voice agent
                </h2>

                <p>
                  Press the phone button below
                  and start talking.
                </p>

              </div>

            ) : (

              events.map(
                (event, index) => (

                  <div
                    className={`event ${event.type}`}
                    key={event.id}
                  >

                    <div className="eventNumber">
                      #{index + 1}
                    </div>

                    <div className="eventIcon">

                      {event.type ===
                      "user"
                        ? "👤"
                        : event.type ===
                          "assistant"
                        ? "🤖"
                        : event.type ===
                          "error"
                        ? "⚠️"
                        : "●"}

                    </div>

                    <div className="eventBody">

                      <div className="eventLabel">

                        {event.type ===
                        "user"
                          ? "TRANSCRIPTION"
                          : event.type ===
                            "assistant"
                          ? "TRANSCRIPTION"
                          : "EVENT"}

                      </div>

                      <div className="eventText">
                        {event.text}
                      </div>

                    </div>

                  </div>

                )
              )

            )}

          </div>


          {/* STATUS */}

          <div className="statusBar">

            <div
              className={
                isConnected
                  ? "statusDot connected"
                  : "statusDot"
              }
            />

            <span>
              {status}
            </span>

          </div>


          {/* INPUT */}

          <div className="inputArea">

            <button className="plusButton">
              ＋
            </button>

            <input
              value={inputText}
              onChange={(e) =>
                setInputText(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter"
                ) {
                  sendTextMessage();
                }
              }}
              placeholder="Type a message..."
            />

            <button
              className={
                isConnected
                  ? "callButton active"
                  : "callButton"
              }
              onClick={
                isConnected
                  ? stopVoiceAgent
                  : startVoiceAgent
              }
            >
              ☎
            </button>

            <button
              className="sendButton"
              onClick={
                sendTextMessage
              }
            >
              ➤
            </button>

          </div>

        </main>

      </div>


      {/* STYLES */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #111111;
        }

        .app {
          height: 100vh;
          width: 100%;

          background: #111111;
          color: #eeeeee;

          font-family:
            Arial,
            Helvetica,
            sans-serif;

          display: flex;
          flex-direction: column;

          overflow: hidden;
        }


        /* TOP BAR */

        .topbar {
          height: 64px;

          background: #151515;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 0 22px;

          border-bottom:
            1px solid #2a2a2a;
        }

        .brand {
          display: flex;
          align-items: center;

          gap: 12px;

          font-size: 16px;
          font-weight: 500;
        }

        .iconButton {
          background: transparent;
          border: none;

          color: #ddd;

          font-size: 22px;

          cursor: pointer;
        }

        .brandIcon {
          width: 24px;
          height: 24px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 6px;

          background: #272727;

          font-size: 14px;
        }

        .topControls {
          display: flex;
          align-items: center;

          gap: 12px;
        }

        .agentSelect,
        .newSession {
          background: #202020;
          color: #ddd;

          border:
            1px solid #383838;

          border-radius: 8px;

          padding: 9px 14px;

          cursor: pointer;
        }

        .newSession:hover,
        .agentSelect:hover {
          background: #292929;
        }

        .profile {
          width: 34px;
          height: 34px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: #303030;

          color: #aaa;
        }


        /* MAIN */

        .main {
          flex: 1;

          display: flex;

          min-height: 0;
        }


        /* SIDEBAR */

        .sidebar {
          width: 150px;

          background: #141414;

          border-right:
            1px solid #292929;

          padding-top: 20px;
        }

        .sidebarItem {
          padding: 14px 22px;

          color: #999;

          font-size: 14px;

          cursor: pointer;
        }

        .sidebarItem:hover {
          color: white;
          background: #1e1e1e;
        }

        .sidebarItem.active {
          color: white;

          background: #242424;

          border-left:
            3px solid #8ab4f8;
        }


        /* CONTENT */

        .content {
          flex: 1;

          display: flex;
          flex-direction: column;

          min-width: 0;
          min-height: 0;

          background: #171717;
        }


        /* TABS */

        .tabs {
          height: 58px;

          display: flex;
          align-items: center;

          gap: 8px;

          padding: 0 24px;

          border-bottom:
            1px solid #292929;
        }

        .tab,
        .filter {
          background: transparent;

          border: none;

          color: #999;

          padding: 10px 14px;

          cursor: pointer;

          font-size: 14px;
        }

        .activeTab {
          color: white;

          background: #282828;

          border-radius: 8px;
        }

        .filter {
          border:
            1px dashed #444;

          border-radius: 8px;

          margin-left: 5px;
        }


        /* EVENTS */

        .events {
          flex: 1;

          overflow-y: auto;

          padding: 24px 35px;
        }

        .event {
          display: flex;

          align-items: flex-start;

          gap: 12px;

          margin-bottom: 20px;

          max-width: 900px;
        }

        .eventNumber {
          width: 30px;

          color: #777;

          font-size: 13px;

          padding-top: 7px;
        }

        .eventIcon {
          width: 32px;
          height: 32px;

          border-radius: 50%;

          display: flex;
          align-items: center;
          justify-content: center;

          background: #292929;

          font-size: 14px;

          flex-shrink: 0;
        }

        .event.user {
          margin-left: auto;

          max-width: 650px;

          justify-content: flex-end;

          flex-direction: row-reverse;
        }

        .event.user .eventNumber {
          text-align: right;
        }

        .event.user .eventBody {
          background: #222222;

          border-radius: 12px;

          padding: 10px 14px;
        }

        .event.assistant .eventIcon {
          background: #321b1b;
        }

        .eventBody {
          min-width: 100px;
        }

        .eventLabel {
          color: #777;

          font-size: 10px;

          letter-spacing: 0.7px;

          margin-bottom: 5px;
        }

        .eventText {
          color: #ddd;

          line-height: 1.5;

          font-size: 14px;

          white-space: normal;

          word-break: normal;
        }


        /* EMPTY */

        .emptyState {
          height: 100%;

          display: flex;

          flex-direction: column;

          align-items: center;
          justify-content: center;

          color: #777;

          text-align: center;
        }

        .emptyIcon {
          font-size: 45px;

          margin-bottom: 12px;
        }

        .emptyState h2 {
          color: #ddd;

          font-size: 20px;

          margin: 5px;
        }

        .emptyState p {
          margin: 5px;

          font-size: 14px;
        }


        /* STATUS */

        .statusBar {
          display: flex;

          align-items: center;

          gap: 8px;

          padding: 8px 28px;

          color: #888;

          font-size: 12px;
        }

        .statusDot {
          width: 8px;
          height: 8px;

          border-radius: 50%;

          background: #555;
        }

        .statusDot.connected {
          background: #45d483;

          box-shadow:
            0 0 8px #45d483;
        }


        /* INPUT */

        .inputArea {
          height: 66px;

          margin: 0 28px 20px;

          display: flex;

          align-items: center;

          gap: 8px;

          padding: 0 12px;

          border:
            1px solid #555;

          border-radius: 10px;

          background: #1a1a1a;

          box-shadow:
            0 0 0 1px
            rgba(255,255,255,0.02);
        }

        .inputArea input {
          flex: 1;

          background: transparent;

          border: none;

          outline: none;

          color: white;

          font-size: 14px;
        }

        .inputArea input::placeholder {
          color: #777;
        }

        .plusButton,
        .callButton,
        .sendButton {
          border: none;

          background: transparent;

          color: #aaa;

          cursor: pointer;

          font-size: 21px;

          width: 38px;
          height: 38px;

          border-radius: 50%;
        }

        .plusButton:hover,
        .sendButton:hover {
          background: #292929;

          color: white;
        }

        .callButton {
          background: #252525;

          color: #aaa;
        }

        .callButton.active {
          background: #2d6948;

          color: #72e0a0;
        }

        .callButton:hover {
          background: #333;
        }

        .sendButton {
          font-size: 24px;
        }


        /* MOBILE */

        @media (max-width: 700px) {

          .sidebar {
            width: 90px;
          }

          .sidebarItem {
            padding: 14px 10px;
            text-align: center;
          }

          .topbar {
            padding: 0 10px;
          }

          .agentSelect {
            display: none;
          }

          .events {
            padding: 18px;
          }

          .inputArea {
            margin: 0 12px 12px;
          }

        }

      `}</style>

    </div>
  );
}

export default App;