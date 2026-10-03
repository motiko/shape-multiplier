/** Built-in sample figures so the app has something to show before the first upload. */
export const SAMPLES: { name: string; svg: string }[] = [
  {
    name: "square",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80"/></svg>`,
  },
  {
    name: "star",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 61,38 97,38 68,59 79,92 50,72 21,92 32,59 3,38 39,38"/></svg>`,
  },
  {
    name: "leaf",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 95 C 10 70 10 30 50 5 C 90 30 90 70 50 95 Z M50 95 L50 5"/></svg>`,
  },
];
