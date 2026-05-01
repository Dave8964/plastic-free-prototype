import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { plasticListEvidence, plasticListProductContexts, plasticListProductParts, plasticListProducts } from "./plasticListSeed";

const plasticListBrandAliases = {
  "Boudin Sourdough": "Boudin",
  "Tartine Sourdough": "Tartine",
  "Haribo Goldbears": "Haribo",
  "M&M's Peanut": "M&M's",
  "Sour Patch": "Sour Patch Kids",
  "Kelloggs Froot": "Kellogg's",
  "Ghirardelli Intense": "Ghirardelli",
  "Ghirardelli Sweet": "Ghirardelli",
  "Nespresso Medium": "Nespresso",
  "Philz Medium": "Philz",
  "Tartine Medium": "Tartine",
  "Verve Medium": "Verve",
  "Clover Organic": "Clover",
  "Clover Whole": "Clover",
  "Good": "Good & Gather",
  "Raw Cow": "Raw Cow Milk",
  "Oatly Oatmilk": "Oatly",
  "Gatorade Thirst": "Gatorade",
  "Celsius Sparkling": "Celsius",
  "Guayaki Organic": "Guayaki",
  "Chipotle Burrito": "Chipotle",
  "In-n-Out Cheeseburger": "In-N-Out",
  "In-n-Out Vanilla": "In-N-Out",
  "Subway Chocolate": "Subway",
  "Subway Sub": "Subway",
  "Wendy's Chocolate": "Wendy's",
  "Wendy's Crispy": "Wendy's",
  "Wendy's Dave's": "Wendy's",
  "Ben & Jerry": "Ben & Jerry's",
  "Impossible Impossible": "Impossible",
  "Ricola Honey": "Ricola",
  "Tylenol Acetaminophen": "Tylenol",
  "Colgate Cavity": "Colgate",
  "Colgate Post-Brush": "Colgate",
  "Colgate Pre-Brush": "Colgate",
  "Amy's Black": "Amy's",
  "Kraft Mac": "Kraft",
  "Sweetgreen Chicken": "Sweetgreen",
  "Trader Joe": "Trader Joe's",
  "Driscoll's Non-Organic": "Driscoll's",
  "Fairlife Core": "Fairlife",
  "KIND Dark": "KIND",
  "Coca-Cola Diet": "Coca-Cola",
  "Coca-Cola Original": "Coca-Cola",
  "Coca-Cola Zero": "Coca-Cola",
  "Thorne Basic": "Thorne",
  "Thorne Prenatal": "Thorne",
  "Rishi English": "Rishi",
  "Tazo Awake": "Tazo",
  "Smeraldina Still": "Smeraldina",
  "Brita Filtered": "Brita",
  "Unfiltered Tap": "Tap Water",
};

const plasticListBrandStripPrefixes = {
  "M&M's Peanut": "M&M's",
  "Kelloggs Froot": "Kelloggs",
  "In-n-Out Cheeseburger": "In-n-Out",
  "In-n-Out Vanilla": "In-n-Out",
  "Ben & Jerry": "Ben & Jerry",
  "Trader Joe": "Trader Joe",
};

const plasticListGenericBrands = new Set(["Breast Milk", "Paper Receipt", "Tap Water", "Cane Sugar", "Cocoa Powder", "Cold Tablets", "Cracker", "Milk Chocolate", "Peanut Butter", "Powdered Milk"]);

function stripBrandFromProductName(name, brand) {
  const normalizedName = name.trim();
  const normalizedBrand = brand.trim();
  if (!normalizedName || !normalizedBrand) return normalizedName;
  const lowerName = normalizedName.toLowerCase();
  const lowerBrand = normalizedBrand.toLowerCase();
  if (lowerName === lowerBrand) return normalizedName;
  if (!lowerName.startsWith(`${lowerBrand} `)) return normalizedName;
  return normalizedName.slice(normalizedBrand.length).trim().replace(/^[-:]+/, "").trim() || normalizedName;
}

function normalizePlasticListProduct(product) {
  const brand = plasticListBrandAliases[product.brand] || product.brand;
  const stripPrefix = plasticListBrandStripPrefixes[product.brand] || brand;
  const shouldStripBrand = !plasticListGenericBrands.has(brand);
  return {
    ...product,
    brand,
    name: shouldStripBrand ? stripBrandFromProductName(product.name, stripPrefix) : product.name,
  };
}

const normalizedPlasticListProducts = plasticListProducts.map(normalizePlasticListProduct);

const db = {
  categories: [
    { id: "cat_personal", name: "Personal care", baseScore: 80 },
    { id: "cat_food_drink", name: "Food and drink", baseScore: 45 },
    { id: "cat_cleaning", name: "Household cleaning", baseScore: 80 },
    { id: "cat_hygiene", name: "Feminine hygiene", baseScore: 70 },
    { id: "cat_sexual_health", name: "Sexual health", baseScore: 65 },
    { id: "cat_plastic_free", name: "Plastic-free / no packaging", baseScore: 100 },
    { id: "cat_health", name: "Health & supplements", baseScore: 55 },
    { id: "cat_receipts", name: "Receipts & paper contact", baseScore: 35 },
  ],
  plasticTypes: [
    { id: "pet1", code: "PET-1", name: "Polyethylene terephthalate", recyclability: "widely", municipal: { Toronto: "widely", Vancouver: "widely", Peel: "widely" } },
    { id: "pp5", code: "PP-5", name: "Polypropylene", recyclability: "limited", municipal: { Toronto: "limited", Vancouver: "widely", Peel: "limited" } },
    { id: "hdpe2", code: "HDPE-2", name: "High-density polyethylene", recyclability: "widely", municipal: { Toronto: "widely", Vancouver: "widely", Peel: "widely" } },
    { id: "ldpe4", code: "LDPE-4", name: "Low-density polyethylene", recyclability: "limited", municipal: { Toronto: "limited", Vancouver: "limited", Peel: "none" } },
    { id: "pva", code: "PVA-PVOH", name: "Polyvinyl alcohol", recyclability: "none", municipal: { Toronto: "none", Vancouver: "none", Peel: "none" } },
    { id: "unknown_plastic", code: "UNKNOWN", name: "Unknown plastic", recyclability: "unknown", municipal: { Toronto: "unknown", Vancouver: "unknown", Peel: "unknown" } },
    { id: "latex_rubber", code: "LATEX", name: "Standard rubber latex", recyclability: "none", municipal: { Toronto: "none", Vancouver: "none", Peel: "none" } },
    { id: "synthetic_condom", code: "SYNTHETIC", name: "Polyurethane / polyisoprene / nitrile", recyclability: "none", municipal: { Toronto: "none", Vancouver: "none", Peel: "none" } },
    { id: "none", code: "NONE", name: "No plastic detected", recyclability: "not_applicable", municipal: { Toronto: "not_applicable", Vancouver: "not_applicable", Peel: "not_applicable" } },
  ],
  materials: [
    { id: "glass", name: "Glass", recyclability: "widely" },
    { id: "plastic", name: "Plastic", recyclability: "limited" },
    { id: "paper", name: "Uncoated paper", recyclability: "widely" },
    { id: "metal", name: "Metal", recyclability: "widely" },
    { id: "mixed", name: "Mixed multilayer material", recyclability: "limited" },
    { id: "rubber_latex", name: "Rubber latex", recyclability: "none" },
    { id: "synthetic_condom_material", name: "Synthetic non-latex material", recyclability: "none" },
    { id: "natural_membrane", name: "Natural membrane", recyclability: "not_applicable" },
    { id: "liner_epoxy_bpa", name: "BPA epoxy can liner", recyclability: "limited", linerRisk: "high", linerImpact: -22, linerLabel: "BPA epoxy liner", linerSummary: "Older or some imported cans may use BPA-based epoxy. Treat as higher concern, especially with food contact." },
    { id: "liner_pvc", name: "PVC / vinyl organosol can liner", recyclability: "limited", linerRisk: "high", linerImpact: -22, linerLabel: "PVC/vinyl liner", linerSummary: "PVC and vinyl organosol liners can raise chemical migration concerns and should score aggressively." },
    { id: "liner_bpa_free_epoxy", name: "BPA-free epoxy / BPANI liner", recyclability: "limited", linerRisk: "medium", linerImpact: -8, linerLabel: "BPA-free epoxy liner", linerSummary: "BPA-free or BPANI linings are an improvement, but still use synthetic food-contact resins." },
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
    { id: "heat", name: "Manufacturing heat exposure", penalty: -25, summary: "Heat during processing, filling, storage, or normal product use can increase plastic leaching risk." },
    { id: "skin", name: "Skin contact", penalty: -10, summary: "Plastic in skin-contact products may transfer microplastics." },
    { id: "prolonged_skin", name: "Prolonged skin contact", penalty: -20, summary: "Extended skin exposure increases absorption risk." },
    { id: "sti_limitation", name: "STI protection limitation", penalty: -10, summary: "Natural membrane condoms can reduce pregnancy risk, but are not recommended for HIV/STI prevention because small pores can allow viruses through." },
    { id: "reuse", name: "Repeated use or friction", penalty: -10, summary: "Repeated use increases microplastic shedding." },
    { id: "internal", name: "Internal plastic packaging", penalty: -18, summary: "Hidden plastics often go unnoticed but increase exposure." },
    { id: "hot_food", name: "Hot food contact", penalty: -30, summary: "The food itself is hot while touching plastic or a can liner, which is a higher-contact exposure scenario." },
    { id: "recycled_plastic", name: "Recycled plastic", penalty: -20, summary: "Recycled plastics may contain contaminants like flame retardants." },
    { id: "long_storage", name: "Long storage contact", penalty: -8, summary: "Long shelf-life contact with liners or plastic packaging can increase concern over time." },
    { id: "heat_sensitive", name: "Heat-sensitive product", penalty: -20, summary: "This product type is often exposed to heat, hot liquids, or hot food, which increases leaching concern." }
  ],
  sources: [
    { id: "source_cfia", title: "Bisphenol A and BPA Alternatives in Selected Canned Foods", organization: "Canadian Food Inspection Agency", credibility: "High", summary: "Food can linings may contain bisphenols or alternatives that can migrate under some conditions." },
    { id: "source_fda", title: "Food Contact Substances", organization: "U.S. Food and Drug Administration", credibility: "High", summary: "Food-contact packaging risk depends on material, use case, and exposure conditions." },
    { id: "source_pva", title: "Water-soluble polymer films in detergent pods", organization: "Material notes", credibility: "Medium", summary: "Many dishwasher and laundry pods use water-soluble PVA/PVOH film, a synthetic polymer rather than gelatin." },
    { id: "source_canned_soup_bpa", title: "Canned Soup Consumption and Urinary Bisphenol A", organization: "PubMed Central / JAMA", credibility: "High", summary: "A randomized crossover study found substantially higher urinary BPA after participants consumed canned soup daily compared with fresh soup, supporting added caution for heated liquid foods in lined cans." },
    { id: "source_plasticlist", title: "Data on Plastic Chemicals in Bay Area Foods", organization: "PlasticList", credibility: "High", summary: "PlasticList tested Bay Area food samples for plastic-related chemicals including phthalates and bisphenols. Results are sample-based and may vary by batch, location, and date.", license: "CC BY 4.0", url: "https://www.plasticlist.org/", accessDate: "Jan 09, 2025" },
    { id: "source_cdc_condoms", title: "Condom Use and HIV/STI Prevention", organization: "CDC", credibility: "High", summary: "CDC guidance supports latex condoms for HIV prevention, notes synthetic non-latex options for people with latex allergies, and warns that natural membrane condoms are not recommended for HIV/STI prevention." },
  ],
  products: [
    { id: "old_spice", name: "Pure Sport Deodorant", brand: "Old Spice", categoryId: "cat_personal", imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "Medium", verification: "inferred" },
    { id: "always_ultra", name: "Ultra Thin", brand: "Always", categoryId: "cat_hygiene", imageUrl: "https://images.unsplash.com/photo-1583946099379-f9c9cb8bc030?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "Low", verification: "inferred" },
    { id: "allens_apple", name: "Apple Juice", brand: "Allen’s", categoryId: "cat_food_drink", imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "Medium", verification: "inferred" },
    { id: "kirkland_tuna", name: "Solid Light Tuna", brand: "Kirkland Signature", categoryId: "cat_food_drink", imageUrl: "https://images.unsplash.com/photo-1584269600519-1123c7b0e6f6?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "Low", verification: "inferred" },
    { id: "kirkland_dishwasher", name: "UltraShine Dishwasher Detergent", brand: "Kirkland Signature", categoryId: "cat_cleaning", productType: "dishwasher_detergent", imageUrl: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "Medium", verification: "inferred" },
    { id: "blueland_dishwasher_tablets", name: "Dishwasher Detergent Tablets", brand: "Blueland", categoryId: "cat_cleaning", productType: "dishwasher_detergent", imageUrl: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?q=80&w=800&auto=format&fit=crop", country: "US", confidence: "Medium", verification: "community_verified", scoringNote: "Modeled as a lower-plastic dishwasher detergent option with paper packaging and no dissolvable PVA pod film." },
    { id: "paper_soap", name: "Paper-Wrapped Bar Soap", brand: "Local Maker", categoryId: "cat_personal", productType: "bar_soap", imageUrl: "https://images.unsplash.com/photo-1607006483224-21d4b8bc8bd7?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "High", verification: "community_verified", scoringNote: "Uncoated paper has minimal impact but still involves packaging and processing. Slight deduction versus true zero-packaging soap." },
    { id: "campbells_soup", name: "Tomato Soup", brand: "Campbell’s", categoryId: "cat_food_drink", imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "Medium", verification: "inferred" },
    { id: "hunts_tomato_paste", name: "Tomato Paste", brand: "Hunt’s", categoryId: "cat_food_drink", imageUrl: "https://images.unsplash.com/photo-1584269600519-1123c7b0e6f6?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "High", verification: "community_verified", barcode: "00027000379355", scoreOverride: 82, scoringNote: "Packaging label confirms a non-BPA liner and recyclable metal can. This earns a strong mainstream score, with a small caution because acidic tomato paste remains in contact with a synthetic can lining." },
    { id: "safechoice_latex_condoms", name: "Classic Latex Condoms", brand: "SafeChoice", categoryId: "cat_sexual_health", productType: "condom", imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "Low", verification: "inferred", scoreOverride: 18, scoringNote: "Fake starter product. Latex is modeled as the plastic-exposure baseline for this category, while still being a standard STI-prevention material." },
    { id: "clearfit_nonlatex_condoms", name: "Non-Latex Condoms", brand: "ClearFit", categoryId: "cat_sexual_health", productType: "condom", imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800&auto=format&fit=crop", country: "US", confidence: "Low", verification: "inferred", scoreOverride: 46, scoringNote: "Fake starter product. Synthetic non-latex materials are modeled as a better option for latex allergies and lower concern than standard latex in this app's plastic-exposure rubric." },
    { id: "heritage_natural_skin_condoms", name: "Natural Skin Condoms", brand: "Heritage", categoryId: "cat_sexual_health", productType: "condom", imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800&auto=format&fit=crop", country: "US", confidence: "Low", verification: "inferred", scoreOverride: 84, scoringNote: "Fake starter product. Scores best for plastic exposure, but natural membrane condoms are not recommended for HIV/STI prevention." },
    ...normalizedPlasticListProducts,
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
    { id: "blueland_dish_box", productId: "blueland_dishwasher_tablets", partType: "outer_packaging", displayName: "Paper pouch", materialId: "paper", plasticTypeId: "none", baseImpact: 0, materialImpact: 0, notes: "Modeled as paper packaging rather than a rigid plastic tub." },
    { id: "blueland_dish_tablet", productId: "blueland_dishwasher_tablets", partType: "product_component", displayName: "Unwrapped tablet", materialId: "mixed", plasticTypeId: "none", baseImpact: -4, materialImpact: 0, notes: "The tablet is modeled without an individual dissolvable PVA pod film." },
    { id: "soap_wrap", productId: "paper_soap", partType: "outer_packaging", displayName: "Wrapper", materialId: "paper", plasticTypeId: "none", baseImpact: 0, materialImpact: 0, notes: "Paper wrapper only." },
    { id: "soup_can", productId: "campbells_soup", partType: "main_container", displayName: "Steel can", materialId: "metal", plasticTypeId: "none", baseImpact: 0, materialImpact: 0, notes: "Main can body is steel." },
    { id: "soup_liner", productId: "campbells_soup", partType: "liner", displayName: "Can liner", materialId: "liner_unknown", plasticTypeId: "unknown_plastic", baseImpact: -8, materialImpact: 0, linerType: "unknown", notes: "Soup cans commonly use a protective internal liner. Unknown modern liners are scored as moderate concern, then soup receives extra risk from heat, acidity, liquid contact, and long storage." },
    { id: "hunts_can", productId: "hunts_tomato_paste", partType: "main_container", displayName: "Metal can", materialId: "metal", plasticTypeId: "none", baseImpact: 0, materialImpact: 0, recyclingClaim: "label_confirmed", notes: "The label identifies this as a recyclable metal can." },
    { id: "hunts_liner", productId: "hunts_tomato_paste", partType: "liner", displayName: "Can liner", materialId: "liner_bpa_free_epoxy", plasticTypeId: "unknown_plastic", baseImpact: 0, materialImpact: 0, linerType: "bpa_free_confirmed", labelClaim: "NON BPA Liner", notes: "The label confirms a non-BPA liner. This reduces BPA concern, but the lining is still a synthetic food-contact coating attached to the can." },
    { id: "safechoice_latex_condom", productId: "safechoice_latex_condoms", partType: "product_component", displayName: "Latex condom", materialId: "rubber_latex", plasticTypeId: "latex_rubber", baseImpact: -18, materialImpact: -20, notes: "Standard rubber latex condom. Modeled as the highest plastic-exposure concern in this starter condom set, while still carrying the standard STI-prevention note from public-health guidance." },
    { id: "safechoice_condom_box", productId: "safechoice_latex_condoms", partType: "outer_packaging", displayName: "Paper box", materialId: "paper", plasticTypeId: "none", baseImpact: 0, materialImpact: 0, notes: "Outer cardboard box. Recycle only if clean and accepted locally." },
    { id: "safechoice_condom_wrapper", productId: "safechoice_latex_condoms", partType: "inner_packaging", displayName: "Foil wrapper", materialId: "mixed", plasticTypeId: "unknown_plastic", baseImpact: -4, materialImpact: -6, notes: "Individual condom wrapper is usually a foil/plastic laminate and is not the same as the condom itself." },
    { id: "clearfit_synthetic_condom", productId: "clearfit_nonlatex_condoms", partType: "product_component", displayName: "Synthetic non-latex condom", materialId: "synthetic_condom_material", plasticTypeId: "synthetic_condom", baseImpact: -10, materialImpact: -12, notes: "Polyurethane, polyisoprene, or nitrile style condom. Modeled as a better non-latex option for allergy use, but still a synthetic product in direct body contact." },
    { id: "clearfit_condom_box", productId: "clearfit_nonlatex_condoms", partType: "outer_packaging", displayName: "Paper box", materialId: "paper", plasticTypeId: "none", baseImpact: 0, materialImpact: 0, notes: "Outer cardboard box. Recycle only if clean and accepted locally." },
    { id: "clearfit_condom_wrapper", productId: "clearfit_nonlatex_condoms", partType: "inner_packaging", displayName: "Foil wrapper", materialId: "mixed", plasticTypeId: "unknown_plastic", baseImpact: -4, materialImpact: -6, notes: "Individual condom wrapper is usually a foil/plastic laminate and is not the same as the condom itself." },
    { id: "heritage_natural_membrane_condom", productId: "heritage_natural_skin_condoms", partType: "product_component", displayName: "Natural membrane condom", materialId: "natural_membrane", plasticTypeId: "none", baseImpact: 0, materialImpact: 0, notes: "Natural skin or lambskin-style membrane. Lower plastic exposure, but not recommended for HIV/STI prevention because small pores can allow viruses through." },
    { id: "heritage_condom_box", productId: "heritage_natural_skin_condoms", partType: "outer_packaging", displayName: "Paper box", materialId: "paper", plasticTypeId: "none", baseImpact: 0, materialImpact: 0, notes: "Outer cardboard box. Recycle only if clean and accepted locally." },
    { id: "heritage_condom_wrapper", productId: "heritage_natural_skin_condoms", partType: "inner_packaging", displayName: "Foil wrapper", materialId: "mixed", plasticTypeId: "unknown_plastic", baseImpact: -4, materialImpact: -6, notes: "Individual condom wrapper is usually a foil/plastic laminate and is not the same as the condom itself." },
    ...plasticListProductParts,
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
    { id: "ctx_hunts_food", productId: "hunts_tomato_paste", partId: "hunts_liner", contextId: "food_contact" },
    { id: "ctx_hunts_acid", productId: "hunts_tomato_paste", partId: "hunts_liner", contextId: "acidic" },
    { id: "ctx_hunts_storage", productId: "hunts_tomato_paste", partId: "hunts_liner", contextId: "long_storage" },
    { id: "ctx_safechoice_skin", productId: "safechoice_latex_condoms", partId: "safechoice_latex_condom", contextId: "prolonged_skin" },
    { id: "ctx_clearfit_skin", productId: "clearfit_nonlatex_condoms", partId: "clearfit_synthetic_condom", contextId: "prolonged_skin" },
    { id: "ctx_heritage_sti", productId: "heritage_natural_skin_condoms", partId: "heritage_natural_membrane_condom", contextId: "sti_limitation" },
    ...plasticListProductContexts,
  ],
  sourceLinks: [
    { sourceId: "source_cfia", entityType: "part", entityId: "tuna_liner" },
    { sourceId: "source_cfia", entityType: "part", entityId: "soup_liner" },
    { sourceId: "source_canned_soup_bpa", entityType: "part", entityId: "soup_liner" },
    { sourceId: "source_fda", entityType: "context", entityId: "drink_contact" },
    { sourceId: "source_pva", entityType: "part", entityId: "dish_podfilm" },
    { sourceId: "source_pva", entityType: "plastic_type", entityId: "pva" },
    { sourceId: "source_cdc_condoms", entityType: "part", entityId: "safechoice_latex_condom" },
    { sourceId: "source_cdc_condoms", entityType: "part", entityId: "clearfit_synthetic_condom" },
    { sourceId: "source_cdc_condoms", entityType: "part", entityId: "heritage_natural_membrane_condom" },
    { sourceId: "source_cdc_condoms", entityType: "part", entityId: "safechoice_condom_wrapper" },
    { sourceId: "source_cdc_condoms", entityType: "part", entityId: "clearfit_condom_wrapper" },
    { sourceId: "source_cdc_condoms", entityType: "part", entityId: "heritage_condom_wrapper" },
    { sourceId: "source_cdc_condoms", entityType: "context", entityId: "sti_limitation" },
  ],
  plasticListEvidence,
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
  if (value >= 92) return { ring: "#00894b", bg: "#e6f8ef", label: "Near-ideal" };
  if (value >= 80) return { ring: "#63b879", bg: "#eff9f2", label: "Very low concern" };
  if (value >= 61) return { ring: "#9edba9", bg: "#f3fbf5", label: "Low plastic concern" };
  if (value >= 21) return { ring: "#c59622", bg: "#fff4d8", label: "Likely hidden plastic" };
  return { ring: "#9f2d28", bg: "#f8e8e6", label: "Contains plastic" };
}

const getScoreBadgeStyle = (theme) => ({
  color: theme.ring,
  background: theme.bg,
});

function reviewStatusLabel(value) {
  return { inferred: "Best guess — needs review", unverified: "Needs review", community_verified: "Community checked", brand_verified: "Brand confirmed", expert_verified: "Expert checked", external_tested: "External lab data" }[value] || "Needs review";
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

function localizedRecyclabilityMeta(status) {
  const map = {
    widely: { icon: "✅", title: "Accepted locally", tone: "text-emerald-800", bg: "bg-emerald-50" },
    limited: { icon: "⚠️", title: "Accepted with conditions", tone: "text-amber-800", bg: "bg-amber-50" },
    none: { icon: "❌", title: "Not accepted locally", tone: "text-red-800", bg: "bg-red-50" },
    unknown: { icon: "？", title: "Needs local check", tone: "text-neutral-700", bg: "bg-neutral-100" },
    not_applicable: { icon: "—", title: "No plastic recycling needed", tone: "text-neutral-700", bg: "bg-neutral-100" },
  };
  return map[status] || map.unknown;
}

function attachedLinerRecyclabilityMeta() {
  return { icon: "⚠️", title: "Recycle with can", tone: "text-amber-800", bg: "bg-amber-50" };
}

function getAttachedLinerRecyclingLabel(part) {
  if (part?.linerType === "bpa_free_confirmed") return "BPA-free liner confirmed; recycle the can";
  if (part?.linerType && part.linerType !== "unknown") return `${part.material?.linerLabel || "Liner type confirmed"}; recycle the can`;
  return "Recycle the can; liner type unknown";
}

function getPartMaterialLabel(part) {
  if (part?.partType === "liner" && part.linerInfo?.linerLabel) return part.linerInfo.linerLabel;
  if (part?.labelClaim) return part.labelClaim;
  return part?.plastic?.code !== "NONE" ? part?.plastic?.name : part?.material?.name;
}

function getLabelEvidenceBonus(part) {
  if (Number.isFinite(part?.labelImpactBonus)) return part.labelImpactBonus;
  if (part?.linerType === "bpa_free_confirmed") return 8;
  if (part?.recyclingClaim === "label_confirmed") return 3;
  return 0;
}

function productRecyclabilityMeta(status, partStatuses = [], isLocalized = false) {
  const activeParts = partStatuses.filter((partStatus) => partStatus !== "not_applicable");
  const affectedCount = activeParts.filter((partStatus) => partStatus === status).length;
  const partWord = affectedCount === 1 ? "part" : "parts";
  const map = {
    widely: {
      icon: "✅",
      title: "Parts look recyclable",
      tone: "text-emerald-800",
      bg: "bg-emerald-50",
      summary: isLocalized ? "The packaging parts below are accepted by the selected city." : "The packaging parts below are commonly accepted, though local rules still matter.",
    },
    limited: {
      icon: "⚠️",
      title: "Check local rules by part",
      tone: "text-amber-800",
      bg: "bg-amber-50",
      summary: isLocalized ? `${affectedCount || "Some"} ${partWord} have conditional guidance for the selected city. Check the part-by-part rows below.` : `${affectedCount || "Some"} ${partWord} may depend on local recycling rules. Check the part-by-part guidance below.`,
    },
    none: {
      icon: "❌",
      title: "Some parts are not recyclable",
      tone: "text-red-800",
      bg: "bg-red-50",
      summary: isLocalized ? `${affectedCount || "At least one"} ${partWord} below is not accepted by the selected city.` : `${affectedCount || "At least one"} ${partWord} below is usually not accepted in household recycling.`,
    },
    unknown: {
      icon: "？",
      title: "Some parts need verification",
      tone: "text-neutral-700",
      bg: "bg-neutral-100",
      summary: `${affectedCount || "Some"} ${partWord} need better material data before recycling guidance can be trusted.`,
    },
    not_applicable: {
      icon: "—",
      title: "No plastic recycling needed",
      tone: "text-neutral-700",
      bg: "bg-neutral-100",
      summary: "No plastic packaging parts were identified for recycling guidance.",
    },
  };
  return map[status] || map.unknown;
}

const defaultRecyclingRules = {
  pet1: "widely",
  hdpe2: "widely",
  pp5: "limited",
  ldpe4: "none",
  pva: "none",
  unknown_plastic: "unknown",
  latex_rubber: "none",
  synthetic_condom: "none",
  none: "not_applicable",
  glass: "widely",
  plastic: "limited",
  paper: "widely",
  metal: "widely",
  mixed: "limited",
  liner: "none",
};

const recyclingLocationProfiles = [
  { id: "toronto_on", city: "Toronto", region: "ON", country: "Canada", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Blue-bin guidance varies by packaging shape and cleanliness." },
  { id: "montreal_qc", city: "Montreal", region: "QC", country: "Canada", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Container shape and local sorting rules matter." },
  { id: "vancouver_bc", city: "Vancouver", region: "BC", country: "Canada", rules: { pp5: "widely", ldpe4: "limited", mixed: "limited", glass: "widely" }, note: "Recycle BC accepts more rigid plastics; flexible plastic usually needs depot handling." },
  { id: "calgary_ab", city: "Calgary", region: "AB", country: "Canada", rules: { pp5: "widely", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Rigid containers are better supported than films or multilayer packaging." },
  { id: "edmonton_ab", city: "Edmonton", region: "AB", country: "Canada", rules: { pp5: "widely", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Accepted items depend on container format and sorting facility rules." },
  { id: "ottawa_on", city: "Ottawa", region: "ON", country: "Canada", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Flexible film and mixed packaging are usually not curbside-friendly." },
  { id: "winnipeg_mb", city: "Winnipeg", region: "MB", country: "Canada", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Rigid containers have better support than films." },
  { id: "quebec_city_qc", city: "Quebec City", region: "QC", country: "Canada", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Local sorting rules can change by borough or service provider." },
  { id: "hamilton_on", city: "Hamilton", region: "ON", country: "Canada", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Check local container rules for plastic tubs and lids." },
  { id: "kitchener_on", city: "Kitchener-Waterloo", region: "ON", country: "Canada", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Regional guidance can differ from nearby cities." },
  { id: "london_on", city: "London", region: "ON", country: "Canada", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Rigid packaging is more likely to be accepted than film." },
  { id: "halifax_ns", city: "Halifax", region: "NS", country: "Canada", rules: { pp5: "widely", ldpe4: "limited", mixed: "limited", glass: "widely" }, note: "Some flexible plastics may require special handling." },
  { id: "victoria_bc", city: "Victoria", region: "BC", country: "Canada", rules: { pp5: "widely", ldpe4: "limited", mixed: "limited", glass: "widely" }, note: "Depot and curbside rules can differ for flexible plastics." },
  { id: "saskatoon_sk", city: "Saskatoon", region: "SK", country: "Canada", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Plastic container type matters more than resin code alone." },
  { id: "regina_sk", city: "Regina", region: "SK", country: "Canada", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Films and multilayer packaging remain poor curbside candidates." },
  { id: "new_york_ny", city: "New York", region: "NY", country: "USA", rules: { pp5: "widely", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Rigid plastics, metal, glass, and cartons have broad support; plastic film does not." },
  { id: "los_angeles_ca", city: "Los Angeles", region: "CA", country: "USA", rules: { pp5: "widely", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Blue-bin acceptance is broad for rigid containers, not flexible films." },
  { id: "chicago_il", city: "Chicago", region: "IL", country: "USA", rules: { pp5: "widely", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Clean containers are more likely to be accepted." },
  { id: "houston_tx", city: "Houston", region: "TX", country: "USA", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "limited" }, note: "Glass and some plastics may have more limited curbside support." },
  { id: "phoenix_az", city: "Phoenix", region: "AZ", country: "USA", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Rigid bottles and jugs are safer bets than tubs or films." },
  { id: "philadelphia_pa", city: "Philadelphia", region: "PA", country: "USA", rules: { pp5: "widely", ldpe4: "none", mixed: "limited", glass: "limited" }, note: "Check current guidance for glass and non-bottle plastics." },
  { id: "san_antonio_tx", city: "San Antonio", region: "TX", country: "USA", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Container shape and cleanliness are key." },
  { id: "san_diego_ca", city: "San Diego", region: "CA", country: "USA", rules: { pp5: "widely", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Rigid containers are supported; film generally is not curbside." },
  { id: "dallas_tx", city: "Dallas", region: "TX", country: "USA", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Bottle and jug plastics are stronger candidates than films." },
  { id: "san_jose_ca", city: "San Jose", region: "CA", country: "USA", rules: { pp5: "widely", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Accepted rigid containers vary less than flexible packaging." },
  { id: "austin_tx", city: "Austin", region: "TX", country: "USA", rules: { pp5: "widely", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Rigid plastics, metal, paper, and glass have stronger support than film." },
  { id: "jacksonville_fl", city: "Jacksonville", region: "FL", country: "USA", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "limited" }, note: "Accepted materials vary by hauler and program updates." },
  { id: "fort_worth_tx", city: "Fort Worth", region: "TX", country: "USA", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Container plastics are more likely than flexible films." },
  { id: "columbus_oh", city: "Columbus", region: "OH", country: "USA", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Local sorting rules can be narrower than resin codes suggest." },
  { id: "charlotte_nc", city: "Charlotte", region: "NC", country: "USA", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Rigid containers are better supported than films or multilayer packs." },
  { id: "san_francisco_ca", city: "San Francisco", region: "CA", country: "USA", rules: { pp5: "widely", ldpe4: "limited", mixed: "limited", glass: "widely" }, note: "Local program support is broad, but flexible plastics still need caution." },
  { id: "seattle_wa", city: "Seattle", region: "WA", country: "USA", rules: { pp5: "widely", ldpe4: "limited", mixed: "limited", glass: "widely" }, note: "Seattle-area rules often distinguish tubs, lids, and flexible film." },
  { id: "denver_co", city: "Denver", region: "CO", country: "USA", rules: { pp5: "widely", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Rigid containers are stronger candidates than plastic bags or film." },
  { id: "washington_dc", city: "Washington", region: "DC", country: "USA", rules: { pp5: "widely", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Rigid plastics, cans, glass, and paper are the safer baseline." },
  { id: "boston_ma", city: "Boston", region: "MA", country: "USA", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Bottle-shaped plastics are more reliable than tubs or films." },
  { id: "miami_fl", city: "Miami", region: "FL", country: "USA", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "limited" }, note: "Program rules vary across Miami-Dade municipalities." },
  { id: "atlanta_ga", city: "Atlanta", region: "GA", country: "USA", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "limited" }, note: "Glass and non-bottle plastics may require extra caution." },
  { id: "portland_or", city: "Portland", region: "OR", country: "USA", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Tubs and lids can be more restricted than bottles and jugs." },
  { id: "minneapolis_mn", city: "Minneapolis", region: "MN", country: "USA", rules: { pp5: "widely", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Rigid plastics are better supported than flexible films." },
  { id: "detroit_mi", city: "Detroit", region: "MI", country: "USA", rules: { pp5: "limited", ldpe4: "none", mixed: "limited", glass: "widely" }, note: "Local hauler rules should be checked for tubs and cartons." },
];

function getRecyclingLocation(id) {
  return recyclingLocationProfiles.find((location) => location.id === id) || recyclingLocationProfiles[0];
}

const recyclingLocationCoordinates = {
  toronto_on: [43.6532, -79.3832],
  montreal_qc: [45.5017, -73.5673],
  vancouver_bc: [49.2827, -123.1207],
  calgary_ab: [51.0447, -114.0719],
  edmonton_ab: [53.5461, -113.4938],
  ottawa_on: [45.4215, -75.6972],
  winnipeg_mb: [49.8951, -97.1384],
  quebec_city_qc: [46.8139, -71.208],
  hamilton_on: [43.2557, -79.8711],
  kitchener_on: [43.4516, -80.4925],
  london_on: [42.9849, -81.2453],
  halifax_ns: [44.6488, -63.5752],
  victoria_bc: [48.4284, -123.3656],
  saskatoon_sk: [52.1579, -106.6702],
  regina_sk: [50.4452, -104.6189],
  new_york_ny: [40.7128, -74.006],
  los_angeles_ca: [34.0522, -118.2437],
  chicago_il: [41.8781, -87.6298],
  houston_tx: [29.7604, -95.3698],
  phoenix_az: [33.4484, -112.074],
  philadelphia_pa: [39.9526, -75.1652],
  san_antonio_tx: [29.4241, -98.4936],
  san_diego_ca: [32.7157, -117.1611],
  dallas_tx: [32.7767, -96.797],
  san_jose_ca: [37.3382, -121.8863],
  austin_tx: [30.2672, -97.7431],
  jacksonville_fl: [30.3322, -81.6557],
  fort_worth_tx: [32.7555, -97.3308],
  columbus_oh: [39.9612, -82.9988],
  charlotte_nc: [35.2271, -80.8431],
  san_francisco_ca: [37.7749, -122.4194],
  seattle_wa: [47.6062, -122.3321],
  denver_co: [39.7392, -104.9903],
  washington_dc: [38.9072, -77.0369],
  boston_ma: [42.3601, -71.0589],
  miami_fl: [25.7617, -80.1918],
  atlanta_ga: [33.749, -84.388],
  portland_or: [45.5152, -122.6784],
  minneapolis_mn: [44.9778, -93.265],
  detroit_mi: [42.3314, -83.0458],
};

function getDistanceKm(latA, lonA, latB, lonB) {
  const toRad = (value) => value * Math.PI / 180;
  const earthKm = 6371;
  const dLat = toRad(latB - latA);
  const dLon = toRad(lonB - lonA);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLon / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getNearestRecyclingLocationId(latitude, longitude) {
  return recyclingLocationProfiles.reduce((nearest, location) => {
    const coords = recyclingLocationCoordinates[location.id];
    if (!coords) return nearest;
    const distanceKm = getDistanceKm(latitude, longitude, coords[0], coords[1]);
    return !nearest || distanceKm < nearest.distanceKm ? { id: location.id, distanceKm } : nearest;
  }, null)?.id || recyclingLocationProfiles[0].id;
}

function getRecyclingLocationIdFromTimezone(timeZone) {
  const map = {
    "America/Toronto": "toronto_on",
    "America/Montreal": "montreal_qc",
    "America/Vancouver": "vancouver_bc",
    "America/Edmonton": "edmonton_ab",
    "America/Winnipeg": "winnipeg_mb",
    "America/Halifax": "halifax_ns",
    "America/Regina": "regina_sk",
    "America/New_York": "new_york_ny",
    "America/Los_Angeles": "los_angeles_ca",
    "America/Chicago": "chicago_il",
    "America/Houston": "houston_tx",
    "America/Phoenix": "phoenix_az",
    "America/Denver": "denver_co",
    "America/Detroit": "detroit_mi",
  };
  return map[timeZone] || "toronto_on";
}

function getBrowserFallbackRecyclingLocationId() {
  const timeZone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  return getRecyclingLocationIdFromTimezone(timeZone);
}

function getDefaultSpellingLocale() {
  const timeZone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  const canadaZones = ["America/Toronto", "America/Montreal", "America/Vancouver", "America/Edmonton", "America/Winnipeg", "America/Halifax", "America/Regina"];
  return canadaZones.includes(timeZone) ? "CA" : "US";
}

function getLocaleCopy(locale = "CA") {
  const isCanada = locale === "CA";
  const favorite = isCanada ? "Favourite" : "Favorite";
  const favorites = isCanada ? "Favourites" : "Favorites";
  return { favorite, favorites, favoriteLower: favorite.toLowerCase(), favoritesLower: favorites.toLowerCase() };
}

function getRecyclabilityKey(part) {
  if (part.partType === "liner") return "liner";
  if (part.plastic && part.plastic.code !== "NONE") return part.plasticTypeId || "unknown_plastic";
  return part.materialId || "unknown_plastic";
}

function recyclingRuleLabel(key) {
  return {
    pet1: "PET #1 bottles and containers",
    hdpe2: "HDPE #2 bottles and jugs",
    pp5: "PP #5 tubs, cups, and lids",
    ldpe4: "LDPE #4 film/flexible plastic",
    pva: "PVA/PVOH dissolvable film",
    latex_rubber: "Used condom - do not recycle",
    synthetic_condom: "Used condom - do not recycle",
    unknown_plastic: "Unidentified plastic",
    glass: "Glass containers",
    plastic: "Unspecified rigid plastic",
    paper: "Paper/cardboard",
    metal: "Metal containers",
    mixed: "Mixed or multilayer packaging",
    liner: "Can liner/coating",
    none: "No plastic",
  }[key] || "Local material rule";
}

function combineRecyclability(statuses) {
  const relevant = statuses.filter((status) => status !== "not_applicable");
  if (!relevant.length) return "widely";
  if (relevant.includes("none")) return "none";
  if (relevant.includes("unknown")) return "unknown";
  if (relevant.includes("limited")) return "limited";
  return "widely";
}

function getPartRecyclingRule(part, useLocation, locationId = "toronto_on") {
  const key = getRecyclabilityKey(part);
  if (part?.partType === "product_component" && /condom/i.test(part.displayName || "")) {
    return { status: "none", label: "Do not recycle used condoms", location: useLocation ? getRecyclingLocation(locationId) : null, note: "Only clean outer packaging should be checked for recycling." };
  }
  if (part?.recyclingClaim === "label_confirmed") {
    return { status: "widely", label: "Recyclable label confirmed", location: useLocation ? getRecyclingLocation(locationId) : null, note: "Packaging label confirms recyclability." };
  }
  const generalStatus = defaultRecyclingRules[key] || part.recyclability || "unknown";
  if (!useLocation) return { status: generalStatus, label: recyclingRuleLabel(key), location: null, note: "General material guidance." };
  const location = getRecyclingLocation(locationId);
  const status = location.rules[key] || generalStatus;
  return { status, label: recyclingRuleLabel(key), location, note: location.note };
}

function hasMetalCanBody(product) {
  return (product?.parts || []).some((part) => part.materialId === "metal" && /can/i.test(`${part.displayName || ""} ${part.partType || ""}`));
}

function isAttachedCanLiner(part, product) {
  return part?.partType === "liner" && hasMetalCanBody(product);
}

function getPartRecyclability(part, useLocation, locationId = "toronto_on") {
  return getPartRecyclingRule(part, useLocation, locationId).status;
}

function getProductRecyclability(product, useLocation, locationId = "toronto_on") {
  return combineRecyclability((product?.parts || []).map((part) => getPartRecyclability(part, useLocation, locationId)));
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

function isColdPreparedDrink(product) {
  const text = `${product?.brand || ""} ${product?.name || ""}`.toLowerCase();
  return ["boba", "frappuccino", "nitro cold brew", "cold brew", "iced"].some((term) => text.includes(term));
}

function getProductContexts(productId) {
  return db.productContexts.filter((item) => item.productId === productId).map((item) => ({ ...item, context: getById("contexts", item.contextId) })).filter((item) => item.context);
}

function getSourcesFor({ entityType, entityId }) {
  return db.sourceLinks.filter((item) => item.entityType === entityType && item.entityId === entityId).map((item) => ({ ...item, source: getById("sources", item.sourceId) })).filter((item) => item.source);
}

function getPlasticListEvidence(productId) {
  return db.plasticListEvidence.filter((item) => item.productId === productId).map((item) => ({ ...item, source: getById("sources", item.sourceId) })).filter((item) => item.source);
}

function plasticListToneMeta(tone) {
  const map = {
    high: { label: "High concern", bg: "bg-red-50", text: "text-red-900", pill: "bg-red-100 text-red-900" },
    medium: { label: "Elevated", bg: "bg-amber-50", text: "text-amber-900", pill: "bg-amber-100 text-amber-900" },
    low: { label: "Detected", bg: "bg-emerald-50", text: "text-emerald-900", pill: "bg-emerald-100 text-emerald-900" },
  };
  return map[tone] || map.medium;
}

function getPartSeverity(totalImpact, part = null) {
  if (part?.partType === "liner" && part.linerType === "bpa_free_confirmed") return { label: "Minimal concern", tone: "bg-emerald-50 text-emerald-800" };
  if (part?.plastic?.code === "NONE" && part?.partType !== "liner") return { label: "Plastic-free", tone: "bg-emerald-50 text-emerald-800" };
  if (part?.plastic?.code && part.plastic.code !== "NONE" && part.plastic.code !== "UNKNOWN") return { label: "Plastic packaging", tone: "bg-amber-100 text-amber-800" };
  if (part?.plastic?.code === "UNKNOWN") return { label: "Unknown plastic", tone: "bg-orange-100 text-orange-800" };
  if (totalImpact === 0) return { label: "Minimal", tone: "bg-emerald-50 text-emerald-800" };
  if (totalImpact <= -35) return { label: "Severe", tone: "bg-red-100 text-red-800" };
  if (totalImpact <= -25) return { label: "High", tone: "bg-orange-100 text-orange-800" };
  if (totalImpact <= -15) return { label: "Moderate", tone: "bg-amber-100 text-amber-800" };
  return { label: "Low", tone: "bg-emerald-100 text-emerald-800" };
}

function hydrateProduct(product, extraParts = []) {
  const highRiskKeywords = ["canned", "bottle", "gum", "salt", "sponge", "cutting", "tupperware"];
  const acidicKeywords = ["tomato", "vinegar", "citrus", "mustard", "ketchup", "hot sauce", "yogurt", "cheese", "juice"];
  const heatSensitiveRules = [
    { id: "heat_tea", terms: ["tea bag", "teabag", "tea sachet"], penalty: -25, label: "Tea bag / hot water", summary: "Tea bags and sachets can be exposed to boiling water, so plastic seals, mesh, or wrappers are treated as higher concern." },
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
  const plasticListEvidence = getPlasticListEvidence(product.id);
  const plasticListPenalty = Math.max(-40, plasticListEvidence.reduce((sum, item) => sum + (item.scoreImpact || 0), 0));
  const rawParts = [...db.productParts, ...extraParts].filter((part) => part.productId === product.id);
  const parts = rawParts.map((part) => {
    const material = getById("materials", part.materialId);
    const plastic = getById("plasticTypes", part.plasticTypeId);
    const contexts = getPartContexts(part.id).filter((item) => !(item.contextId === "heat" && isColdPreparedDrink(product)));
    const linerAdjustment = part.partType === "liner" && material?.linerImpact ? material.linerImpact : 0;
    const labelEvidenceBonus = getLabelEvidenceBonus(part);
    // Context penalties can stack heavily (heat + acidic + food etc)
    // We soften stacking to avoid unrealistic extreme values per part
    const rawContextImpact = contexts.reduce((sum, item) => sum + item.context.penalty, 0);
    const contextFloor = part.linerType === "bpa_free_confirmed" ? -20 : -35;
    const contextImpact = Math.max(rawContextImpact, contextFloor);
    // Cap extreme negative stacking so UI stays readable
    const rawTotalImpact = part.baseImpact + part.materialImpact + linerAdjustment + contextImpact + labelEvidenceBonus;

    // Normalize plastic/problematic parts into a consistent band (-5 to -40), but allow truly low-impact non-plastic parts to remain 0
    const MIN_IMPACT = -40;

    let totalImpact = 0;
    if (rawTotalImpact < 0) {
      const clamped = Math.min(-5, Math.max(rawTotalImpact, MIN_IMPACT));
      const normalized = MIN_IMPACT + (clamped - MIN_IMPACT) * 0.85;
      totalImpact = Math.round(Math.max(normalized, MIN_IMPACT));
    }
    const tone = totalImpact === 0 ? "bg-emerald-800" : totalImpact > -10 ? "bg-emerald-400" : totalImpact > -25 ? "bg-red-400" : "bg-red-800";
    const severity = getPartSeverity(totalImpact, { ...part, material, plastic });
    return { ...part, material, plastic, contexts, contextImpact, linerAdjustment, labelEvidenceBonus, linerInfo: material?.linerRisk ? material : null, totalImpact, severity, tone, recyclability: plastic?.code !== "NONE" ? plastic?.recyclability || "unknown" : material?.recyclability || "unknown" };
  });
  const base = category?.baseScore ?? 50;
  const partPenalty = parts.reduce((sum, part) => sum + part.baseImpact + part.materialImpact + (part.linerAdjustment || 0), 0);
  const contextPenalty = getProductContexts(product.id).reduce((sum, item) => sum + item.context.penalty, 0);
  const verificationBonus = product.verification === "community_verified" ? 3 : 0;
  const normalizedPartPenalty = parts.reduce((sum, part) => sum + part.totalImpact, 0);
  const effectiveProductContexts = getProductContexts(product.id).filter((item) => !(item.contextId === "heat" && isColdPreparedDrink(product)));
  const effectiveContextPenalty = effectiveProductContexts.reduce((sum, item) => sum + item.context.penalty, 0);
  const normalizedContextPressure = Math.max(-35, effectiveContextPenalty + extraPenalty);
  const rawScore = clampScore(base + normalizedPartPenalty + normalizedContextPressure + plasticListPenalty + verificationBonus);
  const plasticListCalculatedScore = product.plasticListId ? clampScore(
    82 +
    Math.round(normalizedPartPenalty * 0.35) +
    Math.round(normalizedContextPressure * 0.3) +
    plasticListPenalty
  ) : null;
  const calibrationScores = {
    paper_soap: 96,
    old_spice: 32,
    always_ultra: 12,
    allens_apple: 19,
    kirkland_tuna: 48,
    kirkland_dishwasher: 12,
    blueland_dishwasher_tablets: 84,
    campbells_soup: 15,
    plasticlist_boba_guys_black_tea_juice: 22,
    plasticlist_boba_guys_black_tea_pearls: 16,
    plasticlist_boba_guys_fruity_flavored_tea: 20,
    chickfila_deluxe: 18
  };
  const score = product.scoreOverride ?? calibrationScores[product.id] ?? plasticListCalculatedScore ?? rawScore;
  const healthRiskPenalty = Math.abs(normalizedContextPressure) + Math.abs(plasticListPenalty) + parts.filter((part) => part.plastic?.code !== "NONE").length * 7;
  const plasticExposurePenalty = Math.abs(normalizedPartPenalty) + Math.abs(plasticListPenalty) + parts.filter((part) => part.plastic?.code !== "NONE").length * 10;
  const recyclabilityStatus = combineRecyclability(parts.map((part) => part.recyclability));
  const recyclabilityPenalty = recyclabilityStatus === "widely" ? 8 : recyclabilityStatus === "limited" ? 28 : recyclabilityStatus === "none" ? 55 : 40;
  const splitScores = { health: clampScore(100 - healthRiskPenalty), exposure: clampScore(100 - plasticExposurePenalty), recyclability: clampScore(100 - recyclabilityPenalty) };
  const riskFactors = [
    ...effectiveProductContexts.filter((item) => ["heat", "hot_food", "heat_sensitive", "acidic", "fatty", "food_contact", "drink_contact", "skin", "prolonged_skin", "sti_limitation", "internal", "recycled_plastic", "long_storage"].includes(item.contextId)).map((item) => item.context),
    ...heatFlags.map((flag) => ({ id: flag.id, name: flag.label, penalty: flag.penalty, summary: flag.summary })),
    ...(extraPenalty < 0 ? [{ id: "category_risk", name: "High-risk product type", penalty: extraPenalty, summary: "This category is scored more aggressively because heat, acidity, ingestion, skin contact, or repeated use can increase plastic exposure." }] : [])
  ];
  const uniqueRiskFactors = Array.from(new Map(riskFactors.map((factor) => [factor.id, factor])).values());
  const alternatives = product.categoryId === "cat_food_drink" ? ["Choose glass-packaged alternatives when possible.", "Look for 100% bisphenol-free or BPA Non-Intent cans.", "Filter tap water instead of buying bottled water."] : product.categoryId === "cat_cleaning" ? ["Choose loose powder or tablet formats without dissolvable film.", "Use cardboard refills or concentrated cleaners in glass.", "Avoid plastic sponges; try natural loofah, cellulose, or dish cloths."] : product.categoryId === "cat_sexual_health" ? ["For STI prevention, prioritize latex or FDA-cleared synthetic condoms over natural membrane options.", "For latex allergies, compare non-latex synthetic options.", "Treat natural skin options as lower-plastic, not as the best health-protection choice."] : product.categoryId === "cat_personal" || product.categoryId === "cat_hygiene" ? ["Look for paper, glass, metal, or refillable packaging.", "Avoid prolonged skin-contact plastics where possible.", "Choose plastic-free applicators or package-free options."] : ["Choose unpackaged, paper, glass, ceramic, stainless steel, cast iron, wood, or bamboo alternatives.", "Avoid hot food in plastic or plastic-lined containers.", "Have receipts emailed instead of taking thermal paper receipts."];
  const theme = getScoreTheme(score);
  const hasCanLiner = parts.some((part) => part.partType === "liner" && (part.material?.linerRisk || part.materialId === "mixed" || part.plastic?.code === "UNKNOWN"));
  const hotCannedFoodTerms = ["soup", "broth", "stew", "chili", "sauce", "gravy"];
  const hasHotCannedFoodSignal = hotCannedFoodTerms.some((term) => name.includes(term)) || uniqueRiskFactors.some((factor) => ["hot_food", "heat_soup"].includes(factor.id));
  const hasHighRiskCanScenario = hasCanLiner && hasHotCannedFoodSignal;
  const dynamicSources = hasHighRiskCanScenario ? [{ sourceId: "source_canned_soup_bpa", source: getById("sources", "source_canned_soup_bpa"), entityType: "dynamic", entityId: product.id }] : [];
  const evidenceSources = plasticListEvidence.map((item) => ({ sourceId: item.sourceId, source: item.source, entityType: "plasticlist", entityId: item.id }));
  const sources = [
    ...parts.flatMap((part) => getSourcesFor({ entityType: "part", entityId: part.id })),
    ...parts.flatMap((part) => getSourcesFor({ entityType: "plastic_type", entityId: part.plasticTypeId })),
    ...effectiveProductContexts.flatMap((item) => getSourcesFor({ entityType: "context", entityId: item.contextId })),
    ...dynamicSources,
    ...evidenceSources,
  ].filter((link) => link.source);
  const uniqueSources = Array.from(new Map(sources.map((link) => [link.source.id, link])).values());
  return { ...product, category, parts, score, theme, rating: theme.label, sources: uniqueSources, splitScores, riskFactors: uniqueRiskFactors, heatFlags, plasticListEvidence, hasCanLiner, hasHighRiskCanScenario, alternatives, community: { scans: Math.max(3, parts.length * 3), favorites: db.saves.filter((save) => save.productId === product.id).length } };
}



function FlashlightIcon({ size = 24 }) {
  return <svg width={size} height={size} viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true"><path d="M634 64H390c-35.2 0-48 28.8-48 64h340c0-35.2-12.8-64-48-64zM392.2 295c15.2 17.6 23.8 40 23.8 63.4v531.8c0 43.8 35.8 69.8 79.8 69.8h32.6c43.8 0 79.8-25.8 79.8-69.8V358.4c0-23.4 8.6-45.6 23.8-63.4 30.8-35.8 50-69 50-135H342c0 70 19.2 99.2 50.2 135z m63.8 181.6c0-31.2 25.2-56.6 56-56.6s56 25.4 56 56.6v70.8c0 31.2-25.2 56.6-56 56.6s-56-25.4-56-56.6v-70.8z" /><path d="M512 546m-40 0a40 40 0 1 0 80 0 40 40 0 1 0-80 0Z" /></svg>;
}

function BarcodeScanIcon({ size = 24, active = true, animate = false }) {
  const color = active ? "#000" : "#5f5f5f";
  return (
    <motion.svg width={size} height={size} viewBox="0 0 122.88 97.04" fill="none" aria-hidden="true" animate={animate ? { scale: [1, 1.14, 1] } : { scale: 1 }} transition={{ duration: 0.28, ease: "easeOut" }}>
      <path fill={color} d="M17.92,16.23h8.26v64.58h-8.26V16.23L17.92,16.23z M69.41,16.23h5.9v64.58h-5.9V16.23L69.41,16.23z M57.98,16.23h4.42v64.58h-4.42V16.23L57.98,16.23z M33.19,16.23h2.51v64.58h-2.51 V16.23L33.19,16.23z M97.59,16.23h7.37v64.58h-7.37V16.23L97.59,16.23z M82.32,16.23h8.26v64.58h-8.26V16.23L82.32,16.23z M42.71,16.23h8.26v64.58h-8.26V16.23L42.71,16.23z" />
      <path d="M20.71 4.76H4.76V17.2M4.76 79.84v12.44h15.95M103.4 4.76h14.72V17.2M118.12 79.84v12.44H103.4" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  );
}

function PackageSymbolIcon({ size = 24, active = true, animate = false }) {
  const color = active ? "#000" : "#5f5f5f";
  return <motion.svg width={size} height={size} viewBox="0 0 96 96" fill="none" aria-hidden="true" animate={animate ? { scale: [1, 1.14, 1] } : { scale: 1 }} transition={{ duration: 0.28, ease: "easeOut" }}><path d="M48 9 15 28v40l33 19 33-19V28L48 9Z" stroke={color} strokeWidth="7" strokeLinejoin="round" /><path d="M15 28 48 47l33-19M48 47v40" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /><path d="M37 28h22l-11 19" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></motion.svg>;
}

function PartPackagingIcon({ part, size = 28 }) {
  const common = { width: size, height: size, viewBox: "0 0 48 48", fill: "none", stroke: "#111", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const name = `${part.displayName || ""} ${part.notes || ""}`.toLowerCase();
  const isCan = part.materialId === "metal" || name.includes("can");
  const isTub = name.includes("tub") || name.includes("bucket");
  const isCarton = name.includes("carton") || name.includes("box") || name.includes("tetra") || name.includes("cereal");

  if (part.partType === "liner") return <svg {...common}><path d="M14 13c0-3.3 20-3.3 20 0v22c0 3.3-20 3.3-20 0V13Z" /><path d="M14 13c0 3.3 20 3.3 20 0" /><path d="M18 17v16" /><path d="M30 17v16" /><path d="M21 23c2-2.4 4-2.4 6 0s4 2.4 6 0" /></svg>;
  if (part.partType === "cap_lid") return <svg {...common}><ellipse cx="24" cy="17" rx="13" ry="5" /><path d="M11 17v9c0 3 5.8 5.5 13 5.5S37 29 37 26v-9" /><path d="M16 26h16" /><path d="M18 21v8M24 22v9M30 21v8" /></svg>;
  if (part.partType === "inner_packaging") return <svg {...common}><path d="M9 16h30v16H9z" /><path d="m9 16 6 5-6 5M39 16l-6 5 6 5" /><path d="M16 20h16M16 28h16" /></svg>;
  if (part.partType === "outer_packaging") return <svg {...common}><path d="M11 15h26v24H11z" /><path d="M15 15V9h18v6" /><path d="M16 23h16M16 29h12" /></svg>;
  if (part.partType === "product_component") return <svg {...common}><path d="M10 16c8-5 20-5 28 0v18c-8-5-20-5-28 0V16Z" /><path d="M14 22c6-3 14-3 20 0M14 28c6-3 14-3 20 0" /></svg>;
  if (part.partType === "main_container" && isCan) return <svg {...common}><path d="M13 13c0-3.4 22-3.4 22 0v22c0 3.4-22 3.4-22 0V13Z" /><path d="M13 13c0 3.4 22 3.4 22 0M13 35c0-3.4 22-3.4 22 0" /><path d="M18 21h12M18 27h12" /></svg>;
  if (part.partType === "main_container" && isTub) return <svg {...common}><path d="M11 15h26l-3 24H14L11 15Z" /><path d="M9 12h30" /><path d="M16 21h16M17 27h14" /></svg>;
  if (part.partType === "main_container" && isCarton) return <svg {...common}><path d="M13 15 24 9l11 6v24H13V15Z" /><path d="M13 15h22M24 9v30" /><path d="M17 23h6M17 29h6" /></svg>;
  if (part.displayName?.toLowerCase().includes("tested sample")) return <svg {...common}><path d="M17 8h14" /><path d="M20 8v10l-7 16c-1.4 3.2.8 6 4.2 6h13.6c3.4 0 5.6-2.8 4.2-6l-7-16V8" /><path d="M17 29h14" /><path d="M19 34h10" /></svg>;
  if (part.partType === "main_container") return <svg {...common}><path d="M13 9h22v30H13z" /><path d="M17 14h14M17 20h14M17 31h10" /><path d="M13 9l4 5M35 9l-4 5" /></svg>;
  return <svg {...common}><path d="M12 14 24 8l12 6v20L24 40l-12-6V14Z" /><path d="M12 14l12 6 12-6M24 20v20" /></svg>;
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

function BackButton({ onClick, variant = "ghost", className = "" }) {
  return <Button onClick={onClick} variant={variant} className={`gap-1.5 ${className}`}><span aria-hidden="true">←</span><span>Back</span></Button>;
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
    <div className="mx-auto flex h-[100dvh] w-full flex-col overflow-hidden bg-[#f8f5ef] pt-0 pb-0 md:h-[min(760px,calc(100dvh-4rem))] md:w-[430px] md:rounded-[2.35rem] md:border md:border-white/70 md:shadow-[0_32px_90px_rgba(0,0,0,0.22)] md:ring-1 md:ring-black/5">
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

function FastTapButton({ children, onActivate, className = "", ...props }) {
  const tap = useRef(null);
  const ignoreClickUntil = useRef(0);

  const startTap = (event) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    tap.current = { x: touch.clientX, y: touch.clientY };
  };

  const moveTap = (event) => {
    if (!tap.current || event.touches.length !== 1) return;
    const touch = event.touches[0];
    if (Math.abs(touch.clientX - tap.current.x) > 12 || Math.abs(touch.clientY - tap.current.y) > 12) tap.current = null;
  };

  const endTap = (event) => {
    if (!tap.current || event.changedTouches.length !== 1) return;
    const touch = event.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - tap.current.x);
    const deltaY = Math.abs(touch.clientY - tap.current.y);
    tap.current = null;
    if (deltaX > 12 || deltaY > 12) return;
    event.preventDefault();
    ignoreClickUntil.current = Date.now() + 650;
    onActivate?.(event);
  };

  const handleClick = (event) => {
    if (Date.now() < ignoreClickUntil.current) return;
    onActivate?.(event);
  };

  return (
    <button
      {...props}
      type="button"
      onClick={handleClick}
      onTouchStart={startTap}
      onTouchMove={moveTap}
      onTouchEnd={endTap}
      onTouchCancel={() => {
        tap.current = null;
      }}
      className={className}
    >
      {children}
    </button>
  );
}

function useSwipeBack(onBack, enabled = true) {
  const gesture = useRef(null);

  const startGesture = (clientX, clientY, event) => {
    if (!enabled) return;
    if (event.target.closest?.("button, a, input, textarea, select")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const edgeZone = Math.min(96, bounds.width * 0.28);
    const localX = clientX - bounds.left;
    if (localX > edgeZone) return;
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Some browser test surfaces do not expose capture for synthetic drags.
    }
    gesture.current = { x: clientX, y: clientY, time: Date.now() };
  };

  const finishGesture = (clientX, clientY, event) => {
    if (!gesture.current) return;
    const { x, y, time } = gesture.current;
    gesture.current = null;
    const deltaX = clientX - x;
    const deltaY = clientY - y;
    const elapsed = Date.now() - time;
    const isBackSwipe = deltaX > 86 && Math.abs(deltaY) < 70 && deltaX > Math.abs(deltaY) * 1.7 && elapsed < 1400;
    if (!isBackSwipe) return;
    event.stopPropagation();
    triggerHapticFeedback();
    onBack?.();
  };

  return {
    onPointerDown: (event) => {
      if (event.button !== 0) return;
      startGesture(event.clientX, event.clientY, event);
    },
    onPointerUp: (event) => finishGesture(event.clientX, event.clientY, event),
    onMouseDown: (event) => {
      if (event.button !== 0) return;
      startGesture(event.clientX, event.clientY, event);
    },
    onMouseUp: (event) => finishGesture(event.clientX, event.clientY, event),
    onTouchStart: (event) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      startGesture(touch.clientX, touch.clientY, event);
    },
    onTouchEnd: (event) => {
      if (event.changedTouches.length !== 1) return;
      const touch = event.changedTouches[0];
      finishGesture(touch.clientX, touch.clientY, event);
    },
    onPointerCancel: () => {
      gesture.current = null;
    },
    onMouseLeave: () => {
      gesture.current = null;
    },
    onTouchCancel: () => {
      gesture.current = null;
    },
  };
}

function ScoreRing({ score, onClick, delay = 0.15, featured = false }) {
  const value = clampScore(score);
  const theme = getScoreTheme(value);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const handleClick = () => {
    triggerHapticFeedback();
    onClick?.();
  };
  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 160, damping: 18 }}
      className="relative flex h-[154px] w-[154px] items-center justify-center overflow-hidden rounded-full"
    >
      <svg width="154" height="154" viewBox="0 0 140 140" className="-rotate-90 drop-shadow-sm">
        {featured && (
          <defs>
            <linearGradient id="nearIdealScoreGradient" x1="18" y1="18" x2="122" y2="122" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7ce7a5" />
              <stop offset="48%" stopColor="#00894b" />
              <stop offset="100%" stopColor="#006f3f" />
            </linearGradient>
          </defs>
        )}
        <circle cx="70" cy="70" r={radius} stroke="#ebe6dc" strokeWidth="13" fill="none" />
        <motion.circle cx="70" cy="70" r={radius} stroke={featured ? "url(#nearIdealScoreGradient)" : theme.ring} strokeWidth="13" fill="none" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ delay: delay + 0.12, type: "spring", stiffness: 58, damping: 16 }} />
      </svg>
      {featured && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ background: "linear-gradient(118deg, transparent 40%, rgba(255,255,255,0.42) 50%, transparent 60%)" }}
          initial={{ x: "-120%", opacity: 0 }}
          animate={{ x: ["-120%", "120%"], opacity: [0, 0.42, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        />
      )}
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay + 0.28, duration: 0.28 }} className="absolute text-center">
        <div className="text-[42px] font-semibold tracking-[-0.06em] text-neutral-950">{value}</div>
        <div className="text-xs font-medium text-neutral-400">/ 100</div>
      </motion.div>
    </motion.div>
  );
  return onClick ? <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={handleClick} className="relative overflow-hidden rounded-full transition" aria-label="View score breakdown">{content}</motion.button> : content;
}

function ProductRow({ product, onClick }) {
  return <FastTapButton onActivate={onClick} className="w-full touch-manipulation text-left active:scale-[0.985]"><Card className="bg-white/78"><div className="flex items-center gap-3 p-3.5"><ProductImage src={product.imageUrl} alt={product.name} className="h-16 w-16 rounded-2xl object-cover shadow-sm" /><div className="min-w-0 flex-1"><div className="flex items-center gap-1 truncate text-[15px] font-semibold tracking-[-0.01em] text-neutral-950"><span className="truncate">{product.name}</span></div><div className="mt-0.5 text-sm text-neutral-500">{product.brand}</div><div className="mt-1 text-xs text-neutral-400">{product.category?.name}</div></div><div className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold shadow-inner" style={getScoreBadgeStyle(product.theme)}>{product.score}</div></div></Card></FastTapButton>;
}

function normalizeBarcode(value = "") {
  return String(value).replace(/\D/g, "").replace(/^0+(?=\d{12,13}$)/, "");
}

function findProductByBarcode(products, barcode) {
  const code = normalizeBarcode(barcode);
  if (!code) return null;
  return products.find((product) => {
    const productCodes = [product.barcode, ...(product.barcodes || [])].filter(Boolean).map(normalizeBarcode);
    return productCodes.includes(code);
  }) || null;
}

async function fetchOpenFoodFactsProduct(barcode) {
  const code = normalizeBarcode(barcode);
  if (!code) return null;
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,image_front_url,quantity,categories_tags`);
  if (!response.ok) throw new Error("Open Food Facts lookup failed.");
  const data = await response.json();
  if (data.status !== 1 || !data.product) return null;
  const product = data.product;
  return {
    barcode: code,
    name: product.product_name || "Unknown product",
    brand: product.brands?.split(",")[0]?.trim() || "",
    imageUrl: product.image_front_url || "",
    quantity: product.quantity || "",
    source: "Open Food Facts",
  };
}

function createPendingProductFromDraft(draft = {}, photos = {}) {
  const idSeed = normalizeBarcode(draft.barcode) || `${Date.now()}`;
  const id = `pending_${idSeed}`;
  const product = {
    id,
    name: draft.name?.trim() || "Pending product",
    brand: draft.brand?.trim() || "Brand pending",
    categoryId: "cat_food_drink",
    imageUrl: draft.imageUrl || "",
    country: "CA",
    confidence: "Low",
    verification: "unverified",
    barcode: normalizeBarcode(draft.barcode),
    scoreOverride: 52,
    scoringNote: "Pending community submission. This temporary score uses a conservative placeholder until photos and packaging details are reviewed.",
    submittedPhotos: photos,
  };
  const parts = [
    { id: `${id}_packaging`, productId: id, partType: "main_container", displayName: "Packaging pending review", materialId: "mixed", plasticTypeId: "unknown_plastic", baseImpact: -10, materialImpact: -12, notes: "User submitted this product for review. Front, back label, barcode, and plastic/recycling symbol photos should be checked before final scoring." },
  ];
  return { product, parts };
}

function BottomNav({ tab, setTab }) {
  return <div className="relative z-20 border-t border-white/70 bg-white/72 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] backdrop-blur-2xl"><div className="grid grid-cols-5 gap-1">{getBottomNavItems().map(([key, type, label]) => { const isActive = tab === key; return <FastTapButton key={key} onActivate={() => setTab(key)} className={`flex min-h-[54px] touch-manipulation flex-col items-center gap-1 rounded-full px-1 py-2 text-xs transition ${isActive ? "bg-neutral-200 text-neutral-950 shadow-inner" : "text-neutral-500 hover:bg-black/5"}`}><Icon type={type} active={isActive} animate={isActive} /><span className={isActive ? "font-semibold text-neutral-950" : "text-neutral-500"}>{label}</span></FastTapButton>; })}</div></div>;
}

function ScanScreen({ products, openResult, openAddProduct }) {
  const [flashOn, setFlashOn] = useState(false);
  const [flashStatus, setFlashStatus] = useState("");
  const [scanMode, setScanMode] = useState("barcode");
  const [scanStatus, setScanStatus] = useState("Ready to scan");
  const [manualBarcode, setManualBarcode] = useState("");
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [matchedProduct, setMatchedProduct] = useState(null);
  const [openFoodFactsProduct, setOpenFoodFactsProduct] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const cameraStreamRef = useRef(null);
  const torchTrackRef = useRef(null);
  const videoRef = useRef(null);
  const scannerControlsRef = useRef(null);
  const lastScannedRef = useRef("");
  const isBarcodeMode = scanMode === "barcode";
  const plasticListFood = products.find((product) => product.id === "plasticlist_boba_guys_black_tea_pearls") || products.find((product) => product.plasticListEvidence?.length) || products[4] || null;
  const plasticListPackaging = products.find((product) => product.id === "plasticlist_chick_fil_a_deluxe_sandwich") || products.find((product) => product.plasticListEvidence?.length) || products[2] || null;
  const scanCopy = isBarcodeMode ? {
    title: "Scan barcode",
    help: "Point your camera at a barcode to check for hidden plastic.",
    action: "Simulate unknown barcode",
    target: plasticListFood,
  } : {
    title: "Scan packaging",
    help: "Point your camera at recycling numbers, resin codes, or plastic symbols on the packaging.",
    action: "Simulate symbol scan",
    target: plasticListPackaging,
  };

  useEffect(() => {
    return () => {
      scannerControlsRef.current?.stop?.();
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function stopBarcodeScanner() {
    scannerControlsRef.current?.stop?.();
    scannerControlsRef.current = null;
    setIsScanning(false);
  }

  const createMissingProductDraft = (source = openFoodFactsProduct, barcode = scannedBarcode || manualBarcode) => ({
    barcode: normalizeBarcode(barcode),
    name: source?.name || "",
    brand: source?.brand || "",
    imageUrl: source?.imageUrl || "",
    quantity: source?.quantity || "",
    source: source?.source || "Barcode scan",
  });

  const resolveBarcode = async (barcode) => {
    const code = normalizeBarcode(barcode);
    if (!code || code === lastScannedRef.current) return;
    lastScannedRef.current = code;
    setScannedBarcode(code);
    setManualBarcode(code);
    setMatchedProduct(null);
    setOpenFoodFactsProduct(null);
    setScanStatus(`Barcode found: ${code}`);
    triggerHapticFeedback();
    const localProduct = findProductByBarcode(products, code);
    if (localProduct) {
      setMatchedProduct(localProduct);
      setScanStatus("Matched in your product database.");
      stopBarcodeScanner();
      return;
    }
    setScanStatus("Checking Open Food Facts...");
    try {
      const externalProduct = await fetchOpenFoodFactsProduct(code);
      if (externalProduct) {
        setOpenFoodFactsProduct(externalProduct);
        setScanStatus("Found product info. Add photos to verify packaging.");
      } else {
        setScanStatus("Barcode not found. Add the product and packaging photos.");
      }
    } catch {
      setScanStatus("Could not reach Open Food Facts. Add product manually.");
    }
    stopBarcodeScanner();
  };

  const startBarcodeScanner = async () => {
    if (!videoRef.current) return;
    setMatchedProduct(null);
    setOpenFoodFactsProduct(null);
    setScannedBarcode("");
    lastScannedRef.current = "";
    setScanStatus("Starting camera...");
    setIsScanning(true);
    try {
      const reader = new BrowserMultiFormatReader();
      scannerControlsRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (result) resolveBarcode(result.getText());
      });
      cameraStreamRef.current = videoRef.current?.srcObject || null;
      torchTrackRef.current = cameraStreamRef.current?.getVideoTracks?.()[0] || null;
      setScanStatus("Point the camera at a UPC or EAN barcode.");
    } catch {
      setIsScanning(false);
      setScanStatus("Camera access was not enabled. Try Safari/Chrome over HTTPS.");
    }
  };

  const ensureCameraTrack = async () => {
    if (torchTrackRef.current?.readyState === "live") return torchTrackRef.current;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera access is not available in this browser.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
    cameraStreamRef.current = stream;
    const [track] = stream.getVideoTracks();
    torchTrackRef.current = track;
    return track;
  };

  const toggleFlashlight = async () => {
    const nextFlashState = !flashOn;
    setFlashStatus("");
    try {
      const track = await ensureCameraTrack();
      const capabilities = track.getCapabilities?.() || {};
      if (!capabilities.torch) {
        setFlashStatus("Flashlight control is not available in this browser.");
        setFlashOn(false);
        return;
      }
      await track.applyConstraints({ advanced: [{ torch: nextFlashState }] });
      setFlashOn(nextFlashState);
      setFlashStatus(nextFlashState ? "Flashlight on" : "");
      if (!nextFlashState) {
        cameraStreamRef.current?.getTracks().forEach((streamTrack) => streamTrack.stop());
        cameraStreamRef.current = null;
        torchTrackRef.current = null;
      }
    } catch {
      setFlashOn(false);
      setFlashStatus("Allow camera access to use the flashlight.");
    }
  };

  return <div className="relative flex min-h-[690px] flex-col overflow-hidden bg-neutral-950 text-white"><div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#52525b_0%,_#18181b_56%,_#050505_100%)]" /><div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),transparent_28%,rgba(0,0,0,0.45))]" /><div className="relative z-10 flex items-center justify-between px-10 pb-4 pt-7"><h1 className="text-[28px] font-semibold tracking-[-0.04em]">{scanCopy.title}</h1><button type="button" onClick={toggleFlashlight} className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/15 shadow-sm backdrop-blur-xl transition ${flashOn ? "bg-white text-neutral-950" : "bg-white/10 text-white"}`} aria-label="Toggle flashlight"><FlashlightIcon size={23} /></button></div><div className="relative z-10 px-6"><div className="grid grid-cols-2 rounded-full border border-white/12 bg-white/10 p-1 shadow-inner backdrop-blur-xl" role="tablist" aria-label="Scan mode"><button type="button" role="tab" aria-selected={isBarcodeMode} onClick={() => setScanMode("barcode")} className={`flex min-h-10 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold transition ${isBarcodeMode ? "bg-white text-neutral-950 shadow-sm" : "text-white/70"}`}><BarcodeScanIcon size={18} active={isBarcodeMode} />Barcode</button><button type="button" role="tab" aria-selected={!isBarcodeMode} onClick={() => { stopBarcodeScanner(); setScanMode("packaging"); }} className={`flex min-h-10 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold transition ${!isBarcodeMode ? "bg-white text-neutral-950 shadow-sm" : "text-white/70"}`}><PackageSymbolIcon size={19} active={!isBarcodeMode} />Packaging</button></div></div><div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">{isBarcodeMode ? <div className="w-full"><div className="relative mx-auto h-64 w-64 overflow-hidden rounded-[2.25rem] border border-white/70 bg-white/8 shadow-[0_30px_70px_rgba(0,0,0,0.45)]"><video ref={videoRef} className={`h-full w-full object-cover ${isScanning ? "opacity-100" : "opacity-20"}`} muted playsInline autoPlay /><span className="absolute left-8 top-8 h-8 w-8 rounded-tl-lg border-l-[5px] border-t-[5px] border-white" /><span className="absolute right-8 top-8 h-8 w-8 rounded-tr-lg border-r-[5px] border-t-[5px] border-white" /><span className="absolute bottom-8 left-8 h-8 w-8 rounded-bl-lg border-b-[5px] border-l-[5px] border-white" /><span className="absolute bottom-8 right-8 h-8 w-8 rounded-br-lg border-b-[5px] border-r-[5px] border-white" />{!isScanning && <div className="absolute inset-0 flex items-center justify-center"><BarcodeScanIcon size={108} active={false} /></div>}</div><p className="mx-auto mt-5 max-w-[310px] text-sm leading-6 text-white/70">{scanStatus}</p>{scannedBarcode && <p className="mt-2 text-xs font-medium text-white/50">Barcode {scannedBarcode}</p>}{matchedProduct && <div className="mx-auto mt-4 max-w-[330px] rounded-3xl bg-white p-3 text-left text-neutral-950"><ProductRow product={matchedProduct} onClick={() => openResult(matchedProduct)} /></div>}{openFoodFactsProduct && <div className="mx-auto mt-4 max-w-[330px] rounded-3xl bg-white p-4 text-left text-neutral-950"><div className="text-xs font-medium uppercase tracking-wide text-neutral-400">Open Food Facts match</div><div className="mt-1 font-semibold">{openFoodFactsProduct.name}</div><div className="text-sm text-neutral-500">{openFoodFactsProduct.brand || "Brand unknown"}</div><Button onClick={() => openAddProduct(createMissingProductDraft(openFoodFactsProduct))} className="mt-3 w-full">Add photos & verify packaging</Button></div>}<div className="mx-auto mt-4 flex max-w-[330px] gap-2"><input inputMode="numeric" value={manualBarcode} onChange={(event) => setManualBarcode(event.target.value)} placeholder="Enter barcode" className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white outline-none placeholder:text-white/35" /><Button onClick={() => resolveBarcode(manualBarcode)} variant="light" className="px-4">Lookup</Button></div><div className="mt-4 flex justify-center gap-3"><Button onClick={isScanning ? stopBarcodeScanner : startBarcodeScanner} variant="light">{isScanning ? "Stop scanner" : "Start scanner"}</Button><Button onClick={() => openAddProduct(createMissingProductDraft(null))} variant="outline" className="border-white/20 bg-white/10 text-white">Add missing</Button></div></div> : <><motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => openAddProduct({ source: "Packaging symbol scan", packagingScan: true })} className="relative flex h-64 w-64 items-center justify-center rounded-[2.25rem] border border-white/70 bg-white/8 shadow-[0_30px_70px_rgba(0,0,0,0.45)] backdrop-blur-sm" aria-label={scanCopy.title}><span className="absolute left-8 top-8 h-8 w-8 rounded-tl-lg border-l-[5px] border-t-[5px] border-white" /><span className="absolute right-8 top-8 h-8 w-8 rounded-tr-lg border-r-[5px] border-t-[5px] border-white" /><span className="absolute bottom-8 left-8 h-8 w-8 rounded-bl-lg border-b-[5px] border-l-[5px] border-white" /><span className="absolute bottom-8 right-8 h-8 w-8 rounded-br-lg border-b-[5px] border-r-[5px] border-white" /><PackageSymbolIcon size={116} active={false} /></motion.button><p className="mt-6 max-w-[300px] text-sm leading-6 text-white/68">{scanCopy.help}</p><Button onClick={() => openAddProduct({ source: "Packaging symbol scan", packagingScan: true })} variant="light" className="mt-6">Add packaging photos</Button></>}{flashStatus && <p className="mt-3 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">{flashStatus}</p>}</div></div>;
}

function SourceCard({ link }) {
  return <div className="rounded-2xl bg-[#f7f3eb] p-3"><div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{link.source.organization}</div><div className="mt-1 font-medium text-neutral-950">{link.source.title}</div><p className="mt-1 text-sm leading-5 text-neutral-500">{link.source.summary}</p><div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500"><span>Credibility: {link.source.credibility}</span>{link.source.license && <span>License: {link.source.license}</span>}{link.source.accessDate && <span>Accessed: {link.source.accessDate}</span>}</div></div>;
}

function PlasticListEvidenceSummary({ evidence, onOpen }) {
  if (!evidence?.length) return null;
  const primary = evidence[0];
  const meta = plasticListToneMeta(primary.resultTone);
  const topChemical = primary.chemicals?.[0]?.name || "lab data";
  return (
    <button
      type="button"
      onClick={() => {
        triggerHapticFeedback();
        onOpen?.();
      }}
      className="mt-5 w-full rounded-3xl bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Supporting lab data</div>
          <h3 className="mt-1 font-semibold text-neutral-950">PlasticList result available</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-neutral-500">
            {primary.sampleType}; top signal: {topChemical}. Tap to view the full chemical breakdown.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.pill}`}>{meta.label}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f7f3eb] text-lg font-semibold text-neutral-950">›</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-500">
        <span className="rounded-full bg-[#f7f3eb] px-3 py-1">{primary.sampleLocation}</span>
        <span className="rounded-full bg-[#f7f3eb] px-3 py-1">CC BY 4.0</span>
      </div>
    </button>
  );
}

function PlasticListEvidenceDetail({ evidence, product, close }) {
  const swipeBackHandlers = useSwipeBack(close, true);
  if (!evidence?.length) return null;
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5" {...swipeBackHandlers}><Header title="PlasticList data" right={<BackButton onClick={close} />} /><Card><div className="p-5"><div className="text-sm text-neutral-500">{product?.brand}</div><h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">{product?.name}</h2><p className="mt-3 text-sm leading-6 text-neutral-500">Sample-based chemical testing from PlasticList. This is useful supporting evidence, but the main app score and “Where plastic is found” section stay the primary consumer-facing guidance.</p><div className="mt-4 inline-flex rounded-full bg-neutral-950 px-3 py-1 text-xs font-semibold text-white">CC BY 4.0</div></div></Card><div className="mt-5 space-y-3">{evidence.map((item) => { const meta = plasticListToneMeta(item.resultTone); return <div key={item.id} className={`rounded-3xl p-4 shadow-sm ${meta.bg}`}><div className="flex items-start justify-between gap-3"><div><div className={`font-semibold ${meta.text}`}>{item.testedName}</div><div className="mt-1 text-xs text-neutral-500">{item.sampleLocation} • {item.sampleType}</div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.pill}`}>{meta.label}</span></div><p className={`mt-3 text-sm leading-5 ${meta.text}`}>{item.summary}</p><div className="mt-3 grid gap-2">{item.chemicals.map((chemical) => <div key={`${item.id}-${chemical.name}`} className="rounded-2xl bg-white/80 p-3 text-sm shadow-sm"><div className="flex items-center justify-between gap-3"><span className="font-semibold text-neutral-950">{chemical.name}</span><span className="text-xs font-medium text-neutral-500">{chemical.concern}</span></div><div className="mt-1 text-xs text-neutral-500">{chemical.family} • {chemical.amount}</div></div>)}</div><div className="mt-3 text-xs leading-5 text-neutral-500">Attribution: PlasticList, Data on Plastic Chemicals in Bay Area Foods, licensed under CC BY 4.0.</div></div>; })}</div></div>;
}

function UnknownScreen({ close }) {
  return <div className="min-h-[690px] px-5 pb-5"><Header title="Product not found" right={<BackButton onClick={close} />} /><div className="mt-16 flex flex-col items-center text-center"><div className="mb-5 flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white text-5xl font-semibold text-neutral-950 shadow-sm">!</div><h2 className="text-3xl font-semibold tracking-tight text-neutral-950">We don’t have this yet</h2><p className="mt-3 max-w-[300px] text-sm leading-6 text-neutral-500">Add product and packaging photos so the community can help verify it.</p><Button className="mt-7 px-6">Upload product</Button><Button onClick={close} variant="ghost" className="mt-2">Try another scan</Button></div></div>;
}

function DetailScreen({ product, part, close }) {
  const sources = [...getSourcesFor({ entityType: "part", entityId: part.id }), ...getSourcesFor({ entityType: "plastic_type", entityId: part.plasticTypeId }), ...part.contexts.flatMap((context) => getSourcesFor({ entityType: "context", entityId: context.contextId }))];
  const uniqueSources = Array.from(new Map(sources.map((item) => [item.source.id, item])).values());
  const swipeBackHandlers = useSwipeBack(close, true);
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5" {...swipeBackHandlers}><Header title="Why" right={<BackButton onClick={close} />} /><Card><div className="p-5"><div className="text-sm text-neutral-500">{product.name}</div><h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">{part.displayName}</h2><div className="mt-3 inline-flex rounded-full bg-[#f7f3eb] px-3 py-1 text-sm text-neutral-700">{getPartMaterialLabel(part) || "Unknown material"}</div><p className="mt-4 text-sm leading-6 text-neutral-500">{part.notes}</p>{part.linerInfo && <div className="mt-4 rounded-2xl bg-[#f7f3eb] p-3"><div className="text-sm font-semibold text-neutral-950">{part.linerType === "bpa_free_confirmed" ? "Label confirmed" : "Liner assumption"}: {part.linerInfo.linerLabel}</div><p className="mt-1 text-sm leading-5 text-neutral-500">{part.linerInfo.linerSummary}</p></div>}</div></Card><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><h3 className="font-semibold text-neutral-950">Score impact</h3><div className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><span>Component</span><span>{part.baseImpact}</span></div><div className="flex justify-between"><span>Material type</span><span>{part.materialImpact}</span></div>
          {part.linerInfo && <div className="flex justify-between"><span>{part.linerInfo.linerLabel}</span><span>{part.linerAdjustment}</span></div>}{part.labelEvidenceBonus > 0 && <div className="flex justify-between text-emerald-700"><span>Label evidence bonus</span><span>+{part.labelEvidenceBonus}</span></div>}<div className="flex justify-between"><span>Context</span><span>{part.contextImpact}</span></div><div className="flex justify-between border-t border-neutral-200 pt-2 font-semibold"><span>Total impact</span><span>{part.totalImpact}</span></div></div></div><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><h3 className="font-semibold text-neutral-950">Context modifiers</h3><div className="mt-3 space-y-2">{part.contexts.length ? part.contexts.map((item) => <div key={item.id} className="rounded-2xl bg-[#f7f3eb] p-3"><div className="flex justify-between gap-3 font-medium text-neutral-950"><span>{item.context.name}</span><span>{item.context.penalty}</span></div><p className="mt-1 text-sm leading-5 text-neutral-500">{item.context.summary}</p></div>) : <p className="text-sm text-neutral-500">No special context modifiers attached.</p>}</div></div><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><h3 className="font-semibold text-neutral-950">Sources & research</h3><div className="mt-3 space-y-2">{uniqueSources.length ? uniqueSources.map((link) => <SourceCard key={link.source.id} link={link} />) : <p className="text-sm text-neutral-500">No sources attached yet.</p>}</div></div></div>;
}

function ScoreBreakdownPanel({ product, close }) {
  const panelRef = useRef(null);
  const rows = [["Health Risk", product.splitScores.health, "Heat, acidity, ingestion, skin contact, and leaching risk."], ["Plastic Exposure", product.splitScores.exposure, "How much plastic is present and how close it is to the product."], ["Recyclability", product.splitScores.recyclability, "How likely the plastic parts are to be accepted in recycling."]];

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      let node = panelRef.current?.parentElement;
      while (node) {
        const style = window.getComputedStyle(node);
        const canScroll = /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight;
        if (canScroll) {
          node.scrollTo({ top: 0, left: 0, behavior: "auto" });
          break;
        }
        node = node.parentElement;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div ref={panelRef} className="min-h-[690px] overflow-y-auto px-5 pb-5">
      <Header title="Score details" right={<BackButton onClick={close} />} />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
        <Card>
          <div className="flex flex-col items-center p-6 text-center">
            <ScoreRing score={product.score} delay={0.1} />
            <motion.h2 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36, duration: 0.28 }} className="mt-5 text-2xl font-semibold tracking-tight text-neutral-950">Overall score</motion.h2>
            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44, duration: 0.28 }} className="mt-2 max-w-[280px] text-sm leading-5 text-neutral-500">The main score stays simple. These show what drives it.</motion.p>
          </div>
        </Card>
      </motion.div>
      <div className="mt-5 space-y-3">
        {rows.map(([label, value, copy], index) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + index * 0.09, type: "spring", stiffness: 160, damping: 20 }} whileTap={{ scale: 0.99 }} className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 pr-2">
                <div className="font-semibold text-neutral-950">{label}</div>
                <p className="mt-1 text-sm leading-5 text-neutral-500">{copy}</p>
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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef(null);
  const tags = ["Personal care", "Food", "Cleaning", "Sexual health", "Hidden plastic", "Available in Canada", "Microwave safe", "Feminine hygiene", "Baby", "Kitchen", "Clothing", "Teas", "Sunscreen"];
  const trendingProducts = getTrendingProducts(products);
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
      if (tag === "Sexual health") return product.category?.name === "Sexual health";
      if (tag === "Feminine hygiene") return product.category?.name === "Feminine hygiene";
      if (tag === "Hidden plastic") return product.parts.some((part) => part.partType === "inner_packaging" || part.partType === "liner");
      return true;
    });
    return matchesQuery && passesPlasticFree && passesTags;
  });
  const focusSearch = () => searchInputRef.current?.focus();
  const shouldShowTrending = !q && !isSearchFocused;
  return <div className="min-h-[690px] px-5 pb-4"><Header title="Search" /><div onClick={focusSearch} onTouchEnd={focusSearch} className="mb-4 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm"><Icon type="search" active={false} size={22} /><input ref={searchInputRef} value={query} onFocus={() => setIsSearchFocused(true)} onBlur={() => setIsSearchFocused(false)} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} placeholder="Search products, brands, or categories" enterKeyHint="search" className="w-full bg-transparent text-base outline-none" /></div><div className="mb-4 flex gap-2 overflow-x-auto pb-1"><FastTapButton onActivate={() => { triggerHapticFeedback(); setPlasticFreeOnly(!plasticFreeOnly); }} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm shadow-sm transition active:scale-[0.98] ${plasticFreeOnly ? "bg-neutral-950 text-white" : "bg-white text-neutral-700"}`}>Plastic-free only</FastTapButton>{tags.map((tag) => <FastTapButton key={tag} onActivate={() => { triggerHapticFeedback(); toggleTag(tag); }} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm shadow-sm transition active:scale-[0.98] ${activeTags.includes(tag) ? "bg-neutral-950 text-white" : "bg-white text-neutral-700"}`}>{tag}</FastTapButton>)}</div>{shouldShowTrending && trendingProducts.length > 0 && <Card className="mb-4"><div className="p-4"><SocialHighlightHeader title="Trending this week" copy="Most saved in trusted circles" /><div className="flex gap-3 overflow-x-auto pb-1">{trendingProducts.map((product) => <TrendingProductChip key={product.id} product={product} onClick={() => openResult(product)} />)}</div></div></Card>}<div className="space-y-2">{filtered.length ? filtered.map((product, index) => <motion.div key={product.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 3) * 0.025, duration: 0.16 }}><ProductRow product={product} onClick={() => openResult(product)} /></motion.div>) : <div className="mt-20 text-center"><div className="text-xl font-semibold text-neutral-950">No product found</div><p className="mt-2 text-sm text-neutral-500">Add photos and packaging notes to help verify it.</p><Button onClick={openAddProduct} className="mt-5">＋ Add product</Button></div>}</div></div>;
}

function PhotoUploadSlot({ label, value, onChange }) {
  return (
    <label className="block rounded-2xl border border-neutral-200 bg-[#f7f3eb] p-3 text-left">
      <span className="block text-sm font-semibold text-neutral-950">{label}</span>
      <span className="mt-1 block truncate text-xs text-neutral-500">{value || "Tap to choose photo"}</span>
      <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => onChange(event.target.files?.[0]?.name || "")} />
    </label>
  );
}

function AddProductScreen({ close, draft = {}, onSubmit }) {
  const [flashOn, setFlashOn] = useState(false);
  const [photos, setPhotos] = useState({ front: "", back: "", barcode: "", symbols: "" });
  const [name, setName] = useState(draft.name || "");
  const [brand, setBrand] = useState(draft.brand || "");
  const [barcode, setBarcode] = useState(draft.barcode || "");
  const [submitted, setSubmitted] = useState(false);
  const setPhoto = (key, value) => setPhotos((current) => ({ ...current, [key]: value }));
  const canSubmit = name.trim() || barcode.trim();
  return <div className="relative min-h-[690px] overflow-y-auto bg-neutral-950 text-white"><div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#3f3f46_0%,_#18181b_55%,_#09090b_100%)]" /><div className="relative z-10 px-5 pb-6"><div className="flex items-center justify-between pb-3 pt-6"><h1 className="text-2xl font-semibold tracking-tight">Add product</h1><BackButton onClick={close} variant="light" /></div><div className="mt-8 flex flex-col items-center text-center"><button type="button" className="relative flex h-64 w-64 items-center justify-center overflow-hidden rounded-[2rem] border-2 border-white/80 bg-white/5 shadow-2xl">{draft.imageUrl ? <img src={draft.imageUrl} alt="" className="h-full w-full object-cover opacity-80" /> : <><span className="absolute left-8 top-8 h-8 w-8 border-l-4 border-t-4 border-white" /><span className="absolute right-8 top-8 h-8 w-8 border-r-4 border-t-4 border-white" /><span className="absolute bottom-8 left-8 h-8 w-8 border-b-4 border-l-4 border-white" /><span className="absolute bottom-8 right-8 h-8 w-8 border-b-4 border-r-4 border-white" /><div className="flex flex-col items-center gap-3"><div className="text-5xl">📷</div><div className="text-sm font-medium text-white/80">Add product photos</div></div></>}</button><div className="mt-5 flex gap-3"><Button variant="light">Photo review</Button><button type="button" onClick={() => setFlashOn(!flashOn)} className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/20 ${flashOn ? "bg-white text-neutral-950" : "bg-white/10 text-white"}`} aria-label="Toggle light"><FlashlightIcon size={22} /></button></div><p className="mt-5 max-w-[310px] text-sm leading-6 text-white/70">Upload front, back label, barcode, and plastic/recycling symbols so the database can verify the product before it becomes public.</p>{draft.source && <p className="mt-3 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">Started from {draft.source}</p>}</div><div className="mt-8 space-y-3 rounded-3xl bg-white p-4 text-neutral-950 shadow-sm"><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Product name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. UltraShine Dishwasher Detergent" className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" /></label><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Brand</span><input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="e.g. Kirkland Signature" className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" /></label><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Category</span><select defaultValue={draft.packagingScan ? "Other" : "Food and drink"} className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950"><option>Food and drink</option><option>Personal care</option><option>Household cleaning</option><option>Feminine hygiene</option><option>Sexual health</option><option>Baby</option><option>Other</option></select></label><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Barcode number</span><input value={barcode} onChange={(event) => setBarcode(event.target.value)} inputMode="numeric" placeholder="Scan or enter manually" className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" /></label><div><span className="mb-2 block text-sm font-medium text-neutral-700">Required photos</span><div className="grid grid-cols-2 gap-2"><PhotoUploadSlot label="Front" value={photos.front} onChange={(value) => setPhoto("front", value)} /><PhotoUploadSlot label="Back label" value={photos.back} onChange={(value) => setPhoto("back", value)} /><PhotoUploadSlot label="Barcode" value={photos.barcode} onChange={(value) => setPhoto("barcode", value)} /><PhotoUploadSlot label="Plastic symbols" value={photos.symbols} onChange={(value) => setPhoto("symbols", value)} /></div></div><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Packaging notes</span><textarea defaultValue={draft.packagingScan ? "Started from packaging symbol scan. Add resin codes, recycling symbols, liner claims, or compostable markings seen on the package." : ""} placeholder="Main container, cap, liner, wrapper, inner packaging, etc." className="min-h-[100px] w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" /></label>{submitted && <div className="rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Submitted and added to your scan history.</div>}<Button onClick={() => { if (!canSubmit) return; setSubmitted(true); onSubmit?.({ ...draft, name, brand, barcode }, photos); }} className={`w-full ${!canSubmit ? "opacity-50" : ""}`}>Submit for review</Button></div></div></div>;
}

function HistoryScreen({ products, scans = db.scans, openResult, openScanned, openSearched }) {
  const resolvedScans = scans.map((scan) => ({ ...scan, product: products.find((product) => product.id === scan.productId) })).filter((scan) => scan.product);
  const searchedProducts = products.filter((product) => !resolvedScans.some((scan) => scan.product.id === product.id));
  return <div className="min-h-[690px] px-5 pb-4"><Header title="History" /><div className="mb-5 grid grid-cols-2 gap-3"><button type="button" onClick={openScanned} className="text-left"><Card><div className="p-4"><div className="text-3xl font-semibold">{resolvedScans.length}</div><div className="text-sm text-neutral-500">Products scanned</div></div></Card></button><button type="button" onClick={openSearched} className="text-left"><Card><div className="p-4"><div className="text-3xl font-semibold">{searchedProducts.length}</div><div className="text-sm text-neutral-500">Products searched</div></div></Card></button></div><div className="space-y-2">{resolvedScans.map((scan) => <ProductRow key={scan.id} product={scan.product} onClick={() => openResult(scan.product)} />)}</div></div>;
}

function ShareSheet({ product, close, onShareSuccess }) {
  const shareLink = `https://plasticfree.app/product/${product?.id || "unknown"}`;
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title="Share product" right={<BackButton onClick={close} />} /><Card><div className="p-5 text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f7f3eb] text-2xl">↗</div><h2 className="text-2xl font-semibold tracking-tight text-neutral-950">Share {product?.name}</h2><p className="mt-2 text-sm leading-6 text-neutral-500">This sends a link that opens in the app. If they don’t have the app, it takes them to the App Store.</p><div className="mt-5 rounded-2xl bg-[#f7f3eb] p-3 text-left text-xs text-neutral-500">{shareLink}</div></div></Card><div className="mt-5 grid grid-cols-3 gap-3"><Button onClick={() => onShareSuccess?.("Text")} variant="outline" className="bg-white">Text</Button><Button onClick={() => onShareSuccess?.("WhatsApp")} variant="outline" className="bg-white">WhatsApp</Button><Button onClick={() => onShareSuccess?.("Email")} variant="outline" className="bg-white">Email</Button></div></div>;
}

function ProductListScreen({ title, products, openResult, close }) {
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title={title} right={<BackButton onClick={close} />} /><div className="space-y-2">{products.length ? products.map((product) => <ProductRow key={product.id} product={product} onClick={() => openResult(product)} />) : <Card><div className="p-5 text-center text-sm text-neutral-500">No products yet.</div></Card>}</div></div>;
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

function AppleShareIcon({ size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M6 12v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7" /></svg>;
}

function HeartIcon({ filled = false, size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>;
}

function CloseIcon({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>;
}

function ProductImagePreview({ product, close }) {
  const swipeBackHandlers = useSwipeBack(close, true);
  return (
    <motion.div
      className="fixed left-1/2 top-0 z-[90] flex h-[100dvh] w-full max-w-[430px] -translate-x-1/2 items-center justify-center overflow-hidden bg-black/82 px-5 backdrop-blur-xl md:top-1/2 md:h-[min(760px,calc(100dvh-4rem))] md:-translate-y-1/2 md:rounded-[2.35rem]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 0.8, 0.2, 1] }}
      onClick={close}
      {...swipeBackHandlers}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          triggerHapticFeedback();
          close();
        }}
        className="absolute right-5 top-[max(1.25rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-white/92 text-neutral-950 shadow-lg ring-1 ring-white/30 backdrop-blur transition active:scale-95"
        aria-label="Close image preview"
      >
        <CloseIcon />
      </button>
      <motion.div
        className="w-full"
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.3, ease: [0.2, 0.82, 0.2, 1] }}
        onClick={(event) => event.stopPropagation()}
      >
        <ProductImage src={product.imageUrl} alt={product.name} className="mx-auto max-h-[72dvh] w-full max-w-[360px] rounded-[2rem] bg-[#f7f3eb] object-contain shadow-2xl" />
        <div className="mx-auto mt-4 max-w-[360px] text-center">
          <div className="text-sm font-medium text-white/70">{product.brand}</div>
          <div className="mt-1 text-lg font-semibold leading-tight text-white">{product.name}</div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SocialProductPreview({ product, onClick }) {
  return <button type="button" onClick={onClick} className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-[#f7f3eb] p-3 text-left transition hover:bg-[#f1eadf] active:scale-[0.99]"><ProductImage src={product.imageUrl} alt={product.name} className="h-14 w-14 rounded-xl object-cover shadow-sm" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-neutral-950">{product.name}</div><div className="text-xs text-neutral-500">{product.brand}</div></div><div className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold shadow-inner" style={getScoreBadgeStyle(product.theme)}>{product.score}</div></button>;
}

function getProductSwapType(product) {
  if (product?.productType) return product.productType;
  const text = `${product?.brand || ""} ${product?.name || ""}`.toLowerCase();
  if (text.includes("dishwasher") && (text.includes("detergent") || text.includes("tablet") || text.includes("pod"))) return "dishwasher_detergent";
  if (text.includes("bar soap") || text.includes("handwash") || text.includes("hand wash")) return "soap";
  if (text.includes("tuna")) return "tuna";
  if (text.includes("tomato paste")) return "tomato_paste";
  if (text.includes("tea")) return "tea";
  if (text.includes("water")) return "water";
  return null;
}

function getBetterSwap(products) {
  const groups = products.reduce((acc, product) => {
    const type = getProductSwapType(product);
    if (!type) return acc;
    acc[type] = [...(acc[type] || []), product];
    return acc;
  }, {});
  return Object.values(groups).reduce((best, group) => {
    const sorted = [...group].sort((a, b) => a.score - b.score);
    const from = sorted[0];
    const to = [...sorted].reverse().find((product) => product.id !== from.id && product.score >= from.score + 15);
    if (!from || !to) return best;
    if (!best || to.score - from.score > best.to.score - best.from.score) return { from, to };
    return best;
  }, null);
}

function getTrendingProducts(products) {
  const ids = [
    "paper_soap",
    "hunts_tomato_paste",
    "blueland_dishwasher_tablets",
    "kirkland_tuna",
    "kirkland_dishwasher",
    "old_spice",
    "allens_apple",
    "campbells_soup",
    "always_ultra",
    "plasticlist_boba_guys_fruity_flavored_tea",
    "plasticlist_coca_cola_original",
    "plasticlist_enfamil_neuro_pro_587g_infant_formula_can"
  ];
  const picked = ids.map((id) => products.find((product) => product.id === id)).filter(Boolean);
  const fallback = products.filter((product) => !picked.some((item) => item.id === product.id)).slice(0, 10 - picked.length);
  return [...picked, ...fallback].slice(0, 10);
}

function CompactScoreCircle({ product, className = "" }) {
  return <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-inner ${className}`} style={getScoreBadgeStyle(product.theme)}>{product.score}</div>;
}

function SocialHighlightHeader({ title, copy }) {
  return <div className="mb-3"><h3 className="font-semibold text-neutral-950">{title}</h3><p className="text-xs text-neutral-500">{copy}</p></div>;
}

function TrendingProductChip({ product, onClick }) {
  return <FastTapButton onActivate={onClick} className="flex w-64 shrink-0 touch-manipulation items-center gap-3 rounded-2xl bg-[#f7f3eb] p-3 text-left transition active:scale-[0.98]"><ProductImage src={product.imageUrl} alt={product.name} className="h-16 w-16 rounded-xl object-cover shadow-sm" /><div className="min-w-0 flex-1"><div className="line-clamp-2 text-sm font-semibold leading-tight text-neutral-950">{product.name}</div><div className="mt-1 line-clamp-2 text-xs font-medium leading-tight text-neutral-500">{product.brand}</div></div><CompactScoreCircle product={product} /></FastTapButton>;
}

function SwapProductTile({ product, label, tone, onClick }) {
  const isBetter = tone === "better";
  return <button type="button" onClick={onClick} className={`flex min-w-0 items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[0.98] ${isBetter ? "bg-[#f4fbf6]" : "bg-[#f7f3eb]"}`}><ProductImage src={product.imageUrl} alt={product.name} className="h-16 w-16 rounded-xl object-cover shadow-sm" /><div className="min-w-0 flex-1"><div className={`text-[10px] font-medium uppercase tracking-[0.08em] ${isBetter ? "text-emerald-700/70" : "text-neutral-400"}`}>{label}</div><div className="mt-1 line-clamp-2 text-sm font-semibold leading-tight text-neutral-950">{product.name}</div><div className="mt-0.5 line-clamp-1 text-xs font-medium leading-tight text-neutral-500">{product.brand}</div></div><CompactScoreCircle product={product} /></button>;
}

function BetterSwapHighlight({ swapFrom, swapTo, openResult }) {
  if (!swapFrom || !swapTo) return null;
  return <Card><div className="p-4"><SocialHighlightHeader title="Better swap spotted" copy="Same product type, cleaner-rated option" /><div className="space-y-2"><SwapProductTile product={swapFrom} label="From" tone="from" onClick={() => openResult(swapFrom)} /><div className="flex h-5 items-center justify-center text-lg font-semibold text-neutral-400">↓</div><SwapProductTile product={swapTo} label="To" tone="better" onClick={() => openResult(swapTo)} /></div></div></Card>;
}

function SocialScreen({ products, openResult, openNotifications, openUserProfile, savedProductIds = [], toggleFavorite, unreadNotifications = 0 }) {
  const [mode, setMode] = useState("following");
  const people = db.users.filter((user) => ["user_maya", "user_jon"].includes(user.id));
  const creators = db.users.filter((user) => ["user_amelia", "user_sam"].includes(user.id));
  const getTime = (i) => ["2h", "5h", "1d"][i % 3];
  const betterSwap = getBetterSwap(products);
  const swapFrom = betterSwap?.from;
  const swapTo = betterSwap?.to;

  return <div className="min-h-[690px] overflow-y-auto px-5 pb-4"><Header title="Social" right={<button type="button" onClick={openNotifications} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"><Icon type="bell" size={22} />{unreadNotifications > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm">{unreadNotifications}</span>}</button>} /><div className="mb-4 grid grid-cols-2 rounded-full bg-white p-1 shadow-sm">{["following", "discover"].map((option) => <button key={option} type="button" onClick={() => setMode(option)} className={`rounded-full py-2 text-sm font-medium capitalize ${mode === option ? "bg-neutral-950 text-white" : "text-neutral-500"}`}>{option}</button>)}</div>{mode === "discover" ? <div className="space-y-5"><Card><div className="p-3"><h3 className="mb-2 text-sm text-neutral-500">People you know</h3><div className="space-y-2">{people.map((user) => <div key={user.id} onClick={() => openUserProfile(user)} className="cursor-pointer rounded-2xl transition hover:bg-[#f1eadf] active:scale-[0.98]"><SuggestedUser user={user} /></div>)}</div></div></Card><Card><div className="p-3"><h3 className="mb-2 text-sm text-neutral-500">Creators</h3><div className="space-y-2">{creators.map((user) => <div key={user.id} onClick={() => openUserProfile(user)} className="cursor-pointer rounded-2xl transition hover:bg-[#f1eadf] active:scale-[0.98]"><SuggestedUser user={user} /></div>)}</div></div></Card></div> : <div className="space-y-3"><BetterSwapHighlight swapFrom={swapFrom} swapTo={swapTo} openResult={openResult} />{db.social.length === 0 && <div className="mt-20 text-center text-sm text-neutral-500">Follow people to see product activity</div>}{db.social.map((activity, i) => { const product = products.find((p) => p.id === activity.productId); const user = db.users.find((u) => u.id === activity.userId); if (!product || !user) return null; const isSaved = savedProductIds.includes(product.id); return <Card key={activity.id}><div className="p-4"><div className="flex items-center justify-between"><button type="button" className="flex min-w-0 items-center gap-2 text-left" onClick={() => openUserProfile(user)}><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white shadow-sm">{user.avatar}</div><div className="min-w-0 text-sm"><span className="text-neutral-500">{user.displayName}</span><span className="font-medium text-neutral-950"> {activity.action} {product.name}</span></div></button><span className="shrink-0 text-xs text-neutral-400">{getTime(i)}</span></div><p className="mt-2 text-sm text-neutral-500">{activity.note}</p><SocialProductPreview product={product} onClick={() => openResult(product)} /><div className="mt-3 grid grid-cols-3 gap-2"><SocialActionButton onClick={() => toggleFavorite?.(product.id)} muted={isSaved}>{isSaved ? "♡ Saved" : "❤ Save"}</SocialActionButton><SocialActionButton>↗ Share</SocialActionButton><SocialActionButton onClick={() => openResult(product)}><span className="flex items-center gap-1"><EyeMiniIcon /> View</span></SocialActionButton></div></div></Card>; })}</div>}</div>;
}

function SettingsSection({ title, children }) {
  return <div className="rounded-3xl bg-white p-4 shadow-sm"><h3 className="mb-4 font-semibold text-neutral-950">{title}</h3>{children}</div>;
}

function Field({ label, type = "text", placeholder, defaultValue = "" }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">{label}</span><input type={type} placeholder={placeholder} defaultValue={defaultValue} className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" /></label>;
}

function SettingsScreen({ close, onSignOut, onDeleteAccount, profile, updateProfile, locale, setLocale, localeCopy }) {
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

  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title="Settings" right={<BackButton onClick={close} />} /><div className="space-y-4"><SettingsSection title="Update name"><div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">First</span><input value={firstName} onChange={(event) => { setFirstName(event.target.value); setNameUpdated(false); }} className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" /></label><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Last</span><input value={lastName} onChange={(event) => { setLastName(event.target.value); setNameUpdated(false); }} className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" /></label></div><Button onClick={() => { updateProfile({ firstName, lastName }); setNameUpdated(true); }} className={`mt-4 w-full ${nameUpdated ? updatedButtonClass : ""}`}>{nameUpdated ? <span className="text-neutral-300">Name updated!</span> : "Update name"}</Button></SettingsSection><SettingsSection title="Update email address"><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Email address</span><input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setEmailUpdated(false); }} className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" /></label><Button onClick={() => { updateProfile({ email }); setEmailUpdated(true); }} className={`mt-4 w-full ${emailUpdated ? updatedButtonClass : ""}`}>{emailUpdated ? <span className="text-neutral-300">Email updated!</span> : "Update email"}</Button></SettingsSection><SettingsSection title="Regional spelling"><p className="mb-3 text-sm text-neutral-500">Controls labels like {localeCopy.favorite}/{locale === "CA" ? "Favorite" : "Favourite"} across the app.</p><div className="grid grid-cols-2 rounded-full bg-[#f7f3eb] p-1"><button type="button" onClick={() => setLocale("CA")} className={`rounded-full py-2 text-sm font-semibold ${locale === "CA" ? "bg-neutral-950 text-white" : "text-neutral-500"}`}>Canada</button><button type="button" onClick={() => setLocale("US")} className={`rounded-full py-2 text-sm font-semibold ${locale === "US" ? "bg-neutral-950 text-white" : "text-neutral-500"}`}>USA</button></div></SettingsSection><SettingsSection title="Change password"><div className="space-y-3"><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Current password</span><input type="password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setPasswordUpdated(false); }} placeholder="Enter current password" className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" /></label><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">New password</span><input type="password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setPasswordUpdated(false); }} placeholder="Enter new password" className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" /></label></div><Button onClick={() => { updateProfile({ password: newPassword }); setPasswordUpdated(true); }} className={`mt-4 w-full ${passwordUpdated ? updatedButtonClass : ""}`}>{passwordUpdated ? <span className="text-neutral-300">Password updated!</span> : "Update password"}</Button></SettingsSection><SettingsSection title="Notifications & Privacy"><div className="mb-4 flex items-center justify-between gap-4"><div><div className="font-medium text-neutral-950">Push notifications</div><p className="mt-1 text-sm text-neutral-500">Get updates about product reviews, comments, and new matches.</p></div><ToggleSwitch checked={notificationsOn} onClick={() => setNotificationsOn(!notificationsOn)} label="Toggle notifications" /></div><div className="flex items-center justify-between gap-4"><div><div className="font-medium text-neutral-950">Share activity</div><p className="mt-1 text-sm text-neutral-500">Show your scans and {localeCopy.favoritesLower} in your social feed.</p></div><ToggleSwitch checked={shareActivity} onClick={() => setShareActivity(!shareActivity)} label="Toggle share activity" /></div></SettingsSection><Button onClick={onSignOut} variant="outline" className="w-full bg-white">Sign out</Button><Button onClick={onDeleteAccount} variant="ghost" className="w-full text-red-700 hover:bg-red-50">Delete account</Button></div></div>;
}

function SignInScreen({ onSignIn }) {
  return <div className="flex min-h-[760px] flex-col justify-center px-6 py-8"><div className="text-center"><div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-950 text-2xl font-semibold text-white">D</div><h1 className="text-3xl font-semibold tracking-tight text-neutral-950">Welcome back</h1><p className="mt-2 text-sm text-neutral-500">Sign in to continue checking products.</p></div><div className="mt-8 rounded-3xl bg-white p-4 shadow-sm"><div className="space-y-3"><Field label="Email address" type="email" defaultValue="dave@example.com" /><Field label="Password" type="password" placeholder="Enter password" /></div><Button onClick={onSignIn} className="mt-5 w-full">Sign in</Button></div></div>;
}

function DeleteAccountScreen({ close, onConfirmDelete }) {
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title="Delete account" right={<BackButton onClick={close} />} /><div className="mt-8 rounded-3xl bg-white p-5 text-center shadow-sm"><div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-4xl font-semibold text-red-700">!</div><h2 className="text-2xl font-semibold tracking-tight text-neutral-950">Are you sure?</h2><p className="mt-3 text-sm leading-6 text-neutral-500">Deleting your account will permanently remove your profile, scan history, favorites, social activity, and saved settings. This cannot be undone.</p><Button onClick={onConfirmDelete} className="mt-6 w-full bg-red-700 hover:bg-red-800">Permanently delete account</Button><Button onClick={close} variant="ghost" className="mt-2 w-full">Cancel</Button></div></div>;
}

function NotificationIcon({ type }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (type === "score") return <svg {...common}><path d="M21 12a9 9 0 0 0-15.4-6.3L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 15.4 6.3L21 16" /><path d="M16 16h5v5" /></svg>;
  if (type === "share") return <svg {...common}><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>;
  return <BarcodeScanIcon size={20} active={true} />;
}

function NotificationsScreen({ close }) {
  const notifications = [
    { id: 1, title: "Product score updated", message: <>Solid Light Tuna changed from 42 → 38 after new liner information was added.</>, time: "2h", icon: "score" },
    { id: 2, title: "Product shared with you", message: <><span className="text-neutral-500">Maya K.</span><span> shared </span><span className="font-medium text-neutral-700">Paper-Wrapped Bar Soap</span><span> with you.</span></>, time: "5h", icon: "share" },
    { id: 3, title: "New scan from someone you follow", message: <><span className="text-neutral-500">Jon R.</span><span> scanned </span><span className="font-medium text-neutral-700">UltraShine Dishwasher Detergent</span><span>.</span></>, time: "1d", icon: "scan" }
  ];
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title="Notifications" right={<BackButton onClick={close} />} /><div className="space-y-2">{notifications.map((item) => <div key={item.id} className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f7f3eb] text-neutral-950"><NotificationIcon type={item.icon} /></div><div className="min-w-0 flex-1"><div className="font-medium text-neutral-950">{item.title}</div><div className="mt-1 text-sm leading-5 text-neutral-600">{item.message}</div><div className="mt-1 text-xs text-neutral-400">{item.time} ago</div></div></div>)}</div></div>;
}

function PlansScreen({ close }) {
  const [billing, setBilling] = useState("yearly");
  const proPrice = billing === "yearly" ? "$39.99/year" : "$4.99/month";
  const freeFeatures = ["5 scans per day", "Last 30 scanned products", "Basic product score", "Plastic breakdown", "Sources and research", "Community feed", "Location-based recyclability"];
  const proFeatures = ["Unlimited scans", "Unlimited history", "Advanced search by product, brand, category, and filters", "Offline mode for grocery stores", "Strict mode and personal risk profiles", "Product alerts when score changes", "Exportable shopping lists", "Barcode batch scan for pantry cleanups", "Early access to new product data", "Priority product verification requests"];
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title="Plans" right={<BackButton onClick={close} />} /><div className="mb-5 grid grid-cols-2 rounded-full bg-white/70 p-1 shadow-sm backdrop-blur-xl"><button type="button" onClick={() => setBilling("monthly")} className={`rounded-full py-2 text-sm font-semibold transition ${billing === "monthly" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500"}`}>Monthly</button><button type="button" onClick={() => setBilling("yearly")} className={`rounded-full py-2 text-sm font-semibold transition ${billing === "yearly" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500"}`}>Yearly</button></div><div className="space-y-4"><Card><div className="p-5"><div className="flex items-start justify-between"><div><h2 className="text-2xl font-semibold tracking-[-0.04em] text-neutral-950">Free</h2><p className="mt-1 text-sm text-neutral-500">For casual product checks.</p></div><div className="rounded-full bg-[#f7f3eb] px-3 py-1 text-sm font-semibold text-neutral-700">$0</div></div><div className="mt-5 space-y-3">{freeFeatures.map((feature) => <div key={feature} className="flex gap-2 text-sm text-neutral-700"><span className="text-neutral-950">✓</span><span>{feature}</span></div>)}</div><Button variant="outline" className="mt-5 w-full bg-white">Current plan</Button></div></Card><div className="overflow-hidden rounded-[28px] bg-neutral-950 p-5 text-white shadow-[0_18px_42px_rgba(0,0,0,0.22)]"><div className="pointer-events-none -mx-5 -mt-5 mb-5 h-24 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_55%)]" /><div className="-mt-24 flex items-start justify-between"><div><div className="mb-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xl">Best value</div><h2 className="text-2xl font-semibold tracking-[-0.04em]">Pro</h2><p className="mt-1 text-sm text-neutral-300">For people actively reducing plastic exposure.</p></div><div className="text-right"><div className="text-xl font-semibold">{proPrice}</div>{billing === "yearly" && <div className="text-xs text-neutral-400">Save 33%</div>}</div></div><div className="mt-5 space-y-3">{proFeatures.map((feature) => <div key={feature} className="flex gap-2 text-sm text-neutral-200"><span>✓</span><span>{feature}</span></div>)}</div><Button variant="light" className="mt-5 w-full">Start Pro</Button></div></div></div>;
}

function BadgeCard({ badge, highlight, compact = false }) {
  const status = getBadgeStatus(badge);
  const progressText = badge.isPercent ? `${badge.progress}% / ${status.nextThreshold}%` : `${badge.progress} / ${status.nextThreshold}`;
  const tierStyles = {
    Bronze: { medal: "linear-gradient(145deg, #f0c7a4 0%, #b8734a 34%, #6f3f28 66%, #d69a72 100%)" },
    Silver: { medal: "linear-gradient(145deg, #e9ecef 0%, #a6adb5 34%, #66717c 66%, #c0c7ce 100%)" },
    Gold: { medal: "linear-gradient(145deg, #fff8d6 0%, #ffe26a 24%, #f7b51e 48%, #b97800 70%, #ffe99a 100%)", shadow: "0 10px 24px rgba(247,181,30,0.38), 0 2px 7px rgba(93,55,0,0.24)" },
    Platinum: { medal: "linear-gradient(145deg, #ffffff 0%, #eaf7ff 20%, #b7d4e8 42%, #7f96ad 62%, #f9fdff 82%, #cfe7f6 100%)", shadow: "0 11px 26px rgba(164,205,232,0.46), 0 2px 8px rgba(44,63,82,0.24)" },
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
        style={{ background: tier.medal, ...(tier.shadow ? { boxShadow: tier.shadow } : {}) }}
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

        {status.currentTier === "Gold" && (
          <>
            <div
              className="pointer-events-none absolute inset-[-1px] rounded-full"
              style={{ background: "conic-gradient(from 210deg, transparent 0deg, rgba(255,255,255,0.55) 42deg, transparent 88deg, rgba(126,70,0,0.28) 172deg, transparent 260deg, rgba(255,238,156,0.45) 322deg, transparent 360deg)" }}
            />
            <div
              className="pointer-events-none absolute inset-[4px] rounded-full border border-white/45"
              style={{ boxShadow: "inset 0 1px 2px rgba(255,255,255,0.92), inset 0 -2px 3px rgba(120,72,0,0.24)" }}
            />
          </>
        )}

        {status.currentTier === "Platinum" && (
          <>
            <div
              className="pointer-events-none absolute inset-[-1px] rounded-full"
              style={{ background: "conic-gradient(from 225deg, transparent 0deg, rgba(255,255,255,0.82) 38deg, transparent 72deg, rgba(96,126,151,0.28) 150deg, transparent 218deg, rgba(218,245,255,0.7) 292deg, transparent 360deg)" }}
            />
            <div
              className="pointer-events-none absolute inset-[4px] rounded-full border border-white/65"
              style={{ boxShadow: "inset 0 1px 3px rgba(255,255,255,0.96), inset 0 -2px 4px rgba(58,83,108,0.24)" }}
            />
            <motion.div
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
              style={{ background: "linear-gradient(118deg, transparent 34%, rgba(255,255,255,0.75) 48%, rgba(205,238,255,0.48) 52%, transparent 66%)" }}
              initial={{ x: "-125%", opacity: 0 }}
              animate={{ x: ["-125%", "125%"], opacity: [0, 0.72, 0] }}
              transition={{ duration: 2.35, repeat: Infinity, ease: "easeInOut", delay: 0.55 }}
            />
          </>
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
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title="Badges" right={<BackButton onClick={close} />} /><div className="grid grid-cols-2 gap-3">{badges.map((badge) => <BadgeCard key={badge.id} badge={badge} highlight={highlightBadge === badge.id} compact />)}</div></div>;
}

function FavoritesScreen({ products, openResult, close, favoriteIds = null, localeCopy = getLocaleCopy() }) {
  const groups = getFavoritesByCategory(products, favoriteIds);
  const categories = ["All", ...Object.keys(groups)];
  const [activeCategory, setActiveCategory] = useState("All");
  const visibleProducts = activeCategory === "All" ? Object.values(groups).flat() : groups[activeCategory] || [];
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title={localeCopy.favorites} right={<BackButton onClick={close} />} /><div className="mb-4 flex gap-2 overflow-x-auto pb-1">{categories.map((category) => <button type="button" key={category} onClick={() => setActiveCategory(category)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm shadow-sm ${activeCategory === category ? "bg-neutral-950 text-white" : "bg-white text-neutral-700"}`}>{category}</button>)}</div><Card><div className="p-4"><h3 className="mb-3 font-semibold text-neutral-950">{activeCategory === "All" ? `All ${localeCopy.favoritesLower}` : activeCategory}</h3><div className="space-y-2">{visibleProducts.length ? visibleProducts.map((product) => <ProductRow key={product.id} product={product} onClick={() => openResult(product)} />) : <p className="p-5 text-center text-sm text-neutral-500">No {localeCopy.favoritesLower} yet.</p>}</div></div></Card></div>;
}

function ProfileScreen({ products, badges, highlightBadge, openResult, openSettings, openFavorites, openBadges, openPlans, profile, favoriteIds = [], localeCopy = getLocaleCopy() }) {
  const following = db.follows.filter((follow) => follow.followerId === "user_me").length;
  const followers = db.follows.filter((follow) => follow.followedId === "user_me").length + 12;
  const saved = favoriteIds.map((productId) => products.find((product) => product.id === productId)).filter(Boolean);
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-4"><Header title="Profile" right={<Button onClick={openSettings} variant="outline" className="bg-white">Settings</Button>} /><Card><div className="p-5 text-center"><div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-950 text-2xl font-semibold text-white">D</div><h2 className="text-2xl font-semibold tracking-tight text-neutral-950">{profile.firstName} {profile.lastName.charAt(0)}.</h2><p className="text-sm text-neutral-500">{profile.email}</p><div className="mt-5 grid grid-cols-4 gap-3"><div><div className="text-2xl font-semibold">{db.scans.length}</div><div className="text-xs text-neutral-500">Scans</div></div><div><div className="text-2xl font-semibold">{following}</div><div className="text-xs text-neutral-500">Following</div></div><div><div className="text-2xl font-semibold">{followers}</div><div className="text-xs text-neutral-500">Followers</div></div><div><div className="text-2xl font-semibold">{saved.length}</div><div className="text-xs text-neutral-500">{localeCopy.favorites}</div></div></div></div></Card><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-neutral-950">{localeCopy.favorites}</h3><button type="button" onClick={openFavorites} className="text-sm font-medium text-neutral-500">See all</button></div><div className="space-y-2">{saved.length ? saved.slice(0, 3).map((product) => <ProductRow key={product.id} product={product} onClick={() => openResult(product)} />) : <p className="text-sm text-neutral-500">{localeCopy.favorite} products will appear here.</p>}</div></div><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-neutral-950">Badges</h3><button type="button" onClick={openBadges} className="text-sm font-medium text-neutral-500">See all</button></div><div className="grid grid-cols-2 gap-3">{(badges || []).slice(0, 4).map((badge) => <BadgeCard key={badge.id} badge={badge} highlight={highlightBadge === badge.id} compact />)}</div></div><div className="mt-5 rounded-3xl bg-neutral-950 p-5 text-white shadow-sm"><div className="text-lg font-semibold">Upgrade to Pro</div><p className="mt-2 text-sm text-neutral-300">Advanced search, strict mode, offline scans, and early database access.</p><Button onClick={openPlans} variant="light" className="mt-4">View plans</Button></div></div>;
}


;function runTests() {
  const products = db.products.map(hydrateProduct);
  const soap = products.find((product) => product.id === "paper_soap");
  const dishwasher = products.find((product) => product.id === "kirkland_dishwasher");
  const dishwasherSwap = products.find((product) => product.id === "blueland_dishwasher_tablets");
  const betterSwap = getBetterSwap(products);
  const hunts = products.find((product) => product.id === "hunts_tomato_paste");
  const bobaJuice = products.find((product) => product.id === "plasticlist_boba_guys_black_tea_juice");
  const bobaPearls = products.find((product) => product.id === "plasticlist_boba_guys_black_tea_pearls");
  const bobaFruity = products.find((product) => product.id === "plasticlist_boba_guys_fruity_flavored_tea");
  const tests = [
    [clampScore(-10) === 0, "clampScore clamps negative scores to 0"],
    [clampScore(120) === 100, "clampScore clamps scores above 100 to 100"],
    [getScoreTheme(70).label === "Low plastic concern", "70 should be Low plastic concern"],
    [getScoreTheme(72).ring !== getScoreTheme(82).ring && getScoreTheme(82).ring !== getScoreTheme(92).ring, "green score tiers should be visually distinct"],
    [getScoreTheme(92).label === "Near-ideal" && !getScoreTheme(92).shadow, "92+ scores should use clean near-ideal styling without glow"],
    [reviewStatusLabel("inferred") === "Best guess — needs review", "inferred should be translated"],
    [dataQualityLabel("Medium") === "Good data", "confidence should be translated into data quality"],
    [getBottomNavItems().map((item) => item[0]).join(",") === "search,history,scan,social,profile", "scan should be centered"],
    [soap?.score >= 80, "paper soap should score green"],
    [products.find(p => p.name.toLowerCase().includes("tuna"))?.score < 50, "canned food should be penalized heavily"],
    [products.find(p => p.name.toLowerCase().includes("juice"))?.score < 60, "acidic drinks should reduce score"],
    [products.find(p => p.name.toLowerCase().includes("dishwasher"))?.score === 12, "dishwasher should use calibrated common-ground score"],
    [dishwasherSwap?.score > dishwasher?.score, "cleaner dishwasher detergent swap should score higher than pod detergent"],
    [getProductSwapType(dishwasher) === getProductSwapType(dishwasherSwap), "dishwasher swaps should share the same product type"],
    [betterSwap?.from?.id === "kirkland_dishwasher" && betterSwap?.to?.id === "blueland_dishwasher_tablets", "social better swap should compare same-type dishwasher detergents"],
    [products.find(p => p.id === "campbells_soup")?.hasHighRiskCanScenario === true, "soup should trigger high-risk can scenario"],
    [products.find(p => p.id === "campbells_soup")?.score === 15, "hot canned soup should use calibrated common-ground score"],
    [products.find(p => p.id === "campbells_soup")?.parts.every(part => part.totalImpact >= -40 && part.totalImpact <= 0), "part impacts should be normalized between 0 and -40"],
    [products.find(p => p.id === "paper_soap")?.parts.every(part => part.totalImpact === 0), "paper-only soap wrapper should not show an artificial penalty"],
    [getPartSeverity(-40).label === "Severe", "severe part labels should exist for non-material-specific penalties"],
    [products.find(p => p.id === "old_spice")?.score === 32, "Old Spice should match calibrated common-ground score"],
    [products.find(p => p.id === "old_spice")?.parts.filter((part) => part.plasticTypeId === "pp5").every((part) => part.severity?.label === "Plastic packaging"), "same PP packaging should use a consistent visible label"],
    [products.find(p => p.id === "always_ultra")?.score === 12, "Always Ultra Thin should match calibrated common-ground score"],
    [products.find(p => p.id === "allens_apple")?.score === 19, "Allen’s Apple Juice should match calibrated common-ground score"],
    [products.find(p => p.id === "kirkland_tuna")?.score === 48, "Kirkland tuna should stay mid-risk due to unknown liner and fatty contents"],
    [products.find(p => p.id === "kirkland_tuna")?.riskFactors.some((factor) => factor.name === "Fatty or oily contents"), "Kirkland tuna should keep the fatty contents risk factor"],
    [products.find(p => p.id === "kirkland_tuna")?.parts.find(part => part.id === "tuna_liner")?.linerInfo?.linerRisk === "medium", "unknown tuna liner should use moderate liner assumption"],
    [products.find(p => p.id === "campbells_soup")?.parts.find(part => part.id === "soup_liner")?.linerAdjustment === -12, "unknown soup liner should not default to worst-case BPA/PVC penalty"],
    [hunts?.score === 82, "Hunt's tomato paste should score as a strong mainstream option with confirmed labels"],
    [hunts?.parts.find((part) => part.id === "hunts_liner")?.linerType === "bpa_free_confirmed", "Hunt's liner should preserve BPA-free label evidence"],
    [hunts?.parts.find((part) => part.id === "hunts_liner")?.totalImpact > -30, "confirmed BPA-free liner should avoid severe part penalty"],
    [hunts?.parts.find((part) => part.id === "hunts_liner")?.severity?.label === "Minimal concern", "confirmed BPA-free liner should display a minimal concern badge"],
    [hunts?.parts.find((part) => part.id === "hunts_can")?.severity?.label === "Plastic-free", "metal can body should display as plastic-free"],
    [getPartMaterialLabel(hunts?.parts.find((part) => part.id === "hunts_liner")) === "BPA-free epoxy liner", "confirmed BPA-free liner should not display as unknown plastic"],
    [getPartRecyclingRule(hunts?.parts.find((part) => part.id === "hunts_can"), true, "toronto_on").label === "Recyclable label confirmed", "Hunt's metal can should preserve recyclable label evidence"],
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
    [!products.find((p) => p.id === "kirkland_tuna")?.sources.some((link) => link.sourceId === "source_canned_soup_bpa"), "non-hot canned foods should not attach the canned soup BPA source"],
    [Array.isArray(products.find((p) => p.id === "kirkland_tuna")?.heatFlags), "products should include heat-sensitive flags"],
    [db.products.filter((p) => p.plasticListId && p.scoreOverride !== undefined).length === 0, "PlasticList imports should use calculated scores instead of generated overrides"],
    [products.filter((p) => p.plasticListEvidence?.length && p.score <= 3).length < products.filter((p) => p.plasticListEvidence?.length).length * 0.2, "PlasticList calculated scores should not collapse into the bottom bucket"],
    [products.filter((p) => p.plasticListEvidence?.length).length >= 236, "PlasticList evidence should attach to imported products"],
    [bobaPearls?.sources.some((link) => link.sourceId === "source_plasticlist"), "PlasticList source should appear on evidence-backed products"],
    [bobaPearls?.parts.some((part) => part.displayName === "Plastic drink cup"), "PlasticList imports should infer packaging parts instead of generic samples"],
    [!bobaFruity?.riskFactors.some((factor) => factor.name === "Heat exposure"), "cold Boba Guys fruity tea should not inherit heat exposure"],
    [!bobaPearls?.riskFactors.some((factor) => factor.name === "Heat exposure"), "cold Boba Guys pearls should not inherit heat exposure"],
    [bobaJuice?.score === 22, "Boba Guys Black Tea Juice should stay in the high-concern range without heat exposure"],
    [bobaPearls?.score === 16, "Boba Guys Black Tea Pearls should be the highest-concern Boba sample"],
    [bobaFruity?.score === 20, "Boba Guys Fruity Flavored Tea should stay in the high-concern range without heat exposure"],
    [[bobaJuice, bobaPearls, bobaFruity].every((product) => product?.score >= 15 && product.score <= 30), "high-concern cold Boba Guys products should score 15-30 without heat exposure"],
    [products.find((p) => p.id === "plasticlist_coca_cola_original")?.parts.some((part) => part.displayName === "Can liner"), "PlasticList canned drinks should expose can liners"],
    [products.find((p) => p.id === "plasticlist_enfamil_neuro_pro_587g_infant_formula_can")?.hasHighRiskCanScenario === false, "dry formula cans should not trigger the hot canned soup warning"],
    [getById("sources", "source_plasticlist")?.license === "CC BY 4.0", "PlasticList source should preserve CC BY attribution"],
    [badgeDefinitions.length >= 12, "badge system should include the full badge set"],
    [getBadgeStatus(badgeDefinitions.find((badge) => badge.id === "word_of_mouth")).nextTier === "Bronze", "word of mouth should progress toward Bronze"],
    [getProductRecyclability(dishwasher, false) === "none", "dishwasher pods should not be recyclable"],
    [true, "plans updated with new pricing rules"],
    [getProductRecyclability(soap, false) === "widely", "paper soap should be widely recyclable"],
    [recyclingLocationProfiles.length >= 40, "recycling localization should include major Canada/USA cities"],
    [getNearestRecyclingLocationId(47.61, -122.33) === "seattle_wa", "geolocation should match nearest recycling city"],
    [getRecyclingLocationIdFromTimezone("America/Toronto") === "toronto_on", "timezone fallback should resolve Toronto"],
    [getPartRecyclingRule(dishwasher.parts.find((part) => part.displayName === "Pod film"), true, "seattle_wa").status === "none", "localized recycling should keep PVA pod film out of curbside recycling"],
  ];
  tests.forEach(([passed, message]) => {
    if (!passed) console.error(`Test failed: ${message}`);
  });
}
runTests();

function ResultScreen({ product, close, openDetail, openPlasticListEvidence, openShare, favoriteIds = [], toggleFavorite, profile, localeCopy = getLocaleCopy(), onFavoriteAdded, onShareSuccess }) {
  const [useLocation, setUseLocation] = useState(false);
  const [selectedRecyclingLocation, setSelectedRecyclingLocation] = useState("toronto_on");
  const [locationStatus, setLocationStatus] = useState("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const [showScoreDetails, setShowScoreDetails] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const recyclingLocation = getRecyclingLocation(selectedRecyclingLocation);
  const handleSwipeBack = () => {
    if (showImagePreview) {
      setShowImagePreview(false);
      return;
    }
    if (showScoreDetails) {
      setShowScoreDetails(false);
      return;
    }
    close();
  };
  const swipeBackHandlers = useSwipeBack(handleSwipeBack, Boolean(product));

  useEffect(() => {
    if (!showImagePreview) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setShowImagePreview(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showImagePreview]);

  if (!product) return <UnknownScreen close={close} />;
  if (showScoreDetails) return <div className="min-h-full" {...swipeBackHandlers}><ScoreBreakdownPanel product={product} close={() => setShowScoreDetails(false)} /></div>;

  const isFavorite = favoriteIds.includes(product.id);
  const isNearIdealScore = product.score >= 92;
  const recyclingRules = product.parts.map((part) => getPartRecyclingRule(part, useLocation, selectedRecyclingLocation));
  const recyclingSummaryStatuses = recyclingRules.map((rule, index) => isAttachedCanLiner(product.parts[index], product) ? "limited" : rule.status);
  const recyclingStatus = combineRecyclability(recyclingSummaryStatuses);
  const recyclingMeta = productRecyclabilityMeta(recyclingStatus, recyclingSummaryStatuses, useLocation);
  const handleNativeShare = async () => {
    const appName = "PlasticFree";
    const userName = profile?.firstName || "Someone";
    const shareText = `${userName} shared ${product.name} from ${appName} for you to check out.`;
    const shareData = {
      title: `${product.brand} ${product.name}`,
      text: shareText,
      url: `https://plasticfree.app/product/${product.id}`
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        onShareSuccess?.();
        return;
      } catch {
        return;
      }
    }
    openShare(product);
  };
  // Build dynamic explanation based on actual risk factors
  const reasonFactors = (product.riskFactors || []).map(f => f.name);

  const humanize = (name) => {
    const map = {
      "Drink contact": "drink contact",
      "Food contact": "food contact",
      "Acidic contents": "acidic contents",
      "Fatty or oily contents": "fatty contents",
      "Heat exposure": "heat",
      "Manufacturing heat exposure": "manufacturing heat",
      "Hot food exposure": "hot food",
      "Hot food contact": "hot food contact",
      "Hot canned liquid": "hot liquid",
      "Skin contact": "skin contact",
      "Prolonged skin contact": "prolonged skin contact",
      "STI protection limitation": "STI protection limits",
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

  const harshReason = `This score is lower because ${formatList(uniqueReasons)} ${uniqueReasons.length === 1 ? "increases" : "increase"} potential plastic exposure.`;
  const useFallbackRecyclingLocation = () => {
    const fallbackId = getBrowserFallbackRecyclingLocationId();
    const fallbackLocation = getRecyclingLocation(fallbackId);
    setSelectedRecyclingLocation(fallbackId);
    setUseLocation(true);
    setLocationStatus("matched");
    setLocationMessage(`Precise location is off. Using ${fallbackLocation.city}, ${fallbackLocation.region} as your regional recycling guide.`);
  };
  const requestRecyclingLocation = () => {
    if (useLocation) {
      setUseLocation(false);
      setLocationStatus("idle");
      setLocationMessage("");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      useFallbackRecyclingLocation();
      return;
    }
    setLocationStatus("locating");
    setLocationMessage("Finding the nearest supported city...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearestId = getNearestRecyclingLocationId(position.coords.latitude, position.coords.longitude);
        const nearestLocation = getRecyclingLocation(nearestId);
        setSelectedRecyclingLocation(nearestId);
        setUseLocation(true);
        setLocationStatus("matched");
        setLocationMessage(`Using nearest supported city: ${nearestLocation.city}, ${nearestLocation.region}.`);
      },
      () => {
        useFallbackRecyclingLocation();
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 1000 * 60 * 30 }
    );
  };

  return (
    <div className="min-h-[690px] overflow-y-auto px-5 pb-5" {...swipeBackHandlers}>
      <Header title="Product score" right={<BackButton onClick={close} />} />

      <Card>
        <div className="relative p-5 text-center">
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback();
              if (!isFavorite) onFavoriteAdded?.();
              toggleFavorite?.(product.id);
            }}
            className={`absolute left-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-black/5 backdrop-blur transition active:scale-95 ${isFavorite ? "text-red-600" : "text-neutral-950"}`}
            aria-label={isFavorite ? `Remove from ${localeCopy.favoritesLower}` : `Add to ${localeCopy.favoritesLower}`}
          >
            <HeartIcon filled={isFavorite} />
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback();
              handleNativeShare();
            }}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-neutral-950 shadow-sm ring-1 ring-black/5 backdrop-blur transition active:scale-95"
            aria-label="Share product"
          >
            <AppleShareIcon />
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback();
              setShowImagePreview(true);
            }}
            className="mx-auto flex items-start justify-center rounded-[2rem] transition active:scale-[0.98]"
            aria-label="Open larger product image"
          >
            <ProductImage src={product.imageUrl} alt={product.name} className="h-36 w-36 rounded-3xl object-cover" />
          </button>

          <div className="mt-5 flex justify-center">
            <ScoreRing score={product.score} onClick={() => setShowScoreDetails(true)} featured={isNearIdealScore} />
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
                style={getScoreBadgeStyle(product.theme)}
              >
                {product.rating}
              </motion.div>
            </div>
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950">{product.name}</h2>
          <p className="text-neutral-500">{product.brand}</p>
          <p className="mt-2 text-xs text-neutral-500">
            {product.category?.name} • {reviewStatusLabel(product.verification)} • {dataQualityLabel(product.confidence)}
          </p>
        </div>
      </Card>

      <AnimatePresence>
        {showImagePreview && <ProductImagePreview product={product} close={() => setShowImagePreview(false)} />}
      </AnimatePresence>

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
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-950 shadow-sm">
                  <PartPackagingIcon part={part} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-neutral-950">{part.displayName}</div>
                  <div className="text-sm text-neutral-500">{getPartMaterialLabel(part)}</div>
                  <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${part.severity.tone}`}>{part.severity.label}</div>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-bold text-white shadow-[0_6px_14px_rgba(0,0,0,0.18)] ring-1 ring-black/5 transition group-hover:scale-105 group-hover:bg-neutral-800">
                  i
                </div>
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
                    Soup is usually hot-filled during manufacturing, so hot liquid can sit against the can liner before it reaches your kitchen. This is not about heating soup in the can at home; it is why lined canned soups receive a stronger warning.
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

      <PlasticListEvidenceSummary evidence={product.plasticListEvidence} onOpen={() => openPlasticListEvidence(product)} />

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
            <p className="mt-1 text-sm text-neutral-500">Use your location to match the nearest supported city.</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-xs font-medium text-neutral-500">Use location</span>
            <ToggleSwitch checked={useLocation} onClick={requestRecyclingLocation} label="Use location for recycling rules" />
          </div>
        </div>

        {locationMessage && (
          <div className={`mb-3 rounded-2xl px-3 py-2 text-sm ${locationStatus === "error" ? "bg-red-50 text-red-800" : "bg-[#f7f3eb] text-neutral-600"}`}>
            {locationMessage}
          </div>
        )}

        <div className={`rounded-2xl p-3 ${recyclingMeta.bg}`}>
          <div className={`font-semibold ${recyclingMeta.tone}`}>{recyclingMeta.icon} {recyclingMeta.title}</div>
          <p className="mt-1 text-sm text-neutral-600">
            {useLocation ? `Based on ${recyclingLocation.city}, ${recyclingLocation.region}. ` : "General guidance. "}{recyclingMeta.summary}
          </p>
          {useLocation && <p className="mt-2 text-xs leading-5 text-neutral-500">{recyclingLocation.note}</p>}
        </div>

        <div className="mt-3 space-y-2">
          {product.parts.map((part, index) => {
            const rule = recyclingRules[index];
            const status = rule.status;
            const isAttachedLiner = isAttachedCanLiner(part, product);
            const meta = isAttachedLiner ? attachedLinerRecyclabilityMeta() : useLocation ? localizedRecyclabilityMeta(status) : recyclabilityMeta(status);
            const ruleLabel = isAttachedLiner ? getAttachedLinerRecyclingLabel(part) : useLocation ? rule.label : part.plastic?.code !== "NONE" ? part.plastic?.code : part.material?.name;
            return (
              <div key={part.id} className="rounded-2xl bg-[#f7f3eb] p-3">
                <div className="min-w-0">
                  <div className="break-words text-[15px] font-semibold leading-snug text-neutral-950">{part.displayName}</div>
                  <div className="mt-1 break-words text-sm leading-snug text-neutral-500">{ruleLabel}</div>
                </div>
                <div className={`mt-3 inline-flex max-w-full items-center rounded-full px-3 py-1 text-xs font-medium leading-tight ${meta.bg} ${meta.tone}`}>
                  {meta.title}
                </div>
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

    </div>
  );
}

function UserProfileView({ user, products, badges = [], highlightBadge, openResult, close, openFavorites, localeCopy = getLocaleCopy() }) {
  const userSaves = db.saves.filter((s) => s.userId === user.id).map((s) => products.find((p) => p.id === s.productId)).filter(Boolean);
  const userScans = db.scans.filter((scan) => scan.userId === user.id).length + (user.id === "user_me" ? 0 : 8);
  const following = db.follows.filter((follow) => follow.followerId === user.id).length + (user.id === "user_me" ? 0 : 2);
  const followers = db.follows.filter((follow) => follow.followedId === user.id).length + (user.id === "user_me" ? 12 : 34);

  return <div className="min-h-[690px] overflow-y-auto px-5 pb-4"><Header title={user.displayName} right={<BackButton onClick={close} />} /><Card><div className="p-5 text-center"><div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-950 text-2xl font-semibold text-white">{user.avatar}</div><h2 className="text-2xl font-semibold text-neutral-950">{user.displayName}</h2><p className="text-sm text-neutral-500">{user.role}</p><div className="mt-5 grid grid-cols-4 gap-3"><div><div className="text-2xl font-semibold">{userScans}</div><div className="text-xs text-neutral-500">Scans</div></div><div><div className="text-2xl font-semibold">{following}</div><div className="text-xs text-neutral-500">Following</div></div><div><div className="text-2xl font-semibold">{followers}</div><div className="text-xs text-neutral-500">Followers</div></div><div><div className="text-2xl font-semibold">{userSaves.length}</div><div className="text-xs text-neutral-500">{localeCopy.favorites}</div></div></div></div></Card><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-neutral-950">Recent {localeCopy.favoritesLower}</h3><button type="button" onClick={openFavorites} className="text-sm font-medium text-neutral-500">See all</button></div><div className="space-y-2">{userSaves.length ? userSaves.slice(0, 3).map((p) => <ProductRow key={p.id} product={p} onClick={() => openResult(p)} />) : <p className="text-sm text-neutral-500">No {localeCopy.favoritesLower} yet.</p>}</div></div><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-neutral-950">Badges earned</h3><span className="text-sm font-medium text-neutral-400">Top 4</span></div><div className="grid grid-cols-2 gap-3">{badges.slice(0, 4).map((badge) => <BadgeCard key={badge.id} badge={badge} highlight={highlightBadge === badge.id} compact />)}</div></div></div>;
}

export default function PlasticFreeScannerDatabasePrototype() {
  const [submittedProducts, setSubmittedProducts] = useState([]);
  const [submittedParts, setSubmittedParts] = useState([]);
  const products = useMemo(() => [...db.products, ...submittedProducts].map((product) => hydrateProduct(product, submittedParts)), [submittedProducts, submittedParts]);
  const [tab, setTab] = useState("scan");
  const [result, setResult] = useState(null);
  const [detail, setDetail] = useState(null);
  const [plasticListDetail, setPlasticListDetail] = useState(null);
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
  const [addProductDraft, setAddProductDraft] = useState({});
  const [badgeToast, setBadgeToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  const contentScrollRef = useRef(null);
  const productScrollTopRef = useRef(0);
  const shouldRestoreProductScrollRef = useRef(false);
  const searchScrollTopRef = useRef(0);
  const shouldRestoreSearchScrollRef = useRef(false);
  const [badgeProgress, setBadgeProgress] = useState(badgeDefinitions);
  const [highlightBadge, setHighlightBadge] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(() => db.saves.filter((save) => save.userId === "user_me").map((save) => save.productId));
  const [scanHistory, setScanHistory] = useState(db.scans);
  const [profile, setProfile] = useState({ firstName: "Dave", lastName: "Rusinek", email: "dave@example.com", password: "password123" });
  const [locale, setLocale] = useState(getDefaultSpellingLocale);
  const localeCopy = getLocaleCopy(locale);

  const updateProfile = (updates) => {
    setProfile((current) => ({ ...current, ...updates }));
  };

  const toggleFavorite = (productId) => {
    setFavoriteIds((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]);
  };

  const resetOverlays = () => {
    setDetail(null);
    setPlasticListDetail(null);
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
    if (tab === "search" && !showResult && !detail) {
      searchScrollTopRef.current = contentScrollRef.current?.scrollTop || 0;
      shouldRestoreSearchScrollRef.current = true;
    }
    productScrollTopRef.current = 0;
    shouldRestoreProductScrollRef.current = false;
    setResult(product);
    resetOverlays();
    setShowResult(true);
  };

  const openAddProduct = (draft = {}) => {
    setAddProductDraft(draft || {});
    resetOverlays();
    setShowAddProduct(true);
  };

  const recordScan = (productId) => {
    setScanHistory((current) => current.some((scan) => scan.productId === productId && scan.userId === "user_me") ? current : [{ id: `scan_${productId}_${Date.now()}`, userId: "user_me", productId }, ...current]);
  };

  const submitPendingProduct = (draft, photos) => {
    const { product, parts } = createPendingProductFromDraft(draft, photos);
    setSubmittedProducts((current) => current.some((item) => item.id === product.id) ? current.map((item) => item.id === product.id ? product : item) : [product, ...current]);
    setSubmittedParts((current) => [...current.filter((part) => part.productId !== product.id), ...parts]);
    recordScan(product.id);
    setShowAddProduct(false);
    setAddProductDraft({});
    setTimeout(() => {
      const hydrated = hydrateProduct(product, parts);
      setResult(hydrated);
      setShowResult(true);
    }, 0);
    showToast("Submitted for review and added to History", 2200);
  };

  const openPartDetail = (product, part) => {
    productScrollTopRef.current = contentScrollRef.current?.scrollTop || 0;
    shouldRestoreProductScrollRef.current = false;
    setDetail({ product, part });
  };

  const closePartDetail = () => {
    shouldRestoreProductScrollRef.current = true;
    setDetail(null);
  };

  const openPlasticListEvidence = (product) => {
    productScrollTopRef.current = contentScrollRef.current?.scrollTop || 0;
    shouldRestoreProductScrollRef.current = false;
    setPlasticListDetail({ product });
  };

  const closePlasticListEvidence = () => {
    shouldRestoreProductScrollRef.current = true;
    setPlasticListDetail(null);
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
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setBadgeToast(message);
    toastTimeoutRef.current = setTimeout(() => setBadgeToast(null), duration);
  };

  const showShareBadgeToast = () => {
    incrementBadge("word_of_mouth", 1);
    showToast("+1 toward Word of Mouth (3/3)", 3000);
  };

  const handleScan = (product) => {
    incrementBadge("plastic_detective", 2);
    showToast("+2 scans recorded", 2000);
    if (product?.id) recordScan(product.id);
    openResult(product);
  };

  const scannedProducts = scanHistory.map((scan) => products.find((product) => product.id === scan.productId)).filter(Boolean);
  const searchedProducts = products.filter((product) => !scanHistory.some((scan) => scan.productId === product.id));
  const hideNav = viewUser || showResult || detail || plasticListDetail || showSettings || showFavorites || showBadges || showDeleteAccount || shareProduct || historyList || showNotifications || showPlans || showAddProduct;
  const goBack = () => {
    if (viewUser) {
      setViewUser(null);
      return;
    }
    if (showAddProduct) {
      setShowAddProduct(false);
      return;
    }
    if (showPlans) {
      setShowPlans(false);
      return;
    }
    if (showNotifications) {
      setShowNotifications(false);
      return;
    }
    if (shareProduct) {
      setShareProduct(null);
      return;
    }
    if (historyList) {
      setHistoryList(null);
      return;
    }
    if (showDeleteAccount) {
      setShowDeleteAccount(false);
      return;
    }
    if (showBadges) {
      setShowBadges(false);
      return;
    }
    if (showFavorites) {
      setShowFavorites(false);
      return;
    }
    if (showSettings) {
      setShowSettings(false);
      return;
    }
    if (detail) {
      setDetail(null);
      return;
    }
    if (plasticListDetail) {
      closePlasticListEvidence();
      return;
    }
    if (showResult) setShowResult(false);
  };
  const pageTransition = { duration: 0.44, ease: [0.2, 0.82, 0.2, 1] };
  const productPageTransition = { ...pageTransition, duration: 0.4 };
  const returnToTabTransition = { ...pageTransition, duration: 0.24 };
  const scrollIncomingScreen = (screen) => {
    if (screen === "product" && shouldRestoreProductScrollRef.current) {
      contentScrollRef.current?.scrollTo({ top: productScrollTopRef.current, left: 0, behavior: "auto" });
      shouldRestoreProductScrollRef.current = false;
      return;
    }
    if (screen === "search" && shouldRestoreSearchScrollRef.current) {
      contentScrollRef.current?.scrollTo({ top: searchScrollTopRef.current, left: 0, behavior: "auto" });
      shouldRestoreSearchScrollRef.current = false;
      return;
    }
    contentScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };
  const handleScreenAnimationStart = (screen, animationDefinition) => {
    if (animationDefinition?.opacity === 0) return;
    scrollIncomingScreen(screen);
  };

  return <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,#ffffff_0%,#f2eee6_42%,#dfd8ca_100%)] px-0 py-0 font-sans text-neutral-950 antialiased md:flex md:items-center md:justify-center md:px-4 md:py-8"><AnimatePresence>{badgeToast && <motion.div initial={{ opacity: 0, y: -56, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -36, scale: 0.98 }} transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.85 }} className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-50 mx-auto max-w-[360px] rounded-[1.35rem] bg-neutral-950/95 px-4 py-3 text-sm font-medium text-white shadow-2xl shadow-black/20 ring-1 ring-white/10 backdrop-blur-xl"><div className="flex items-center justify-between gap-3"><span>{badgeToast}</span><button type="button" onClick={() => setBadgeToast(null)} className="text-white/70">×</button></div></motion.div>}</AnimatePresence><Phone>{isSignedOut ? <SignInScreen onSignIn={() => setIsSignedOut(false)} /> : <div className="flex h-full min-h-0 flex-col"><div className="flex min-h-0 flex-1 flex-col"><div ref={contentScrollRef} className="min-h-0 flex-1 overflow-y-auto"><AnimatePresence mode="wait">
{viewUser ? (
  <motion.div key="user-profile" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("top", definition)}>
    <UserProfileView user={viewUser} products={products} badges={badgeProgress} highlightBadge={highlightBadge} openResult={openResult} close={() => setViewUser(null)} openFavorites={() => setHistoryList({ title: `${viewUser.displayName} ${localeCopy.favoritesLower}`, products: db.saves.filter((save) => save.userId === viewUser.id).map((save) => products.find((product) => product.id === save.productId)).filter(Boolean) })} localeCopy={localeCopy} />
  </motion.div>
) : showAddProduct ? (
  <motion.div key="add-product" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("top", definition)}>
    <AddProductScreen draft={addProductDraft} close={() => { setShowAddProduct(false); setAddProductDraft({}); }} onSubmit={submitPendingProduct} />
  </motion.div>
) : showPlans ? (
  <motion.div key="plans" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("top", definition)}>
    <PlansScreen close={() => setShowPlans(false)} />
  </motion.div>
) : showNotifications ? (
  <motion.div key="notifications" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("top", definition)}>
    <NotificationsScreen close={() => setShowNotifications(false)} />
  </motion.div>
) : shareProduct ? (
  <motion.div key="share" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("top", definition)}>
    <ShareSheet product={shareProduct} close={() => setShareProduct(null)} onShareSuccess={showShareBadgeToast} />
  </motion.div>
) : historyList ? (
  <motion.div key="history-list" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("top", definition)}>
    <ProductListScreen title={historyList.title} products={historyList.products} openResult={openResult} close={() => setHistoryList(null)} />
  </motion.div>
) : showDeleteAccount ? (
  <motion.div key="delete" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("top", definition)}>
    <DeleteAccountScreen close={() => setShowDeleteAccount(false)} onConfirmDelete={confirmDeleteAccount} />
  </motion.div>
) : showBadges ? (
  <motion.div key="badges" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("top", definition)}>
    <BadgesScreen badges={badgeProgress} highlightBadge={highlightBadge} close={() => setShowBadges(false)} />
  </motion.div>
) : showFavorites ? (
  <motion.div key="favorites" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("top", definition)}>
    <FavoritesScreen products={products} openResult={openResult} close={() => setShowFavorites(false)} favoriteIds={favoriteIds} localeCopy={localeCopy} />
  </motion.div>
) : showSettings ? (
  <motion.div key="settings" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("top", definition)}>
    <SettingsScreen close={() => setShowSettings(false)} onSignOut={signOut} onDeleteAccount={() => { setShowSettings(false); setShowDeleteAccount(true); }} profile={profile} updateProfile={updateProfile} locale={locale} setLocale={setLocale} localeCopy={localeCopy} />
  </motion.div>
) : detail ? (
  <motion.div key="detail" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("top", definition)}>
    <DetailScreen product={detail.product} part={detail.part} close={closePartDetail} />
  </motion.div>
) : plasticListDetail ? (
  <motion.div key="plastic-list-detail" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("top", definition)}>
    <PlasticListEvidenceDetail evidence={plasticListDetail.product.plasticListEvidence} product={plasticListDetail.product} close={closePlasticListEvidence} />
  </motion.div>
) : showResult ? (
  <motion.div key="result" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={productPageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("product", definition)}>
    <ResultScreen product={result} close={() => setShowResult(false)} openDetail={openPartDetail} openPlasticListEvidence={openPlasticListEvidence} openShare={(product) => setShareProduct(product)} favoriteIds={favoriteIds} toggleFavorite={toggleFavorite} profile={profile} localeCopy={localeCopy} onFavoriteAdded={() => showToast(`Added to ${localeCopy.favoritesLower}`, 1800)} onShareSuccess={showShareBadgeToast} />
  </motion.div>
) : (
  <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={returnToTabTransition} onAnimationStart={(definition) => handleScreenAnimationStart(tab === "search" ? "search" : "top", definition)}>
    {tab === "scan" && <ScanScreen products={products} openResult={handleScan} openAddProduct={openAddProduct} />}
    {tab === "search" && <SearchScreen products={products} openResult={openResult} openAddProduct={() => openAddProduct()} />}
    {tab === "history" && <HistoryScreen products={products} scans={scanHistory} openResult={openResult} openScanned={() => setHistoryList({ title: "Products scanned", products: scannedProducts })} openSearched={() => setHistoryList({ title: "Products searched", products: searchedProducts })} />}
    {tab === "social" && <SocialScreen products={products} openResult={openResult} openNotifications={() => { setUnreadNotifications(0); setShowNotifications(true); }} openUserProfile={(user) => setViewUser(user)} savedProductIds={favoriteIds} toggleFavorite={toggleFavorite} unreadNotifications={unreadNotifications} />}
    {tab === "profile" && <ProfileScreen products={products} badges={badgeProgress} highlightBadge={highlightBadge} openResult={openResult} openSettings={() => setShowSettings(true)} openFavorites={() => setShowFavorites(true)} openBadges={() => setShowBadges(true)} openPlans={() => setShowPlans(true)} profile={profile} favoriteIds={favoriteIds} localeCopy={localeCopy} />}
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
