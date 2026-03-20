const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.vdmnexus.com";

// Sophie's employee ID — the VDM Vastgoed AI employee
const SOPHIE_ID = process.env.NEXT_PUBLIC_EMPLOYEE_ID ?? "e1331c02-83de-4d57-a2a1-7d1c6edac567";

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

// Legacy non-streaming call (fallback)
export async function sendChatMessage(
  message: string,
  conversationId?: string
): Promise<{ conversationId: string; message: ChatMessage }> {
  const res = await fetch(`${API_URL}/chat/${SOPHIE_ID}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, conversationId }),
  });

  if (!res.ok) throw new Error("Chat request failed");
  return res.json();
}

// Streaming chat call via SSE
export async function sendChatMessageStream(
  message: string,
  conversationId: string | undefined,
  onMeta: (meta: { conversationId: string }) => void,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/chat/${SOPHIE_ID}/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, conversationId }),
    });
  } catch {
    onError("Kan geen verbinding maken met de server.");
    return;
  }

  if (!res.ok) {
    onError("Chat request failed");
    return;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "message";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line === "") {
          // Empty line = end of SSE event, reset event type
          currentEvent = "message";
          continue;
        }
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
          continue;
        }
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          switch (currentEvent) {
            case "meta":
              try { onMeta(JSON.parse(data)); } catch {}
              break;
            case "chunk":
              onChunk(data);
              break;
            case "done":
              onDone();
              return;
            case "error":
              onError(data);
              return;
          }
        }
      }
    }
  } catch {
    onError("Stream verbinding verbroken.");
    return;
  }

  onDone();
}
