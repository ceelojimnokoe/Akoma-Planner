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
//
// `description` is real, written copy per default item — shown in the
// calendar's task-detail popup (see components/calendar/TaskDetailModal.tsx)
// alongside a separate, category-keyed "planning tip" from CATEGORY_TIPS
// below. Custom user-added tasks have no description (nullable on the
// ChecklistItem model) — this file only ever supplies one for the
// default template.

export type ChecklistPriority = "LOW" | "MEDIUM" | "HIGH";

export interface ChecklistTemplateItem {
  title: string;
  category: string;
  description: string;
  daysBeforeWedding: number;
  priority: ChecklistPriority;
}

export const DEFAULT_CHECKLIST_TEMPLATE: ChecklistTemplateItem[] = [
  // Planning & Budget
  {
    title: "Set the wedding budget",
    category: "Planning & Budget",
    description: "Agree on a realistic total figure with both families before committing to anything else — every other planning decision depends on this number.",
    daysBeforeWedding: 365,
    priority: "HIGH",
  },
  {
    title: "Agree on a wedding date with both families",
    category: "Planning & Budget",
    description: "Lock in a date both families can commit to, checking for major holidays, exam periods, or travel conflicts for key guests.",
    daysBeforeWedding: 365,
    priority: "HIGH",
  },
  {
    title: "Decide the order of events: engagement, church, reception",
    category: "Planning & Budget",
    description: "Map out how the traditional/engagement ceremony, church service, and reception fit together — same day, or spread across a weekend.",
    daysBeforeWedding: 340,
    priority: "MEDIUM",
  },

  // Venue
  {
    title: "Book the reception venue",
    category: "Venue",
    description: "Reserve your reception venue early — popular venues in Accra and Kumasi get booked 8-12 months out, especially in peak wedding season.",
    daysBeforeWedding: 300,
    priority: "HIGH",
  },
  {
    title: "Book the traditional/engagement venue",
    category: "Venue",
    description: "Confirm a venue for the knocking/engagement ceremony, ideally close to the bride's family home.",
    daysBeforeWedding: 300,
    priority: "MEDIUM",
  },

  // Guests
  {
    title: "Start a first-draft guest list",
    category: "Guests",
    description: "Draft a rough headcount split by side — this number drives your venue capacity, catering quantities, and budget.",
    daysBeforeWedding: 300,
    priority: "MEDIUM",
  },
  {
    title: "Finalize the guest list",
    category: "Guests",
    description: "Lock in final names and contacts before invitations go out — late additions get expensive fast.",
    daysBeforeWedding: 90,
    priority: "HIGH",
  },
  {
    title: "Send invitations",
    category: "Guests",
    description: "Send physical or digital invitations with enough lead time for guests to plan travel, especially those coming from abroad.",
    daysBeforeWedding: 60,
    priority: "MEDIUM",
  },
  {
    title: "Confirm RSVPs",
    category: "Guests",
    description: "Follow up with anyone who hasn't responded — caterers and venues need a firm headcount well before the day.",
    daysBeforeWedding: 21,
    priority: "MEDIUM",
  },

  // Traditional Rites
  {
    title: "Confirm bride-price / list items with the family linguist (okyeame)",
    category: "Traditional Rites",
    description: "Work with the family linguist (okyeame) to agree on the bride-price list items and quantities expected.",
    daysBeforeWedding: 240,
    priority: "HIGH",
  },
  {
    title: "Agree the knocking/engagement date with both families",
    category: "Traditional Rites",
    description: "Coordinate both families' calendars for the formal knocking/engagement ceremony date.",
    daysBeforeWedding: 210,
    priority: "MEDIUM",
  },
  {
    title: "Compile the traditional/engagement list (drinks, cloth, gifts)",
    category: "Traditional Rites",
    description: "Put together the full list of drinks, cloth, and gifts for the traditional ceremony, priced against your budget.",
    daysBeforeWedding: 210,
    priority: "MEDIUM",
  },

  // Attire
  {
    title: "Order kente/cloth for both families",
    category: "Attire",
    description: "Order or weave kente/cloth well ahead — quality pieces can take weeks to prepare, especially custom orders.",
    daysBeforeWedding: 180,
    priority: "MEDIUM",
  },
  {
    title: "First wedding dress fitting",
    category: "Attire",
    description: "Book your first fitting with enough runway left for alterations before the big day.",
    daysBeforeWedding: 150,
    priority: "MEDIUM",
  },
  {
    title: "Shop for the groom's attire",
    category: "Attire",
    description: "Source the groom's suit or traditional wear, coordinated with the overall wedding colors.",
    daysBeforeWedding: 120,
    priority: "LOW",
  },
  {
    title: "Book hair and makeup artist",
    category: "Attire",
    description: "Trial and book your hair/makeup artist — popular ones fill their calendars months in advance.",
    daysBeforeWedding: 45,
    priority: "MEDIUM",
  },
  {
    title: "Final dress/suit fitting",
    category: "Attire",
    description: "One last fitting close to the date to catch any final adjustments.",
    daysBeforeWedding: 14,
    priority: "MEDIUM",
  },

  // Photography & Media
  {
    title: "Book photographer and videographer",
    category: "Photography & Media",
    description: "Secure your photography/videography team early — the best ones book out a year ahead.",
    daysBeforeWedding: 180,
    priority: "HIGH",
  },
  {
    title: "Book MC, DJ and/or live band",
    category: "Photography & Media",
    description: "Lock in entertainment for the reception — confirm their set list and any special requests.",
    daysBeforeWedding: 120,
    priority: "MEDIUM",
  },

  // Catering
  {
    title: "Book caterer and confirm menu",
    category: "Catering",
    description: "Choose a caterer and finalize the menu, accounting for both traditional and reception-style dishes.",
    daysBeforeWedding: 150,
    priority: "HIGH",
  },
  {
    title: "Order the wedding cake",
    category: "Catering",
    description: "Order your cake with the baker, confirming flavor, size, and design.",
    daysBeforeWedding: 45,
    priority: "LOW",
  },
  {
    title: "Confirm final headcount with caterer",
    category: "Catering",
    description: "Give your caterer the final confirmed number so quantities and cost are accurate.",
    daysBeforeWedding: 14,
    priority: "HIGH",
  },

  // Legal
  {
    title: "Start marriage ordinance / registry paperwork",
    category: "Legal",
    description: "Begin the legal registration process — this can take weeks depending on your registry office.",
    daysBeforeWedding: 90,
    priority: "MEDIUM",
  },
  {
    title: "Complete marriage ordinance / registry paperwork",
    category: "Legal",
    description: "Finish all legal paperwork well before the ceremony to avoid last-minute stress.",
    daysBeforeWedding: 30,
    priority: "HIGH",
  },

  // Accommodation
  {
    title: "Confirm accommodation for out-of-town family",
    category: "Accommodation",
    description: "Book rooms for family and guests traveling from outside the city.",
    daysBeforeWedding: 30,
    priority: "MEDIUM",
  },

  // Wedding Week
  {
    title: "Pack traditional list items for delivery",
    category: "Wedding Week",
    description: "Pack and organize the traditional list items so they're ready for delivery on the day.",
    daysBeforeWedding: 7,
    priority: "LOW",
  },
  {
    title: "Confirm transport for the day",
    category: "Wedding Week",
    description: "Arrange transport for the wedding party and key family members for the day.",
    daysBeforeWedding: 5,
    priority: "MEDIUM",
  },
  {
    title: "Rehearsal with wedding party",
    category: "Wedding Week",
    description: "Walk through the day's schedule with your wedding party so everyone knows their role.",
    daysBeforeWedding: 3,
    priority: "MEDIUM",
  },
  {
    title: "Delegate a day-of point of contact for each vendor",
    category: "Wedding Week",
    description: "Assign someone other than the couple to handle each vendor's questions on the day itself.",
    daysBeforeWedding: 1,
    priority: "LOW",
  },
];

/**
 * A short, general planning tip per category — separate from each
 * item's own `description` above, and not stored on ChecklistItem at
 * all (not user-editable, purely contextual copy for the calendar's
 * task-detail popup). Keyed by category name, same strings used
 * throughout DEFAULT_CHECKLIST_TEMPLATE.
 */
export const CATEGORY_TIPS: Record<string, string> = {
  "Planning & Budget": "Revisit your budget every few months — costs for venues and vendors tend to creep up as your date approaches.",
  Venue: "Visit potential venues in person and ask about backup plans for weather if any part of the celebration is outdoors.",
  Guests: "Build in a buffer — Ghanaian wedding attendance often runs 10-20% over RSVP'd numbers, especially on the traditional side.",
  "Traditional Rites": "Involve both families' elders early — traditional rites vary by ethnic group, and getting the details right matters.",
  Attire: "Order custom pieces (kente, tailored suits) with extra lead time — fabric sourcing and tailoring can take longer than expected.",
  "Photography & Media": "Ask to see a full wedding gallery, not just a highlight reel, before booking any photographer or videographer.",
  Catering: "Always request a tasting before finalizing your menu, and confirm how dietary restrictions are handled.",
  Legal: "Registry office processing times vary — start early so paperwork isn't a bottleneck close to the date.",
  Accommodation: "Book rooms in blocks where possible — many hotels offer group rates for wedding parties.",
  "Wedding Week": "Delegate as much as you can this week — you and your partner should be enjoying the final stretch, not managing logistics.",
};

export interface BuiltChecklistItem {
  title: string;
  category: string;
  description: string;
  dueDate: Date;
  isDefault: true;
  priority: ChecklistPriority;
}

/**
 * Turns the template above into concrete due dates for a specific wedding.
 * Used both by the onboarding flow (new wedding plan) and by prisma/seed.ts
 * (sample wedding) so the two never drift out of sync.
 *
 * `daysBeforeWedding` is a fixed calendar offset, but the real planning
 * window between `today` and `weddingDate` is rarely the template's full
 * 365 days — an engagement under a year old would otherwise get tasks
 * born already overdue. Instead each item's offset is normalized against
 * the template's own largest offset into a 0-1 position (how far through
 * the planning arc it conceptually sits), then that position is mapped
 * onto the *actual* remaining window. This preserves the template's
 * relative ordering while guaranteeing every due date lands within
 * [today, weddingDate] regardless of how long or short the engagement is.
 */
export function buildDefaultChecklist(weddingDate: Date, today: Date = new Date()): BuiltChecklistItem[] {
  const maxDaysBeforeWedding = Math.max(...DEFAULT_CHECKLIST_TEMPLATE.map((item) => item.daysBeforeWedding));
  const windowMs = Math.max(0, weddingDate.getTime() - today.getTime());

  return DEFAULT_CHECKLIST_TEMPLATE.map((item) => {
    const position = item.daysBeforeWedding / maxDaysBeforeWedding;
    const dueDateMs = weddingDate.getTime() - position * windowMs;
    const clampedMs = Math.min(weddingDate.getTime(), Math.max(today.getTime(), dueDateMs));
    return {
      title: item.title,
      category: item.category,
      description: item.description,
      dueDate: new Date(clampedMs),
      isDefault: true as const,
      priority: item.priority,
    };
  });
}
