export const SKILLS_DELIMITER = ", ";

export const ALL_TECH_SKILLS = [
  "Git",
  "HTML",
  "CSS",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Tailwind CSS",
  "Redux",
  "REST APIs",
  "GraphQL",
  "Unit testing",
  "Accessibility",
  "Web performance",
  "Node.js",
  "Express",
  "Nest.js",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "Docker",
  "AWS",
  "Microservices",
  "System design",
  "Team leadership",
  "Mentoring",
  "Code review",
  "Recruitment",
  "Payroll",
  "HR policies",
  "Employee onboarding",
  "Microsoft Excel",
  "Business strategy",
  "Stakeholder management",
  "Project management",
  "Agile / Scrum",
] as const;

export function parseSkillsValue(value: string): string[] {
  if (!value.trim()) return [];

  return value
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

export function joinSkillsValue(skills: string[]): string {
  return skills.join(SKILLS_DELIMITER);
}
