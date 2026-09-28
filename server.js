import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();

app.use(cors());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.get('/token', async (req, res) => {
  try {
    const expireTime = new Date(
      Date.now() + 30 * 60 * 1000
    ).toISOString();

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime: new Date(
          Date.now() + 60 * 1000
        ).toISOString(),

        liveConnectConstraints: {
          model: 'gemini-3.8-live',
          config: {
            responseModalities: ['AUDIO']
          }
        }
      }
    });

    res.json({
      token: token.name
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Failed to create token'
    });
  }
});

app.listen(3001, () => {
  console.log('Backend running on http://localhost:3001');
});