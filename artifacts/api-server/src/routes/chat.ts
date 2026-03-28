import { Router, type IRouter, type Request, type Response } from "express";
import { GoogleGenAI, Modality } from "@google/genai";
import { SendMessageBody, GenerateImageBody } from "@workspace/api-zod";

const router: IRouter = Router();

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Part =
  | { text: string }
  | { inlineData: { data: string; mimeType: string } };

function parseDataUrl(url: string): { mimeType: string; data: string } | null {
  const match = url.match(/^data:([^;]+);base64,(.+)$/);
  if (match) return { mimeType: match[1], data: match[2] };
  return null;
}

router.post("/chat/message", async (req: Request, res: Response) => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid request body", details: parsed.error.message });
    return;
  }

  const { message, history = [], attachments = [] } = parsed.data;

  try {
    const chatHistory: Array<{ role: "user" | "model"; parts: Part[] }> = [];
    let currentRole: "user" | "model" | null = null;
    let currentParts: Part[] = [];

    for (const msg of history) {
      const mappedRole = msg.role === "assistant" ? "model" : "user";
      const msgParts: Part[] = [];

      if (msg.type === "text") {
        msgParts.push({ text: msg.content });
        if (msg.attachmentUrls && msg.attachmentUrls.length > 0) {
          for (const url of msg.attachmentUrls) {
            const inline = parseDataUrl(url);
            if (inline) msgParts.push({ inlineData: inline });
          }
        }
      } else if (msg.type === "image") {
        if (msg.role === "user") {
          msgParts.push({ text: msg.content });
          if (msg.attachmentUrls && msg.attachmentUrls.length > 0) {
            for (const url of msg.attachmentUrls) {
              const inline = parseDataUrl(url);
              if (inline) msgParts.push({ inlineData: inline });
            }
          }
        } else if (msg.role === "assistant" && msg.imageUrl) {
          const inline = parseDataUrl(msg.imageUrl);
          if (inline) {
            msgParts.push({ inlineData: inline });
          } else {
            msgParts.push({
              text: `(Generated image based on: ${msg.content})`,
            });
          }
        }
      }

      if (msgParts.length === 0) continue;

      if (mappedRole === currentRole) {
        currentParts.push(...msgParts);
      } else {
        if (currentRole) {
          chatHistory.push({ role: currentRole, parts: currentParts });
        }
        currentRole = mappedRole;
        currentParts = [...msgParts];
      }
    }
    if (currentRole) {
      chatHistory.push({ role: currentRole, parts: currentParts });
    }

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      history: chatHistory,
      config: { maxOutputTokens: 8192 },
    });

    const messageParts: Part[] = [{ text: message }];

    for (const att of attachments) {
      messageParts.push({
        inlineData: { data: att.data, mimeType: att.mimeType },
      });
    }

    const result = await chat.sendMessage({ message: messageParts });
    const text = result.text ?? "";

    res.json({ message: text, role: "assistant" });
  } catch (err: unknown) {
    req.log.error({ err }, "Error sending chat message");
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    res
      .status(500)
      .json({ error: "Failed to get response from Gemini", details: errMsg });
  }
});

router.post("/chat/generate-image", async (req: Request, res: Response) => {
  const parsed = GenerateImageBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid request body", details: parsed.error.message });
    return;
  }

  const { prompt, aspectRatio, referenceImage } = parsed.data;

  try {
    const aspectDescription =
      aspectRatio === "16:9"
        ? "wide landscape orientation, 16:9 aspect ratio, horizontal format"
        : "tall portrait orientation, 9:16 aspect ratio, vertical format";

    const isEditing = !!referenceImage;
    const enhancedPrompt = isEditing
      ? `${prompt}. Keep the output in ${aspectDescription}.`
      : `${prompt}. The image should be in ${aspectDescription}.`;

    type Part =
      | { text: string }
      | { inlineData: { data: string; mimeType: string } };
    const parts: Part[] = [];
    if (referenceImage) {
      parts.push({
        inlineData: {
          data: referenceImage.data,
          mimeType: referenceImage.mimeType,
        },
      });
    }
    parts.push({ text: enhancedPrompt });

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: [{ role: "user", parts }],
      config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });

    const responseParts = response.candidates?.[0]?.content?.parts ?? [];

    let imageData: string | null = null;
    let mimeType = "image/png";

    for (const part of responseParts) {
      if (part.inlineData?.data) {
        imageData = part.inlineData.data;
        mimeType = part.inlineData.mimeType ?? "image/png";
        break;
      }
    }

    if (!imageData) {
      const textPart = responseParts.find((p) => p.text);
      req.log.error({ textPart }, "No image returned from model");
      res.status(500).json({
        error: "No image was generated",
        details: textPart?.text ?? "The model did not return image data",
      });
      return;
    }

    res.json({ imageData, mimeType, prompt, aspectRatio });
  } catch (err: unknown) {
    req.log.error({ err }, "Error generating image");
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    res
      .status(500)
      .json({ error: "Failed to generate image", details: errMsg });
  }
});

export default router;
