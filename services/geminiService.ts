
import { GoogleGenAI, Type } from "@google/genai";
import { VideoAnalysisData, TranscriptSegment, ExportFormat } from "../types";

const MODEL_NAME = 'gemini-3-flash-preview';

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

// Fixed analyzeVideo to include chapters in the schema and response processing
export const analyzeVideo = async (
  base64Data: string, 
  mimeType: string,
  signal?: AbortSignal
): Promise<VideoAnalysisData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Define schema for structured output, including mandatory chapters
  const schema = {
    type: Type.OBJECT,
    properties: {
      summary: {
        type: Type.STRING,
        description: "A concise summary of the content (approx 100-150 words).",
      },
      topics: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of 3-5 main topics discussed.",
      },
      chapters: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A short, descriptive title for this chapter." },
            timestamp: { type: Type.STRING, description: "Start time in MM:SS format." },
          },
          propertyOrdering: ["title", "timestamp"],
        },
        description: "Major sections or chapters of the media.",
      },
      transcript: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            timestamp: { type: Type.STRING, description: "Start time for this segment in MM:SS format." },
            text: { type: Type.STRING, description: "The EXACT VERBATIM spoken content for this segment. Do NOT summarize." },
          },
          propertyOrdering: ["timestamp", "text"],
        },
        description: "A word-for-word, verbatim transcript of the media.",
      },
    },
    propertyOrdering: ["summary", "topics", "chapters", "transcript"],
    required: ["summary", "topics", "chapters", "transcript"],
  };

  try {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: "Generate a word-for-word, verbatim transcript for this file. It is critical that the transcript segments represent exactly what was said without any summarization or paraphrasing. Additionally, provide a high-level summary, key topics, and major chapters for navigation.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are a professional stenographer and media analyst. Your primary goal is to provide 100% accurate, verbatim, word-for-word transcripts. You must not summarize the spoken content within the transcript segments. Summaries should only be provided in the dedicated summary field.",
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

    // Enrich chapters with parsed seconds for seeking
    const enrichedChapters = data.chapters.map((item: any) => ({
      ...item,
      seconds: parseTimestamp(item.timestamp),
    }));

    return {
      summary: data.summary,
      topics: data.topics,
      chapters: enrichedChapters,
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
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
             text: `You are answering questions about the media provided. 
             
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
      const formatSrtTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = 0; 
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},000`;
      };
      
      const start = formatSrtTime(seg.seconds);
      const nextSeg = transcript[index + 1];
      const end = nextSeg ? formatSrtTime(nextSeg.seconds) : formatSrtTime(seg.seconds + 3);
      
      return `${index + 1}\n${start} --> ${end}\n${seg.text}\n`;
    }).join('\n');
  }

  // TXT default
  return transcript.map(seg => `[${seg.timestamp}] ${seg.text}`).join('\n');
};
