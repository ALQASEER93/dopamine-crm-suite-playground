"use client";

import { getConfiguredApiBase, normalizeBaseUrl } from "./api-config";

function getBrowserBaseUrl(): string {
  const configured = getConfiguredApiBase();
  if (configured) return configured;

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "";
}

function toPath(input: string): string {
  if (input.startsWith("/")) return input;
  return `/${input.replace(/^\/+/, "")}`;
}

export function buildApiUrl(input: string): string {
  if (/^https?:\/\//i.test(input)) {
    return input;
  }

  const base = normalizeBaseUrl(getBrowserBaseUrl());
  if (!base) {
    return toPath(input);
  }

  return `${base}${toPath(input)}`;
}

export function clientFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const url = buildApiUrl(input);
  return fetch(url, init);
}
