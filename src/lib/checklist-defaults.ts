// src/lib/checklist-defaults.ts
//
// The default checklist every new wedding plan starts with. Modeled on how
// Ghanaian weddings typically run as two linked events — the traditional/
// engagement rites (knocking, bride-price list, linguist/okyeame) and the
// white wedding/reception — rather than a generic Western checklist.
//
// Each template item stores `daysBeforeWedding` instead of a fixed date;
// buildDefaultChecklist() turns that into a real due date once we know the
// actual wedding date (at onboarding time, and again in the seed script).
//
// `priority` drives the Checklist page's priority badge and the Dashboard's
// "This week's focus" list. Reserved for genuinely critical-path items —
// things that block other tasks, have hard external deadlines, or are
// expensive/painful to fix late (HIGH); most tasks are MEDIUM; LOW is for
// things that are easy to do at the last minute with little consequence.

export type ChecklistPriority = "LOW" | "MEDIUM" | "HIGH";

export interface ChecklistTemplateItem {
  title: string;
  category: string;
  daysBeforeWedding: number;
  priority: ChecklistPriority;
}

export const DEFAULT_CHECKLIST_TEMPLATE: ChecklistTemplateItem[] = [
  // Planning & Budget
  { title: "Set the wedding budget", category: "Planning & Budget", daysBeforeWedding: 365, priority: "HIGH" },
  { title: "Agree on a wedding date with both families", category: "Planning & Budget", daysBeforeWedding: 365, priority: "HIGH" },
  { title: "Decide the order of events: engagement, church, reception", category: "Planning & Budget", daysBeforeWedding: 340, priority: "MEDIUM" },

  // Venue
  { title: "Book the reception venue", category: "Venue", daysBeforeWedding: 300, priority: "HIGH" },
  { title: "Book the traditional/engagement venue", category: "Venue", daysBeforeWedding: 300, priority: "MEDIUM" },

  // Guests
  { title: "Start a first-draft guest list", category: "Guests", daysBeforeWedding: 300, priority: "MEDIUM" },
  { title: "Finalize the guest list", category: "Guests", daysBeforeWedding: 90, priority: "HIGH" },
  { title: "Send invitations", category: "Guests", daysBeforeWedding: 60, priority: "MEDIUM" },
  { title: "Confirm RSVPs", category: "Guests", daysBeforeWedding: 21, priority: "MEDIUM" },

  // Traditional Rites
  { title: "Confirm bride-price / list items with the family linguist (okyeame)", category: "Traditional Rites", daysBeforeWedding: 240, priority: "HIGH" },
  { title: "Agree the knocking/engagement date with both families", category: "Traditional Rites", daysBeforeWedding: 210, priority: "MEDIUM" },
  { title: "Compile the traditional/engagement list (drinks, cloth, gifts)", category: "Traditional Rites", daysBeforeWedding: 210, priority: "MEDIUM" },

  // Attire
  { title: "Order kente/cloth for both families", category: "Attire", daysBeforeWedding: 180, priority: "MEDIUM" },
  { title: "First wedding dress fitting", category: "Attire", daysBeforeWedding: 150, priority: "MEDIUM" },
  { title: "Shop for the groom's attire", category: "Attire", daysBeforeWedding: 120, priority: "LOW" },
  { title: "Book hair and makeup artist", category: "Attire", daysBeforeWedding: 45, priority: "MEDIUM" },
  { title: "Final dress/suit fitting", category: "Attire", daysBeforeWedding: 14, priority: "MEDIUM" },

  // Photography & Media
  { title: "Book photographer and videographer", category: "Photography & Media", daysBeforeWedding: 180, priority: "HIGH" },
  { title: "Book MC, DJ and/or live band", category: "Photography & Media", daysBeforeWedding: 120, priority: "MEDIUM" },

  // Catering
  { title: "Book caterer and confirm menu", category: "Catering", daysBeforeWedding: 150, priority: "HIGH" },
  { title: "Order the wedding cake", category: "Catering", daysBeforeWedding: 45, priority: "LOW" },
  { title: "Confirm final headcount with caterer", category: "Catering", daysBeforeWedding: 14, priority: "HIGH" },

  // Legal
  { title: "Start marriage ordinance / registry paperwork", category: "Legal", daysBeforeWedding: 90, priority: "MEDIUM" },
  { title: "Complete marriage ordinance / registry paperwork", category: "Legal", daysBeforeWedding: 30, priority: "HIGH" },

  // Accommodation
  { title: "Confirm accommodation for out-of-town family", category: "Accommodation", daysBeforeWedding: 30, priority: "MEDIUM" },

  // Wedding Week
  { title: "Pack traditional list items for delivery", category: "Wedding Week", daysBeforeWedding: 7, priority: "LOW" },
  { title: "Confirm transport for the day", category: "Wedding Week", daysBeforeWedding: 5, priority: "MEDIUM" },
  { title: "Rehearsal with wedding party", category: "Wedding Week", daysBeforeWedding: 3, priority: "MEDIUM" },
  { title: "Delegate a day-of point of contact for each vendor", category: "Wedding Week", daysBeforeWedding: 1, priority: "LOW" },
];

export interface BuiltChecklistItem {
  title: string;
  category: string;
  dueDate: Date;
  isDefault: true;
  priority: ChecklistPriority;
}

/**
 * Turns the template above into concrete due dates for a specific wedding.
 * Used both by the onboarding flow (new wedding plan) and by prisma/seed.ts
 * (sample wedding) so the two never drift out of sync.
 */
export function buildDefaultChecklist(weddingDate: Date): BuiltChecklistItem[] {
  const oneDayMs = 24 * 60 * 60 * 1000;
  return DEFAULT_CHECKLIST_TEMPLATE.map((item) => ({
    title: item.title,
    category: item.category,
    dueDate: new Date(weddingDate.getTime() - item.daysBeforeWedding * oneDayMs),
    isDefault: true as const,
    priority: item.priority,
  }));
}
