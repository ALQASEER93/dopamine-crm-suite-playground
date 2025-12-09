import path from 'path';
import 'dotenv/config';

const defaultCrmPath = 'D:\\projects 2\\crm2\\backend';
const legacyCrmPaths = [
  'D:\\projects\\crm2',
  'D:\\projects\\crm2\\backend',
  'D:\\projects 2\\crm2',
];
const defaultPwaPath = 'C:\\Users\\M S I\\Desktop\\pwa crm\\dopamine-pwa';

const sanitizeCrmPath = (raw?: string) => {
  const normalized = path.normalize((raw ?? '').replace(/\//g, '\\')).trim();
  const normalizedLower = normalized.toLowerCase();

  if (!normalized) {
    return defaultCrmPath;
  }

  const matchesLegacy = legacyCrmPaths.some(
    (legacy) => normalizedLower === legacy.toLowerCase(),
  );
  if (matchesLegacy) {
    return defaultCrmPath;
  }

  // Ensure we always point to backend folder even if env stops at repo root.
  if (!normalizedLower.includes('\\backend')) {
    return path.join(normalized, 'backend');
  }
  return normalized;
};

const sanitizePwaPath = (raw?: string) => {
  const normalized = (raw ?? '').replace(/\//g, '\\').trim();
  return normalized || defaultPwaPath;
};

export const config = {
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  smtp: {
    host: process.env.AIAGENT_SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.AIAGENT_SMTP_PORT ?? '587'),
    user: process.env.AIAGENT_SMTP_USER ?? '',
    pass: process.env.AIAGENT_SMTP_PASS ?? '',
    from: process.env.AIAGENT_MAIL_FROM ?? '',
    to: process.env.AIAGENT_MAIL_TO ?? '',
  },
  paths: {
    crm: sanitizeCrmPath(process.env.DOPAMINE_CRM_PATH),
    pwa: sanitizePwaPath(process.env.DOPAMINE_PWA_PATH),
  },
};
