"use client";

import { api } from "./api";

export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nexus_token");
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("nexus_user");
  return raw ? JSON.parse(raw) : null;
}

export function setAuth(token: string, user: User) {
  localStorage.setItem("nexus_token", token);
  localStorage.setItem("nexus_user", JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("nexus_token");
  localStorage.removeItem("nexus_user");
}

export async function login(email: string, password: string): Promise<User> {
  const res = await api<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setAuth(res.token, res.user);
  return res.user;
}

export async function register(email: string, password: string, name?: string): Promise<User> {
  const res = await api<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
  setAuth(res.token, res.user);
  return res.user;
}

export function logout() {
  clearAuth();
  window.location.href = "/login";
}
