export const scenarioTemplates = [
  {
    id: "community-workshop",
    title: "Choose a community-workshop plan",
    summary: "Choose between morning or afternoon, then choose a text or calendar reminder.",
  },
  {
    id: "library-meetup",
    title: "Plan a library meetup",
    summary: "Choose an early or late meetup time, then choose an optional reminder method.",
  },
  {
    id: "neighborhood-garden",
    title: "Plan a neighborhood garden visit",
    summary: "Choose Saturday or Sunday, then choose whether to bring a notebook or camera.",
  },
] as const;

export type ScenarioTemplateId = typeof scenarioTemplates[number]["id"];
