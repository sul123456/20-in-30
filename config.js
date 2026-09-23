// =====================================================================
// Tracker structure. Edit here to change weights or labels.
// Status OPTIONS (Pending, Done, ...) live in the Supabase table
// `stage_statuses` — change those in Supabase, not here.
// =====================================================================

export const APP_TITLE = "20 in 30 Project Tracker";

// Workflow steps, in the same order as the Excel "Detailed status of films" columns.
// `col` must match the column name in public.videos.
// weight = % of completion earned when the step is Done (must total 100).
// Script closure (Brand + Product + BCO script approval) = 20% together;
// the other 8 steps share the remaining 80% equally (10% each).
export const STAGES = [
  { col: "stage_agreement",      label: "Agency agreement status",   short: "Agency agreement",  group: "Agency setup",   weight: 10 },
  { col: "stage_ai_addendum",    label: "Agency AI Addendum status", short: "AI Addendum",       group: "Agency setup",   weight: 10 },
  { col: "stage_onboarding",     label: "Agency Onboarding status",  short: "Agency onboarding", group: "Agency setup",   weight: 10 },
  { col: "stage_brand_script",   label: "Brand Script approval",     short: "Brand script",      group: "Script closure", weight: 20 / 3 },
  { col: "stage_product_script", label: "Product Script Approval",   short: "Product script",    group: "Script closure", weight: 20 / 3 },
  { col: "stage_bco_script",     label: "BCO Script approval",       short: "BCO script",        group: "Script closure", weight: 20 / 3 },
  { col: "stage_storyboarding",  label: "Storyboarding",             short: "Storyboarding",     group: "Production",     weight: 10 },
  { col: "stage_legal",          label: "Self Legal Approval",       short: "Self legal",        group: "Production",     weight: 10 },
  { col: "stage_first_cut",      label: "1st cut",                   short: "1st cut",           group: "Production",     weight: 10 },
  { col: "stage_final_cut",      label: "Final cut",                 short: "Final cut",         group: "Production",     weight: 10 },
  { col: "stage_go_live",        label: "Go Live",                   short: "Go Live",           group: "Production",     weight: 10 },
];

// Duration options in seconds (the Excel "Duration" 15 / 20 / 30 / 40 columns).
export const DURATIONS = [15, 20, 30, 40];

// Dropdown fields that learn new values as people type them.
export const LIST_FIELDS = [
  { col: "product",       label: "Product" },
  { col: "usage",         label: "Usage" },
  { col: "maker",         label: "Maker" },
  { col: "agency",        label: "Agency" },
  { col: "digital_fpr",   label: "Digital FPR" },
  { col: "brand_checker", label: "Brand Checker" },
];

// "Videos needing attention": flag unfinished videos not updated for this many days.
export const STALE_DAYS = 5;

// Used only if the stage_statuses table can't be read.
export const FALLBACK_STATUSES = [
  { name: "Pending", sort_order: 10, category: "pending" },
  { name: "In Progress", sort_order: 20, category: "progress" },
  { name: "Done", sort_order: 90, category: "done" },
];
