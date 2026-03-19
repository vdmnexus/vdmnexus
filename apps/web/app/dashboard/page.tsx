"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Bot, ChevronRight } from "lucide-react";
import { getEmployees, type Employee } from "../../lib/api";

export default function DashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEmployees()
      .then(setEmployees)
      .catch(() => setEmployees([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">Employees</h1>
          <p className="text-sm text-primary-400 mt-1">
            {employees.length === 0
              ? "Maak je eerste AI employee aan"
              : `${employees.length} employee${employees.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link
          href="/dashboard/create"
          className="flex items-center gap-2 rounded-xl bg-primary-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 transition-colors"
        >
          <Plus size={16} />
          Nieuwe Employee
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-900" />
        </div>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 mb-4">
            <Bot size={24} className="text-primary-400" />
          </div>
          <h2 className="text-lg font-semibold text-primary mb-1">Nog geen employees</h2>
          <p className="text-sm text-primary-400 mb-6 max-w-sm">
            Maak je eerste AI employee aan. Geef ze een naam, persoonlijkheid, skills en zet ze aan het werk.
          </p>
          <Link
            href="/dashboard/create"
            className="flex items-center gap-2 rounded-xl bg-primary-900 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-800 transition-colors"
          >
            <Plus size={16} />
            Maak je eerste employee
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map((emp) => (
            <Link
              key={emp.id}
              href={`/dashboard/${emp.id}`}
              className="flex items-center gap-4 rounded-xl border border-primary-200 bg-white p-4 transition-colors hover:bg-primary-50"
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl text-white font-bold ${
                  emp.active ? "bg-accent" : "bg-primary-300"
                }`}
              >
                {emp.name[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-primary">{emp.name}</p>
                  {emp.active ? (
                    <span className="flex items-center gap-1 rounded-md bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Active
                    </span>
                  ) : (
                    <span className="rounded-md bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-400">
                      Draft
                    </span>
                  )}
                </div>
                <p className="text-xs text-primary-400">{emp.role ?? "Geen rol"} · {emp.model}</p>
              </div>
              <ChevronRight size={16} className="text-primary-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
