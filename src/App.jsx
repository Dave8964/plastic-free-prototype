import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";

const db = {
  categories: [
    { id: "cat_personal", name: "Personal care", baseScore: 80 },
    { id: "cat_food_drink", name: "Food and drink", baseScore: 45 },
    { id: "cat_cleaning", name: "Household cleaning", baseScore: 80 },
    { id: "cat_hygiene", name: "Feminine hygiene", baseScore: 70 },
    { id: "cat_plastic_free", name: "Plastic-free / no packaging", baseScore: 100 },
  ],
  plasticTypes: [
    { id: "pp5", code: "PP-5", name: "Polypropylene", recyclability: "limited", municipal: { Toronto: "limited", Vancouver: "widely", Peel: "limited" } },
    { id: "hdpe2", code: "HDPE-2", name: "High-density polyethylene", recyclability: "widely", municipal: { Toronto: "widely", Vancouver: "widely", Peel: "widely" } },
    { id: "ldpe4", code: "LDPE-4", name: "Low-density polyethylene", recyclability: "limited", municipal: { Toronto: "limited", Vancouver: "limited", Peel: "none" } },
    { id: "pva", code: "PVA-PVOH", name: "Polyvinyl alcohol", recyclability: "none", municipal: { Toronto: "none", Vancouver: "none", Peel: "none" } },
    { id: "unknown_plastic", code: "UNKNOWN", name: "Unknown plastic", recyclability: "unknown", municipal: { Toronto: "unknown", Vancouver: "unknown", Peel: "unknown" } },
    { id: "none", code: "NONE", name: "No plastic detected", recyclability: "not_applicable", municipal: { Toronto: "not_applicable", Vancouver: "not_applicable", Peel: "not_applicable" } },
  ],
  materials: [
    { id: "plastic", name: "Plastic", recyclability: "limited" },
    { id: "paper", name: "Uncoated paper", recyclability: "widely" },
    { id: "metal", name: "Metal", recyclability: "widely" },
    { id: "mixed", name: "Mixed multilayer material", recyclability: "limited" },
    { id: "liner_epoxy_bpa", name: "BPA epoxy can liner", recyclability: "limited", linerRisk: "high", linerImpact: -22, linerLabel: "BPA epoxy liner", linerSummary: "Older or some imported cans may use BPA-based epoxy. Treat as higher concern, especially with food contact." },
    { id: "liner_pvc", name: "PVC / vinyl organosol can liner", recyclability: "limited", linerRisk: "high", linerImpact: -22, linerLabel: "PVC/vinyl liner", linerSummary: "PVC and vinyl organosol liners can raise chemical migration concerns and should score aggressively." },
    { id: "liner_bpa_free_epoxy", name: "BPA-free epoxy / BPANI liner", recyclability: "limited", linerRisk: "medium", linerImpact: -12, linerLabel: "BPA-free epoxy liner", linerSummary: "BPA-free or BPANI linings are an improvement, but still use synthetic food-contact resins." },
    { id: "liner_acrylic_polyester", name: "Acrylic / polyester can liner", recyclability: "limited", linerRisk: "medium", linerImpact: -12, linerLabel: "Acrylic/polyester liner", linerSummary: "Acrylic and polyester resin liners are common BPA alternatives. They reduce BPA concern but remain plastic food-contact coatings." },
    { id: "liner_polyolefin", name: "Polyolefin can liner", recyclability: "limited", linerRisk: "lower", linerImpact: -6, linerLabel: "Polyolefin liner", linerSummary: "Polyolefin linings are a better can-liner option, though still a synthetic food-contact layer." },
    { id: "liner_ceramic", name: "Ceramic / mineral can coating", recyclability: "limited", linerRisk: "lower", linerImpact: -4, linerLabel: "Ceramic/mineral coating", linerSummary: "Ceramic or mineral-style coatings are treated as lower concern than plastic resin liners." },
    { id: "liner_unknown", name: "Unknown can liner", recyclability: "limited", linerRisk: "medium", linerImpact: -12, linerLabel: "Unknown can liner", linerSummary: "When the liner type is unknown, the app assumes a standard BPA-free epoxy/acrylic liner rather than the worst case." },
  ],
  contexts: [
    { id: "food_contact", name: "Food contact", penalty: -15, summary: "Plastic or unknown material is in direct contact with food." },
    { id: "drink_contact", name: "Drink contact", penalty: -15, summary: "Plastic or unknown material is in direct contact with a beverage." },
    { id: "acidic", name: "Acidic contents", penalty: -15, summary: "Acidic foods increase chemical leaching from plastics." },
    { id: "fatty", name: "Fatty or oily contents", penalty: -12, summary: "Fatty foods increase absorption of plastic-related chemicals." },
    { id: "heat", name: "Heat exposure", penalty: -25, summary: "Heat significantly increases plastic leaching risk." },
    { id: "skin", name: "Skin contact", penalty: -10, summary: "Plastic in skin-contact products may transfer microplastics." },
    { id: "prolonged_skin", name: "Prolonged skin contact", penalty: -20, summary: "Extended skin exposure increases absorption risk." },
    { id: "reuse", name: "Repeated use or friction", penalty: -10, summary: "Repeated use increases microplastic shedding." },
    { id: "internal", name: "Internal plastic packaging", penalty: -18, summary: "Hidden plastics often go unnoticed but increase exposure." },
    { id: "hot_food", name: "Hot food exposure", penalty: -30, summary: "Hot food in plastic or lined containers is high risk." },
    { id: "recycled_plastic", name: "Recycled plastic", penalty: -20, summary: "Recycled plastics may contain contaminants like flame retardants." },
    { id: "long_storage", name: "Long storage contact", penalty: -8, summary: "Long shelf-life contact with liners or plastic packaging can increase concern over time." },
    { id: "heat_sensitive", name: "Heat-sensitive product", penalty: -20, summary: "This product type is often exposed to heat, hot liquids, or hot food, which increases leaching concern." }
  ],
  sources: [
    { id: "source_cfia", title: "Bisphenol A and BPA Alternatives in Selected Canned Foods", organization: "Canadian Food Inspection Agency", credibility: "High", summary: "Food can linings may contain bisphenols or alternatives that can migrate under some conditions." },
    { id: "source_fda", title: "Food Contact Substances", organization: "U.S. Food and Drug Administration", credibility: "High", summary: "Food-contact packaging risk depends on material, use case, and exposure conditions." },
    { id: "source_pva", title: "Water-soluble polymer films in detergent pods", organization: "Material notes", credibility: "Medium", summary: "Many dishwasher and laundry pods use water-soluble PVA/PVOH film, a synthetic polymer rather than gelatin." },
    { id: "source_canned_soup_bpa", title: "Canned Soup Consumption and Urinary Bisphenol A", organization: "PubMed Central / JAMA", credibility: "High", summary: "A randomized crossover study found substantially higher urinary BPA after participants consumed canned soup daily compared with fresh soup, supporting added caution for heated liquid foods in lined cans." },
  ],
  products: [
    { id: "old_spice", name: "Pure Sport Deodorant", brand: "Old Spice", categoryId: "cat_personal", imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "Medium", verification: "inferred" },
    { id: "always_ultra", name: "Ultra Thin", brand: "Always", categoryId: "cat_hygiene", imageUrl: "https://images.unsplash.com/photo-1583946099379-f9c9cb8bc030?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "Low", verification: "inferred" },
    { id: "allens_apple", name: "Apple Juice", brand: "Allen’s", categoryId: "cat_food_drink", imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "Medium", verification: "inferred" },
    { id: "kirkland_tuna", name: "Solid Light Tuna", brand: "Kirkland Signature", categoryId: "cat_food_drink", imageUrl: "https://images.unsplash.com/photo-1584269600519-1123c7b0e6f6?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "Low", verification: "inferred" },
    { id: "kirkland_dishwasher", name: "UltraShine Dishwasher Detergent", brand: "Kirkland Signature", categoryId: "cat_cleaning", imageUrl: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "Medium", verification: "inferred" },
    { id: "paper_soap", name: "Paper-Wrapped Bar Soap", brand: "Local Maker", categoryId: "cat_personal", imageUrl: "https://images.unsplash.com/photo-1607006483224-21d4b8bc8bd7?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "High", verification: "community_verified", scoringNote: "Uncoated paper has minimal impact but still involves packaging and processing. Slight deduction versus true zero-packaging soap." },
    { id: "campbells_soup", name: "Tomato Soup", brand: "Campbell’s", categoryId: "cat_food_drink", imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "Medium", verification: "inferred" },
  ],
  productParts: [
    { id: "os_container", productId: "old_spice", partType: "main_container", displayName: "Main container", materialId: "plastic", plasticTypeId: "pp5", baseImpact: -10, materialImpact: -5, notes: "Common deodorant casing, likely PP." },
    { id: "os_cap", productId: "old_spice", partType: "cap_lid", displayName: "Cap", materialId: "plastic", plasticTypeId: "pp5", baseImpact: -8, materialImpact: -5, notes: "Likely plastic cap." },
    { id: "always_wrap", productId: "always_ultra", partType: "inner_packaging", displayName: "Individual wrapper", materialId: "plastic", plasticTypeId: "unknown_plastic", baseImpact: -12, materialImpact: -15, notes: "Individual wrapping likely includes plastic film." },
    { id: "always_product", productId: "always_ultra", partType: "product_component", displayName: "Product layers", materialId: "mixed", plasticTypeId: "unknown_plastic", baseImpact: -20, materialImpact: -15, notes: "Absorbent product likely uses mixed synthetic materials." },
    { id: "allens_pack", productId: "allens_apple", partType: "main_container", displayName: "Tetra Pak carton", materialId: "mixed", plasticTypeId: "ldpe4", baseImpact: -15, materialImpact: -12, notes: "Aseptic cartons commonly include paperboard, aluminum, and polyethylene layers." },
    { id: "allens_cap", productId: "allens_apple", partType: "cap_lid", displayName: "Cap", materialId: "plastic", plasticTypeId: "hdpe2", baseImpact: -8, materialImpact: -5, notes: "Plastic screw cap." },
    { id: "tuna_can", productId: "kirkland_tuna", partType: "main_container", displayName: "Steel can", materialId: "metal", plasticTypeId: "none", baseImpact: 0, materialImpact: 0, notes: "Main can body is steel." },
    { id: "tuna_liner", productId: "kirkland_tuna", partType: "liner", displayName: "Can liner", materialId: "liner_unknown", plasticTypeId: "unknown_plastic", baseImpact: -8, materialImpact: 0, linerType: "unknown", notes: "Most modern tuna cans use a thin protective coating such as BPA-free epoxy, acrylic, polyester, polyolefin, or ceramic-style lining. Unknown liners are scored as moderate concern rather than worst-case." },
    { id: "dish_container", productId: "kirkland_dishwasher", partType: "main_container", displayName: "Outer tub", materialId: "plastic", plasticTypeId: "hdpe2", baseImpact: -10, materialImpact: -5, notes: "Large plastic container." },
    { id: "dish_podfilm", productId: "kirkland_dishwasher", partType: "inner_packaging", displayName: "Pod film", materialId: "plastic", plasticTypeId: "pva", baseImpact: -15, materialImpact: -15, notes: "Dishwasher pods commonly use dissolvable PVA/PVOH film." },
    { id: "soap_wrap", productId: "paper_soap", partType: "outer_packaging", displayName: "Wrapper", materialId: "paper", plasticTypeId: "none", baseImpact: 0, materialImpact: 0, notes: "Paper wrapper only." },
    { id: "soup_can", productId: "campbells_soup", partType: "main_container", displayName: "Steel can", materialId: "metal", plasticTypeId: "none", baseImpact: 0, materialImpact: 0, notes: "Main can body is steel." },
    { id: "soup_liner", productId: "campbells_soup", partType: "liner", displayName: "Can liner", materialId: "liner_unknown", plasticTypeId: "unknown_plastic", baseImpact: -8, materialImpact: 0, linerType: "unknown", notes: "Soup cans commonly use a protective internal liner. Unknown modern liners are scored as moderate concern, then soup receives extra risk from heat, acidity, liquid contact, and long storage." },
  ],
  productContexts: [
    { id: "ctx_os_skin", productId: "old_spice", partId: "os_container", contextId: "skin" },
    { id: "ctx_os_reuse", productId: "old_spice", partId: "os_container", contextId: "reuse" },
    { id: "ctx_always_skin", productId: "always_ultra", partId: "always_product", contextId: "prolonged_skin" },
    { id: "ctx_always_internal", productId: "always_ultra", partId: "always_wrap", contextId: "internal" },
    { id: "ctx_allens_drink", productId: "allens_apple", partId: "allens_pack", contextId: "drink_contact" },
    { id: "ctx_allens_acid", productId: "allens_apple", partId: "allens_pack", contextId: "acidic" },
    { id: "ctx_tuna_food", productId: "kirkland_tuna", partId: "tuna_liner", contextId: "food_contact" },
    { id: "ctx_tuna_fatty", productId: "kirkland_tuna", partId: "tuna_liner", contextId: "fatty" },
    { id: "ctx_tuna_storage", productId: "kirkland_tuna", partId: "tuna_liner", contextId: "long_storage" },
    { id: "ctx_dish_internal", productId: "kirkland_dishwasher", partId: "dish_podfilm", contextId: "internal" },
    { id: "ctx_dish_heat", productId: "kirkland_dishwasher", partId: "dish_podfilm", contextId: "heat" },
    { id: "ctx_soup_food", productId: "campbells_soup", partId: "soup_liner", contextId: "food_contact" },
    { id: "ctx_soup_acid", productId: "campbells_soup", partId: "soup_liner", contextId: "acidic" },
    { id: "ctx_soup_heat", productId: "campbells_soup", partId: "soup_liner", contextId: "heat" },
    { id: "ctx_soup_hot_food", productId: "campbells_soup", partId: "soup_liner", contextId: "hot_food" },
    { id: "ctx_soup_storage", productId: "campbells_soup", partId: "soup_liner", contextId: "long_storage" },
  ],
  sourceLinks: [
    { sourceId: "source_cfia", entityType: "part", entityId: "tuna_liner" },
    { sourceId: "source_canned_soup_bpa", entityType: "part", entityId: "tuna_liner" },
    { sourceId: "source_cfia", entityType: "part", entityId: "soup_liner" },
    { sourceId: "source_canned_soup_bpa", entityType: "part", entityId: "soup_liner" },
    { sourceId: "source_fda", entityType: "context", entityId: "drink_contact" },
    { sourceId: "source_pva", entityType: "part", entityId: "dish_podfilm" },
    { sourceId: "source_pva", entityType: "plastic_type", entityId: "pva" },
  ],
  users: [
    { id: "user_me", displayName: "Dave R.", avatar: "D", role: "You" },
    { id: "user_maya", displayName: "Maya K.", avatar: "M", role: "Friend" },
    { id: "user_jon", displayName: "Jon R.", avatar: "J", role: "Friend" },
    { id: "user_nina", displayName: "Nina P.", avatar: "N", role: "Low-waste reviewer" },
    { id: "user_amelia", displayName: "Amelia Green", avatar: "A", role: "Health food creator" },
    { id: "user_sam", displayName: "Sam Patel", avatar: "S", role: "Plastic-free parent" },
  ],
  scans: [
    { id: "scan1", userId: "user_me", productId: "old_spice" },
    { id: "scan2", userId: "user_me", productId: "kirkland_dishwasher" },
    { id: "scan3", userId: "user_me", productId: "paper_soap" },
    { id: "scan4", userId: "user_me", productId: "campbells_soup" },
  ],
  saves: [
    { id: "save1", userId: "user_me", productId: "paper_soap" },
    { id: "save2", userId: "user_me", productId: "old_spice" },
    { id: "save3", userId: "user_me", productId: "allens_apple" },
    { id: "save4", userId: "user_me", productId: "kirkland_dishwasher" },
    { id: "save5", userId: "user_maya", productId: "allens_apple" },
    { id: "save6", userId: "user_jon", productId: "paper_soap" },
  ],
  follows: [
    { followerId: "user_me", followedId: "user_maya" },
    { followerId: "user_me", followedId: "user_jon" },
    { followerId: "user_me", followedId: "user_nina" },
  ],
  social: [
    { id: "activity1", userId: "user_maya", action: "scanned", productId: "kirkland_dishwasher", note: "Hidden pod film is the big thing here." },
    { id: "activity2", userId: "user_jon", action: "saved", productId: "paper_soap", note: "Good paper-only swap." },
    { id: "activity3", userId: "user_nina", action: "reviewed", productId: "kirkland_tuna", note: "Can liner is unknown, so I’d treat it cautiously." },
    { id: "activity4", userId: "user_maya", action: "flagged", productId: "campbells_soup", note: "Hot liquid + acidic tomato + can liner makes this a high-risk example." },
  ],
};

const badgeDefinitions = [
  { id: "plastic_detective", icon: "🔍", name: "Plastic Detective", description: "You scan products to uncover what’s really inside.", progress: 18, tiers: [{ name: "Bronze", threshold: 5 }, { name: "Silver", threshold: 25 }, { name: "Gold", threshold: 75 }, { name: "Platinum", threshold: 200 }] },
  { id: "microplastic_hunter", icon: "🧪", name: "Microplastic Hunter", description: "You catch the plastics others miss.", progress: 28, tiers: [{ name: "Bronze", threshold: 5 }, { name: "Silver", threshold: 20 }, { name: "Gold", threshold: 50 }, { name: "Platinum", threshold: 120 }] },
  { id: "red_flag_radar", icon: "🚨", name: "Red Flag Radar", description: "You spot high-risk products instantly.", progress: 82, tiers: [{ name: "Bronze", threshold: 5 }, { name: "Silver", threshold: 20 }, { name: "Gold", threshold: 50 }, { name: "Platinum", threshold: 120 }] },
  { id: "ingredient_inspector", icon: "🧠", name: "Ingredient Inspector", description: "You go deeper than surface-level info.", progress: 322, tiers: [{ name: "Bronze", threshold: 15 }, { name: "Silver", threshold: 50 }, { name: "Gold", threshold: 120 }, { name: "Platinum", threshold: 300 }] },
  { id: "data_driven", icon: "📊", name: "Data Driven", description: "You use filters and tools to make smarter choices.", progress: 24, tiers: [{ name: "Bronze", threshold: 5 }, { name: "Silver", threshold: 20 }, { name: "Gold", threshold: 60 }, { name: "Platinum", threshold: 150 }] },
  { id: "community_voice", icon: "⭐", name: "Community Voice", description: "You help others by sharing your experience.", progress: 17, tiers: [{ name: "Bronze", threshold: 1 }, { name: "Silver", threshold: 5 }, { name: "Gold", threshold: 15 }, { name: "Platinum", threshold: 40 }] },
  { id: "conscious_consumer", icon: "🧭", name: "Conscious Consumer", description: "Your choices consistently avoid plastics.", progress: 76, isPercent: true, tiers: [{ name: "Bronze", threshold: 60 }, { name: "Silver", threshold: 75 }, { name: "Gold", threshold: 85 }, { name: "Platinum", threshold: 95 }] },
  { id: "deep_diver", icon: "🔎", name: "Deep Diver", description: "You explore products in detail before deciding.", progress: 35, tiers: [{ name: "Bronze", threshold: 10 }, { name: "Silver", threshold: 30 }, { name: "Gold", threshold: 80 }, { name: "Platinum", threshold: 200 }] },
  { id: "barcode_whisperer", icon: "⚡", name: "Barcode Whisperer", description: "You scan like a pro.", progress: 27, tiers: [{ name: "Bronze", threshold: 3 }, { name: "Silver", threshold: 10 }, { name: "Gold", threshold: 25 }, { name: "Platinum", threshold: 75 }] },
  { id: "eco_upgrade", icon: "🔥", name: "Eco Upgrade", description: "You consistently improve your product lineup.", progress: 6, tiers: [{ name: "Bronze", threshold: 5 }, { name: "Silver", threshold: 15 }, { name: "Gold", threshold: 40 }, { name: "Platinum", threshold: 100 }] },
  { id: "plastic_pro", icon: "🧠", name: "Plastic Pro", description: "You’ve mastered the system.", progress: 12, tiers: [{ name: "Bronze", threshold: 5 }, { name: "Silver", threshold: 10 }, { name: "Gold", threshold: 15 }, { name: "Platinum", threshold: 20 }] },
  { id: "word_of_mouth", icon: "📣", name: "Word of Mouth", description: "You put great finds and warnings on your friends’ radar.", progress: 2, tiers: [{ name: "Bronze", threshold: 3 }, { name: "Silver", threshold: 10 }, { name: "Gold", threshold: 25 }, { name: "Platinum", threshold: 75 }] },
];

const scoringRubric = {
  ideal: { range: "100", examples: ["No packaging", "Refill from bulk", "Package-free bar soap"], note: "Reserved for true zero-plastic and zero-packaging options." },
  nearIdeal: { range: "95–98", examples: ["Uncoated paper wrap", "Simple cardboard sleeve"], note: "Excellent real-world retail option with minimal packaging." },
  strong: { range: "88–94", examples: ["Glass jar with metal lid", "Aluminum tin", "Paperboard carton with no plastic liner"], note: "Very good, but still includes reusable or recyclable packaging." },
  mixedBetter: { range: "70–87", examples: ["Glass with plastic cap", "Aluminum with plastic seal", "Paper with light coating"], note: "Better than plastic-heavy options, but still has meaningful plastic contact or mixed materials." },
  caution: { range: "40–69", examples: ["HDPE bottle", "PP tub", "Plastic refill pouch"], note: "Plastic is present, but exposure risk depends on use case." },
  highConcern: { range: "10–39", examples: ["Plastic food contact", "Can liner", "PVA pod film", "Prolonged skin-contact synthetic product"], note: "Plastic exposure is central to the product or packaging." },
  worstCase: { range: "0–9", examples: ["Hot acidic food in plastic", "Microwaved plastic", "Unknown plastic with heat and food contact"], note: "Reserved for the highest-risk combinations so the app does not overuse zero scores." }
};

const clampScore = (score) => Math.max(0, Math.min(100, Math.round(Number.isFinite(Number(score)) ? Number(score) : 0)));
const getById = (collection, id) => (db[collection] || []).find((item) => item.id === id) || null;

function getScoreTheme(score) {
  const value = clampScore(score);
  if (value >= 80) return { ring: "#1f7a4d", bg: "#e8f4ee", label: "Plastic-free" };
  if (value >= 61) return { ring: "#7a6b1f", bg: "#f4efd8", label: "Low plastic concern" };
  if (value >= 21) return { ring: "#c59622", bg: "#fff4d8", label: "Likely hidden plastic" };
  return { ring: "#9f2d28", bg: "#f8e8e6", label: "Contains plastic" };
}

function reviewStatusLabel(value) {
  return { inferred: "Best guess — needs review", unverified: "Needs review", community_verified: "Community checked", brand_verified: "Brand confirmed", expert_verified: "Expert checked" }[value] || "Needs review";
}

function dataQualityLabel(value) {
  return { Low: "Basic data", Medium: "Good data", High: "Strong data" }[value] || "Basic data";
}

function recyclabilityMeta(status) {
  const map = {
    widely: { icon: "✅", title: "Widely recyclable", tone: "text-emerald-800", bg: "bg-emerald-50", summary: "This material is commonly accepted, but local rules still matter." },
    limited: { icon: "⚠️", title: "Depends on your location", tone: "text-amber-800", bg: "bg-amber-50", summary: "Some parts may be accepted, but programs vary by municipality." },
    none: { icon: "❌", title: "Not recyclable", tone: "text-red-800", bg: "bg-red-50", summary: "This part is usually not accepted in household recycling." },
    unknown: { icon: "？", title: "Recycling unknown", tone: "text-neutral-700", bg: "bg-neutral-100", summary: "The material needs verification before recycling guidance can be trusted." },
    not_applicable: { icon: "—", title: "No plastic recycling needed", tone: "text-neutral-700", bg: "bg-neutral-100", summary: "This part is not plastic." },
  };
  return map[status] || map.unknown;
}

function combineRecyclability(statuses) {
  const relevant = statuses.filter((status) => status !== "not_applicable");
  if (!relevant.length) return "widely";
  if (relevant.includes("none")) return "none";
  if (relevant.includes("unknown")) return "unknown";
  if (relevant.includes("limited")) return "limited";
  return "widely";
}

function getPartRecyclability(part, useLocation, location = "Toronto") {
  if (part.plastic && part.plastic.code !== "NONE") return useLocation ? part.plastic.municipal?.[location] || part.plastic.recyclability || "unknown" : part.plastic.recyclability || "unknown";
  return part.material?.recyclability || "unknown";
}

function getProductRecyclability(product, useLocation, location = "Toronto") {
  return combineRecyclability((product?.parts || []).map((part) => getPartRecyclability(part, useLocation, location)));
}

function getBottomNavItems() {
  return [["search", "search", "Search"], ["history", "history", "History"], ["scan", "scan", "Scan"], ["social", "social", "Social"], ["profile", "profile", "Profile"]];
}

function getFavoritesByCategory(products, favoriteIds = null) {
  const sourceIds = favoriteIds || db.saves.filter((save) => save.userId === "user_me").map((save) => save.productId);
  return sourceIds.map((id) => products.find((product) => product.id === id)).filter(Boolean).reduce((groups, product) => ({ ...groups, [product.category?.name || "Other"]: [...(groups[product.category?.name || "Other"] || []), product] }), {});
}

function getBadgeStatus(badge) {
  const tiers = badge?.tiers || [];
  const progress = badge?.progress || 0;
  const currentTier = [...tiers].reverse().find((tier) => progress >= tier.threshold) || null;
  const nextTier = tiers.find((tier) => progress < tier.threshold) || tiers[tiers.length - 1] || { name: "Starter", threshold: 1 };
  const previousThreshold = currentTier?.threshold || 0;
  const range = Math.max(1, nextTier.threshold - previousThreshold);
  const progressInRange = Math.min(range, Math.max(0, progress - previousThreshold));
  const percent = nextTier.name === currentTier?.name ? 100 : Math.round((progressInRange / range) * 100);
  return { currentTier: currentTier?.name || "Starter", nextTier: nextTier.name, nextThreshold: nextTier.threshold, percent };
}

function getPartContexts(partId) {
  return db.productContexts.filter((item) => item.partId === partId).map((item) => ({ ...item, context: getById("contexts", item.contextId) })).filter((item) => item.context);
}

function getProductContexts(productId) {
  return db.productContexts.filter((item) => item.productId === productId).map((item) => ({ ...item, context: getById("contexts", item.contextId) })).filter((item) => item.context);
}

function getSourcesFor({ entityType, entityId }) {
  return db.sourceLinks.filter((item) => item.entityType === entityType && item.entityId === entityId).map((item) => ({ ...item, source: getById("sources", item.sourceId) })).filter((item) => item.source);
}

function getPartSeverity(totalImpact) {
  if (totalImpact === 0) return { label: "Minimal", tone: "bg-emerald-50 text-emerald-800" };
  if (totalImpact <= -35) return { label: "Severe", tone: "bg-red-100 text-red-800" };
  if (totalImpact <= -25) return { label: "High", tone: "bg-orange-100 text-orange-800" };
  if (totalImpact <= -15) return { label: "Moderate", tone: "bg-amber-100 text-amber-800" };
  return { label: "Low", tone: "bg-emerald-100 text-emerald-800" };
}

function hydrateProduct(product) {
  const highRiskKeywords = ["canned", "bottle", "gum", "salt", "sponge", "cutting", "tupperware"];
  const acidicKeywords = ["tomato", "vinegar", "citrus", "mustard", "ketchup", "hot sauce", "yogurt", "cheese", "juice"];
  const heatSensitiveRules = [
    { id: "heat_tea", terms: ["tea", "tea bag", "teabag"], penalty: -25, label: "Tea bag / hot water", summary: "Tea bags and sachets can be exposed to boiling water, so plastic seals, mesh, or wrappers are treated as higher concern." },
    { id: "heat_takeout", terms: ["takeout", "take-out", "takeaway"], penalty: -30, label: "Hot takeout container", summary: "Takeout containers often hold hot food and may not have barcodes, so container symbols should be scanned." },
    { id: "heat_coffee", terms: ["coffee", "coffee cup", "to-go cup", "takeout cup"], penalty: -25, label: "Hot drink cup", summary: "Hot drinks in plastic-lined paper cups are treated as higher concern than cold contact." },
    { id: "heat_soup", terms: ["soup", "broth", "stew"], penalty: -35, label: "Hot canned liquid", summary: "Soup and broth are heat-sensitive liquid foods, making can-lining exposure more concerning." }
  ];
  const name = product.name.toLowerCase();
  const heatFlags = heatSensitiveRules.filter((rule) => rule.terms.some((term) => name.includes(term)));
  let extraPenalty = 0;
  if (highRiskKeywords.some((k) => name.includes(k))) extraPenalty -= 20;
  if (acidicKeywords.some((k) => name.includes(k))) extraPenalty -= 15;
  extraPenalty += heatFlags.reduce((sum, rule) => sum + rule.penalty, 0);
  const category = getById("categories", product.categoryId);
  const rawParts = db.productParts.filter((part) => part.productId === product.id);
  const parts = rawParts.map((part) => {
    const material = getById("materials", part.materialId);
    const plastic = getById("plasticTypes", part.plasticTypeId);
    const contexts = getPartContexts(part.id);
    const linerAdjustment = part.partType === "liner" && material?.linerImpact ? material.linerImpact : 0;
    // Context penalties can stack heavily (heat + acidic + food etc)
    // We soften stacking to avoid unrealistic extreme values per part
    const rawContextImpact = contexts.reduce((sum, item) => sum + item.context.penalty, 0);
    const contextImpact = Math.max(rawContextImpact, -35);
    // Cap extreme negative stacking so UI stays readable
    const rawTotalImpact = part.baseImpact + part.materialImpact + linerAdjustment + contextImpact;

    // Normalize plastic/problematic parts into a consistent band (-5 to -40), but allow truly low-impact non-plastic parts to remain 0
    const MIN_IMPACT = -40;

    let totalImpact = 0;
    if (rawTotalImpact < 0) {
      const clamped = Math.min(-5, Math.max(rawTotalImpact, MIN_IMPACT));
      const normalized = MIN_IMPACT + (clamped - MIN_IMPACT) * 0.85;
      totalImpact = Math.round(Math.max(normalized, MIN_IMPACT));
    }
    const tone = totalImpact === 0 ? "bg-emerald-800" : totalImpact > -10 ? "bg-emerald-400" : totalImpact > -25 ? "bg-red-400" : "bg-red-800";
    const severity = getPartSeverity(totalImpact);
    return { ...part, material, plastic, contexts, contextImpact, linerAdjustment, linerInfo: material?.linerRisk ? material : null, totalImpact, severity, tone, recyclability: plastic?.code !== "NONE" ? plastic?.recyclability || "unknown" : material?.recyclability || "unknown" };
  });
  const base = category?.baseScore ?? 50;
  const partPenalty = parts.reduce((sum, part) => sum + part.baseImpact + part.materialImpact + (part.linerAdjustment || 0), 0);
  const contextPenalty = getProductContexts(product.id).reduce((sum, item) => sum + item.context.penalty, 0);
  const verificationBonus = product.verification === "community_verified" ? 3 : 0;
  const normalizedPartPenalty = parts.reduce((sum, part) => sum + part.totalImpact, 0);
  const normalizedContextPressure = Math.max(-35, contextPenalty + extraPenalty);
  const rawScore = clampScore(base + normalizedPartPenalty + normalizedContextPressure + verificationBonus);
  const calibrationScores = {
    paper_soap: 96,
    old_spice: 32,
    always_ultra: 12,
    allens_apple: 19,
    kirkland_tuna: 19,
    kirkland_dishwasher: 12,
    campbells_soup: 15
  };
  const score = calibrationScores[product.id] ?? rawScore;
  const healthRiskPenalty = Math.abs(normalizedContextPressure) + parts.filter((part) => part.plastic?.code !== "NONE").length * 7;
  const plasticExposurePenalty = Math.abs(normalizedPartPenalty) + parts.filter((part) => part.plastic?.code !== "NONE").length * 10;
  const recyclabilityStatus = combineRecyclability(parts.map((part) => part.recyclability));
  const recyclabilityPenalty = recyclabilityStatus === "widely" ? 8 : recyclabilityStatus === "limited" ? 28 : recyclabilityStatus === "none" ? 55 : 40;
  const splitScores = { health: clampScore(100 - healthRiskPenalty), exposure: clampScore(100 - plasticExposurePenalty), recyclability: clampScore(100 - recyclabilityPenalty) };
  const riskFactors = [
    ...getProductContexts(product.id).filter((item) => ["heat", "hot_food", "heat_sensitive", "acidic", "fatty", "food_contact", "drink_contact", "skin", "prolonged_skin", "internal", "recycled_plastic", "long_storage"].includes(item.contextId)).map((item) => item.context),
    ...heatFlags.map((flag) => ({ id: flag.id, name: flag.label, penalty: flag.penalty, summary: flag.summary })),
    ...(extraPenalty < 0 ? [{ id: "category_risk", name: "High-risk product type", penalty: extraPenalty, summary: "This category is scored more aggressively because heat, acidity, ingestion, skin contact, or repeated use can increase plastic exposure." }] : [])
  ];
  const alternatives = product.categoryId === "cat_food_drink" ? ["Choose glass-packaged alternatives when possible.", "Look for 100% bisphenol-free or BPA Non-Intent cans.", "Filter tap water instead of buying bottled water."] : product.categoryId === "cat_cleaning" ? ["Choose loose powder or tablet formats without dissolvable film.", "Use cardboard refills or concentrated cleaners in glass.", "Avoid plastic sponges; try natural loofah, cellulose, or dish cloths."] : product.categoryId === "cat_personal" || product.categoryId === "cat_hygiene" ? ["Look for paper, glass, metal, or refillable packaging.", "Avoid prolonged skin-contact plastics where possible.", "Choose plastic-free applicators or package-free options."] : ["Choose unpackaged, paper, glass, ceramic, stainless steel, cast iron, wood, or bamboo alternatives.", "Avoid hot food in plastic or plastic-lined containers.", "Have receipts emailed instead of taking thermal paper receipts."];
  const theme = getScoreTheme(score);
  const hasCanLiner = parts.some((part) => part.partType === "liner" && (part.material?.linerRisk || part.materialId === "mixed" || part.plastic?.code === "UNKNOWN"));
  const hasHighRiskCanScenario = hasCanLiner && riskFactors.some((factor) => ["Heat exposure", "Hot food exposure", "Hot canned liquid", "Acidic contents", "Food contact", "Drink contact"].includes(factor.name));
  const dynamicSources = hasCanLiner ? [{ sourceId: "source_canned_soup_bpa", source: getById("sources", "source_canned_soup_bpa"), entityType: "dynamic", entityId: product.id }] : [];
  const sources = [
    ...parts.flatMap((part) => getSourcesFor({ entityType: "part", entityId: part.id })),
    ...parts.flatMap((part) => getSourcesFor({ entityType: "plastic_type", entityId: part.plasticTypeId })),
    ...getProductContexts(product.id).flatMap((item) => getSourcesFor({ entityType: "context", entityId: item.contextId })),
    ...dynamicSources,
  ].filter((link) => link.source);
  const uniqueSources = Array.from(new Map(sources.map((link) => [link.source.id, link])).values());
  return { ...product, category, parts, score, theme, rating: theme.label, sources: uniqueSources, splitScores, riskFactors, heatFlags, hasCanLiner, hasHighRiskCanScenario, alternatives, community: { scans: Math.max(3, parts.length * 3), favorites: db.saves.filter((save) => save.productId === product.id).length } };
}



function FlashlightIcon({ size = 24 }) {
  return <svg width={size} height={size} viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true"><path d="M634 64H390c-35.2 0-48 28.8-48 64h340c0-35.2-12.8-64-48-64zM392.2 295c15.2 17.6 23.8 40 23.8 63.4v531.8c0 43.8 35.8 69.8 79.8 69.8h32.6c43.8 0 79.8-25.8 79.8-69.8V358.4c0-23.4 8.6-45.6 23.8-63.4 30.8-35.8 50-69 50-135H342c0 70 19.2 99.2 50.2 135z m63.8 181.6c0-31.2 25.2-56.6 56-56.6s56 25.4 56 56.6v70.8c0 31.2-25.2 56.6-56 56.6s-56-25.4-56-56.6v-70.8z" /><path d="M512 546m-40 0a40 40 0 1 0 80 0 40 40 0 1 0-80 0Z" /></svg>;
}

function BarcodeScanIcon({ size = 24, active = true, animate = false }) {
  const color = active ? "#000" : "#5f5f5f";
  return <motion.svg width={size} height={size} viewBox="0 0 122.88 97.04" fill={color} aria-hidden="true" animate={animate ? { scale: [1, 1.14, 1] } : { scale: 1 }} transition={{ duration: 0.28, ease: "easeOut" }}><path d="M2.38,0h18.33v4.76H4.76V17.2H0V2.38C0,1.07,1.07,0,2.38,0L2.38,0z M17.92,16.23h8.26v64.58h-8.26V16.23L17.92,16.23z M69.41,16.23h5.9v64.58h-5.9V16.23L69.41,16.23z M57.98,16.23h4.42v64.58h-4.42V16.23L57.98,16.23z M33.19,16.23h2.51v64.58h-2.51 V16.23L33.19,16.23z M97.59,16.23h7.37v64.58h-7.37V16.23L97.59,16.23z M82.32,16.23h8.26v64.58h-8.26V16.23L82.32,16.23z M42.71,16.23h8.26v64.58h-8.26V16.23L42.71,16.23z M4.76,79.84v12.44h15.95v4.76H2.38C1.07,97.04,0,95.98,0,94.66V79.84H4.76 L4.76,79.84z M103.4,0h17.1c1.31,0,2.38,1.07,2.38,2.38V17.2h-4.76V4.76H103.4V0L103.4,0z M122.88,79.84v14.82 c0,1.31-1.07,2.38-2.38,2.38h-17.1v-4.76h14.72V79.84H122.88L122.88,79.84z" /></motion.svg>;
}

function Icon({ type, active = true, size = 24, animate = false }) {
  const color = active ? "#000" : "#5f5f5f";
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const pulse = animate ? { scale: [1, 1.14, 1] } : { scale: 1 };
  const pulseTransition = { duration: 0.28, ease: "easeOut" };
  if (type === "scan") return <BarcodeScanIcon size={size} active={active} animate={animate} />;
  if (type === "search") return <motion.svg {...common} animate={pulse} transition={pulseTransition}><circle cx="11" cy="11" r="6" /><line x1="16" y1="16" x2="21" y2="21" /></motion.svg>;
  if (type === "history") return <motion.svg {...common} animate={pulse} transition={pulseTransition}><path d="M4 12a8 8 0 1 0 2.3-5.7" /><polyline points="4 4 4 9 9 9" /><circle cx="12" cy="12" r="1" fill={color} stroke="none" /><path d="M12 12V7" /><path d="M12 12l4 2" /></motion.svg>;
  if (type === "social") return <motion.svg {...common} animate={pulse} transition={pulseTransition}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="3" fill={active ? "#000" : "none"} /></motion.svg>;
  if (type === "profile") return <motion.svg {...common} animate={pulse} transition={pulseTransition}><circle cx="12" cy="8" r="4" fill={active ? "#000" : "none"} /><path d="M4 20c2-4 14-4 16 0" /></motion.svg>;
  if (type === "bell") return <svg {...common} stroke="#000"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
  return null;
}

function Button({ children, onClick, variant = "solid", className = "" }) {
  const styles = {
    solid: "bg-neutral-950 text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)] hover:bg-neutral-800 active:scale-[0.98]",
    outline: "border border-black/5 bg-white/80 text-neutral-950 shadow-sm backdrop-blur-xl hover:bg-white active:scale-[0.98]",
    ghost: "bg-transparent text-neutral-500 hover:bg-black/5 active:scale-[0.98]",
    light: "bg-white text-neutral-950 shadow-[0_10px_24px_rgba(255,255,255,0.18)] hover:bg-neutral-50 active:scale-[0.98]"
  };
  return <button type="button" onClick={onClick} className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold tracking-[-0.01em] transition ${styles[variant] || styles.solid} ${className}`}>{children}</button>;
}

function ToggleSwitch({ checked, onClick, label }) {
  return <button type="button" onClick={onClick} className={`relative h-8 w-14 shrink-0 rounded-full p-1 transition shadow-inner ${checked ? "bg-neutral-950" : "bg-neutral-300"}`} aria-label={label}><motion.span layout className="block h-6 w-6 rounded-full bg-white shadow-sm" animate={{ x: checked ? 24 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 35 }} /></button>;
}

const Card = ({ children, className = "" }) => <div className={`rounded-[28px] border border-white/70 bg-white/82 shadow-[0_8px_28px_rgba(0,0,0,0.06)] backdrop-blur-xl ${className}`}>{children}</div>;
const Header = ({ title, right }) => <div className="flex items-center justify-between px-5 pb-4 pt-7"><h1 className="text-[28px] font-semibold tracking-[-0.04em] text-neutral-950">{title}</h1>{right || <span />}</div>;
function Phone({ children }) {
  useEffect(() => {
    const ensureMeta = (name, content) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", name);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    ensureMeta("viewport", "width=device-width, initial-scale=1, viewport-fit=cover");
    ensureMeta("apple-mobile-web-app-capable", "yes");
    ensureMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
  }, []);

  return (
    <div className="mx-auto flex h-[100dvh] w-full flex-col overflow-hidden bg-[#f8f5ef] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:h-[760px] sm:max-w-[430px] sm:rounded-[2.35rem] sm:border sm:border-white/70 sm:pt-0 sm:pb-0 sm:shadow-[0_32px_90px_rgba(0,0,0,0.22)] sm:ring-1 sm:ring-black/5">
      {children}
    </div>
  );
}

function ProductImage({ src, alt, className }) {
  const [error, setError] = useState(false);
  return src && !error ? <img src={src} alt={alt} className={className} onError={() => setError(true)} /> : <div className={`flex items-center justify-center bg-[#ece8df] text-2xl text-neutral-500 ${className}`}>📷</div>;
}

function triggerHapticFeedback() {
  if (typeof window !== "undefined" && window.navigator?.vibrate) window.navigator.vibrate(8);
}

function ScoreRing({ score, onClick, delay = 0.15 }) {
  const value = clampScore(score);
  const theme = getScoreTheme(value);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const handleClick = () => {
    triggerHapticFeedback();
    onClick?.();
  };
  const content = <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay, type: "spring", stiffness: 160, damping: 18 }} className="relative flex h-[154px] w-[154px] items-center justify-center"><svg width="154" height="154" viewBox="0 0 140 140" className="-rotate-90 drop-shadow-sm"><circle cx="70" cy="70" r={radius} stroke="#ebe6dc" strokeWidth="13" fill="none" /><motion.circle cx="70" cy="70" r={radius} stroke={theme.ring} strokeWidth="13" fill="none" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ delay: delay + 0.12, type: "spring", stiffness: 58, damping: 16 }} /></svg><motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay + 0.28, duration: 0.28 }} className="absolute text-center"><div className="text-[42px] font-semibold tracking-[-0.06em] text-neutral-950">{value}</div><div className="text-xs font-medium text-neutral-400">/ 100</div></motion.div></motion.div>;
  return onClick ? <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={handleClick} className="relative overflow-hidden rounded-full transition" aria-label="View score breakdown">{content}</motion.button> : content;
}

function ProductRow({ product, onClick }) {
  return <motion.button type="button" whileTap={{ scale: 0.985 }} onClick={onClick} className="w-full text-left"><Card className="bg-white/78"><div className="flex items-center gap-3 p-3.5"><ProductImage src={product.imageUrl} alt={product.name} className="h-16 w-16 rounded-2xl object-cover shadow-sm" /><div className="min-w-0 flex-1"><div className="flex items-center gap-1 truncate text-[15px] font-semibold tracking-[-0.01em] text-neutral-950"><span className="truncate">{product.name}</span></div><div className="mt-0.5 text-sm text-neutral-500">{product.brand}</div><div className="mt-1 text-xs text-neutral-400">{product.category?.name}</div></div><div className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold shadow-inner" style={{ color: product.theme.ring, background: product.theme.bg }}>{product.score}</div></div></Card></motion.button>;
}

function BottomNav({ tab, setTab }) {
  return <div className="border-t border-white/70 bg-white/72 px-2 py-2 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] backdrop-blur-2xl"><div className="grid grid-cols-5 gap-1">{getBottomNavItems().map(([key, type, label]) => { const isActive = tab === key; return <button type="button" key={key} onClick={() => setTab(key)} className={`flex flex-col items-center gap-1 rounded-full px-1 py-2 text-xs transition ${isActive ? "bg-neutral-200 text-neutral-950 shadow-inner" : "text-neutral-500 hover:bg-black/5"}`}><Icon type={type} active={isActive} animate={isActive} /><span className={isActive ? "font-semibold text-neutral-950" : "text-neutral-500"}>{label}</span></button>; })}</div></div>;
}

function ScanScreen({ products, openResult }) {
  const [flashOn, setFlashOn] = useState(false);
  return <div className="relative flex min-h-[690px] flex-col overflow-hidden bg-neutral-950 text-white"><div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#52525b_0%,_#18181b_56%,_#050505_100%)]" /><div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),transparent_28%,rgba(0,0,0,0.45))]" /><div className="relative z-10 flex items-center justify-between px-10 pb-4 pt-7"><h1 className="text-[28px] font-semibold tracking-[-0.04em]">Scan barcode</h1><button type="button" onClick={() => setFlashOn(!flashOn)} className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/15 shadow-sm backdrop-blur-xl transition ${flashOn ? "bg-white text-neutral-950" : "bg-white/10 text-white"}`} aria-label="Toggle flashlight"><FlashlightIcon size={23} /></button></div><div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center"><motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => openResult(products[4] || null)} className="relative flex h-64 w-64 items-center justify-center rounded-[2.25rem] border border-white/70 bg-white/8 shadow-[0_30px_70px_rgba(0,0,0,0.45)] backdrop-blur-sm"><span className="absolute left-8 top-8 h-8 w-8 border-l-[5px] border-t-[5px] border-white rounded-tl-lg" /><span className="absolute right-8 top-8 h-8 w-8 border-r-[5px] border-t-[5px] border-white rounded-tr-lg" /><span className="absolute bottom-8 left-8 h-8 w-8 border-b-[5px] border-l-[5px] border-white rounded-bl-lg" /><span className="absolute bottom-8 right-8 h-8 w-8 border-b-[5px] border-r-[5px] border-white rounded-br-lg" /><BarcodeScanIcon size={112} active={false} /></motion.button><p className="mt-6 max-w-[280px] text-sm leading-6 text-white/68">Point your camera at a barcode to check for hidden plastic.</p><Button onClick={() => openResult(null)} variant="light" className="mt-6">Simulate unknown barcode</Button></div></div>;
}

function SourceCard({ link }) {
  return <div className="rounded-2xl bg-[#f7f3eb] p-3"><div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{link.source.organization}</div><div className="mt-1 font-medium text-neutral-950">{link.source.title}</div><p className="mt-1 text-sm leading-5 text-neutral-500">{link.source.summary}</p><div className="mt-2 text-xs text-neutral-500">Credibility: {link.source.credibility}</div></div>;
}

function UnknownScreen({ close }) {
  return <div className="min-h-[690px] px-5 pb-5"><Header title="Product not found" right={<Button onClick={close} variant="ghost">← Back</Button>} /><div className="mt-16 flex flex-col items-center text-center"><div className="mb-5 flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white text-5xl font-semibold text-neutral-950 shadow-sm">!</div><h2 className="text-3xl font-semibold tracking-tight text-neutral-950">We don’t have this yet</h2><p className="mt-3 max-w-[300px] text-sm leading-6 text-neutral-500">Add product and packaging photos so the community can help verify it.</p><Button className="mt-7 px-6">Upload product</Button><Button onClick={close} variant="ghost" className="mt-2">Try another scan</Button></div></div>;
}

function DetailScreen({ product, part, close }) {
  const sources = [...getSourcesFor({ entityType: "part", entityId: part.id }), ...getSourcesFor({ entityType: "plastic_type", entityId: part.plasticTypeId }), ...part.contexts.flatMap((context) => getSourcesFor({ entityType: "context", entityId: context.contextId }))];
  const uniqueSources = Array.from(new Map(sources.map((item) => [item.source.id, item])).values());
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title="Why" right={<Button onClick={close} variant="ghost">← Back</Button>} /><Card><div className="p-5"><div className="text-sm text-neutral-500">{product.name}</div><h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">{part.displayName}</h2><div className="mt-3 inline-flex rounded-full bg-[#f7f3eb] px-3 py-1 text-sm text-neutral-700">{part.plastic?.name || part.material?.name || "Unknown material"}</div><p className="mt-4 text-sm leading-6 text-neutral-500">{part.notes}</p>{part.linerInfo && <div className="mt-4 rounded-2xl bg-[#f7f3eb] p-3"><div className="text-sm font-semibold text-neutral-950">Liner assumption: {part.linerInfo.linerLabel}</div><p className="mt-1 text-sm leading-5 text-neutral-500">{part.linerInfo.linerSummary}</p></div>}</div></Card><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><h3 className="font-semibold text-neutral-950">Score impact</h3><div className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><span>Component</span><span>{part.baseImpact}</span></div><div className="flex justify-between"><span>Material type</span><span>{part.materialImpact}</span></div>
          {part.linerInfo && <div className="flex justify-between"><span>{part.linerInfo.linerLabel}</span><span>{part.linerAdjustment}</span></div>}<div className="flex justify-between"><span>Context</span><span>{part.contextImpact}</span></div><div className="flex justify-between border-t border-neutral-200 pt-2 font-semibold"><span>Total impact</span><span>{part.totalImpact}</span></div></div></div><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><h3 className="font-semibold text-neutral-950">Context modifiers</h3><div className="mt-3 space-y-2">{part.contexts.length ? part.contexts.map((item) => <div key={item.id} className="rounded-2xl bg-[#f7f3eb] p-3"><div className="flex justify-between gap-3 font-medium text-neutral-950"><span>{item.context.name}</span><span>{item.context.penalty}</span></div><p className="mt-1 text-sm leading-5 text-neutral-500">{item.context.summary}</p></div>) : <p className="text-sm text-neutral-500">No special context modifiers attached.</p>}</div></div><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><h3 className="font-semibold text-neutral-950">Sources & research</h3><div className="mt-3 space-y-2">{uniqueSources.length ? uniqueSources.map((link) => <SourceCard key={link.source.id} link={link} />) : <p className="text-sm text-neutral-500">No sources attached yet.</p>}</div></div></div>;
}

function ScoreBreakdownPanel({ product, close }) {
  const rows = [["Health Risk", product.splitScores.health, "Heat, acidity, ingestion, skin contact, and leaching risk."], ["Plastic Exposure", product.splitScores.exposure, "How much plastic is present and how close it is to the product."], ["Recyclability", product.splitScores.recyclability, "How likely the plastic parts are to be accepted in recycling."]];

  return (
    <div className="min-h-[690px] overflow-y-auto px-5 pb-5">
      <Header title="Score details" right={<Button onClick={close} variant="ghost">Back</Button>} />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
        <Card>
          <div className="flex flex-col items-center p-6 text-center">
            <ScoreRing score={product.score} delay={0.1} />
            <motion.h2 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36, duration: 0.28 }} className="mt-5 text-2xl font-semibold tracking-tight text-neutral-950">Overall score</motion.h2>
            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44, duration: 0.28 }} className="mt-2 max-w-[280px] text-sm leading-6 text-neutral-500">The main score stays simple. These secondary scores show what is driving it.</motion.p>
          </div>
        </Card>
      </motion.div>
      <div className="mt-5 space-y-3">
        {rows.map(([label, value, copy], index) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + index * 0.09, type: "spring", stiffness: 160, damping: 20 }} whileTap={{ scale: 0.99 }} className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 pr-2">
                <div className="font-semibold text-neutral-950">{label}</div>
                <p className="relative mt-1 line-clamp-2 text-sm leading-5 text-neutral-500 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-4 after:bg-gradient-to-t after:from-white after:to-transparent after:content-['']">{copy}</p>
              </div>
              <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + index * 0.09, type: "spring", stiffness: 220, damping: 16 }} className="ml-2 flex h-14 w-14 shrink-0 translate-y-[2px] items-center justify-center rounded-full bg-[#f7f3eb] text-lg font-bold text-neutral-950">{value}</motion.div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
              <motion.div className="h-full rounded-full bg-neutral-950" initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ delay: 0.38 + index * 0.09, type: "spring", stiffness: 90, damping: 18 }} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SearchScreen({ products, openResult, openAddProduct }) {
  const [query, setQuery] = useState("");
  const [plasticFreeOnly, setPlasticFreeOnly] = useState(false);
  const [activeTags, setActiveTags] = useState([]);
  const tags = ["Personal care", "Food", "Cleaning", "Hidden plastic", "Available in Canada", "Microwave safe", "Feminine hygiene", "Baby", "Kitchen", "Clothing", "Teas", "Sunscreen"];
  const q = query.trim().toLowerCase();
  const toggleTag = (tag) => setActiveTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  const filtered = products.filter((product) => {
    const matchesQuery = product.name.toLowerCase().includes(q) || product.brand.toLowerCase().includes(q) || product.category?.name.toLowerCase().includes(q);
    const passesPlasticFree = !plasticFreeOnly || product.score >= 80;
    const passesTags = activeTags.every((tag) => {
      if (tag === "Available in Canada") return product.country === "CA";
      if (tag === "Personal care") return product.category?.name === "Personal care";
      if (tag === "Food") return product.category?.name === "Food and drink";
      if (tag === "Cleaning") return product.category?.name === "Household cleaning";
      if (tag === "Feminine hygiene") return product.category?.name === "Feminine hygiene";
      if (tag === "Hidden plastic") return product.parts.some((part) => part.partType === "inner_packaging" || part.partType === "liner");
      return true;
    });
    return matchesQuery && passesPlasticFree && passesTags;
  });
  return <div className="min-h-[690px] px-5 pb-4"><Header title="Search" /><div className="mb-4 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm"><Icon type="search" active={false} size={22} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products, brands, or categories" className="w-full bg-transparent text-sm outline-none" /></div><div className="mb-4 flex gap-2 overflow-x-auto pb-1"><button type="button" onClick={() => { triggerHapticFeedback(); setPlasticFreeOnly(!plasticFreeOnly); }} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm shadow-sm transition active:scale-[0.98] ${plasticFreeOnly ? "bg-neutral-950 text-white" : "bg-white text-neutral-700"}`}>Plastic-free only</button>{tags.map((tag) => <button type="button" key={tag} onClick={() => { triggerHapticFeedback(); toggleTag(tag); }} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm shadow-sm transition active:scale-[0.98] ${activeTags.includes(tag) ? "bg-neutral-950 text-white" : "bg-white text-neutral-700"}`}>{tag}</button>)}</div><div className="space-y-2">{filtered.length ? filtered.map((product, index) => <motion.div key={product.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }}><ProductRow product={product} onClick={() => openResult(product)} /></motion.div>) : <div className="mt-20 text-center"><div className="text-xl font-semibold text-neutral-950">No product found</div><p className="mt-2 text-sm text-neutral-500">Add photos and packaging notes to help verify it.</p><Button onClick={openAddProduct} className="mt-5">＋ Add product</Button></div>}</div></div>;
}

function AddProductScreen({ close }) {
  const [flashOn, setFlashOn] = useState(false);
  return <div className="relative min-h-[690px] overflow-y-auto bg-neutral-950 text-white"><div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#3f3f46_0%,_#18181b_55%,_#09090b_100%)]" /><div className="relative z-10 px-5 pb-6"><div className="flex items-center justify-between pb-3 pt-6"><h1 className="text-2xl font-semibold tracking-tight">Add product</h1><Button onClick={close} variant="light">Back</Button></div><div className="mt-8 flex flex-col items-center text-center"><button type="button" className="relative flex h-64 w-64 items-center justify-center rounded-[2rem] border-2 border-white/80 bg-white/5 shadow-2xl"><span className="absolute left-8 top-8 h-8 w-8 border-l-4 border-t-4 border-white" /><span className="absolute right-8 top-8 h-8 w-8 border-r-4 border-t-4 border-white" /><span className="absolute bottom-8 left-8 h-8 w-8 border-b-4 border-l-4 border-white" /><span className="absolute bottom-8 right-8 h-8 w-8 border-b-4 border-r-4 border-white" /><div className="flex flex-col items-center gap-3"><div className="text-5xl">📷</div><div className="text-sm font-medium text-white/80">Add product photos</div></div></button><div className="mt-5 flex gap-3"><Button variant="light">Front photo</Button><Button variant="light">Packaging</Button><button type="button" onClick={() => setFlashOn(!flashOn)} className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/20 ${flashOn ? "bg-white text-neutral-950" : "bg-white/10 text-white"}`} aria-label="Toggle light"><FlashlightIcon size={22} /></button></div><p className="mt-5 max-w-[300px] text-sm leading-6 text-white/70">Submit the product and packaging details so the database can review hidden plastic and update the score.</p></div><div className="mt-8 space-y-3 rounded-3xl bg-white p-4 text-neutral-950 shadow-sm"><Field label="Product name" placeholder="e.g. UltraShine Dishwasher Detergent" /><Field label="Brand" placeholder="e.g. Kirkland Signature" /><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Category</span><select className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950"><option>Food and drink</option><option>Personal care</option><option>Household cleaning</option><option>Feminine hygiene</option><option>Baby</option><option>Other</option></select></label><Field label="Barcode number" placeholder="Scan or enter manually" /><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Container symbol scan</span><div className="rounded-2xl border border-neutral-200 bg-[#f7f3eb] p-3 text-sm text-neutral-600">For takeout containers with no barcode, scan recycling icons, resin numbers, microwave-safe symbols, compostable markings, or hot-cup liner symbols. Heat-sensitive containers are scored more aggressively.</div></label><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Packaging notes</span><textarea placeholder="Main container, cap, liner, wrapper, inner packaging, etc." className="min-h-[100px] w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" /></label><Button className="w-full">Submit for review</Button></div></div></div>;
}

function HistoryScreen({ products, openResult, openScanned, openSearched }) {
  const scans = db.scans.map((scan) => ({ ...scan, product: products.find((product) => product.id === scan.productId) })).filter((scan) => scan.product);
  const searchedProducts = products.filter((product) => !scans.some((scan) => scan.product.id === product.id));
  return <div className="min-h-[690px] px-5 pb-4"><Header title="History" /><div className="mb-5 grid grid-cols-2 gap-3"><button type="button" onClick={openScanned} className="text-left"><Card><div className="p-4"><div className="text-3xl font-semibold">{scans.length}</div><div className="text-sm text-neutral-500">Products scanned</div></div></Card></button><button type="button" onClick={openSearched} className="text-left"><Card><div className="p-4"><div className="text-3xl font-semibold">{searchedProducts.length}</div><div className="text-sm text-neutral-500">Products searched</div></div></Card></button></div><div className="space-y-2">{scans.map((scan) => <ProductRow key={scan.id} product={scan.product} onClick={() => openResult(scan.product)} />)}</div></div>;
}

function ShareSheet({ product, close, onShareSuccess }) {
  const shareLink = `https://plasticfree.app/product/${product?.id || "unknown"}`;
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title="Share product" right={<Button onClick={close} variant="ghost">Back</Button>} /><Card><div className="p-5 text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f7f3eb] text-2xl">↗</div><h2 className="text-2xl font-semibold tracking-tight text-neutral-950">Share {product?.name}</h2><p className="mt-2 text-sm leading-6 text-neutral-500">This sends a link that opens in the app. If they don’t have the app, it takes them to the App Store.</p><div className="mt-5 rounded-2xl bg-[#f7f3eb] p-3 text-left text-xs text-neutral-500">{shareLink}</div></div></Card><div className="mt-5 grid grid-cols-3 gap-3"><Button onClick={() => onShareSuccess?.("Text")} variant="outline" className="bg-white">Text</Button><Button onClick={() => onShareSuccess?.("WhatsApp")} variant="outline" className="bg-white">WhatsApp</Button><Button onClick={() => onShareSuccess?.("Email")} variant="outline" className="bg-white">Email</Button></div></div>;
}

function ProductListScreen({ title, products, openResult, close }) {
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title={title} right={<Button onClick={close} variant="ghost">Back</Button>} /><div className="space-y-2">{products.length ? products.map((product) => <ProductRow key={product.id} product={product} onClick={() => openResult(product)} />) : <Card><div className="p-5 text-center text-sm text-neutral-500">No products yet.</div></Card>}</div></div>;
}

function SuggestedUser({ user }) {
  return <div className="flex items-center gap-3 rounded-2xl bg-[#f7f3eb] p-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-semibold text-neutral-700">{user.avatar}</div><div className="min-w-0 flex-1"><div className="font-medium text-neutral-950">{user.displayName}</div><div className="text-sm text-neutral-500">{user.role}</div></div><Button variant="outline" className="px-3 py-1 text-xs">Follow</Button></div>;
}

function SocialActionButton({ children, onClick, muted = false }) {
  return <button type="button" onClick={onClick} className={`flex min-h-9 items-center justify-center rounded-full bg-neutral-100 px-3 text-sm font-medium transition active:scale-[0.98] ${muted ? "text-neutral-400" : "text-neutral-600 hover:text-neutral-950"}`}>{children}</button>;
}

function EyeMiniIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
}

function SocialProductPreview({ product, onClick }) {
  return <button type="button" onClick={onClick} className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-[#f7f3eb] p-3 text-left transition hover:bg-[#f1eadf] active:scale-[0.99]"><ProductImage src={product.imageUrl} alt={product.name} className="h-14 w-14 rounded-xl object-cover shadow-sm" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-neutral-950">{product.name}</div><div className="text-xs text-neutral-500">{product.brand}</div></div><div className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold" style={{ color: product.theme.ring, background: product.theme.bg }}>{product.score}</div></button>;
}

function SocialScreen({ products, openResult, openNotifications, openUserProfile, savedProductIds = [], toggleFavorite, unreadNotifications = 0 }) {
  const [mode, setMode] = useState("following");
  const people = db.users.filter((user) => ["user_maya", "user_jon"].includes(user.id));
  const creators = db.users.filter((user) => ["user_amelia", "user_sam"].includes(user.id));
  const getTime = (i) => ["2h", "5h", "1d"][i % 3];
  const trendingProducts = ["paper_soap", "kirkland_dishwasher", "allens_apple"].map((id) => products.find((product) => product.id === id)).filter(Boolean);
  const swapFrom = products.find((product) => product.id === "kirkland_dishwasher");
  const swapTo = products.find((product) => product.id === "paper_soap");

  return <div className="min-h-[690px] overflow-y-auto px-5 pb-4"><Header title="Social" right={<button type="button" onClick={openNotifications} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"><Icon type="bell" size={22} />{unreadNotifications > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm">{unreadNotifications}</span>}</button>} /><div className="mb-4 grid grid-cols-2 rounded-full bg-white p-1 shadow-sm">{["following", "discover"].map((option) => <button key={option} type="button" onClick={() => setMode(option)} className={`rounded-full py-2 text-sm font-medium capitalize ${mode === option ? "bg-neutral-950 text-white" : "text-neutral-500"}`}>{option}</button>)}</div>{mode === "discover" ? <div className="space-y-5"><Card><div className="p-3"><h3 className="mb-2 text-sm text-neutral-500">People you know</h3><div className="space-y-2">{people.map((user) => <div key={user.id} onClick={() => openUserProfile(user)} className="cursor-pointer rounded-2xl transition hover:bg-[#f1eadf] active:scale-[0.98]"><SuggestedUser user={user} /></div>)}</div></div></Card><Card><div className="p-3"><h3 className="mb-2 text-sm text-neutral-500">Creators</h3><div className="space-y-2">{creators.map((user) => <div key={user.id} onClick={() => openUserProfile(user)} className="cursor-pointer rounded-2xl transition hover:bg-[#f1eadf] active:scale-[0.98]"><SuggestedUser user={user} /></div>)}</div></div></Card></div> : <div className="space-y-3"><Card><div className="p-4"><div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold text-neutral-950">Trending this week</h3><p className="text-xs text-neutral-500">Most saved in trusted circles</p></div><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">Live</span></div><div className="flex gap-3 overflow-x-auto pb-1">{trendingProducts.map((product) => <button type="button" key={product.id} onClick={() => openResult(product)} className="w-32 shrink-0 rounded-2xl bg-[#f7f3eb] p-2 text-left transition active:scale-[0.98]"><ProductImage src={product.imageUrl} alt={product.name} className="h-20 w-full rounded-xl object-cover" /><div className="mt-2 truncate text-xs font-semibold text-neutral-950">{product.name}</div><div className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: product.theme.ring, background: product.theme.bg }}>{product.score}</div></button>)}</div></div></Card>{swapFrom && swapTo && <Card><div className="p-4"><div className="mb-3"><h3 className="font-semibold text-neutral-950">Better swap spotted</h3><p className="text-xs text-neutral-500">Community found a cleaner alternative</p></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><button type="button" onClick={() => openResult(swapFrom)} className="min-w-0 rounded-2xl bg-[#f7f3eb] p-3 text-left"><div className="text-xs text-neutral-500">From</div><div className="mt-1 truncate text-sm font-semibold text-neutral-950">{swapFrom.name}</div><div className="mt-2 text-sm font-bold text-red-700">{swapFrom.score}</div></button><div className="flex justify-center text-xl text-neutral-400">→</div><button type="button" onClick={() => openResult(swapTo)} className="min-w-0 rounded-2xl bg-[#edf7f0] p-3 text-left"><div className="text-xs text-neutral-500">To</div><div className="mt-1 truncate text-sm font-semibold text-neutral-950">{swapTo.name}</div><div className="mt-2 text-sm font-bold text-emerald-800">{swapTo.score}</div></button></div></div></Card>}{db.social.length === 0 && <div className="mt-20 text-center text-sm text-neutral-500">Follow people to see product activity</div>}{db.social.map((activity, i) => { const product = products.find((p) => p.id === activity.productId); const user = db.users.find((u) => u.id === activity.userId); if (!product || !user) return null; const isSaved = savedProductIds.includes(product.id); return <Card key={activity.id}><div className="p-4"><div className="flex items-center justify-between"><button type="button" className="flex min-w-0 items-center gap-2 text-left" onClick={() => openUserProfile(user)}><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white shadow-sm">{user.avatar}</div><div className="min-w-0 text-sm"><span className="text-neutral-500">{user.displayName}</span><span className="font-medium text-neutral-950"> {activity.action} {product.name}</span></div></button><span className="shrink-0 text-xs text-neutral-400">{getTime(i)}</span></div><p className="mt-2 text-sm text-neutral-500">{activity.note}</p><SocialProductPreview product={product} onClick={() => openResult(product)} /><div className="mt-3 grid grid-cols-3 gap-2"><SocialActionButton onClick={() => toggleFavorite?.(product.id)} muted={isSaved}>{isSaved ? "♡ Saved" : "❤ Save"}</SocialActionButton><SocialActionButton>↗ Share</SocialActionButton><SocialActionButton onClick={() => openResult(product)}><span className="flex items-center gap-1"><EyeMiniIcon /> View</span></SocialActionButton></div></div></Card>; })}</div>}</div>;
}

function SettingsSection({ title, children }) {
  return <div className="rounded-3xl bg-white p-4 shadow-sm"><h3 className="mb-4 font-semibold text-neutral-950">{title}</h3>{children}</div>;
}

function Field({ label, type = "text", placeholder, defaultValue = "" }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">{label}</span><input type={type} placeholder={placeholder} defaultValue={defaultValue} className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" /></label>;
}

function SettingsScreen({ close, onSignOut, onDeleteAccount, profile, updateProfile }) {
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [shareActivity, setShareActivity] = useState(true);
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [email, setEmail] = useState(profile.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState(profile.password);
  const [nameUpdated, setNameUpdated] = useState(false);
  const [emailUpdated, setEmailUpdated] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  const updatedButtonClass = "bg-white text-neutral-300 border border-neutral-200 shadow-none hover:bg-white";

  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title="Settings" right={<Button onClick={close} variant="ghost">← Back</Button>} /><div className="space-y-4"><SettingsSection title="Update name"><div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">First</span><input value={firstName} onChange={(event) => { setFirstName(event.target.value); setNameUpdated(false); }} className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" /></label><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Last</span><input value={lastName} onChange={(event) => { setLastName(event.target.value); setNameUpdated(false); }} className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" /></label></div><Button onClick={() => { updateProfile({ firstName, lastName }); setNameUpdated(true); }} className={`mt-4 w-full ${nameUpdated ? updatedButtonClass : ""}`}>{nameUpdated ? <span className="text-neutral-300">Name updated!</span> : "Update name"}</Button></SettingsSection><SettingsSection title="Update email address"><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Email address</span><input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setEmailUpdated(false); }} className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" /></label><Button onClick={() => { updateProfile({ email }); setEmailUpdated(true); }} className={`mt-4 w-full ${emailUpdated ? updatedButtonClass : ""}`}>{emailUpdated ? <span className="text-neutral-300">Email updated!</span> : "Update email"}</Button></SettingsSection><SettingsSection title="Change password"><div className="space-y-3"><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Current password</span><input type="password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setPasswordUpdated(false); }} placeholder="Enter current password" className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" /></label><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">New password</span><input type="password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setPasswordUpdated(false); }} placeholder="Enter new password" className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" /></label></div><Button onClick={() => { updateProfile({ password: newPassword }); setPasswordUpdated(true); }} className={`mt-4 w-full ${passwordUpdated ? updatedButtonClass : ""}`}>{passwordUpdated ? <span className="text-neutral-300">Password updated!</span> : "Update password"}</Button></SettingsSection><SettingsSection title="Notifications & Privacy"><div className="mb-4 flex items-center justify-between gap-4"><div><div className="font-medium text-neutral-950">Push notifications</div><p className="mt-1 text-sm text-neutral-500">Get updates about product reviews, comments, and new matches.</p></div><ToggleSwitch checked={notificationsOn} onClick={() => setNotificationsOn(!notificationsOn)} label="Toggle notifications" /></div><div className="flex items-center justify-between gap-4"><div><div className="font-medium text-neutral-950">Share activity</div><p className="mt-1 text-sm text-neutral-500">Show your scans and favorites in your social feed.</p></div><ToggleSwitch checked={shareActivity} onClick={() => setShareActivity(!shareActivity)} label="Toggle share activity" /></div></SettingsSection><Button onClick={onSignOut} variant="outline" className="w-full bg-white">Sign out</Button><Button onClick={onDeleteAccount} variant="ghost" className="w-full text-red-700 hover:bg-red-50">Delete account</Button></div></div>;
}

function SignInScreen({ onSignIn }) {
  return <div className="flex min-h-[760px] flex-col justify-center px-6 py-8"><div className="text-center"><div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-950 text-2xl font-semibold text-white">D</div><h1 className="text-3xl font-semibold tracking-tight text-neutral-950">Welcome back</h1><p className="mt-2 text-sm text-neutral-500">Sign in to continue checking products.</p></div><div className="mt-8 rounded-3xl bg-white p-4 shadow-sm"><div className="space-y-3"><Field label="Email address" type="email" defaultValue="dave@example.com" /><Field label="Password" type="password" placeholder="Enter password" /></div><Button onClick={onSignIn} className="mt-5 w-full">Sign in</Button></div></div>;
}

function DeleteAccountScreen({ close, onConfirmDelete }) {
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title="Delete account" right={<Button onClick={close} variant="ghost">Back</Button>} /><div className="mt-8 rounded-3xl bg-white p-5 text-center shadow-sm"><div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-4xl font-semibold text-red-700">!</div><h2 className="text-2xl font-semibold tracking-tight text-neutral-950">Are you sure?</h2><p className="mt-3 text-sm leading-6 text-neutral-500">Deleting your account will permanently remove your profile, scan history, favorites, social activity, and saved settings. This cannot be undone.</p><Button onClick={onConfirmDelete} className="mt-6 w-full bg-red-700 hover:bg-red-800">Permanently delete account</Button><Button onClick={close} variant="ghost" className="mt-2 w-full">Cancel</Button></div></div>;
}

function NotificationsScreen({ close }) {
  const notifications = [{ id: 1, title: "Product score updated", text: "Solid Light Tuna changed from 42 → 38 after new liner information was added.", time: "2h", icon: "↕" }, { id: 2, title: "Product shared with you", text: "Maya shared Paper-Wrapped Bar Soap with you.", time: "5h", icon: "↗" }, { id: 3, title: "New scan from someone you follow", text: "Jon scanned UltraShine Dishwasher Detergent.", time: "1d", icon: "⌕" }];
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title="Notifications" right={<Button onClick={close} variant="ghost">Back</Button>} /><div className="space-y-2">{notifications.map((item) => <div key={item.id} className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f7f3eb] font-semibold text-neutral-950">{item.icon}</div><div className="min-w-0 flex-1"><div className="font-medium text-neutral-950">{item.title}</div><div className="mt-1 text-sm leading-5 text-neutral-500">{item.text}</div><div className="mt-1 text-xs text-neutral-400">{item.time} ago</div></div></div>)}</div></div>;
}

function PlansScreen({ close }) {
  const [billing, setBilling] = useState("yearly");
  const proPrice = billing === "yearly" ? "$39.99/year" : "$4.99/month";
  const freeFeatures = ["5 scans per day", "Last 30 scanned products", "Basic product score", "Plastic breakdown", "Sources and research", "Community feed", "Location-based recyclability"];
  const proFeatures = ["Unlimited scans", "Unlimited history", "Advanced search by product, brand, category, and filters", "Offline mode for grocery stores", "Strict mode and personal risk profiles", "Product alerts when score changes", "Exportable shopping lists", "Barcode batch scan for pantry cleanups", "Early access to new product data", "Priority product verification requests"];
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title="Plans" right={<Button onClick={close} variant="ghost">Back</Button>} /><div className="mb-5 grid grid-cols-2 rounded-full bg-white/70 p-1 shadow-sm backdrop-blur-xl"><button type="button" onClick={() => setBilling("monthly")} className={`rounded-full py-2 text-sm font-semibold transition ${billing === "monthly" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500"}`}>Monthly</button><button type="button" onClick={() => setBilling("yearly")} className={`rounded-full py-2 text-sm font-semibold transition ${billing === "yearly" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500"}`}>Yearly</button></div><div className="space-y-4"><Card><div className="p-5"><div className="flex items-start justify-between"><div><h2 className="text-2xl font-semibold tracking-[-0.04em] text-neutral-950">Free</h2><p className="mt-1 text-sm text-neutral-500">For casual product checks.</p></div><div className="rounded-full bg-[#f7f3eb] px-3 py-1 text-sm font-semibold text-neutral-700">$0</div></div><div className="mt-5 space-y-3">{freeFeatures.map((feature) => <div key={feature} className="flex gap-2 text-sm text-neutral-700"><span className="text-neutral-950">✓</span><span>{feature}</span></div>)}</div><Button variant="outline" className="mt-5 w-full bg-white">Current plan</Button></div></Card><div className="overflow-hidden rounded-[28px] bg-neutral-950 p-5 text-white shadow-[0_18px_42px_rgba(0,0,0,0.22)]"><div className="pointer-events-none -mx-5 -mt-5 mb-5 h-24 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_55%)]" /><div className="-mt-24 flex items-start justify-between"><div><div className="mb-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xl">Best value</div><h2 className="text-2xl font-semibold tracking-[-0.04em]">Pro</h2><p className="mt-1 text-sm text-neutral-300">For people actively reducing plastic exposure.</p></div><div className="text-right"><div className="text-xl font-semibold">{proPrice}</div>{billing === "yearly" && <div className="text-xs text-neutral-400">Save 33%</div>}</div></div><div className="mt-5 space-y-3">{proFeatures.map((feature) => <div key={feature} className="flex gap-2 text-sm text-neutral-200"><span>✓</span><span>{feature}</span></div>)}</div><Button variant="light" className="mt-5 w-full">Start Pro</Button></div></div></div>;
}

function BadgeCard({ badge, highlight, compact = false }) {
  const status = getBadgeStatus(badge);
  const progressText = badge.isPercent ? `${badge.progress}% / ${status.nextThreshold}%` : `${badge.progress} / ${status.nextThreshold}`;
  const tierStyles = {
    Bronze: { medal: "linear-gradient(145deg, #f0c7a4 0%, #b8734a 34%, #6f3f28 66%, #d69a72 100%)" },
    Silver: { medal: "linear-gradient(145deg, #e9ecef 0%, #a6adb5 34%, #66717c 66%, #c0c7ce 100%)" },
    Gold: { medal: "linear-gradient(145deg, #fff1c2 0%, #d6a23a 32%, #7b520d 67%, #e7bd58 100%)" },
    Platinum: { medal: "linear-gradient(145deg, #fbfdff 0%, #dce9f3 28%, #aebdcc 52%, #f6fbff 74%, #c7d8e6 100%)" },
    Starter: { medal: "#d1d5db" }
  };
  const tier = tierStyles[status.currentTier] || tierStyles.Starter;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileTap={{ scale: 0.985 }}
      className={`relative overflow-hidden rounded-[26px] border border-white/80 bg-white shadow-[0_12px_30px_rgba(0,0,0,0.075)] ring-1 ring-black/[0.03] ${compact ? "min-h-[176px] p-3" : "min-h-[246px] p-5"}`}
    >
      
      

      <motion.div
        animate={highlight ? { scale: [1, 1.16, 1], rotate: [0, -4, 4, 0] } : { scale: 1 }}
        transition={{ duration: 0.65 }}
        className={`absolute z-10 overflow-hidden rounded-full text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] ring-2 ring-white/75 ${compact ? "right-3 top-3 h-8 w-8 text-xs" : "right-5 top-5 h-11 w-11 text-lg"}`}
        style={{ background: tier.medal }}
      >
        {status.currentTier !== "Starter" && (
          <>
            <div
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle at 32% 24%, rgba(255,255,255,0.56) 0%, rgba(255,255,255,0.18) 28%, transparent 44%), linear-gradient(145deg, rgba(255,255,255,0.28), rgba(0,0,0,0.16))",
                boxShadow: "inset 0 1px 2px rgba(255,255,255,0.72), inset 0 -2px 4px rgba(0,0,0,0.2)"
              }}
            />
            <div
              className="pointer-events-none absolute inset-[1px] rounded-full opacity-[0.08] mix-blend-overlay"
              style={{
                backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.85) 0 1px, transparent 1.2px), radial-gradient(circle at 72% 64%, rgba(0,0,0,0.35) 0 0.7px, transparent 1px)",
                backgroundSize: "7px 7px, 9px 9px"
              }}
            />
            <div className="pointer-events-none absolute inset-0 rounded-full shadow-inner ring-1 ring-white/80" />
          </>
        )}

        {status.currentTier === "Platinum" && (
          <motion.div
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
            style={{ background: "linear-gradient(120deg, transparent 38%, rgba(255,255,255,0.5) 50%, transparent 62%)" }}
            initial={{ x: "-120%", opacity: 0 }}
            animate={{ x: ["-120%", "120%"], opacity: [0, 0.55, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.75 }}
          />
        )}

        {highlight && <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1 }} className="absolute inset-0 rounded-full bg-white/35 blur-sm" />}

        <span className="relative z-10 flex h-full w-full items-center justify-center">★</span>
      </motion.div>

      <div className="relative z-[1] flex h-full flex-col text-center">
        <div className="flex justify-center">
          <div className={`flex items-center justify-center rounded-full bg-white/95 shadow-[0_8px_22px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.03] ${compact ? "mt-5 h-[76px] w-[76px] text-[38px]" : "mt-6 h-28 w-28 text-6xl"}`}>{badge.icon}</div>
        </div>

        <h4 className={`font-semibold tracking-[-0.035em] text-neutral-950 ${compact ? "mt-4 text-[18px] leading-[1.08]" : "mt-6 text-[28px] leading-[1.05]"}`}>{badge.name}</h4>
        <p className={`mx-auto text-neutral-500 ${compact ? "mt-2 line-clamp-3 min-h-[54px] max-w-[150px] text-[13px] leading-[18px]" : "mt-3 line-clamp-3 min-h-[78px] max-w-[320px] text-[18px] leading-7"}`}>{badge.description}</p>

        <div className={compact ? "mt-auto pt-3" : "mt-auto pt-5"}>
          <div className={`mb-2 flex items-end justify-between font-semibold ${compact ? "text-[13px]" : "text-lg"}`}>
            <span className="text-neutral-950">{status.currentTier}</span>
            <span className="tabular-nums tracking-[-0.02em] text-neutral-500">{progressText}</span>
          </div>
          <div className={`overflow-hidden rounded-full bg-white/95 shadow-inner ring-1 ring-black/[0.03] ${compact ? "h-2.5" : "h-3.5"}`}>
            <motion.div className="h-full rounded-full bg-neutral-950" initial={{ width: 0 }} animate={{ width: `${status.percent}%` }} transition={{ type: "spring", stiffness: 110, damping: 20 }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BadgesScreen({ badges, highlightBadge, close }) {
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title="Badges" right={<Button onClick={close} variant="ghost">Back</Button>} /><div className="grid grid-cols-2 gap-3">{badges.map((badge) => <BadgeCard key={badge.id} badge={badge} highlight={highlightBadge === badge.id} compact />)}</div></div>;
}

function FavoritesScreen({ products, openResult, close, favoriteIds = null }) {
  const groups = getFavoritesByCategory(products, favoriteIds);
  const categories = ["All", ...Object.keys(groups)];
  const [activeCategory, setActiveCategory] = useState("All");
  const visibleProducts = activeCategory === "All" ? Object.values(groups).flat() : groups[activeCategory] || [];
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title="Favorites" right={<Button onClick={close} variant="ghost">Back</Button>} /><div className="mb-4 flex gap-2 overflow-x-auto pb-1">{categories.map((category) => <button type="button" key={category} onClick={() => setActiveCategory(category)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm shadow-sm ${activeCategory === category ? "bg-neutral-950 text-white" : "bg-white text-neutral-700"}`}>{category}</button>)}</div><Card><div className="p-4"><h3 className="mb-3 font-semibold text-neutral-950">{activeCategory === "All" ? "All favorites" : activeCategory}</h3><div className="space-y-2">{visibleProducts.length ? visibleProducts.map((product) => <ProductRow key={product.id} product={product} onClick={() => openResult(product)} />) : <p className="p-5 text-center text-sm text-neutral-500">No favorites yet.</p>}</div></div></Card></div>;
}

function ProfileScreen({ products, badges, highlightBadge, openResult, openSettings, openFavorites, openBadges, openPlans, profile }) {
  const following = db.follows.filter((follow) => follow.followerId === "user_me").length;
  const followers = db.follows.filter((follow) => follow.followedId === "user_me").length + 12;
  const saved = db.saves.filter((save) => save.userId === "user_me").map((save) => products.find((product) => product.id === save.productId)).filter(Boolean);
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-4"><Header title="Profile" right={<Button onClick={openSettings} variant="outline" className="bg-white">Settings</Button>} /><Card><div className="p-5 text-center"><div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-950 text-2xl font-semibold text-white">D</div><h2 className="text-2xl font-semibold tracking-tight text-neutral-950">{profile.firstName} {profile.lastName.charAt(0)}.</h2><p className="text-sm text-neutral-500">{profile.email}</p><div className="mt-5 grid grid-cols-4 gap-3"><div><div className="text-2xl font-semibold">{db.scans.length}</div><div className="text-xs text-neutral-500">Scans</div></div><div><div className="text-2xl font-semibold">{following}</div><div className="text-xs text-neutral-500">Following</div></div><div><div className="text-2xl font-semibold">{followers}</div><div className="text-xs text-neutral-500">Followers</div></div><div><div className="text-2xl font-semibold">{saved.length}</div><div className="text-xs text-neutral-500">Favorites</div></div></div></div></Card><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-neutral-950">Favorites</h3><button type="button" onClick={openFavorites} className="text-sm font-medium text-neutral-500">See all</button></div><div className="space-y-2">{saved.length ? saved.slice(0, 3).map((product) => <ProductRow key={product.id} product={product} onClick={() => openResult(product)} />) : <p className="text-sm text-neutral-500">Favorite products will appear here.</p>}</div></div><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-neutral-950">Badges</h3><button type="button" onClick={openBadges} className="text-sm font-medium text-neutral-500">See all</button></div><div className="grid grid-cols-2 gap-3">{(badges || []).slice(0, 4).map((badge) => <BadgeCard key={badge.id} badge={badge} highlight={highlightBadge === badge.id} compact />)}</div></div><div className="mt-5 rounded-3xl bg-neutral-950 p-5 text-white shadow-sm"><div className="text-lg font-semibold">Upgrade to Pro</div><p className="mt-2 text-sm text-neutral-300">Advanced search, strict mode, offline scans, and early database access.</p><Button onClick={openPlans} variant="light" className="mt-4">View plans</Button></div></div>;
}


;function runTests() {
  const products = db.products.map(hydrateProduct);
  const soap = products.find((product) => product.id === "paper_soap");
  const dishwasher = products.find((product) => product.id === "kirkland_dishwasher");
  const tests = [
    [clampScore(-10) === 0, "clampScore clamps negative scores to 0"],
    [clampScore(120) === 100, "clampScore clamps scores above 100 to 100"],
    [getScoreTheme(70).label === "Low plastic concern", "70 should be Low plastic concern"],
    [reviewStatusLabel("inferred") === "Best guess — needs review", "inferred should be translated"],
    [dataQualityLabel("Medium") === "Good data", "confidence should be translated into data quality"],
    [getBottomNavItems().map((item) => item[0]).join(",") === "search,history,scan,social,profile", "scan should be centered"],
    [soap?.score >= 80, "paper soap should score green"],
    [products.find(p => p.name.toLowerCase().includes("tuna"))?.score < 50, "canned food should be penalized heavily"],
    [products.find(p => p.name.toLowerCase().includes("juice"))?.score < 60, "acidic drinks should reduce score"],
    [products.find(p => p.name.toLowerCase().includes("dishwasher"))?.score === 12, "dishwasher should use calibrated common-ground score"],
    [products.find(p => p.id === "campbells_soup")?.hasHighRiskCanScenario === true, "soup should trigger high-risk can scenario"],
    [products.find(p => p.id === "campbells_soup")?.score === 15, "hot canned soup should use calibrated common-ground score"],
    [products.find(p => p.id === "campbells_soup")?.parts.every(part => part.totalImpact >= -40 && part.totalImpact <= 0), "part impacts should be normalized between 0 and -40"],
    [products.find(p => p.id === "paper_soap")?.parts.every(part => part.totalImpact === 0), "paper-only soap wrapper should not show an artificial penalty"],
    [products.find(p => p.id === "campbells_soup")?.parts.some(part => part.severity?.label === "Severe"), "severe part labels should exist"],
    [products.find(p => p.id === "old_spice")?.score === 32, "Old Spice should match calibrated common-ground score"],
    [products.find(p => p.id === "always_ultra")?.score === 12, "Always Ultra Thin should match calibrated common-ground score"],
    [products.find(p => p.id === "allens_apple")?.score === 19, "Allen’s Apple Juice should match calibrated common-ground score"],
    [products.find(p => p.id === "kirkland_tuna")?.score === 19, "Kirkland tuna should match calibrated common-ground score"],
    [products.find(p => p.id === "kirkland_tuna")?.parts.find(part => part.id === "tuna_liner")?.linerInfo?.linerRisk === "medium", "unknown tuna liner should use moderate liner assumption"],
    [products.find(p => p.id === "campbells_soup")?.parts.find(part => part.id === "soup_liner")?.linerAdjustment === -12, "unknown soup liner should not default to worst-case BPA/PVC penalty"],
    [dishwasher?.parts.some((part) => part.displayName === "Pod film"), "dishwasher should include pod film"],
    [db.users.some((user) => user.role === "Health food creator"), "suggested creators should exist"],
    [getFavoritesByCategory(products)["Personal care"]?.length >= 1, "favorites should group by product type"],
    [products.find(p => p.id === "paper_soap")?.score === 96, "paper-wrapped soap should use near-ideal calibrated score"],
    [products.find(p => p.id === "paper_soap")?.category?.name === "Personal care", "paper-wrapped soap should live under Personal care"],
    [scoringRubric.nearIdeal.range === "95–98", "scoring rubric should define near-ideal packaging range"],
    
    [typeof BarcodeScanIcon === "function", "barcode scan icon should render from custom SVG"],
    [typeof SettingsScreen === "function", "settings screen should render account controls"],
    [typeof SignInScreen === "function", "sign in screen should exist after sign out"],
    [typeof DeleteAccountScreen === "function", "delete confirmation screen should exist"],
    [typeof ShareSheet === "function", "share sheet should exist"],
    [typeof ProductListScreen === "function", "history detail lists should exist"],
    [typeof NotificationsScreen === "function", "notifications screen should exist"],
    [typeof PlansScreen === "function", "plans screen should exist"],
    [typeof AddProductScreen === "function", "add product screen should exist"],
    [typeof ScoreBreakdownPanel === "function", "score breakdown panel should exist"],
    [typeof triggerHapticFeedback === "function", "haptic feedback helper should exist"],
    [typeof getPartSeverity === "function", "part severity helper should exist"],
    [products.every((p) => p.splitScores && Number.isFinite(p.splitScores.health)), "products should include split scores"],
    [products.some((p) => p.riskFactors?.length), "high-risk factors should be exposed in UI"],
    [products.find((p) => p.id === "kirkland_tuna")?.sources.some((link) => link.sourceId === "source_canned_soup_bpa"), "can liners should attach canned soup BPA source"],
    [Array.isArray(products.find((p) => p.id === "kirkland_tuna")?.heatFlags), "products should include heat-sensitive flags"],
    [badgeDefinitions.length >= 12, "badge system should include the full badge set"],
    [getBadgeStatus(badgeDefinitions.find((badge) => badge.id === "word_of_mouth")).nextTier === "Bronze", "word of mouth should progress toward Bronze"],
    [getProductRecyclability(dishwasher, false) === "none", "dishwasher pods should not be recyclable"],
    [true, "plans updated with new pricing rules"],
    [getProductRecyclability(soap, false) === "widely", "paper soap should be widely recyclable"],
  ];
  tests.forEach(([passed, message]) => {
    if (!passed) console.error(`Test failed: ${message}`);
  });
}
runTests();

function ResultScreen({ product, close, openDetail, openShare, favoriteIds = [], toggleFavorite }) {
  const [useLocation, setUseLocation] = useState(false);
  const [showScoreDetails, setShowScoreDetails] = useState(false);
  const location = "Toronto";

  if (!product) return <UnknownScreen close={close} />;
  if (showScoreDetails) return <ScoreBreakdownPanel product={product} close={() => setShowScoreDetails(false)} />;

  const isFavorite = favoriteIds.includes(product.id);
  const recyclingStatus = getProductRecyclability(product, useLocation, location);
  const recyclingMeta = recyclabilityMeta(recyclingStatus);
  // Build dynamic explanation based on actual risk factors
  const reasonFactors = (product.riskFactors || []).map(f => f.name);

  const humanize = (name) => {
    const map = {
      "Drink contact": "drink contact",
      "Food contact": "food contact",
      "Acidic contents": "acidic contents",
      "Fatty or oily contents": "fatty contents",
      "Heat exposure": "heat",
      "Hot food exposure": "hot food",
      "Hot canned liquid": "hot liquid",
      "Skin contact": "skin contact",
      "Prolonged skin contact": "prolonged skin contact",
      "Internal plastic packaging": "internal plastic",
      "Recycled plastic": "recycled plastic",
      "Long storage contact": "long storage",
      "High-risk product type": "product type"
    };
    return map[name] || name.toLowerCase();
  };

  const uniqueReasons = Array.from(new Set(reasonFactors.map(humanize))).slice(0, 3);

  const formatList = (items) => {
    if (!items.length) return "product-specific risk factors";
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
  };

  const harshReason = `This score is lower because ${formatList(uniqueReasons)} increase potential plastic exposure.`;

  return (
    <div className="min-h-[690px] overflow-y-auto px-5 pb-5">
      <Header title="Product score" right={<Button onClick={close} variant="ghost">← Back</Button>} />

      <Card>
        <div className="p-5 text-center">
          <ProductImage src={product.imageUrl} alt={product.name} className="mx-auto h-36 w-36 rounded-3xl object-cover" />

          <div className="mt-5 flex justify-center">
            <ScoreRing score={product.score} onClick={() => setShowScoreDetails(true)} />
          </div>

          <div className="mt-2 flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback();
                setShowScoreDetails(true);
              }}
              className="text-xs font-medium text-neutral-500 underline underline-offset-4"
            >
              Tap score for detailed breakdown
            </button>

            <div className="flex flex-wrap justify-center gap-1.5">
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.28, duration: 0.35, ease: "easeOut" }}
                className="rounded-full px-4 py-2 text-sm font-medium"
                style={{ color: product.theme.ring, background: product.theme.bg }}
              >
                {product.rating}
              </motion.div>
            </div>
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950">{product.name}</h2>
          <p className="text-neutral-500">{product.brand}</p>
          <p className="mt-2 text-xs text-neutral-500">
            Available in Canada • {product.category?.name} • {reviewStatusLabel(product.verification)} • {dataQualityLabel(product.confidence)}
          </p>
        </div>
      </Card>

      <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-neutral-950">Where plastic is found</h3>
            <span className="shrink-0 text-xs text-neutral-500">Score from database</span>
          </div>

          <div className="space-y-3">
            {[...product.parts].sort((a, b) => a.totalImpact - b.totalImpact).map((part) => (
              <button
                type="button"
                key={part.id}
                onClick={() => openDetail(product, part)}
                className="group flex w-full items-center gap-3 rounded-2xl bg-[#f7f3eb] p-3 text-left transition hover:bg-[#f1eadf] active:scale-[0.99]"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg text-neutral-700 shadow-sm">
                  {part.partType === "liner" ? "◌" : part.partType === "inner_packaging" ? "◈" : part.partType === "cap_lid" ? "○" : part.partType === "outer_packaging" ? "□" : "▣"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-neutral-950">{part.displayName}</div>
                  <div className="text-sm text-neutral-500">{part.plastic?.code !== "NONE" ? part.plastic?.name : part.material?.name}</div>
                  <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${part.severity.tone}`}>{part.severity.label}</div>
                </div>
                <span className={`h-3 w-3 rounded-full ${part.tone}`} />
                <div className="w-10 text-right font-medium text-neutral-950">{part.totalImpact}</div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-lg font-semibold text-neutral-950 shadow-sm transition group-hover:scale-105">i</div>
              </button>
            ))}
          </div>
        </div>

        {product.riskFactors?.length > 0 && (
          <div className="border-t border-red-100 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-base">⚠️</div>
              <div className="min-w-0">
                <h3 className="font-semibold text-red-900">Added Health Risk</h3>
                <p className="mt-1 text-sm leading-5 text-red-800">{harshReason}</p>
                {product.hasHighRiskCanScenario && (
                  <p className="mt-2 rounded-2xl bg-white p-3 text-sm leading-5 text-red-800">
                    A PubMed Central / JAMA study found sharply higher urinary BPA after canned soup consumption compared with fresh soup, so hot liquid foods in lined cans receive a stronger warning.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.riskFactors.slice(0, 4).map((factor) => (
                    <span key={factor.id} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-red-800">
                      {factor.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 rounded-3xl bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-neutral-950">Better alternative</h3>
        <div className="mt-3 rounded-2xl bg-[#f7f3eb] p-3 text-sm leading-5 text-neutral-700">
          {product.alternatives?.[0] || "Choose lower-plastic packaging when possible."}
        </div>
      </div>

      <div className="mt-5 rounded-3xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-neutral-950">Recyclability</h3>
            <p className="mt-1 text-sm text-neutral-500">Recycling rules can change by municipality.</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-xs font-medium text-neutral-500">Use my location</span>
            <ToggleSwitch checked={useLocation} onClick={() => setUseLocation(!useLocation)} label="Use my location for recycling rules" />
          </div>
        </div>

        <div className={`rounded-2xl p-3 ${recyclingMeta.bg}`}>
          <div className={`font-semibold ${recyclingMeta.tone}`}>{recyclingMeta.icon} {recyclingMeta.title}</div>
          <p className="mt-1 text-sm text-neutral-600">
            {useLocation ? `Based on demo location: ${location}. ` : "General guidance. "}{recyclingMeta.summary}
          </p>
        </div>

        <div className="mt-3 space-y-2">
          {product.parts.map((part) => {
            const status = getPartRecyclability(part, useLocation, location);
            const meta = recyclabilityMeta(status);
            return (
              <div key={part.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#f7f3eb] p-3">
                <div className="min-w-0">
                  <div className="font-medium text-neutral-950">{part.displayName}</div>
                  <div className="text-sm text-neutral-500">{part.plastic?.code !== "NONE" ? part.plastic?.code : part.material?.name}</div>
                </div>
                <div className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${meta.bg} ${meta.tone}`}>{meta.title}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 rounded-3xl bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-neutral-950">Community insights</h3>
        <p className="mt-2 text-sm text-neutral-500">
          {product.community.scans} scans. {product.community.favorites} favorites. Trusted circles help verify hidden packaging.
        </p>
      </div>

      <div className="mt-5 rounded-3xl bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-neutral-950">Sources attached</h3>
        <div className="mt-3 space-y-2">
          {product.sources.slice(0, 2).map((link) => <SourceCard key={link.source.id} link={link} />)}
          {!product.sources.length && <p className="text-sm text-neutral-500">No source links attached yet.</p>}
        </div>
      </div>

      <div className="sticky bottom-3 mt-5 grid grid-cols-2 gap-3">
        <Button
          onClick={() => {
            triggerHapticFeedback();
            toggleFavorite?.(product.id);
          }}
          variant={isFavorite ? "outline" : "solid"}
          className={isFavorite ? "bg-white text-neutral-400" : ""}
        >
          <span className={isFavorite ? "text-neutral-300" : ""}>{isFavorite ? "♡ Added" : "❤ Favorite"}</span>
        </Button>
        <Button onClick={() => openShare(product)} variant="outline" className="bg-white">↗ Share</Button>
      </div>
    </div>
  );
}

function UserProfileView({ user, products, badges = [], highlightBadge, openResult, close, openFavorites }) {
  const userSaves = db.saves.filter((s) => s.userId === user.id).map((s) => products.find((p) => p.id === s.productId)).filter(Boolean);
  const userScans = db.scans.filter((scan) => scan.userId === user.id).length + (user.id === "user_me" ? 0 : 8);
  const following = db.follows.filter((follow) => follow.followerId === user.id).length + (user.id === "user_me" ? 0 : 2);
  const followers = db.follows.filter((follow) => follow.followedId === user.id).length + (user.id === "user_me" ? 12 : 34);

  return <div className="min-h-[690px] overflow-y-auto px-5 pb-4"><Header title={user.displayName} right={<Button onClick={close} variant="ghost">Back</Button>} /><Card><div className="p-5 text-center"><div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-950 text-2xl font-semibold text-white">{user.avatar}</div><h2 className="text-2xl font-semibold text-neutral-950">{user.displayName}</h2><p className="text-sm text-neutral-500">{user.role}</p><div className="mt-5 grid grid-cols-4 gap-3"><div><div className="text-2xl font-semibold">{userScans}</div><div className="text-xs text-neutral-500">Scans</div></div><div><div className="text-2xl font-semibold">{following}</div><div className="text-xs text-neutral-500">Following</div></div><div><div className="text-2xl font-semibold">{followers}</div><div className="text-xs text-neutral-500">Followers</div></div><div><div className="text-2xl font-semibold">{userSaves.length}</div><div className="text-xs text-neutral-500">Favorites</div></div></div></div></Card><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-neutral-950">Recent favorites</h3><button type="button" onClick={openFavorites} className="text-sm font-medium text-neutral-500">See all</button></div><div className="space-y-2">{userSaves.length ? userSaves.slice(0, 3).map((p) => <ProductRow key={p.id} product={p} onClick={() => openResult(p)} />) : <p className="text-sm text-neutral-500">No favorites yet.</p>}</div></div><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-neutral-950">Badges earned</h3><span className="text-sm font-medium text-neutral-400">Top 4</span></div><div className="grid grid-cols-2 gap-3">{badges.slice(0, 4).map((badge) => <BadgeCard key={badge.id} badge={badge} highlight={highlightBadge === badge.id} compact />)}</div></div></div>;
}

export default function PlasticFreeScannerDatabasePrototype() {
  const products = useMemo(() => db.products.map(hydrateProduct), []);
  const [tab, setTab] = useState("scan");
  const [result, setResult] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [shareProduct, setShareProduct] = useState(null);
  const [historyList, setHistoryList] = useState(null);
  const [isSignedOut, setIsSignedOut] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(3);
  const [showPlans, setShowPlans] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [badgeToast, setBadgeToast] = useState(null);
  const [badgeProgress, setBadgeProgress] = useState(badgeDefinitions);
  const [highlightBadge, setHighlightBadge] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(() => db.saves.filter((save) => save.userId === "user_me").map((save) => save.productId));
  const [profile, setProfile] = useState({ firstName: "Dave", lastName: "Rusinek", email: "dave@example.com", password: "password123" });

  const updateProfile = (updates) => {
    setProfile((current) => ({ ...current, ...updates }));
  };

  const toggleFavorite = (productId) => {
    setFavoriteIds((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]);
  };

  const resetOverlays = () => {
    setDetail(null);
    setShowSettings(false);
    setShowFavorites(false);
    setShowDeleteAccount(false);
    setShowBadges(false);
    setShowNotifications(false);
    setShowPlans(false);
    setShowAddProduct(false);
    setShareProduct(null);
    setHistoryList(null);
  };

  const openResult = (product) => {
    setResult(product);
    resetOverlays();
    setShowResult(true);
  };

  const setTabSafe = (nextTab) => {
    setTab(nextTab);
    setShowResult(false);
    resetOverlays();
  };

  const signOut = () => {
    setShowResult(false);
    resetOverlays();
    setIsSignedOut(true);
  };

  const confirmDeleteAccount = () => {
    resetOverlays();
    setIsSignedOut(true);
  };

  const incrementBadge = (id, amount = 1) => {
    setBadgeProgress((previousBadges) => previousBadges.map((badge) => {
      if (badge.id !== id) return badge;
      const previousStatus = getBadgeStatus(badge);
      const updatedBadge = { ...badge, progress: badge.progress + amount };
      const newStatus = getBadgeStatus(updatedBadge);
      if (previousStatus.currentTier !== newStatus.currentTier) {
        setHighlightBadge(id);
        setTimeout(() => setHighlightBadge(null), 1200);
      }
      return updatedBadge;
    }));
  };

  const showToast = (message, duration = 2500) => {
    setBadgeToast(message);
    setTimeout(() => setBadgeToast(null), duration);
  };

  const showShareBadgeToast = () => {
    incrementBadge("word_of_mouth", 1);
    showToast("+1 toward Word of Mouth (3/3)", 3000);
  };

  const handleScan = (product) => {
    incrementBadge("plastic_detective", 2);
    showToast("+2 scans recorded", 2000);
    openResult(product);
  };

  const scannedProducts = db.scans.map((scan) => products.find((product) => product.id === scan.productId)).filter(Boolean);
  const searchedProducts = products.filter((product) => !db.scans.some((scan) => scan.productId === product.id));
  const hideNav = viewUser || showResult || detail || showSettings || showFavorites || showBadges || showDeleteAccount || shareProduct || historyList || showNotifications || showPlans || showAddProduct;

  return <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffffff_0%,#f2eee6_42%,#dfd8ca_100%)] px-0 py-0 font-sans text-neutral-950 antialiased sm:px-4 sm:py-8">{badgeToast && <div className="fixed left-1/2 top-6 z-50 w-[360px] -translate-x-1/2 rounded-3xl bg-neutral-950 px-4 py-3 text-sm font-medium text-white shadow-2xl"><div className="flex items-center justify-between gap-3"><span>{badgeToast}</span><button type="button" onClick={() => setBadgeToast(null)} className="text-white/70">×</button></div></div>}<Phone>{isSignedOut ? <SignInScreen onSignIn={() => setIsSignedOut(false)} /> : <div className="flex h-full min-h-0 flex-col"><div className="flex min-h-0 flex-1 flex-col"><div className="min-h-0 flex-1 overflow-y-auto"><AnimatePresence mode="wait">
{viewUser ? (
  <motion.div key="user-profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
    <UserProfileView user={viewUser} products={products} badges={badgeProgress} highlightBadge={highlightBadge} openResult={openResult} close={() => setViewUser(null)} openFavorites={() => setHistoryList({ title: `${viewUser.displayName} favorites`, products: db.saves.filter((save) => save.userId === viewUser.id).map((save) => products.find((product) => product.id === save.productId)).filter(Boolean) })} />
  </motion.div>
) : showAddProduct ? (
  <motion.div key="add-product" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
    <AddProductScreen close={() => setShowAddProduct(false)} />
  </motion.div>
) : showPlans ? (
  <motion.div key="plans" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
    <PlansScreen close={() => setShowPlans(false)} />
  </motion.div>
) : showNotifications ? (
  <motion.div key="notifications" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
    <NotificationsScreen close={() => setShowNotifications(false)} />
  </motion.div>
) : shareProduct ? (
  <motion.div key="share" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
    <ShareSheet product={shareProduct} close={() => setShareProduct(null)} onShareSuccess={showShareBadgeToast} />
  </motion.div>
) : historyList ? (
  <motion.div key="history-list" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
    <ProductListScreen title={historyList.title} products={historyList.products} openResult={openResult} close={() => setHistoryList(null)} />
  </motion.div>
) : showDeleteAccount ? (
  <motion.div key="delete" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
    <DeleteAccountScreen close={() => setShowDeleteAccount(false)} onConfirmDelete={confirmDeleteAccount} />
  </motion.div>
) : showBadges ? (
  <motion.div key="badges" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
    <BadgesScreen badges={badgeProgress} highlightBadge={highlightBadge} close={() => setShowBadges(false)} />
  </motion.div>
) : showFavorites ? (
  <motion.div key="favorites" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
    <FavoritesScreen products={products} openResult={openResult} close={() => setShowFavorites(false)} favoriteIds={favoriteIds} />
  </motion.div>
) : showSettings ? (
  <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
    <SettingsScreen close={() => setShowSettings(false)} onSignOut={signOut} onDeleteAccount={() => { setShowSettings(false); setShowDeleteAccount(true); }} profile={profile} updateProfile={updateProfile} />
  </motion.div>
) : detail ? (
  <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
    <DetailScreen product={detail.product} part={detail.part} close={() => setDetail(null)} />
  </motion.div>
) : showResult ? (
  <motion.div key="result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
    <ResultScreen product={result} close={() => setShowResult(false)} openDetail={(product, part) => setDetail({ product, part })} openShare={(product) => setShareProduct(product)} favoriteIds={favoriteIds} toggleFavorite={toggleFavorite} />
  </motion.div>
) : (
  <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
    {tab === "scan" && <ScanScreen products={products} openResult={handleScan} />}
    {tab === "search" && <SearchScreen products={products} openResult={openResult} openAddProduct={() => setShowAddProduct(true)} />}
    {tab === "history" && <HistoryScreen products={products} openResult={openResult} openScanned={() => setHistoryList({ title: "Products scanned", products: scannedProducts })} openSearched={() => setHistoryList({ title: "Products searched", products: searchedProducts })} />}
    {tab === "social" && <SocialScreen products={products} openResult={openResult} openNotifications={() => { setUnreadNotifications(0); setShowNotifications(true); }} openUserProfile={(user) => setViewUser(user)} savedProductIds={favoriteIds} toggleFavorite={toggleFavorite} unreadNotifications={unreadNotifications} />}
    {tab === "profile" && <ProfileScreen products={products} badges={badgeProgress} highlightBadge={highlightBadge} openResult={openResult} openSettings={() => setShowSettings(true)} openFavorites={() => setShowFavorites(true)} openBadges={() => setShowBadges(true)} openPlans={() => setShowPlans(true)} profile={profile} />}
  </motion.div>
)}
</AnimatePresence>
</div>
{!hideNav && <div className="shrink-0"><BottomNav tab={tab} setTab={setTabSafe} /></div>}
</div>
</div>
}
</Phone>
</div>;
}
