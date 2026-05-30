/**
 * Generates a gradient thumbnail for project cards based on index
 * Returns a base64-encoded SVG data URL
 */
export const generateGradientThumbnail = (index: number): string => {
  const gradients = [
    { start: "#5a6eea", end: "#6b5dba" },
    { start: "#e083fb", end: "#e5576c" },
    { start: "#3facfe", end: "#00e2fe" },
    { start: "#3ce97b", end: "#2ff9d7" },
    { start: "#fa609a", end: "#fee040" },
    { start: "#98edea", end: "#fed6e3" },
    { start: "#ff8a9e", end: "#fecfef" },
    { start: "#ffecd2", end: "#fcb69f" },
  ];

  const gradient = gradients[index % gradients.length];

  const svgContent = `
    <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${gradient.start}" />
          <stop offset="100%" style="stop-color:${gradient.end}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svgContent)}`;
};
