export const cn = (...classes: (string | false | undefined)[]) =>
  classes.filter(Boolean).join(" ");

export const ui = {
  // Surfaces
  page: "min-h-screen bg-base text-primary",
  card: "surface",
  cardInner: "surface-subtle",

  // Inputs
  input: "input",
  select: "input",

  // Buttons
  btnPrimary: "btn btn-primary",
  btnSecondary: "btn btn-secondary",
  btnDanger: "btn btn-danger",
  btnGhost: "btn btn-ghost",

  // Labels
  label: "field-label",
  labelSm: "text-muted text-xs",

  // Status badges
  badgeGreen: "badge badge-green",
  badgeAmber: "badge badge-amber",
  badgeSlate: "badge badge-neutral",

};