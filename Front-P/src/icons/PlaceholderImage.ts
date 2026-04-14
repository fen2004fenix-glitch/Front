// src/icons/PlaceholderImage.ts
// Экспортируем плейсхолдер SVG как data URL, чтобы вынести SVG-in-JS из компонента
export const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'>
     <rect width='100%' height='100%' fill='#f3f7ff'/>
     <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#345' font-family='Arial' font-size='14'>
       Image not provided
     </text>
   </svg>`
);
