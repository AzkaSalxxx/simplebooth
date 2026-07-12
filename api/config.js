// File: api/config.js

export default function handler(req, res) {
  const CONFIG = {
    brand: "Make it Simple",
    markerColor: "#00FFFF",
    tolerance: 35,
    countdown: 3,
    quality: 1,
    mirror: true,
    peaceCapture: true,
    peaceDelay: 1400,
    defaultLayout: "4",
    defaultTemplate: { "2": "f2w", "3": "f3w", "4": "f4w", "6": "default-6", "4v2": "default-4v2", "6v2": "default-6v2" },
    layouts: {
      "2": { name: "Strip 2 Foto", photoCount: 2, width: 800, height: 1500 },
      "3": { name: "Strip 3 Foto", photoCount: 3, width: 800, height: 1900 },
      "4": { name: "Strip 4 Foto", photoCount: 4, width: 800, height: 2300 },
      "6": { name: "Strip 6 Foto", photoCount: 6, width: 800, height: 3200 },
      "4v2": { name: "Strip 4V2", photoCount: 4, width: 1200, height: 1800 },
      "6v2": { name: "Strip 6V2", photoCount: 6, width: 1200, height: 2200 }
    },
    templates: [
      { id: "f2w", name: "D2W", layout: "2", file: "assets/templates/f2w.png" },
      { id: "f2b", name: "D2B", layout: "2", file: "assets/templates/f2b.png" },
      { id: "f3w", name: "D3W", layout: "3", file: "assets/templates/f3w.png" },
      { id: "f3b", name: "D3B", layout: "3", file: "assets/templates/f3b.png" },
      { id: "f4w", name: "D4W", layout: "4", file: "assets/templates/f4w.png" },
      { id: "f4b", name: "D4B", layout: "4", file: "assets/templates/f4b.png" },
      { id: "default-6", name: "Default 6", layout: "6", file: "" },
      { id: "default-4v2", name: "Default 4V2", layout: "4v2", file: "" },
      { id: "default-6v2", name: "Default 6V2", layout: "6v2", file: "" },
      { id: "cute", name: "Cute Template", layout: "4", file: "assets/templates/cute.png" },
      { id: "01", name: "01", layout: "3", file: "assets/templates/01.png" },
    ]
  };

  // Setting cache agar API cepat diakses dan tidak membebani server Vercel
  res.setHeader('Cache-Control', 's-maxage=86400');
  res.status(200).json(CONFIG);
}
