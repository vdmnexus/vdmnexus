import { NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const WAITLIST_FILE = path.join(DATA_DIR, "waitlist.json");

interface WaitlistEntry {
  email: string;
  company: string;
  useCase: string;
  createdAt: string;
}

export async function POST(request: Request) {
  try {
    const { email, company, useCase } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is verplicht" },
        { status: 400 }
      );
    }

    const entry: WaitlistEntry = {
      email: email.trim().toLowerCase(),
      company: company?.trim() || "",
      useCase: useCase?.trim() || "",
      createdAt: new Date().toISOString(),
    };

    await mkdir(DATA_DIR, { recursive: true });

    let entries: WaitlistEntry[] = [];
    try {
      const data = await readFile(WAITLIST_FILE, "utf-8");
      entries = JSON.parse(data);
    } catch {
      // File doesn't exist yet
    }

    if (entries.some((e) => e.email === entry.email)) {
      return NextResponse.json(
        { message: "Je staat al op de lijst!" },
        { status: 200 }
      );
    }

    entries.push(entry);
    await writeFile(WAITLIST_FILE, JSON.stringify(entries, null, 2));

    return NextResponse.json(
      { message: "Succesvol aangemeld!" },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Er ging iets mis" },
      { status: 500 }
    );
  }
}
