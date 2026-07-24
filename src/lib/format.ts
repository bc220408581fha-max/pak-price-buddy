export function formatPKR(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  if (!Number.isFinite(n)) return "Rs 0";
  return "Rs " + Math.round(n).toLocaleString("en-PK");
}

export function daysAgo(iso: string): number {
  const then = new Date(iso).getTime();
  return Math.max(0, Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24)));
}

export function categorizeProduct(name: string): "Grocery" | "Dairy" | "Produce" | "Household" {
  const n = name.toLowerCase();
  const dairy = ["milk", "yogurt", "yoghurt", "dahi", "cheese", "butter", "ghee", "cream", "lassi", "paneer"];
  const produce = [
    "apple", "banana", "mango", "orange", "onion", "potato", "tomato", "garlic", "ginger",
    "lemon", "carrot", "cucumber", "chili", "chilli", "mirchi", "spinach", "palak",
    "cabbage", "cauliflower", "gobi", "peas", "grape", "watermelon", "papaya", "guava",
    "aloo", "pyaz", "tamatar", "sabzi", "vegetable", "fruit",
  ];
  const household = [
    "soap", "detergent", "surf", "shampoo", "toothpaste", "brush", "tissue", "towel",
    "bleach", "cleaner", "harpic", "vim", "phenyl", "matches", "battery", "bulb",
    "diaper", "pamper", "sanitary", "razor", "lotion",
  ];
  if (dairy.some((k) => n.includes(k))) return "Dairy";
  if (produce.some((k) => n.includes(k))) return "Produce";
  if (household.some((k) => n.includes(k))) return "Household";
  return "Grocery";
}
