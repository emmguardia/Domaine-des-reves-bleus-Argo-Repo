export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  feedback: string[];
}

export const calculatePasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score += 1;
  else feedback.push("Au moins 8 caractères");

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push("Une minuscule");

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push("Une majuscule");

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push("Un chiffre");

  if (/[@$!%*?&]/.test(password)) score += 1;
  else feedback.push("Un caractère spécial (@$!%*?&)");

  if (password.length >= 12) score += 1;

  let label = "Très faible";
  let color = "bg-red-500";

  if (score >= 5) {
    label = "Très fort";
    color = "bg-green-500";
  } else if (score >= 4) {
    label = "Fort";
    color = "bg-green-400";
  } else if (score >= 3) {
    label = "Moyen";
    color = "bg-yellow-500";
  } else if (score >= 2) {
    label = "Faible";
    color = "bg-orange-500";
  }

  return { score, label, color, feedback };
};

