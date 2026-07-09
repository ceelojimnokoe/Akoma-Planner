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

export interface ChecklistTemplateItem {
  title: string;
  category: string;
  daysBeforeWedding: number;
}

export const DEFAULT_CHECKLIST_TEMPLATE: ChecklistTemplateItem[] = [
  // Planning & Budget
  { title: "Set the wedding budget", category: "Planning & Budget", daysBeforeWedding: 365 },
  { title: "Agree on a wedding date with both families", category: "Planning & Budget", daysBeforeWedding: 365 },
  { title: "Decide the order of events: engagement, church, reception", category: "Planning & Budget", daysBeforeWedding: 340 },

  // Venue
  { title: "Book the reception venue", category: "Venue", daysBeforeWedding: 300 },
  { title: "Book the traditional/engagement venue", category: "Venue", daysBeforeWedding: 300 },

  // Guests
  { title: "Start a first-draft guest list", category: "Guests", daysBeforeWedding: 300 },
  { title: "Finalize the guest list", category: "Guests", daysBeforeWedding: 90 },
  { title: "Send invitations", category: "Guests", daysBeforeWedding: 60 },
  { title: "Confirm RSVPs", category: "Guests", daysBeforeWedding: 21 },

  // Traditional Rites
  { title: "Confirm bride-price / list items with the family linguist (okyeame)", category: "Traditional Rites", daysBeforeWedding: 240 },
  { title: "Agree the knocking/engagement date with both families", category: "Traditional Rites", daysBeforeWedding: 210 },
  { title: "Compile the traditional/engagement list (drinks, cloth, gifts)", category: "Traditional Rites", daysBeforeWedding: 210 },

  // Attire
  { title: "Order kente/cloth for both families", category: "Attire", daysBeforeWedding: 180 },
  { title: "First wedding dress fitting", category: "Attire", daysBeforeWedding: 150 },
  { title: "Shop for the groom's attire", category: "Attire", daysBeforeWedding: 120 },
  { title: "Book hair and makeup artist", category: "Attire", daysBeforeWedding: 45 },
  { title: "Final dress/suit fitting", category: "Attire", daysBeforeWedding: 14 },

  // Photography & Media
  { title: "Book photographer and videographer", category: "Photography & Media", daysBeforeWedding: 180 },
  { title: "Book MC, DJ and/or live band", category: "Photography & Media", daysBeforeWedding: 120 },

  // Catering
  { title: "Book caterer and confirm menu", category: "Catering", daysBeforeWedding: 150 },
  { title: "Order the wedding cake", category: "Catering", daysBeforeWedding: 45 },
  { title: "Confirm final headcount with caterer", category: "Catering", daysBeforeWedding: 14 },

  // Legal
  { title: "Start marriage ordinance / registry paperwork", category: "Legal", daysBeforeWedding: 90 },
  { title: "Complete marriage ordinance / registry paperwork", category: "Legal", daysBeforeWedding: 30 },

  // Accommodation
  { title: "Confirm accommodation for out-of-town family", category: "Accommodation", daysBeforeWedding: 30 },

  // Wedding Week
  { title: "Pack traditional list items for delivery", category: "Wedding Week", daysBeforeWedding: 7 },
  { title: "Confirm transport for the day", category: "Wedding Week", daysBeforeWedding: 5 },
  { title: "Rehearsal with wedding party", category: "Wedding Week", daysBeforeWedding: 3 },
  { title: "Delegate a day-of point of contact for each vendor", category: "Wedding Week", daysBeforeWedding: 1 },
];

export interface BuiltChecklistItem {
  title: string;
  category: string;
  dueDate: Date;
  isDefault: true;
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
  }));
}
