/**
 * Placeholder seed data for the plan & estimate flow.
 * Replace with real/AI-sourced data once live.
 * All hospital and doctor names are fictional.
 */

export type SeedPackage = {
  id: string;
  specialty: string;
  procedure: string;
  name: string;
  sub: string;
  priceMin: number;
  priceMax: number;
  rating: number;
  successRate: number;
  city: string;
  accreditation: string;
  stayDays: string;
  languages: string[];
};

export type SeedHospital = {
  id: string;
  specialty: string;
  name: string;
  sub: string;
  city: string;
  priceFrom: number;
  rating: number;
  successRate: number;
  accreditation: string;
  beds: number;
  languages: string[];
  airportKm: number;
};

export type SeedDoctor = {
  id: string;
  specialty: string;
  name: string;
  hospitalId: string;
  title: string;
  city: string;
  experienceYrs: number;
  proceduresDone: number;
  rating: number;
  languages: string[];
  nextAvailable: string;
};

export const SPECIALTIES = [
  { slug: "cardiac", label: "Cardiac & Heart", icon: "❤️", procedures: ["Angioplasty (PTCA)", "Bypass (CABG)", "Valve replacement", "Pacemaker", "Angiography"] },
  { slug: "oncology", label: "Oncology", icon: "🎗️", procedures: ["Chemotherapy", "Tumour surgery", "Radiation therapy"] },
  { slug: "orthopaedics", label: "Orthopaedics", icon: "🦴", procedures: ["Knee replacement", "Hip replacement", "Spine surgery"] },
  { slug: "neuro", label: "Neuro & Spine", icon: "🧠", procedures: ["Brain surgery", "Spine fusion", "DBS"] },
  { slug: "transplant", label: "Transplant", icon: "🫁", procedures: ["Liver transplant", "Kidney transplant", "Bone marrow"] },
  { slug: "fertility", label: "Fertility & IVF", icon: "👶", procedures: ["IVF", "IUI", "ICSI"] },
  { slug: "cosmetic", label: "Cosmetic", icon: "💠", procedures: ["Rhinoplasty", "Liposuction", "Hair transplant"] },
] as const;

export const CITIES = ["Delhi", "Bengaluru", "Chennai", "Mumbai", "Hyderabad"] as const;

export const PACKAGES: SeedPackage[] = [
  // Cardiac — fully populated
  { id: "pkg-c1", specialty: "cardiac", procedure: "Angioplasty (PTCA)", name: "Angioplasty — Single Stent (Standard)", sub: "3–4 day stay · DES stent · incl. tests", priceMin: 4900, priceMax: 5800, rating: 4.6, successRate: 92, city: "Bengaluru", accreditation: "NABH", stayDays: "3–4", languages: ["English", "Arabic", "Hindi"] },
  { id: "pkg-c2", specialty: "cardiac", procedure: "Angioplasty (PTCA)", name: "Angioplasty — Single Stent (Premium)", sub: "Private room · senior surgeon · 4 day stay", priceMin: 6400, priceMax: 7200, rating: 4.8, successRate: 95, city: "Delhi", accreditation: "JCI", stayDays: "4", languages: ["English", "Arabic", "French"] },
  { id: "pkg-c3", specialty: "cardiac", procedure: "Angioplasty (PTCA)", name: "Angioplasty — Double Stent", sub: "2 stents · 4–5 day stay · incl. cardiac rehab", priceMin: 7800, priceMax: 8600, rating: 4.7, successRate: 93, city: "Delhi", accreditation: "JCI", stayDays: "4–5", languages: ["English", "French"] },
  { id: "pkg-c4", specialty: "cardiac", procedure: "Angiography", name: "Diagnostic Angiography + Consult", sub: "Day-care · report in 24h", priceMin: 300, priceMax: 600, rating: 4.5, successRate: 90, city: "Bengaluru", accreditation: "NABH", stayDays: "1", languages: ["English", "Arabic"] },
  { id: "pkg-c5", specialty: "cardiac", procedure: "Bypass (CABG)", name: "CABG — Triple Vessel", sub: "7–10 day stay · ICU included", priceMin: 5500, priceMax: 9500, rating: 4.7, successRate: 94, city: "Chennai", accreditation: "JCI", stayDays: "7–10", languages: ["English", "Arabic", "French"] },
  { id: "pkg-c6", specialty: "cardiac", procedure: "Valve replacement", name: "Aortic Valve Replacement (Mechanical)", sub: "7–10 day stay · ICU + step-down", priceMin: 6500, priceMax: 11000, rating: 4.8, successRate: 96, city: "Delhi", accreditation: "JCI", stayDays: "7–10", languages: ["English", "Arabic"] },
  // Oncology — stub
  { id: "pkg-o1", specialty: "oncology", procedure: "Chemotherapy", name: "Chemotherapy — 6-cycle Standard", sub: "Outpatient · fortnightly cycles", priceMin: 3000, priceMax: 5000, rating: 4.5, successRate: 88, city: "Mumbai", accreditation: "NABH", stayDays: "Outpatient", languages: ["English", "Hindi"] },
  { id: "pkg-o2", specialty: "oncology", procedure: "Tumour surgery", name: "Tumour Excision — General", sub: "3–5 day stay · biopsy incl.", priceMin: 4000, priceMax: 7000, rating: 4.6, successRate: 91, city: "Delhi", accreditation: "JCI", stayDays: "3–5", languages: ["English", "Arabic"] },
  // Orthopaedics — stub
  { id: "pkg-r1", specialty: "orthopaedics", procedure: "Knee replacement", name: "Total Knee Replacement — Unilateral", sub: "5–7 day stay · implant incl.", priceMin: 5000, priceMax: 7500, rating: 4.7, successRate: 95, city: "Delhi", accreditation: "JCI", stayDays: "5–7", languages: ["English", "Arabic"] },
  { id: "pkg-r2", specialty: "orthopaedics", procedure: "Hip replacement", name: "Total Hip Replacement", sub: "5–7 day stay · rehab session incl.", priceMin: 5500, priceMax: 8000, rating: 4.6, successRate: 93, city: "Bengaluru", accreditation: "NABH", stayDays: "5–7", languages: ["English", "Hindi"] },
  // Neuro — stub
  { id: "pkg-n1", specialty: "neuro", procedure: "Spine fusion", name: "Lumbar Spine Fusion — Single Level", sub: "4–6 day stay · implant incl.", priceMin: 5000, priceMax: 8500, rating: 4.6, successRate: 92, city: "Chennai", accreditation: "JCI", stayDays: "4–6", languages: ["English", "Arabic"] },
  // Transplant — stub
  { id: "pkg-t1", specialty: "transplant", procedure: "Kidney transplant", name: "Kidney Transplant — Living Donor", sub: "14–21 day stay · donor eval incl.", priceMin: 13000, priceMax: 18000, rating: 4.8, successRate: 96, city: "Delhi", accreditation: "JCI", stayDays: "14–21", languages: ["English", "Arabic", "French"] },
  // Fertility — stub
  { id: "pkg-f1", specialty: "fertility", procedure: "IVF", name: "IVF — Standard Cycle", sub: "2–3 week stay · egg retrieval + transfer", priceMin: 3500, priceMax: 5000, rating: 4.5, successRate: 55, city: "Mumbai", accreditation: "NABH", stayDays: "14–21", languages: ["English", "Hindi"] },
  // Cosmetic — stub
  { id: "pkg-s1", specialty: "cosmetic", procedure: "Rhinoplasty", name: "Rhinoplasty — Open", sub: "2–3 day stay · post-op follow-up", priceMin: 2500, priceMax: 4000, rating: 4.4, successRate: 94, city: "Mumbai", accreditation: "NABH", stayDays: "2–3", languages: ["English", "Hindi"] },
];

export const HOSPITALS: SeedHospital[] = [
  // Cardiac — fully populated
  { id: "h-c1", specialty: "cardiac", name: "Meridian Heart Institute", sub: "Delhi · 320 beds · 8,000+ cardiac cases/yr", city: "Delhi", priceFrom: 5400, rating: 4.8, successRate: 97, accreditation: "JCI", beds: 320, languages: ["English", "Arabic", "French"], airportKm: 18 },
  { id: "h-c2", specialty: "cardiac", name: "Asha Superspecialty", sub: "Bengaluru · dedicated cardiac wing", city: "Bengaluru", priceFrom: 4950, rating: 4.6, successRate: 94, accreditation: "NABH", beds: 180, languages: ["English", "Arabic", "Hindi"], airportKm: 32 },
  { id: "h-c3", specialty: "cardiac", name: "Sunrise Cardiac Centre", sub: "Delhi · 24×7 cath lab", city: "Delhi", priceFrom: 5800, rating: 4.7, successRate: 95, accreditation: "JCI", beds: 250, languages: ["English", "French", "Hindi"], airportKm: 22 },
  { id: "h-c4", specialty: "cardiac", name: "Green Valley Hospital", sub: "Bengaluru · value cardiac programme", city: "Bengaluru", priceFrom: 4600, rating: 4.4, successRate: 90, accreditation: "NABH", beds: 150, languages: ["English", "Hindi"], airportKm: 28 },
  { id: "h-c5", specialty: "cardiac", name: "Nova Institute of Cardiology", sub: "Chennai · robotic cath lab", city: "Chennai", priceFrom: 6200, rating: 4.9, successRate: 98, accreditation: "JCI", beds: 400, languages: ["English", "Arabic", "French"], airportKm: 15 },
  // Oncology — stub
  { id: "h-o1", specialty: "oncology", name: "Arogya Cancer Centre", sub: "Mumbai · comprehensive cancer care", city: "Mumbai", priceFrom: 4000, rating: 4.7, successRate: 91, accreditation: "NABH", beds: 220, languages: ["English", "Hindi"], airportKm: 12 },
  // Orthopaedics — stub
  { id: "h-r1", specialty: "orthopaedics", name: "Pinnacle Ortho Hospital", sub: "Delhi · robotic joint centre", city: "Delhi", priceFrom: 5200, rating: 4.7, successRate: 95, accreditation: "JCI", beds: 200, languages: ["English", "Arabic"], airportKm: 20 },
  // Neuro — stub
  { id: "h-n1", specialty: "neuro", name: "Brainstem Neuro Institute", sub: "Chennai · advanced neuro ICU", city: "Chennai", priceFrom: 5500, rating: 4.8, successRate: 94, accreditation: "JCI", beds: 280, languages: ["English", "Arabic", "French"], airportKm: 18 },
  // Transplant — stub
  { id: "h-t1", specialty: "transplant", name: "LifeSpring Transplant Centre", sub: "Delhi · NOTTO-approved", city: "Delhi", priceFrom: 14000, rating: 4.9, successRate: 97, accreditation: "JCI", beds: 350, languages: ["English", "Arabic", "French"], airportKm: 16 },
  // Fertility — stub
  { id: "h-f1", specialty: "fertility", name: "Bloom Fertility Clinic", sub: "Mumbai · 60%+ IVF success rate", city: "Mumbai", priceFrom: 3800, rating: 4.5, successRate: 60, accreditation: "NABH", beds: 80, languages: ["English", "Hindi"], airportKm: 10 },
  // Cosmetic — stub
  { id: "h-s1", specialty: "cosmetic", name: "Radiance Aesthetic Centre", sub: "Mumbai · international clientele", city: "Mumbai", priceFrom: 2800, rating: 4.4, successRate: 94, accreditation: "NABH", beds: 60, languages: ["English", "Hindi"], airportKm: 14 },
];

export const DOCTORS: SeedDoctor[] = [
  // Cardiac — fully populated
  { id: "d-c1", specialty: "cardiac", name: "Dr. Arun Verma", hospitalId: "h-c1", title: "Interventional cardiologist", city: "Delhi", experienceYrs: 24, proceduresDone: 6000, rating: 4.9, languages: ["English", "Arabic", "Hindi"], nextAvailable: "Within 1 week" },
  { id: "d-c2", specialty: "cardiac", name: "Dr. Meera Nair", hospitalId: "h-c2", title: "Cardiologist", city: "Bengaluru", experienceYrs: 18, proceduresDone: 4200, rating: 4.7, languages: ["English", "Arabic", "Hindi"], nextAvailable: "Within 1 week" },
  { id: "d-c3", specialty: "cardiac", name: "Dr. S. Krishnan", hospitalId: "h-c5", title: "Sr. cardiac surgeon", city: "Chennai", experienceYrs: 27, proceduresDone: 8500, rating: 4.8, languages: ["English", "French", "Hindi"], nextAvailable: "Within 2 weeks" },
  { id: "d-c4", specialty: "cardiac", name: "Dr. Faisal Khan", hospitalId: "h-c3", title: "Interventional cardiologist", city: "Delhi", experienceYrs: 15, proceduresDone: 3200, rating: 4.6, languages: ["English", "Arabic", "Hindi"], nextAvailable: "Within 1 week" },
  { id: "d-c5", specialty: "cardiac", name: "Dr. Priya Rao", hospitalId: "h-c4", title: "Cardiologist", city: "Bengaluru", experienceYrs: 12, proceduresDone: 2800, rating: 4.5, languages: ["English", "Hindi"], nextAvailable: "Within 3 days" },
  // Oncology — stub
  { id: "d-o1", specialty: "oncology", name: "Dr. Vivek Sharma", hospitalId: "h-o1", title: "Medical oncologist", city: "Mumbai", experienceYrs: 20, proceduresDone: 5000, rating: 4.7, languages: ["English", "Hindi"], nextAvailable: "Within 1 week" },
  // Orthopaedics — stub
  { id: "d-r1", specialty: "orthopaedics", name: "Dr. Rajesh Iyer", hospitalId: "h-r1", title: "Joint replacement surgeon", city: "Delhi", experienceYrs: 22, proceduresDone: 5500, rating: 4.7, languages: ["English", "Arabic"], nextAvailable: "Within 1 week" },
  // Neuro — stub
  { id: "d-n1", specialty: "neuro", name: "Dr. Lakshmi Devi", hospitalId: "h-n1", title: "Neurosurgeon", city: "Chennai", experienceYrs: 19, proceduresDone: 3800, rating: 4.8, languages: ["English", "Arabic", "French"], nextAvailable: "Within 2 weeks" },
  // Transplant — stub
  { id: "d-t1", specialty: "transplant", name: "Dr. Sanjay Gupta", hospitalId: "h-t1", title: "Transplant surgeon", city: "Delhi", experienceYrs: 25, proceduresDone: 2200, rating: 4.9, languages: ["English", "Arabic", "French"], nextAvailable: "Within 2 weeks" },
  // Fertility — stub
  { id: "d-f1", specialty: "fertility", name: "Dr. Anita Desai", hospitalId: "h-f1", title: "Reproductive endocrinologist", city: "Mumbai", experienceYrs: 16, proceduresDone: 4000, rating: 4.5, languages: ["English", "Hindi"], nextAvailable: "Within 1 week" },
  // Cosmetic — stub
  { id: "d-s1", specialty: "cosmetic", name: "Dr. Karan Mehta", hospitalId: "h-s1", title: "Plastic surgeon", city: "Mumbai", experienceYrs: 14, proceduresDone: 3500, rating: 4.4, languages: ["English", "Hindi"], nextAvailable: "Within 3 days" },
];
