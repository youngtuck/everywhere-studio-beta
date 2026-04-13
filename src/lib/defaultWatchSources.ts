export interface WatchSource {
  name: string;
  type: "blog" | "newsletter" | "podcast" | "substack" | "publication";
  track: "competitor" | "thoughtLeader" | "techInfra" | "industry" | "general";
}

export const DEFAULT_SOURCES: WatchSource[] = [
  // Blogs
  { name: "Stratechery", type: "blog", track: "thoughtLeader" },
  { name: "Benedict Evans", type: "blog", track: "thoughtLeader" },
  { name: "Cal Newport's Blog", type: "blog", track: "thoughtLeader" },
  { name: "Daring Fireball", type: "blog", track: "techInfra" },
  { name: "Ribbonfarm", type: "blog", track: "thoughtLeader" },
  { name: "The Roots of Progress", type: "blog", track: "industry" },
  { name: "Simon Willison's Weblog", type: "blog", track: "techInfra" },
  { name: "Craig Mod", type: "blog", track: "thoughtLeader" },
  { name: "Anil Dash", type: "blog", track: "thoughtLeader" },
  { name: "Kottke.org", type: "blog", track: "general" },

  // Newsletters
  { name: "The Hustle", type: "newsletter", track: "industry" },
  { name: "The Generalist", type: "newsletter", track: "industry" },
  { name: "Stratechery Newsletter", type: "newsletter", track: "thoughtLeader" },
  { name: "The Diff", type: "newsletter", track: "industry" },
  { name: "New Things Under the Sun", type: "newsletter", track: "thoughtLeader" },
  { name: "Platformer", type: "newsletter", track: "techInfra" },
  { name: "The Browser", type: "newsletter", track: "general" },
  { name: "Citation Needed", type: "newsletter", track: "thoughtLeader" },
  { name: "Trust Insights", type: "newsletter", track: "industry" },
  { name: "Normal Tech", type: "newsletter", track: "techInfra" },

  // Podcasts
  { name: "All-In Podcast", type: "podcast", track: "industry" },
  { name: "Latent Space", type: "podcast", track: "techInfra" },
  { name: "The Knowledge Project", type: "podcast", track: "thoughtLeader" },
  { name: "Colossus", type: "podcast", track: "industry" },
  { name: "Acquired", type: "podcast", track: "industry" },
  { name: "The Psychology Podcast", type: "podcast", track: "thoughtLeader" },
  { name: "Huberman Lab", type: "podcast", track: "thoughtLeader" },
  { name: "Modern Wisdom", type: "podcast", track: "thoughtLeader" },
  { name: "Founders", type: "podcast", track: "thoughtLeader" },
  { name: "Conversations with Tyler", type: "podcast", track: "thoughtLeader" },
  { name: "80000 Hours Podcast", type: "podcast", track: "thoughtLeader" },
  { name: "The Talk Show", type: "podcast", track: "techInfra" },
  { name: "The Dwarkesh Podcast", type: "podcast", track: "thoughtLeader" },

  // Substacks
  { name: "Lenny's Newsletter", type: "substack", track: "industry" },
  { name: "Exponential View", type: "substack", track: "techInfra" },
  { name: "The Pragmatic Engineer", type: "substack", track: "techInfra" },
  { name: "Not Boring", type: "substack", track: "industry" },
  { name: "One Useful Thing", type: "substack", track: "techInfra" },
  { name: "Where's Your Ed At", type: "substack", track: "thoughtLeader" },
  { name: "Astral Codex Ten", type: "substack", track: "thoughtLeader" },
  { name: "Construction Physics", type: "substack", track: "industry" },
  { name: "Experimental History", type: "substack", track: "thoughtLeader" },
  { name: "Age of Invention", type: "substack", track: "thoughtLeader" },
  { name: "Liza Adams EnvisionIT", type: "substack", track: "industry" },
  { name: "Mark Sylvester", type: "substack", track: "thoughtLeader" },

  // Publications
  { name: "MIT Technology Review", type: "publication", track: "techInfra" },
  { name: "Works in Progress", type: "publication", track: "industry" },
  { name: "Six Colors", type: "publication", track: "techInfra" },
];

export const DEFAULT_KEYWORDS = [
  "AI adoption", "change management", "shadow AI", "AI governance",
  "fractional CAIO", "training retention", "nonprofit tech",
  "executive coaching", "thought leadership", "composed intelligence",
  "digital transformation", "AI readiness",
];

