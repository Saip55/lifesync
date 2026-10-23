// Hard-coded on purpose: emergency numbers are never taken from the model.
export const EMERGENCY_NUMBERS = [
  { number: "112", label: "All emergencies" },
  { number: "108", label: "Ambulance" },
  { number: "100", label: "Police" },
  { number: "101", label: "Fire" },
  { number: "1070", label: "Disaster helpline" },
  { number: "1098", label: "Child helpline" },
  { number: "14567", label: "Elder helpline" },
] as const;

export const DISCLAIMER = "LifeSync is an AI assistant, not a doctor or emergency service.";
