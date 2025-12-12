import { GoogleGenAI } from "@google/genai";
import { GroundingLink } from '../types';

let genAI: GoogleGenAI | null = null;

export const initializeGemini = () => {
  if (process.env.API_KEY) {
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
};

export const generateLocationInsights = async (
  prompt: string,
  contextData: string,
  userLocation?: { latitude: number; longitude: number }
): Promise<{ text: string; links: GroundingLink[] }> => {
  if (!genAI) throw new Error("API Key not found");

  const model = "gemini-2.5-flash";
  
  const systemInstruction = `
You are a Location Intelligence Analyst for Q-Pets, a pet store chain in Hong Kong.
You have access to a CSV dataset of customer delivery addresses and sales figures provided by the user.
Your goal is to help the user understand the geographic distribution of their customers.

User Context:
${contextData}

Instructions:
1. When asked about specific addresses, verify them using the 'googleMaps' tool.
2. If asked about districts or areas, use 'googleMaps' to identify key landmarks or residential estates in those areas if the context isn't sufficient.
3. Always reference the specific customer data provided in the context when forming your answer.
4. If the user asks "Where do my customers live?", analyze the CSV data provided in the context and summarize the key locations, then use Google Maps to provide details about the top areas (e.g., "Many customers are in Tuen Mun, which is a residential new town...").
5. Do NOT hallucinate addresses not in the data. Only use the provided data or Google Maps Grounding.

If the user provides a location (latitude/longitude), use it to refine search results.
  `;

  let toolConfig = undefined;
  if (userLocation) {
    toolConfig = {
      retrievalConfig: {
        latLng: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        }
      }
    };
  }

  try {
    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleMaps: {} }],
        toolConfig: toolConfig,
      },
    });

    const text = response.text || "I couldn't generate a response.";
    
    // Extract Grounding Chunks (Map Links)
    const links: GroundingLink[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      chunks.forEach((chunk: any) => {
        // Handle Maps Grounding Chunks
        if (chunk.groundingChunkType === 'maps' || chunk.maps) {
           const mapData = chunk.maps || chunk;
           if (mapData.uri) {
               links.push({ 
                   title: mapData.title || "Google Maps Location", 
                   uri: mapData.uri 
               });
           }
        }
        // Fallback for generic web grounding if mixed (though usually googleMaps tool implies maps chunks)
        else if (chunk.web?.uri && chunk.web?.title) {
            links.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    return { text, links };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};