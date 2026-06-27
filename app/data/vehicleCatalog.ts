export type VehicleCatalogItem = {
  brand: string;
  models: string[];
};

export const vehicleCatalog: VehicleCatalogItem[] = [
  {
    brand: "Toyota",
    models: [
      "Camry",
      "Corolla",
      "Land Cruiser",
      "Prado",
      "Hilux",
      "Yaris",
      "Rav4",
      "Fortuner",
      "Avalon",
      "Innova",
    ],
  },
  {
    brand: "Nissan",
    models: [
      "Patrol",
      "Sunny",
      "Altima",
      "X-Trail",
      "Navara",
      "Maxima",
      "Sentra",
      "Pathfinder",
      "Kicks",
    ],
  },
  {
    brand: "Hyundai",
    models: [
      "Accent",
      "Elantra",
      "Sonata",
      "Tucson",
      "Santa Fe",
      "Creta",
      "Azera",
      "H1",
    ],
  },
  {
    brand: "Kia",
    models: [
      "Sportage",
      "Sorento",
      "Cerato",
      "Rio",
      "Optima",
      "K5",
      "Carnival",
      "Pegas",
    ],
  },
  {
    brand: "Ford",
    models: [
      "Explorer",
      "Expedition",
      "F-150",
      "Taurus",
      "Edge",
      "Escape",
      "Mustang",
    ],
  },
  {
    brand: "Chevrolet",
    models: [
      "Tahoe",
      "Suburban",
      "Silverado",
      "Malibu",
      "Caprice",
      "Spark",
      "Camaro",
    ],
  },
  {
    brand: "GMC",
    models: [
      "Yukon",
      "Sierra",
      "Acadia",
      "Terrain",
      "Savana",
    ],
  },
  {
    brand: "Lexus",
    models: [
      "ES",
      "LS",
      "IS",
      "RX",
      "LX",
      "GX",
      "NX",
    ],
  },
  {
    brand: "Mercedes-Benz",
    models: [
      "C-Class",
      "E-Class",
      "S-Class",
      "GLE",
      "GLC",
      "G-Class",
      "Sprinter",
    ],
  },
  {
    brand: "BMW",
    models: [
      "3 Series",
      "5 Series",
      "7 Series",
      "X3",
      "X5",
      "X6",
      "X7",
    ],
  },
  {
    brand: "Honda",
    models: [
      "Accord",
      "Civic",
      "CR-V",
      "Pilot",
      "City",
      "Odyssey",
    ],
  },
  {
    brand: "Mazda",
    models: [
      "Mazda 3",
      "Mazda 6",
      "CX-3",
      "CX-5",
      "CX-9",
      "BT-50",
    ],
  },
  {
    brand: "Mitsubishi",
    models: [
      "Pajero",
      "Lancer",
      "Outlander",
      "Attrage",
      "L200",
      "ASX",
    ],
  },
  {
    brand: "Isuzu",
    models: [
      "D-Max",
      "MU-X",
      "N-Series",
      "F-Series",
    ],
  },
  {
    brand: "Other",
    models: ["Other"],
  },
];

export const vehicleBrands = vehicleCatalog.map((item) => item.brand);

export const getVehicleModelsByBrand = (brand?: string | null) => {
  if (!brand) return [];

  const selected = vehicleCatalog.find(
    (item) => item.brand.toLowerCase() === String(brand).trim().toLowerCase()
  );

  return selected?.models || [];
};