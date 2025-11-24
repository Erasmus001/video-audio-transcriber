import { GoogleGenAI, Type } from "@google/genai";
import { VideoAnalysisData, TranscriptSegment, ExportFormat } from "../types";

// Helper to calculate seconds from timestamp string "MM:SS" or "HH:MM:SS"
const parseTimestamp = (timestamp: string): number => {
  const parts = timestamp.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
};

export const analyzeVideo = async (
  base64Data: string, 
  mimeType: string,
  signal?: AbortSignal
): Promise<VideoAnalysisData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Define schema for structured output
  const schema = {
    type: Type.OBJECT,
    properties: {
      summary: {
        type: Type.STRING,
        description: "A concise summary of the video content (approx 100-150 words).",
      },
      topics: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of 3-5 main topics discussed in the video.",
      },
      transcript: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            timestamp: { type: Type.STRING, description: "Timestamp in MM:SS format." },
            text: { type: Type.STRING, description: "The spoken content or description of events at this time." },
          },
          propertyOrdering: ["timestamp", "text"],
        },
        description: "A detailed transcript of the video.",
      },
    },
    propertyOrdering: ["summary", "topics", "transcript"],
    required: ["summary", "topics", "transcript"],
  };

  try {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: "Analyze this video. Provide a detailed transcript with timestamps, a comprehensive summary, and key topics discussed.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are an expert video analyst and transcriber. Your goal is to provide accurate, well-formatted transcripts and insightful summaries.",
      },
    });

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const text = response.text;
    if (!text) {
        throw new Error("No response from Gemini");
    }

    const data = JSON.parse(text);
    
    // Enrich transcript with parsed seconds for seeking
    const enrichedTranscript = data.transcript.map((item: any) => ({
      ...item,
      seconds: parseTimestamp(item.timestamp),
    }));

    return {
      summary: data.summary,
      topics: data.topics,
      transcript: enrichedTranscript,
    };
  } catch (error) {
    // Check if it's an abort error
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        throw new DOMException('Aborted', 'AbortError');
    }
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const askVideoQuestion = async (
  base64Data: string,
  mimeType: string,
  question: string,
  history: { role: 'user' | 'model'; text: string }[] = []
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
             text: `You are answering questions about the video provided. 
             
             Previous conversation history (if any):
             ${history.map(h => `${h.role}: ${h.text}`).join('\n')}
             
             User Question: ${question}`
          }
        ]
      }
    });

    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
};

export const generateExportContent = (transcript: TranscriptSegment[], format: ExportFormat): string => {
  if (format === 'json') {
    return JSON.stringify(transcript, null, 2);
  }
  
  if (format === 'srt') {
    return transcript.map((seg, index) => {
      // Very basic SRT timestamp formatting for demo purposes
      // Needs to convert seconds to HH:MM:SS,mmm
      const formatSrtTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = 0; // Simplified
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},000`;
      };
      
      const start = formatSrtTime(seg.seconds);
      // Estimate end time (next segment or +3s)
      const nextSeg = transcript[index + 1];
      const end = nextSeg ? formatSrtTime(nextSeg.seconds) : formatSrtTime(seg.seconds + 3);
      
      return `${index + 1}\n${start} --> ${end}\n${seg.text}\n`;
    }).join('\n');
  }

  // TXT default
  return transcript.map(seg => `[${seg.timestamp}] ${seg.text}`).join('\n');
};