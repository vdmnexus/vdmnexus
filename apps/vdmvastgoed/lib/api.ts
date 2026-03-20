const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.vdmnexus.com";

// Sophie's employee ID — the VDM Vastgoed AI employee
const SOPHIE_ID = process.env.NEXT_PUBLIC_EMPLOYEE_ID ?? "e1331c02-83de-4d57-a2a1-7d1c6edac567";

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

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
