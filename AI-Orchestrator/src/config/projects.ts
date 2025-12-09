export interface ProjectConfig {
  name: string;
  cwd: string;
  testCommand: string[];
  buildCommand: string[];
}

export const backendProject: ProjectConfig = {
  name: "ALQASEER CRM Backend",
  cwd: "D:/CRM ALQASEER/CRM/backend",
  testCommand: ["npm", "test"],
  buildCommand: ["npm", "run", "build"],
};

export const frontendProject: ProjectConfig = {
  name: "ALQASEER CRM Frontend",
  cwd: "D:/CRM ALQASEER/CRM/frontend",
  testCommand: ["npm", "test"],
  buildCommand: ["npm", "run", "build"],
};

export const pwaProject: ProjectConfig = {
  name: "Dopamine PWA",
  cwd: "D:/CRM ALQASEER/ALQASEER-PWA",
  testCommand: ["npm", "run", "test:vitest"],
  buildCommand: ["npm", "run", "build"],
};

export const aljazeeraProject: ProjectConfig = {
  name: "AlJazeera",
  cwd: "D:/CRM ALQASEER/AlJazeera",
  testCommand: ["node", "-e", "console.log('AlJazeera: no tests defined')"],
  buildCommand: ["node", "-e", "console.log('AlJazeera: no build defined')"],
};

export const projects = {
  backend: backendProject,
  frontend: frontendProject,
  pwa: pwaProject,
  aljazeera: aljazeeraProject,
};
