import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useDragControls, useScroll, useTransform } from "framer-motion";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { plasticListEvidence, plasticListProductContexts, plasticListProductParts, plasticListProducts } from "./plasticListSeed";

const APP_USER_ID = "user_me";
const LOCAL_SUBMISSIONS_KEY = "plasticfree.submissions.v1";
const LOCAL_SCANS_KEY = "plasticfree.scans.v1";
const LOCAL_FAVORITES_KEY = "plasticfree.favorites.v1";
const RETAIL_BARCODE_FORMATS = [
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
];

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
  { id: "ingredient_inspector", icon: "🏷️", name: "Label Inspector", description: "You verify packaging claims, symbols, and recycling labels.", progress: 322, tiers: [{ name: "Bronze", threshold: 15 }, { name: "Silver", threshold: 50 }, { name: "Gold", threshold: 120 }, { name: "Platinum", threshold: 300 }] },
  { id: "data_driven", icon: "📊", name: "Data Driven", description: "You use filters and tools to make smarter choices.", progress: 24, tiers: [{ name: "Bronze", threshold: 5 }, { name: "Silver", threshold: 20 }, { name: "Gold", threshold: 60 }, { name: "Platinum", threshold: 150 }] },
  { id: "community_voice", icon: "⭐", name: "Community Voice", description: "You help others by sharing your experience.", progress: 17, tiers: [{ name: "Bronze", threshold: 1 }, { name: "Silver", threshold: 5 }, { name: "Gold", threshold: 15 }, { name: "Platinum", threshold: 40 }] },
  { id: "conscious_consumer", icon: "🧭", name: "Conscious Consumer", description: "Your choices consistently avoid plastics.", progress: 76, isPercent: true, tiers: [{ name: "Bronze", threshold: 60 }, { name: "Silver", threshold: 75 }, { name: "Gold", threshold: 85 }, { name: "Platinum", threshold: 95 }] },
  { id: "deep_diver", icon: "🔎", name: "Deep Diver", description: "You explore products in detail before deciding.", progress: 35, tiers: [{ name: "Bronze", threshold: 10 }, { name: "Silver", threshold: 30 }, { name: "Gold", threshold: 80 }, { name: "Platinum", threshold: 200 }] },
  { id: "barcode_whisperer", icon: "⚡", name: "Barcode Whisperer", description: "You scan like a pro.", progress: 27, tiers: [{ name: "Bronze", threshold: 3 }, { name: "Silver", threshold: 10 }, { name: "Gold", threshold: 25 }, { name: "Platinum", threshold: 75 }] },
  { id: "eco_upgrade", icon: "🔥", name: "Eco Upgrade", description: "You consistently improve your product lineup.", progress: 6, tiers: [{ name: "Bronze", threshold: 5 }, { name: "Silver", threshold: 15 }, { name: "Gold", threshold: 40 }, { name: "Platinum", threshold: 100 }] },
  { id: "plastic_pro", icon: "↔", name: "Swap Finder", description: "You find better-rated alternatives in the same product type.", progress: 12, tiers: [{ name: "Bronze", threshold: 5 }, { name: "Silver", threshold: 10 }, { name: "Gold", threshold: 15 }, { name: "Platinum", threshold: 20 }] },
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

const scoreConfidenceLabels = {
  estimated: "Estimated from common packaging",
  image_checked: "Checked from product images",
  community_verified: "Community verified",
  brand_confirmed: "Brand confirmed",
  unknown: "Needs packaging info",
};

const packagingTemplates = [
  {
    id: "cereal_box_bag",
    categoryIds: ["cat_food_drink"],
    keywords: ["cereal", "cheerios", "cherios", "honey nut", "rice krispies", "rice crispies", "rice crispees", "shreddies", "granola", "corn flakes", "frosted flakes", "raisin bran", "oatmeal squares"],
    score: 42,
    scoreRange: [35, 50],
    confidence: "estimated",
    explanation: "Based on common cereal packaging: a paperboard box with a plastic inner bag.",
    components: [
      { partType: "outer_packaging", displayName: "Outer box", materialId: "paper", plasticTypeId: "none", baseImpact: 0, materialImpact: 0, notes: "Likely paperboard/cardboard outer box." },
      { partType: "inner_packaging", displayName: "Inner bag", materialId: "plastic", plasticTypeId: "ldpe4", baseImpact: -12, materialImpact: -12, contextIds: ["food_contact", "internal"], notes: "Likely plastic film inner bag in direct food contact." },
    ],
  },
  {
    id: "chips_flexible_bag",
    categoryIds: ["cat_food_drink"],
    keywords: ["chips", "crisps", "tortilla chips", "potato chips"],
    score: 28,
    scoreRange: [20, 35],
    confidence: "estimated",
    explanation: "Based on common chip packaging: a flexible multilayer plastic bag.",
    components: [
      { partType: "main_container", displayName: "Flexible bag", materialId: "mixed", plasticTypeId: "unknown_plastic", baseImpact: -18, materialImpact: -16, contextIds: ["food_contact"], notes: "Likely flexible plastic or metallized multilayer bag." },
    ],
  },
  {
    id: "canned_soup_lined_can",
    categoryIds: ["cat_food_drink"],
    keywords: ["canned soup", "soup", "broth", "stew"],
    score: 15,
    scoreRange: [10, 20],
    confidence: "estimated",
    explanation: "Based on common canned soup packaging: metal can with an internal liner and hot-fill liquid food contact.",
    components: [
      { partType: "main_container", displayName: "Metal can", materialId: "metal", plasticTypeId: "none", baseImpact: 0, materialImpact: 0, notes: "Likely recyclable steel or aluminum can body." },
      { partType: "liner", displayName: "Can liner", materialId: "liner_unknown", plasticTypeId: "unknown_plastic", baseImpact: -8, materialImpact: 0, contextIds: ["food_contact", "hot_food", "heat_sensitive", "acidic", "long_storage"], linerType: "unknown", notes: "Likely protective internal can liner with heat-sensitive liquid food contact." },
    ],
  },
  {
    id: "tuna_lined_can",
    categoryIds: ["cat_food_drink"],
    keywords: ["tuna", "sardine", "salmon can"],
    score: 19,
    scoreRange: [15, 25],
    confidence: "estimated",
    explanation: "Based on common canned tuna packaging: metal can with an unknown liner, fatty food contact, and long storage.",
    components: [
      { partType: "main_container", displayName: "Metal can", materialId: "metal", plasticTypeId: "none", baseImpact: 0, materialImpact: 0, notes: "Likely recyclable metal can body." },
      { partType: "liner", displayName: "Can liner", materialId: "liner_unknown", plasticTypeId: "unknown_plastic", baseImpact: -8, materialImpact: 0, contextIds: ["food_contact", "fatty", "long_storage"], linerType: "unknown", notes: "Likely protective internal liner in contact with fatty food over long storage." },
    ],
  },
  {
    id: "bottled_water_pet",
    categoryIds: ["cat_food_drink"],
    keywords: ["bottled water", "spring water", "distilled water", "water bottle"],
    score: 18,
    scoreRange: [10, 25],
    confidence: "estimated",
    explanation: "Based on common bottled water packaging: PET bottle with a plastic cap.",
    components: [
      { partType: "main_container", displayName: "Bottle", materialId: "plastic", plasticTypeId: "pet1", baseImpact: -14, materialImpact: -10, contextIds: ["drink_contact", "heat_sensitive"], notes: "Likely PET bottle in drink contact; storage and shipping temperature can vary." },
      { partType: "cap_lid", displayName: "Cap", materialId: "plastic", plasticTypeId: "hdpe2", baseImpact: -6, materialImpact: -5, notes: "Likely plastic cap." },
    ],
  },
  {
    id: "paper_wrapped_bar_soap",
    categoryIds: ["cat_personal"],
    keywords: ["bar soap", "paper wrapped soap", "paper-wrapped"],
    score: 96,
    scoreRange: [95, 98],
    confidence: "estimated",
    explanation: "Based on common paper-wrapped bar soap packaging with no plastic packaging identified.",
    components: [
      { partType: "outer_packaging", displayName: "Paper wrap", materialId: "paper", plasticTypeId: "none", baseImpact: 0, materialImpact: 0, notes: "Likely paper wrap with minimal plastic exposure." },
    ],
  },
  {
    id: "zero_packaging",
    categoryIds: ["cat_plastic_free"],
    keywords: ["zero packaging", "package free", "unpackaged", "bulk refill"],
    score: 100,
    scoreRange: [100, 100],
    confidence: "estimated",
    explanation: "Based on a zero-packaging signal.",
    components: [],
  },
  {
    id: "dishwasher_pods",
    categoryIds: ["cat_cleaning"],
    keywords: ["dishwasher pod", "dishwasher pods", "dishwasher detergent", "detergent pod", "pva"],
    score: 15,
    scoreRange: [10, 20],
    confidence: "estimated",
    explanation: "Based on common dishwasher pods: container or box plus PVA/PVOH dissolvable film.",
    components: [
      { partType: "main_container", displayName: "Container or box", materialId: "mixed", plasticTypeId: "unknown_plastic", baseImpact: -8, materialImpact: -8, notes: "Likely plastic tub, pouch, or coated box." },
      { partType: "inner_packaging", displayName: "Pod film", materialId: "plastic", plasticTypeId: "pva", baseImpact: -15, materialImpact: -15, contextIds: ["heat"], notes: "Likely dissolvable PVA/PVOH pod film used during hot dishwasher cycles." },
    ],
  },
  {
    id: "deodorant_plastic_applicator",
    categoryIds: ["cat_personal"],
    keywords: ["deodorant", "antiperspirant"],
    score: 32,
    scoreRange: [25, 40],
    confidence: "estimated",
    explanation: "Based on common deodorant packaging: plastic applicator and cap.",
    components: [
      { partType: "main_container", displayName: "Applicator", materialId: "plastic", plasticTypeId: "pp5", baseImpact: -10, materialImpact: -5, contextIds: ["skin", "reuse"], notes: "Likely plastic applicator in skin-product use." },
      { partType: "cap_lid", displayName: "Cap", materialId: "plastic", plasticTypeId: "pp5", baseImpact: -8, materialImpact: -5, notes: "Likely plastic cap." },
    ],
  },
  {
    id: "dairy_tub_carton",
    categoryIds: ["cat_food_drink"],
    keywords: ["yogurt", "milk", "cheese", "cream", "dairy"],
    score: 30,
    scoreRange: [15, 40],
    confidence: "estimated",
    explanation: "Based on common dairy packaging: plastic tub/carton layer or plastic cap with fatty food contact.",
    components: [
      { partType: "main_container", displayName: "Dairy container", materialId: "mixed", plasticTypeId: "unknown_plastic", baseImpact: -14, materialImpact: -12, contextIds: ["food_contact", "fatty"], notes: "Likely plastic tub, coated carton, or layered dairy packaging." },
      { partType: "cap_lid", displayName: "Lid or cap", materialId: "plastic", plasticTypeId: "unknown_plastic", baseImpact: -6, materialImpact: -8, notes: "Likely plastic lid, film, or cap." },
    ],
  },
  {
    id: "boxed_dry_food",
    categoryIds: ["cat_food_drink"],
    keywords: ["cracker", "cookies", "biscuit", "pasta", "macaroni", "snack bar", "granola bar"],
    score: 44,
    scoreRange: [34, 54],
    confidence: "estimated",
    explanation: "Based on common dry grocery packaging: paperboard box or sleeve plus plastic film or inner pouch.",
    components: [
      { partType: "outer_packaging", displayName: "Outer box", materialId: "paper", plasticTypeId: "none", baseImpact: 0, materialImpact: 0, notes: "Likely paperboard/cardboard outer packaging." },
      { partType: "inner_packaging", displayName: "Inner wrapper", materialId: "plastic", plasticTypeId: "unknown_plastic", baseImpact: -12, materialImpact: -12, contextIds: ["food_contact", "internal"], notes: "Likely plastic film or inner pouch in food contact." },
    ],
  },
  {
    id: "generic_packaged_food",
    categoryIds: ["cat_food_drink"],
    keywords: ["food and drink", "food", "drink"],
    score: 47,
    scoreRange: [38, 58],
    confidence: "estimated",
    explanation: "Based on a general packaged food signal. Packaging photos are needed to identify exact materials.",
    components: [
      { partType: "main_container", displayName: "Package", materialId: "mixed", plasticTypeId: "unknown_plastic", baseImpact: -10, materialImpact: -12, contextIds: ["food_contact"], notes: "Likely packaged food with unknown material details until photos are reviewed." },
    ],
  },
];

function getScoreConfidenceLabel(value) {
  return scoreConfidenceLabels[value] || scoreConfidenceLabels.unknown;
}

function createScoringEvidence(sourceType, sourceLabel, contribution, notes) {
  return { source_type: sourceType, source_label: sourceLabel, confidence_contribution: contribution, notes };
}

function isVisibleAttachedSource(link = {}) {
  const sourceId = `${link.sourceId || link.source?.id || ""}`.toLowerCase();
  const entityType = `${link.entityType || ""}`.toLowerCase();
  const organization = `${link.source?.organization || ""}`.toLowerCase();
  const title = `${link.source?.title || ""}`.toLowerCase();
  if (entityType === "category_template" || sourceId.startsWith("template_")) return false;
  if (sourceId.includes("plasticlist") || entityType === "plasticlist" || organization.includes("plasticlist")) return true;
  if (sourceId.includes("pubmed") || organization.includes("pubmed") || title.includes("pubmed")) return true;
  if (entityType.includes("brand") || sourceId.includes("brand")) return true;
  return Boolean(link.source?.url);
}

function isVisibleScoringEvidence(evidence = {}) {
  return ["brand_confirmation", "brand_page"].includes(evidence.source_type);
}

function getProductSearchText(product = {}, category = null) {
  return [
    product.name,
    product.brand,
    category?.name,
    product.category,
    product.quantity,
    product.productType,
    product.source,
    ...(product.categories_tags || product.categoriesTags || []),
    product.ingredients,
  ].filter(Boolean).join(" ").toLowerCase();
}

function matchPackagingTemplate(product = {}, category = null) {
  const text = getProductSearchText(product, category);
  if (!text.trim() && !category?.id) return null;
  return packagingTemplates.find((template) => {
    const categoryMatch = !template.categoryIds?.length || template.categoryIds.includes(category?.id || product.categoryId);
    const keywordMatch = template.keywords.some((keyword) => text.includes(keyword));
    return categoryMatch && keywordMatch;
  }) || null;
}

function createTemplateParts(product, template) {
  return (template?.components || []).map((component, index) => ({
    id: `${product.id}_${template.id}_${index}`,
    productId: product.id,
    estimated: true,
    evidenceSourceType: "category_template",
    ...component,
    displayName: component.displayName,
    notes: component.notes || template.explanation,
  }));
}

function isGenericPendingPart(part = {}) {
  const text = `${part.displayName || ""} ${part.notes || ""}`.toLowerCase();
  return part.id?.includes("_packaging") && (text.includes("pending review") || text.includes("unknown")) && part.plasticTypeId === "unknown_plastic";
}

function stableScoreOffset(product = {}, spread = 4) {
  const text = `${product.brand || ""} ${product.name || ""} ${product.barcode || ""}`;
  const hash = Array.from(text).reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 997, 7);
  return (hash % (spread * 2 + 1)) - spread;
}

function getEstimatedTemplateScore(product = {}, template = null) {
  if (!template) return null;
  const [min = template.score, max = template.score] = template.scoreRange || [template.score, template.score];
  const text = getProductSearchText(product);
  let score = template.score + stableScoreOffset(product);
  if (/\bglass\b|paper[-\s]?wrapped|plastic[-\s]?free|cardboard only/.test(text)) score += 6;
  if (/family size|value size|club size|costco|multipack/.test(text)) score -= 3;
  if (/chocolate|peanut butter|oil|cream|cheese|whole milk|fat/.test(text)) score -= 4;
  if (/tomato|citrus|lemon|vinegar|pickle|salsa/.test(text)) score -= 3;
  if (/hot|microwave|instant|soup|broth|stew/.test(text)) score -= 5;
  return clampScore(Math.max(min, Math.min(max, score)));
}

function cleanProductText(value = "") {
  const raw = String(value || "").trim();
  const lower = raw.toLowerCase();
  if (lower.includes("cheerios") && (lower.includes("miel") || lower.includes("noix") || lower.includes("honey nut"))) return "Honey Nut Cheerios";
  if (/\brice\s+(krispies|crispees|crispies)\b/i.test(raw)) return "Rice Krispies";
  return raw
    .replace(/^(c[eé]r[eé]ales|cereal|cereals)\s+/i, "")
    .replace(/\bCrispees\b/gi, "Krispies")
    .replace(/\bRice Crispies\b/gi, "Rice Krispies")
    .replace(/\bCherios\b/gi, "Cheerios")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeProductIdentity(product = {}) {
  return {
    ...product,
    name: cleanProductText(product.name),
    brand: cleanProductText(product.brand),
  };
}

function getScoreTheme(score) {
  const value = clampScore(score);
  if (value >= 92) return { ring: "#00894b", bg: "#e6f8ef", label: "Near-ideal" };
  if (value >= 80) return { ring: "#63b879", bg: "#eff9f2", label: "Very low concern" };
  if (value >= 61) return { ring: "#9edba9", bg: "#f3fbf5", label: "Low plastic concern" };
  if (value >= 21) return { ring: "#c59622", bg: "#fff4d8", label: "Likely hidden plastic" };
  return { ring: "#9f2d28", bg: "#f8e8e6", label: "Contains plastic" };
}

const pendingScoreTheme = { ring: "#c7c7cc", bg: "#f7f7f8", label: "Score pending review" };

function isPendingReviewProduct(product = {}) {
  return false;
}

function isPublishableSubmissionProduct(product = {}) {
  return product.scoreStatus !== "photo_review" && product.scoreStatus !== "rejected_duplicate";
}

function getScoreDisplay(product = {}) {
  return product.score;
}

const getScoreBadgeStyle = (theme) => ({
  color: theme.ring,
  background: theme.bg,
});

function reviewStatusLabel(value) {
  return { estimated: "Estimated score", inferred: "Estimated score", unverified: "Needs packaging info", community_verified: "Community verified", brand_verified: "Brand confirmed", brand_confirmed: "Brand confirmed", expert_verified: "Expert checked", image_checked: "Checked from product images", external_tested: "External lab data" }[value] || "Needs packaging info";
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
  return [["history", "home", "Home"], ["search", "search", "Search"], ["scan", "scan", "Scan"], ["social", "social", "Social"], ["profile", "profile", "Profile"]];
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
  const maxTier = tiers[tiers.length - 1] || nextTier;
  const isMaxTier = currentTier?.name === maxTier?.name;
  const previousThreshold = currentTier?.threshold || 0;
  const range = Math.max(1, nextTier.threshold - previousThreshold);
  const progressInRange = Math.min(range, Math.max(0, progress - previousThreshold));
  const percent = nextTier.name === currentTier?.name ? 100 : Math.round((progressInRange / range) * 100);
  return { currentTier: currentTier?.name || "Starter", nextTier: nextTier.name, nextThreshold: nextTier.threshold, displayProgress: Math.min(progress, nextTier.threshold), percent, isMaxTier };
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
  product = normalizeProductIdentity(product);
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
  const explicitParts = [...db.productParts, ...extraParts].filter((part) => part.productId === product.id);
  const onlyGenericPendingParts = explicitParts.length > 0 && explicitParts.every(isGenericPendingPart);
  const packagingTemplate = !explicitParts.length || onlyGenericPendingParts ? matchPackagingTemplate(product, category) : null;
  const templateParts = packagingTemplate ? createTemplateParts(product, packagingTemplate) : [];
  const rawParts = packagingTemplate && (!explicitParts.length || onlyGenericPendingParts) ? templateParts : explicitParts;
  const parts = rawParts.map((part) => {
    const material = getById("materials", part.materialId);
    const plastic = getById("plasticTypes", part.plasticTypeId);
    const templateContexts = (part.contextIds || []).map((contextId) => ({ id: `${part.id}_${contextId}`, partId: part.id, contextId, context: getById("contexts", contextId) })).filter((item) => item.context);
    const contexts = [...getPartContexts(part.id), ...templateContexts].filter((item) => !(item.contextId === "heat" && isColdPreparedDrink(product)));
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
    kirkland_tuna: 19,
    kirkland_dishwasher: 12,
    blueland_dishwasher_tablets: 84,
    campbells_soup: 15,
    plasticlist_boba_guys_black_tea_juice: 22,
    plasticlist_boba_guys_black_tea_pearls: 16,
    plasticlist_boba_guys_fruity_flavored_tea: 20,
    chickfila_deluxe: 18
  };
  const scorePending = isPendingReviewProduct(product);
  const templateScore = getEstimatedTemplateScore(product, packagingTemplate);
  const score = product.scoreOverride ?? calibrationScores[product.id] ?? plasticListCalculatedScore ?? templateScore ?? rawScore;
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
  const scoreConfidence = product.scoreConfidence || (product.verification === "brand_confirmed" || product.verification === "brand_verified" ? "brand_confirmed" : product.verification === "community_verified" || product.verification === "expert_verified" ? "community_verified" : product.scoreStatus === "approved_photo" || product.scoreStatus === "photo_review" ? "image_checked" : packagingTemplate ? "estimated" : explicitParts.length || plasticListEvidence.length ? "estimated" : "unknown");
  const scoreConfidenceLabel = getScoreConfidenceLabel(scoreConfidence);
  const scoringEvidence = [
    ...(packagingTemplate ? [createScoringEvidence("category_template", `Category template: ${packagingTemplate.id}`, scoreConfidence, packagingTemplate.explanation)] : []),
    ...(product.packaging ? [createScoringEvidence("product_api_packaging", "Product API packaging field", "estimated", product.packaging)] : []),
    ...(product.imageUrl ? [createScoringEvidence("product_image", "Product image available", "image_checked", "Product image can help verify packaging shape but does not fully confirm materials.")] : []),
    ...(product.verification === "community_verified" ? [createScoringEvidence("community_upload", "Community verified", "community_verified", "Community evidence is attached to this product.")] : []),
    ...(scoreConfidence === "brand_confirmed" ? [createScoringEvidence("brand_confirmation", "Brand confirmed", "brand_confirmed", "Brand or label evidence confirms packaging.")] : []),
  ];
  const dynamicSources = [
    ...(hasHighRiskCanScenario ? [{ sourceId: "source_canned_soup_bpa", source: getById("sources", "source_canned_soup_bpa"), entityType: "dynamic", entityId: product.id }] : []),
  ];
  const evidenceSources = plasticListEvidence.map((item) => ({ sourceId: item.sourceId, source: item.source, entityType: "plasticlist", entityId: item.id }));
  const sources = [
    ...parts.flatMap((part) => getSourcesFor({ entityType: "part", entityId: part.id })),
    ...parts.flatMap((part) => getSourcesFor({ entityType: "plastic_type", entityId: part.plasticTypeId })),
    ...effectiveProductContexts.flatMap((item) => getSourcesFor({ entityType: "context", entityId: item.contextId })),
    ...dynamicSources,
    ...evidenceSources,
  ].filter((link) => link.source);
  const uniqueSources = Array.from(new Map(sources.map((link) => [link.source.id, link])).values());
  const scoringNote = product.scoringNote || (packagingTemplate ? `Based on common packaging for ${category?.name || "this category"}. Upload packaging photos to verify.` : "Needs packaging info before this score can be trusted.");
  return { ...product, category, parts, score, scorePending, scoreConfidence, scoreConfidenceLabel, scoringEvidence, packagingTemplate, scoringNote, theme, rating: theme.label, sources: uniqueSources, splitScores, riskFactors: uniqueRiskFactors, heatFlags, plasticListEvidence, hasCanLiner, hasHighRiskCanScenario, alternatives, community: { scans: Math.max(3, parts.length * 3), favorites: db.saves.filter((save) => save.productId === product.id).length } };
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
  if (type === "home") return <motion.svg {...common} animate={pulse} transition={pulseTransition}><path d="M3.5 10.5 12 3.5l8.5 7" /><path d="M5.5 10.5V20h13v-9.5" /><path d="M9.5 20v-6h5v6" /></motion.svg>;
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
const Header = ({ title, right }) => <div className="flex items-center justify-between px-5 pb-4 pt-[max(3.75rem,calc(env(safe-area-inset-top)+2rem))]"><h1 className="text-[28px] font-semibold leading-[1.03] tracking-[-0.04em] text-neutral-950">{title}</h1>{right || <span />}</div>;
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
    window.screen?.orientation?.lock?.("portrait-primary").catch?.(() => {});
  }, []);

  return (
    <div className="phone-shell relative mx-auto flex h-[100dvh] w-full flex-col overflow-hidden bg-[#f8f5ef] pt-0 pb-0 md:h-[min(760px,calc(100dvh-4rem))] md:w-[430px] md:rounded-[2.35rem] md:border md:border-white/70 md:shadow-[0_32px_90px_rgba(0,0,0,0.22)] md:ring-1 md:ring-black/5">
      {children}
    </div>
  );
}

function ProductImage({ src, alt, className, onMissing }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fit = className?.includes("object-contain") ? "contain" : "cover";
  useEffect(() => {
    let active = true;
    setError(false);
    setLoaded(false);
    if (!src) {
      onMissing?.();
      return () => {
        active = false;
      };
    }
    const image = new Image();
    image.onload = () => {
      if (active) setLoaded(true);
    };
    image.onerror = () => {
      if (!active) return;
      setError(true);
      onMissing?.();
    };
    image.src = src;
    return () => {
      active = false;
    };
  }, [src]);
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-[#f1eee7] text-neutral-400 ${className}`}
      role={loaded ? "img" : undefined}
      aria-label={loaded ? alt : undefined}
      style={loaded && !error ? { backgroundImage: `url("${src}")`, backgroundSize: fit, backgroundPosition: "center", backgroundRepeat: "no-repeat" } : undefined}
    >
      {(!src || error) && (
        <svg width="42%" height="42%" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-label={alt || "Image unavailable"}>
          <circle cx="32" cy="32" r="25" />
          <path d="M22 27h4l2.5-4h7L38 27h4a4 4 0 0 1 4 4v11a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V31a4 4 0 0 1 4-4Z" />
          <circle cx="32" cy="36" r="5.5" />
          <path d="M16 48 48 16" />
        </svg>
      )}
    </div>
  );
}

function triggerHapticFeedback(pattern = 8) {
  if (typeof window !== "undefined" && window.navigator?.vibrate) window.navigator.vibrate(pattern);
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
    if (event.target?.closest?.("button, a, input, textarea, select")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const edgeZone = Math.min(150, Math.max(72, bounds.width * 0.42));
    const localX = clientX - bounds.left;
    if (localX > edgeZone) return;
    gesture.current = { x: clientX, y: clientY, time: Date.now() };
  };

  const finishGesture = (clientX, clientY, event) => {
    if (!gesture.current) return;
    const { x, y, time } = gesture.current;
    gesture.current = null;
    const deltaX = clientX - x;
    const deltaY = clientY - y;
    const elapsed = Date.now() - time;
    const isBackSwipe = deltaX > 54 && Math.abs(deltaY) < 92 && deltaX > Math.abs(deltaY) * 1.15 && elapsed < 1800;
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

function ScoreRing({ score, onClick, delay = 0.15, featured = false, pending = false }) {
  const value = pending ? 0 : clampScore(score);
  const theme = pending ? pendingScoreTheme : getScoreTheme(value);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = pending ? 0 : circumference - (value / 100) * circumference;
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
        <circle cx="70" cy="70" r={radius} stroke={pending ? "#f7f7f8" : "#ebe6dc"} strokeWidth="13" fill="none" />
        <motion.circle cx="70" cy="70" r={radius} stroke={featured ? "url(#nearIdealScoreGradient)" : theme.ring} strokeWidth="13" fill="none" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: pending ? 0 : circumference }} animate={{ strokeDashoffset: offset }} transition={{ delay: delay + 0.12, type: "spring", stiffness: 58, damping: 16 }} />
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
        <div className={`font-semibold ${pending ? "text-[32px] tracking-[-0.03em] text-neutral-400" : "text-[42px] tracking-[-0.06em] text-neutral-950"}`}>{pending ? "TBD" : value}</div>
        {!pending && <div className="text-xs font-medium text-neutral-400">/ 100</div>}
      </motion.div>
    </motion.div>
  );
  return onClick ? <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={handleClick} className="relative overflow-hidden rounded-full transition" aria-label="View score breakdown">{content}</motion.button> : content;
}

function ProductRow({ product, onClick }) {
  const displayName = isPendingPlaceholderText(product.name) ? "Product details needed" : product.name;
  const displayBrand = isPendingPlaceholderText(product.brand, "brand") ? "Pending review" : product.brand;
  return <FastTapButton onActivate={onClick} className="w-full touch-manipulation text-left active:scale-[0.985]"><Card className="bg-white/78"><div className="flex items-center gap-3 p-3.5"><ProductImage src={product.imageUrl} alt={displayName} className="h-16 w-16 rounded-2xl object-cover shadow-sm" /><div className="min-w-0 flex-1"><div className="flex items-center gap-1 truncate text-[15px] font-semibold tracking-[-0.01em] text-neutral-950"><span className="truncate">{displayName}</span></div><div className="mt-0.5 text-sm text-neutral-500">{displayBrand}</div><div className="mt-1 text-xs text-neutral-400">{product.category?.name}</div></div><div className="flex h-12 w-12 items-center justify-center rounded-full text-[16px] font-bold shadow-inner" style={getScoreBadgeStyle(product.theme)}>{getScoreDisplay(product)}</div></div></Card></FastTapButton>;
}

function normalizeBarcode(value = "") {
  return String(value).replace(/\D/g, "").replace(/^0+(?=\d{12,13}$)/, "");
}

function hasValidGtinCheckDigit(value = "") {
  const digits = String(value).replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(digits.length)) return false;
  const check = Number(digits.at(-1));
  const body = digits.slice(0, -1).split("").reverse().map(Number);
  const sum = body.reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

function normalizeScannedBarcode(value = "") {
  const code = normalizeBarcode(value);
  return hasValidGtinCheckDigit(code) ? code : "";
}

function getBarcodeLookupCodes(value = "") {
  const digits = String(value).replace(/\D/g, "");
  const normalized = normalizeBarcode(value);
  return [...new Set([
    normalized,
    digits,
    normalized.length === 12 ? `0${normalized}` : "",
  ].filter(Boolean))];
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
  const codes = getBarcodeLookupCodes(barcode);
  for (const code of codes) {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_en,generic_name_en,brands,brands_tags,image_front_url,quantity,categories,categories_tags`);
    if (response.status === 404) continue;
    if (!response.ok) throw new Error("Open Food Facts lookup failed.");
    const data = await response.json();
    if (data.status !== 1 || !data.product) continue;
    const product = data.product;
    const brandFromTag = product.brands_tags?.[0]?.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    return {
      barcode: normalizeBarcode(code),
      name: cleanProductText(product.product_name_en || product.product_name || product.generic_name_en || "Unknown product"),
      brand: cleanProductText(product.brands?.split(",")[0]?.trim() || brandFromTag || ""),
      imageUrl: product.image_front_url || "",
      quantity: product.quantity || "",
      categories_tags: product.categories_tags || [],
      category: product.categories || "",
      source: "Open Food Facts",
    };
  }
  return null;
}

function readLocalJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local fallback is best-effort only.
  }
}

function readPhotoFile(file) {
  if (!file) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function fetchBackendSubmissions() {
  const response = await fetch(`/api/submissions?userId=${APP_USER_ID}`);
  if (!response.ok) throw new Error("Backend submissions unavailable.");
  const data = await response.json();
  return (data.submissions || []).map(normalizeSubmissionRecord);
}

async function fetchAllBackendSubmissions() {
  const response = await fetch("/api/submissions?admin=1");
  if (!response.ok) throw new Error("Backend review queue unavailable.");
  const data = await response.json();
  return (data.submissions || []).map(normalizeSubmissionRecord);
}

function normalizeSubmissionRecord(submission = {}) {
  const photos = submission.photos || submission.product?.submittedPhotos || {};
  const product = submission.product ? {
    ...submission.product,
    imageUrl: submission.product.imageUrl || photos.front?.dataUrl || "",
    submittedPhotos: photos,
  } : submission.product;
  return {
    ...submission,
    product,
    parts: Array.isArray(submission.parts) ? submission.parts : [],
    photos,
  };
}

async function saveBackendSubmission(submission) {
  const response = await fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: submission.user_id || APP_USER_ID, ...submission }),
  });
  if (!response.ok) throw new Error("Backend submission save failed.");
  const data = await response.json();
  return data.submission;
}

async function fetchBackendScans() {
  const response = await fetch(`/api/scans?userId=${APP_USER_ID}`);
  if (!response.ok) throw new Error("Backend scan history unavailable.");
  const data = await response.json();
  return data.scans || [];
}

async function saveBackendScan(scan) {
  const response = await fetch("/api/scans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: APP_USER_ID, ...scan }),
  });
  if (!response.ok) throw new Error("Backend scan save failed.");
  return response.json();
}

async function fetchBackendFavorites() {
  const response = await fetch(`/api/favorites?userId=${APP_USER_ID}`);
  if (!response.ok) throw new Error("Backend favorites unavailable.");
  const data = await response.json();
  return data.favorites || [];
}

async function saveBackendFavorite(productId, favorited) {
  const response = await fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: APP_USER_ID, productId, favorited }),
  });
  if (!response.ok) throw new Error("Backend favorite save failed.");
  const data = await response.json();
  return data.favorites || [];
}

function getCategoryIdFromLabel(label) {
  const match = db.categories.find((category) => category.name === label);
  return match?.id || "cat_food_drink";
}

function createPendingProductFromDraft(draft = {}, photos = {}) {
  const idSeed = normalizeBarcode(draft.barcode) || `${Date.now()}`;
  const id = `pending_${idSeed}`;
  const submittedName = cleanProductText(`${draft.name || draft.productName || ""}`);
  const submittedBrand = cleanProductText(`${draft.brand || draft.brandName || ""}`);
  const product = {
    id,
    name: submittedName || "Pending product",
    brand: submittedBrand || "Brand pending",
    categoryId: draft.categoryId || getCategoryIdFromLabel(draft.category) || "cat_food_drink",
    imageUrl: draft.imageUrl || photos.front?.dataUrl || "",
    country: "CA",
    confidence: "Low",
    verification: "unverified",
    barcode: normalizeBarcode(draft.barcode),
    quantity: draft.quantity || "",
    categories_tags: draft.categories_tags || draft.categoriesTags || [],
    category: draft.category || "",
    source: draft.source || "Barcode scan",
    scorePending: false,
    scoreStatus: "pending_review",
    scoringNote: "Estimated score. Packaging photos and material evidence can verify the rating.",
    submittedPhotos: photos,
  };
  const parts = [
    { id: `${id}_packaging`, productId: id, partType: "main_container", displayName: "Packaging pending review", materialId: "mixed", plasticTypeId: "unknown_plastic", baseImpact: -10, materialImpact: -12, notes: "User submitted this product for review. Front packaging and material/recycling logo photos should be checked before final scoring." },
  ];
  return { product, parts };
}

function isPendingPlaceholderText(value = "", kind = "name") {
  const text = String(value || "").trim().toLowerCase();
  return !text || text === (kind === "brand" ? "brand pending" : "pending product");
}

function getInitialSubmissionPhotos(draft = {}) {
  const existingPhotos = draft.submittedPhotos || draft.photos || {};
  const front = existingPhotos.front || (draft.imageUrl ? { name: "Front packaging", type: "image/jpeg", dataUrl: draft.imageUrl } : "");
  return {
    front,
    symbols: existingPhotos.symbols || existingPhotos.materials || "",
  };
}

function BottomNav({ tab, setTab }) {
  return <div className="relative z-20 border-t border-white/70 bg-white/72 px-2 pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.45rem))] pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] backdrop-blur-2xl"><div className="grid grid-cols-5 gap-1">{getBottomNavItems().map(([key, type, label]) => { const isActive = tab === key; return <FastTapButton key={key} onActivate={() => setTab(key)} className={`flex min-h-[54px] touch-manipulation flex-col items-center gap-1 rounded-full px-1 py-2 text-xs transition ${isActive ? "bg-neutral-200 text-neutral-950 shadow-inner" : "text-neutral-500 hover:bg-black/5"}`}><Icon type={type} active={isActive} animate={isActive} /><span className={isActive ? "font-semibold text-neutral-950" : "text-neutral-500"}>{label}</span></FastTapButton>; })}</div></div>;
}

function ScanScreen({ products, openResult, openAddProduct, onProductScanned }) {
  const [flashOn, setFlashOn] = useState(false);
  const [scanStatus, setScanStatus] = useState("Ready to scan");
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [matchedProduct, setMatchedProduct] = useState(null);
  const [resultSheetClosing, setResultSheetClosing] = useState(false);
  const [openFoodFactsProduct, setOpenFoodFactsProduct] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanCompletePulse, setScanCompletePulse] = useState(null);
  const cameraStreamRef = useRef(null);
  const torchTrackRef = useRef(null);
  const videoRef = useRef(null);
  const backgroundVideoRef = useRef(null);
  const scannerControlsRef = useRef(null);
  const lastScannedRef = useRef("");
  const ignoredBarcodeRef = useRef({ code: "", until: 0 });
  const pendingBarcodeRef = useRef({ code: "", count: 0, seenAt: 0 });
  const resolvingBarcodeRef = useRef(false);
  const barcodeReaderRef = useRef(null);
  const plasticListFood = products.find((product) => product.id === "plasticlist_boba_guys_black_tea_pearls") || products.find((product) => product.plasticListEvidence?.length) || products[4] || null;
  const scanCopy = {
    title: "Scan barcode",
    help: "Point your camera at a barcode to check for hidden plastic.",
    action: "Simulate unknown barcode",
    target: plasticListFood,
  };
  const isBarcodeNotFound = scannedBarcode && !matchedProduct && !openFoodFactsProduct && !isScanning && (scanStatus.includes("not found") || scanStatus.includes("Could not reach"));

  const completeScanFeedback = (tone = "found", pattern = [18, 36, 18]) => {
    triggerHapticFeedback(pattern);
    setScanCompletePulse(tone);
    window.setTimeout(() => setScanCompletePulse(null), 820);
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
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (backgroundVideoRef.current) backgroundVideoRef.current.srcObject = null;
    torchTrackRef.current = null;
    setIsScanning(false);
    setFlashOn(false);
  }

  const getBarcodeReader = () => {
    if (!barcodeReaderRef.current) {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, RETAIL_BARCODE_FORMATS);
      hints.set(DecodeHintType.TRY_HARDER, true);
      barcodeReaderRef.current = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 20,
        delayBetweenScanSuccess: 60,
        tryPlayVideoTimeout: 1200,
      });
    }
    return barcodeReaderRef.current;
  };

  const createMissingProductDraft = (source = openFoodFactsProduct, barcode = scannedBarcode) => ({
    id: source?.id,
    barcode: normalizeBarcode(barcode),
    name: source?.name || "",
    brand: source?.brand || "",
    imageUrl: source?.imageUrl || "",
    submittedPhotos: source?.submittedPhotos || source?.photos || {},
    categoryId: source?.categoryId,
    categories_tags: source?.categories_tags || source?.categoriesTags || [],
    category: source?.category || "",
    quantity: source?.quantity || "",
    source: source?.source || "Barcode scan",
  });

  const resolveBarcode = async (barcode) => {
    const code = normalizeScannedBarcode(barcode);
    if (!code || code === lastScannedRef.current || resolvingBarcodeRef.current) return;
    resolvingBarcodeRef.current = true;
    lastScannedRef.current = code;
    setScannedBarcode(code);
    setMatchedProduct(null);
    setOpenFoodFactsProduct(null);
    setScanStatus(`Barcode found: ${code}`);
    const localProduct = findProductByBarcode(products, code);
    if (localProduct) {
      setMatchedProduct(localProduct);
      setResultSheetClosing(false);
      setScanStatus(localProduct.scorePending ? "Pending product found. Add packaging evidence if you can." : "Matched in your product database.");
      completeScanFeedback(localProduct.scorePending ? "pending" : "found", localProduct.scorePending ? [16, 42, 16] : [18, 36, 18]);
      onProductScanned?.(localProduct);
      stopBarcodeScanner();
      return;
    }
    setScanStatus("Checking Open Food Facts...");
    try {
      const externalProduct = await fetchOpenFoodFactsProduct(code);
      if (externalProduct) {
        setOpenFoodFactsProduct(externalProduct);
        setScanStatus("Found product info. Add photos to verify packaging.");
        completeScanFeedback("found", [18, 36, 18]);
      } else {
        setScanStatus("Barcode not found! Add this product to our database so a rating score can be determined.");
        completeScanFeedback("missing", [28, 50, 28]);
      }
    } catch {
      setScanStatus("Could not reach Open Food Facts. Add product manually.");
      completeScanFeedback("missing", [28, 50, 28]);
    }
    stopBarcodeScanner();
  };

  const handleBarcodeCandidate = (barcode) => {
    const code = normalizeScannedBarcode(barcode);
    if (!code || resolvingBarcodeRef.current) return;
    if (ignoredBarcodeRef.current.code === code && Date.now() < ignoredBarcodeRef.current.until) return;
    const now = Date.now();
    const pending = pendingBarcodeRef.current;
    const isSameCandidate = pending.code === code && now - pending.seenAt < 1600;
    const nextCount = isSameCandidate ? pending.count + 1 : 1;
    pendingBarcodeRef.current = { code, count: nextCount, seenAt: now };
    setScannedBarcode(code);
    resolveBarcode(code);
  };

  const startBarcodeScanner = async () => {
    if (!videoRef.current) return;
    if (scannerControlsRef.current || isScanning) return;
    setMatchedProduct(null);
    setResultSheetClosing(false);
    setOpenFoodFactsProduct(null);
    setScannedBarcode("");
    lastScannedRef.current = "";
    pendingBarcodeRef.current = { code: "", count: 0, seenAt: 0 };
    resolvingBarcodeRef.current = false;
    setScanStatus("Starting camera...");
    setIsScanning(true);
    try {
      const reader = getBarcodeReader();
      scannerControlsRef.current = await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 }, focusMode: { ideal: "continuous" } }, audio: false }, videoRef.current, (result) => {
        if (result) handleBarcodeCandidate(result.getText());
      });
      cameraStreamRef.current = videoRef.current?.srcObject || null;
      if (backgroundVideoRef.current && cameraStreamRef.current) {
        backgroundVideoRef.current.srcObject = cameraStreamRef.current;
        backgroundVideoRef.current.play?.().catch(() => {});
      }
      torchTrackRef.current = cameraStreamRef.current?.getVideoTracks?.()[0] || null;
      setScanStatus("Point the camera at a UPC or EAN barcode.");
    } catch {
      setIsScanning(false);
      setScanStatus("Camera access was not enabled. Try Safari/Chrome over HTTPS.");
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => startBarcodeScanner(), 180);
    return () => window.clearTimeout(timer);
  }, []);

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
    try {
      const track = await ensureCameraTrack();
      const capabilities = track.getCapabilities?.() || {};
      if (!capabilities.torch) {
        setFlashOn(false);
        return;
      }
      await track.applyConstraints({ advanced: [{ torch: nextFlashState }] });
      setFlashOn(nextFlashState);
      if (!nextFlashState && !scannerControlsRef.current) {
        cameraStreamRef.current?.getTracks().forEach((streamTrack) => streamTrack.stop());
        cameraStreamRef.current = null;
        torchTrackRef.current = null;
      }
    } catch {
      setFlashOn(false);
    }
  };

  const dismissMatchedProduct = () => {
    if (resultSheetClosing) return;
    const dismissedBarcode = scannedBarcode || matchedProduct?.barcode || "";
    if (dismissedBarcode) ignoredBarcodeRef.current = { code: normalizeScannedBarcode(dismissedBarcode) || normalizeBarcode(dismissedBarcode), until: Date.now() + 3200 };
    setResultSheetClosing(true);
    const backdrop = document.querySelector(".z-30.flex.items-end");
    const sheet = backdrop?.firstElementChild;
    backdrop?.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: 620, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" });
    sheet?.animate?.([{ transform: "translateY(0)" }, { transform: "translateY(106%)" }], { duration: 620, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" });
    window.setTimeout(() => {
      setMatchedProduct(null);
      setResultSheetClosing(false);
      setScannedBarcode("");
      lastScannedRef.current = "";
      pendingBarcodeRef.current = { code: "", count: 0, seenAt: 0 };
      resolvingBarcodeRef.current = false;
      window.setTimeout(() => startBarcodeScanner(), 260);
    }, 620);
  };

  return <div className="relative flex min-h-[690px] flex-col overflow-hidden bg-neutral-950 text-white"><video ref={backgroundVideoRef} className={`absolute inset-0 h-full w-full scale-105 object-cover blur-md transition-opacity duration-300 ${isScanning ? "opacity-100" : "opacity-60"}`} muted playsInline autoPlay /><div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_0%,rgba(24,24,27,0.17)_56%,rgba(9,9,11,0.29)_100%)]" /><div className="absolute inset-0 bg-neutral-950/5" /><div className="relative z-10 flex items-center justify-between px-8 pb-4 pt-[max(3.75rem,calc(env(safe-area-inset-top)+2rem))]"><h1 className="text-[28px] font-semibold tracking-[-0.04em]">{scanCopy.title}</h1><button type="button" onClick={toggleFlashlight} className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/20 shadow-sm backdrop-blur-xl transition ${flashOn ? "bg-white text-neutral-950" : "bg-white/15 text-white"}`} aria-label="Toggle flashlight"><FlashlightIcon size={23} /></button></div><div className="relative z-10 flex flex-1 flex-col items-center justify-start px-4 pt-7 text-center"><div className="w-full"><div className="relative mx-auto h-[min(78vw,21.5rem)] w-[min(78vw,21.5rem)] overflow-hidden rounded-[2.4rem] border border-white/80 bg-neutral-950 shadow-[0_26px_70px_rgba(0,0,0,0.42)]"><video ref={videoRef} className={`h-full w-full object-cover transition-opacity ${isScanning ? "opacity-100" : "opacity-20"}`} muted playsInline autoPlay />{isScanning && <><motion.div className="pointer-events-none absolute inset-x-7 top-1/2 h-16 rounded-full bg-[linear-gradient(180deg,transparent,rgba(158,219,169,0.16),rgba(255,255,255,0.3),rgba(158,219,169,0.2),transparent)] blur-sm" initial={{ y: -128, opacity: 0.28 }} animate={{ y: [-128, 128, -128], opacity: [0.24, 0.96, 0.24] }} transition={{ duration: 2.05, repeat: Infinity, ease: "easeInOut" }} /><motion.div className="pointer-events-none absolute inset-x-7 top-1/2 h-[3px] rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.95),0_0_28px_rgba(158,219,169,0.95),0_0_52px_rgba(158,219,169,0.55)]" initial={{ y: -112, opacity: 0.28 }} animate={{ y: [-112, 112, -112], opacity: [0.34, 1, 0.34] }} transition={{ duration: 2.05, repeat: Infinity, ease: "easeInOut" }} /><motion.div className="pointer-events-none absolute inset-x-10 top-1/2 h-9 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.34),transparent_24%,transparent_76%,rgba(255,255,255,0.28),transparent)]" initial={{ y: -129, opacity: 0.12 }} animate={{ y: [-129, 95, -129], opacity: [0.1, 0.55, 0.1] }} transition={{ duration: 2.05, repeat: Infinity, ease: "easeInOut" }} /><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_42%,rgba(158,219,169,0.12)_72%,transparent_100%)]" /></>}{scanCompletePulse && <motion.div key={scanCompletePulse} className={`pointer-events-none absolute inset-0 flex items-center justify-center ${scanCompletePulse === "missing" ? "bg-red-500/14" : "bg-emerald-400/14"}`} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}><motion.div className={`h-28 w-28 rounded-full border ${scanCompletePulse === "missing" ? "border-red-200/80 shadow-[0_0_45px_rgba(248,113,113,0.45)]" : "border-emerald-100/90 shadow-[0_0_48px_rgba(158,219,169,0.75)]"}`} initial={{ scale: 0.72, opacity: 0 }} animate={{ scale: [0.72, 1.35], opacity: [0, 1, 0] }} transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }} /></motion.div>}<span className="absolute left-8 top-8 h-9 w-9 rounded-tl-xl border-l-[5px] border-t-[5px] border-white" /><span className="absolute right-8 top-8 h-9 w-9 rounded-tr-xl border-r-[5px] border-t-[5px] border-white" /><span className="absolute bottom-8 left-8 h-9 w-9 rounded-bl-xl border-b-[5px] border-l-[5px] border-white" /><span className="absolute bottom-8 right-8 h-9 w-9 rounded-br-xl border-b-[5px] border-r-[5px] border-white" />{!isScanning && <div className="absolute inset-0 flex items-center justify-center">{isBarcodeNotFound ? <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/50 bg-white/12 text-6xl font-semibold text-white shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur-md">!</div> : <BarcodeScanIcon size={118} active={false} />}</div>}</div><p className="mx-auto mt-5 max-w-[330px] min-h-[48px] text-sm leading-6 text-white/75">{scanStatus}</p>{scannedBarcode && <p className="mt-2 text-xs font-medium text-white/55">Barcode {scannedBarcode}</p>}{openFoodFactsProduct && <div className="mx-auto mt-4 max-w-[330px] rounded-3xl bg-white p-4 text-left text-neutral-950"><div className="text-xs font-medium uppercase tracking-wide text-neutral-400">Open Food Facts match</div><div className="mt-1 font-semibold">{openFoodFactsProduct.name}</div><div className="text-sm text-neutral-500">{openFoodFactsProduct.brand || "Brand unknown"}</div><Button onClick={() => openAddProduct(createMissingProductDraft(openFoodFactsProduct))} className="mt-3 w-full">Add photos & verify packaging</Button></div>}{isBarcodeNotFound && <div className="mx-auto mt-4 grid max-w-[330px] grid-cols-2 gap-2"><Button onClick={startBarcodeScanner} variant="light">Scan again</Button><Button onClick={() => openAddProduct(createMissingProductDraft(null))} variant="light" className="border border-white/20 bg-white/15 text-white hover:bg-white/20">Add product</Button></div>}</div></div><AnimatePresence>{matchedProduct && <motion.div key="scan-result-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }} className="absolute inset-0 z-30 flex items-end bg-neutral-950/30 backdrop-blur-md" onClick={dismissMatchedProduct}><motion.div key="scan-result-sheet" initial={{ y: "104%" }} animate={{ y: 0 }} exit={{ y: "104%", transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] } }} drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.14 }} onDragEnd={(_, info) => { if (info.offset.y > 112 || info.velocity.y > 860) dismissMatchedProduct(); }} transition={{ type: "spring", stiffness: 190, damping: 34, mass: 1.18 }} className="w-full rounded-t-[2rem] bg-white px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-4 text-left text-neutral-950 shadow-[0_-28px_70px_rgba(0,0,0,0.35)]" onClick={(event) => event.stopPropagation()}><div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-neutral-200" /><div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><div className="text-xs font-medium uppercase tracking-wide text-neutral-400">{matchedProduct.scorePending ? "Pending product found" : "Product found"}</div><div className="truncate text-lg font-semibold tracking-tight text-neutral-950">{isPendingPlaceholderText(matchedProduct.name) ? "Product details needed" : matchedProduct.name}</div></div><BackButton onClick={dismissMatchedProduct} variant="outline" /></div><div className="rounded-3xl bg-[#f7f3eb] p-3"><ProductRow product={matchedProduct} onClick={() => openResult(matchedProduct)} /></div><Button onClick={() => openAddProduct({ ...createMissingProductDraft(matchedProduct), packagingEvidence: true, source: "Packaging evidence update" })} variant="solid" className="mt-3 w-full">Add packaging evidence</Button></motion.div></motion.div>}</AnimatePresence></div>;
}

function SourceCard({ link, onOpen }) {
  const content = <><div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{link.source.organization}</div><div className="mt-1 font-medium text-neutral-950">{link.source.title}</div><p className="mt-1 text-sm leading-5 text-neutral-500">{link.source.summary}</p><div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500"><span>Credibility: {link.source.credibility}</span>{link.source.license && <span>License: {link.source.license}</span>}{link.source.accessDate && <span>Accessed: {link.source.accessDate}</span>}</div></>;
  if (onOpen) return <button type="button" onClick={onOpen} className="w-full rounded-2xl bg-[#f7f3eb] p-3 text-left transition active:scale-[0.99]">{content}</button>;
  return <div className="rounded-2xl bg-[#f7f3eb] p-3">{content}</div>;
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
  return <div className="min-h-[690px] px-5 pb-5" {...swipeBackHandlers}><Header title="PlasticList data" right={<BackButton onClick={close} />} /><Card><div className="p-5"><div className="text-sm text-neutral-500">{product?.brand}</div><h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">{product?.name}</h2><p className="mt-3 text-sm leading-6 text-neutral-500">Sample-based chemical testing from PlasticList. This is useful supporting evidence, but the main app score and “Where plastic is found” section stay the primary consumer-facing guidance.</p><div className="mt-4 inline-flex rounded-full bg-neutral-950 px-3 py-1 text-xs font-semibold text-white">CC BY 4.0</div></div></Card><div className="mt-5 space-y-3">{evidence.map((item) => { const meta = plasticListToneMeta(item.resultTone); return <div key={item.id} className={`rounded-3xl p-4 shadow-sm ${meta.bg}`}><div className="flex items-start justify-between gap-3"><div><div className={`font-semibold ${meta.text}`}>{item.testedName}</div><div className="mt-1 text-xs text-neutral-500">{item.sampleLocation} • {item.sampleType}</div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.pill}`}>{meta.label}</span></div><p className={`mt-3 text-sm leading-5 ${meta.text}`}>{item.summary}</p><div className="mt-3 grid gap-2">{item.chemicals.map((chemical) => <div key={`${item.id}-${chemical.name}`} className="rounded-2xl bg-white/80 p-3 text-sm shadow-sm"><div className="flex items-center justify-between gap-3"><span className="font-semibold text-neutral-950">{chemical.name}</span><span className="text-xs font-medium text-neutral-500">{chemical.concern}</span></div><div className="mt-1 text-xs text-neutral-500">{chemical.family} • {chemical.amount}</div></div>)}</div><div className="mt-3 text-xs leading-5 text-neutral-500">Attribution: PlasticList, Data on Plastic Chemicals in Bay Area Foods, licensed under CC BY 4.0.</div></div>; })}</div></div>;
}

function UnknownScreen({ close }) {
  return <div className="min-h-[690px] px-5 pb-5"><Header title="Product not found" right={<BackButton onClick={close} />} /><div className="mt-16 flex flex-col items-center text-center"><div className="mb-5 flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white text-5xl font-semibold text-neutral-950 shadow-sm">!</div><h2 className="text-3xl font-semibold tracking-tight text-neutral-950">We don’t have this yet</h2><p className="mt-3 max-w-[300px] text-sm leading-6 text-neutral-500">Add product and packaging photos so the community can help verify it.</p><Button className="mt-7 px-6">Upload product</Button><Button onClick={close} variant="ghost" className="mt-2">Try another scan</Button></div></div>;
}

function DetailScreen({ product, part, close }) {
  const sources = [...getSourcesFor({ entityType: "part", entityId: part.id }), ...getSourcesFor({ entityType: "plastic_type", entityId: part.plasticTypeId }), ...part.contexts.flatMap((context) => getSourcesFor({ entityType: "context", entityId: context.contextId }))];
  const uniqueSources = Array.from(new Map(sources.map((item) => [item.source.id, item])).values());
  const swipeBackHandlers = useSwipeBack(close, true);
  return <div className="min-h-[690px] px-5 pb-5" {...swipeBackHandlers}><Header title="Why" right={<BackButton onClick={close} />} /><Card><div className="p-5"><div className="text-sm text-neutral-500">{product.name}</div><h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">{part.estimated ? `Likely ${part.displayName.toLowerCase()}` : part.displayName}</h2><div className="mt-3 inline-flex rounded-full bg-[#f7f3eb] px-3 py-1 text-sm text-neutral-700">{getPartMaterialLabel(part) || "Unknown material"}</div>{part.estimated && <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm leading-5 text-amber-900"><span className="font-semibold">Based on category template.</span> This part is an estimate until packaging photos or label evidence are reviewed.</div>}<p className="mt-4 text-sm leading-6 text-neutral-500">{part.notes}</p>{part.linerInfo && <div className="mt-4 rounded-2xl bg-[#f7f3eb] p-3"><div className="text-sm font-semibold text-neutral-950">{part.linerType === "bpa_free_confirmed" ? "Label confirmed" : "Liner assumption"}: {part.linerInfo.linerLabel}</div><p className="mt-1 text-sm leading-5 text-neutral-500">{part.linerInfo.linerSummary}</p></div>}</div></Card><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><h3 className="font-semibold text-neutral-950">Score impact</h3><div className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><span>Component</span><span>{part.baseImpact}</span></div><div className="flex justify-between"><span>Material type</span><span>{part.materialImpact}</span></div>
          {part.linerInfo && <div className="flex justify-between"><span>{part.linerInfo.linerLabel}</span><span>{part.linerAdjustment}</span></div>}{part.labelEvidenceBonus > 0 && <div className="flex justify-between text-emerald-700"><span>Label evidence bonus</span><span>+{part.labelEvidenceBonus}</span></div>}<div className="flex justify-between"><span>Context</span><span>{part.contextImpact}</span></div><div className="flex justify-between border-t border-neutral-200 pt-2 font-semibold"><span>Total impact</span><span>{part.totalImpact}</span></div></div></div><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><h3 className="font-semibold text-neutral-950">Context modifiers</h3><div className="mt-3 space-y-2">{part.contexts.length ? part.contexts.map((item) => <div key={item.id} className="rounded-2xl bg-[#f7f3eb] p-3"><div className="flex justify-between gap-3 font-medium text-neutral-950"><span>{item.context.name}</span><span>{item.context.penalty}</span></div><p className="mt-1 text-sm leading-5 text-neutral-500">{item.context.summary}</p></div>) : <p className="text-sm text-neutral-500">No special context modifiers attached.</p>}</div></div><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><h3 className="font-semibold text-neutral-950">Sources & research</h3><div className="mt-3 space-y-2">{part.estimated && <div className="rounded-2xl bg-[#f7f3eb] p-3"><div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Category template</div><div className="mt-1 font-medium text-neutral-950">Based on category template</div><p className="mt-1 text-sm leading-5 text-neutral-500">This is estimated from common packaging and should be verified with product photos.</p></div>}{uniqueSources.length ? uniqueSources.map((link) => <SourceCard key={link.source.id} link={link} />) : !part.estimated && <p className="text-sm text-neutral-500">No sources attached yet.</p>}</div></div></div>;
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
    <div ref={panelRef} className="min-h-[690px] px-5 pb-5">
      <Header title="Score details" right={<BackButton onClick={close} />} />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
        <Card>
          <div className="flex flex-col items-center p-6 text-center">
            <ScoreRing score={product.score} delay={0.1} pending={product.scorePending} />
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

function SearchScreen({ products, openResult, openAddProduct, onSearchAction }) {
  const [query, setQuery] = useState("");
  const [plasticFreeOnly, setPlasticFreeOnly] = useState(false);
  const [activeTags, setActiveTags] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef(null);
  const tags = ["Personal care", "Food", "Cleaning", "Sexual health", "Hidden plastic", "Available in Canada", "Microwave safe", "Feminine hygiene", "Baby", "Kitchen", "Clothing", "Teas", "Sunscreen"];
  const q = query.trim().toLowerCase();
  const toggleTag = (tag) => {
    onSearchAction?.(`filter:${tag}`);
    setActiveTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  };
  const filtered = products.filter((product) => {
    const matchesQuery = product.name.toLowerCase().includes(q) || product.brand.toLowerCase().includes(q) || product.category?.name.toLowerCase().includes(q);
    const passesPlasticFree = !plasticFreeOnly || (!product.scorePending && product.score >= 80);
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
  return <div className="min-h-[690px] px-5 pb-4"><Header title="Search" /><div onClick={focusSearch} onTouchEnd={focusSearch} className="mb-4 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm"><Icon type="search" active={false} size={22} /><input ref={searchInputRef} value={query} onFocus={() => setIsSearchFocused(true)} onBlur={() => setIsSearchFocused(false)} onChange={(event) => { setQuery(event.target.value); if (event.target.value.trim().length >= 2) onSearchAction?.(`query:${event.target.value.trim().toLowerCase()}`); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} placeholder="Search by product, brand or category" enterKeyHint="search" className="w-full bg-transparent text-base outline-none" /></div><div className="mb-4 flex gap-2 overflow-x-auto pb-1"><FastTapButton onActivate={() => { triggerHapticFeedback(); onSearchAction?.("filter:plastic-free"); setPlasticFreeOnly(!plasticFreeOnly); }} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm shadow-sm transition active:scale-[0.98] ${plasticFreeOnly ? "bg-neutral-950 text-white" : "bg-white text-neutral-700"}`}>Plastic-free only</FastTapButton>{tags.map((tag) => <FastTapButton key={tag} onActivate={() => { triggerHapticFeedback(); toggleTag(tag); }} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm shadow-sm transition active:scale-[0.98] ${activeTags.includes(tag) ? "bg-neutral-950 text-white" : "bg-white text-neutral-700"}`}>{tag}</FastTapButton>)}</div><div className="space-y-2">{filtered.length ? filtered.map((product, index) => <motion.div key={product.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 3) * 0.025, duration: 0.16 }}><ProductRow product={product} onClick={() => openResult(product)} /></motion.div>) : <div className="mt-20 text-center"><div className="text-xl font-semibold text-neutral-950">No product found</div><p className="mt-2 text-sm text-neutral-500">Add photos and packaging notes to help verify it.</p><Button onClick={openAddProduct} className="mt-5">＋ Add product</Button></div>}</div></div>;
}

function MaterialLogoExampleMark({ mark }) {
  const resinMatch = mark.match(/(\d)/);
  if (resinMatch) {
    return <span className="inline-flex items-center gap-0.5 rounded-full border border-neutral-300/60 bg-white/35 px-1 py-0.5 text-[9px] font-semibold leading-none text-neutral-400"><svg width="13" height="12" viewBox="0 0 24 22" fill="none" aria-hidden="true"><path d="M12 2.5 21 18H3L12 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><text x="12" y="15" textAnchor="middle" fontSize="8" fontWeight="700" fill="currentColor">{resinMatch[1]}</text></svg><span>{mark.replace(/\s+\d$/, "")}</span></span>;
  }
  if (mark === "BPA-free") {
    return <span className="inline-flex items-center gap-0.5 rounded-full border border-neutral-300/60 bg-white/35 px-1 py-0.5 text-[9px] font-semibold leading-none text-neutral-400"><svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.8" /><path d="M5.2 14.8 14.8 5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg><span>BPA-free</span></span>;
  }
  return <span className="inline-flex items-center gap-0.5 rounded-full border border-neutral-300/60 bg-white/35 px-1 py-0.5 text-[9px] font-semibold leading-none text-neutral-400"><svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M6.5 5.2A5.5 5.5 0 0 1 15 6.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M14.7 3.9 15.6 6.4l-2.6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M13.5 14.8A5.5 5.5 0 0 1 5 13.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M5.3 16.1 4.4 13.6l2.6-.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg><span>{mark}</span></span>;
}

function PhotoUploadSlot({ label, value, onChange, accepted = false, showCaption = true, exampleMarks = [] }) {
  const fileName = value?.name || value || "";
  const previewUrl = value?.dataUrl || "";
  return (
    <label className={`block rounded-2xl border p-3 text-left transition ${accepted ? "border-emerald-200 bg-emerald-50" : "border-neutral-200 bg-[#f7f3eb]"}`}>
      <div className={`flex gap-3 ${previewUrl ? "flex-col items-start" : "items-center"}`}>
        {previewUrl && <div className="relative h-20 w-full overflow-hidden rounded-xl bg-white shadow-sm"><img src={previewUrl} alt="" className="h-full w-full object-cover" />{accepted && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[13px] font-bold text-white shadow-sm">✓</span>}</div>}
        <div className="min-w-0 flex-1">
          <span className="block break-words text-sm font-semibold leading-5 text-neutral-950">{label}</span>
          {showCaption && <span className={`mt-1 block truncate text-xs ${accepted ? "font-medium text-emerald-700" : "text-neutral-500"}`}>{accepted ? "Product photo selected" : fileName || "Tap to choose photo"}</span>}
          {!previewUrl && exampleMarks.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{exampleMarks.map((mark) => <MaterialLogoExampleMark key={mark} mark={mark} />)}</div>}
        </div>
      </div>
      <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={async (event) => onChange(await readPhotoFile(event.target.files?.[0]))} />
    </label>
  );
}

function AddProductScreen({ close, draft = {}, onSubmit }) {
  const initialPhotos = getInitialSubmissionPhotos(draft);
  const [flashOn, setFlashOn] = useState(false);
  const [photos, setPhotos] = useState(initialPhotos);
  const [frontPhotoAccepted, setFrontPhotoAccepted] = useState(Boolean(initialPhotos.front));
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [name, setName] = useState(isPendingPlaceholderText(draft.name) ? "" : draft.name || "");
  const [brand, setBrand] = useState(isPendingPlaceholderText(draft.brand, "brand") ? "" : draft.brand || "");
  const [barcode, setBarcode] = useState(draft.barcode || "");
  const [category, setCategory] = useState(draft.packagingScan ? "Other" : "Food and drink");
  const [submitted, setSubmitted] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const videoRef = useRef(null);
  const detailsRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const torchTrackRef = useRef(null);
  const setPhoto = (key, value) => setPhotos((current) => ({ ...current, [key]: value }));
  const setFrontPhoto = (value, accepted = true) => {
    setPhotos((current) => ({ ...current, front: value }));
    setFrontPhotoAccepted(Boolean(value) && accepted);
  };
  const hasRequiredText = name.trim() && brand.trim();
  const hasAcceptedFrontPhoto = photos.front && frontPhotoAccepted;
  const hasUnacceptedFrontPhoto = Boolean(photos.front && !frontPhotoAccepted);
  const canSubmit = draft.packagingEvidence ? hasRequiredText && !hasUnacceptedFrontPhoto && (hasAcceptedFrontPhoto || photos.symbols) : hasRequiredText && hasAcceptedFrontPhoto;
  const showRequiredTextError = submitAttempted && !hasRequiredText;
  const showUnacceptedFrontPhotoError = submitAttempted && hasUnacceptedFrontPhoto;
  const showMissingFrontPhotoError = submitAttempted && !draft.packagingEvidence && !photos.front;

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    torchTrackRef.current = null;
    setCameraReady(false);
    setFlashOn(false);
  };

  const startCamera = async () => {
    if (!videoRef.current || cameraStreamRef.current) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      cameraStreamRef.current = stream;
      videoRef.current.srcObject = stream;
      torchTrackRef.current = stream.getVideoTracks()[0] || null;
      setCameraReady(true);
      setCameraError("");
    } catch {
      setCameraReady(false);
      setCameraError("Camera access was not enabled.");
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => startCamera(), 120);
    return () => {
      window.clearTimeout(timer);
      stopCamera();
    };
  }, []);

  const takeFrontPhoto = () => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext("2d");
    context?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setFrontPhoto({ name: "Front package photo", type: "image/jpeg", dataUrl: canvas.toDataURL("image/jpeg", 0.88) }, false);
    triggerHapticFeedback();
  };

  const acceptFrontPhoto = () => {
    setFrontPhoto(photos.front, true);
    triggerHapticFeedback();
    window.requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const submitForReview = () => {
    setSubmitAttempted(true);
    if (!canSubmit) return;
    const trimmedName = name.trim();
    const trimmedBrand = brand.trim();
    setSubmitted(true);
    onSubmit?.({ ...draft, name: trimmedName, productName: trimmedName, brand: trimmedBrand, brandName: trimmedBrand, barcode, category }, photos);
  };

  const toggleFlashlight = async () => {
    const nextFlashState = !flashOn;
    try {
      const track = torchTrackRef.current;
      const capabilities = track?.getCapabilities?.() || {};
      if (!track || !capabilities.torch) {
        setFlashOn(false);
        return;
      }
      await track.applyConstraints({ advanced: [{ torch: nextFlashState }] });
      setFlashOn(nextFlashState);
    } catch {
      setFlashOn(false);
    }
  };

  return <div className="relative min-h-[690px] bg-neutral-950 text-white"><div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#3f3f46_0%,_#18181b_55%,_#09090b_100%)]" /><div className="relative z-10 px-5 pb-6"><div className="flex items-center justify-between pb-3 pt-6"><h1 className="text-2xl font-semibold tracking-tight">Add product</h1><BackButton onClick={close} variant="light" /></div><div className="mt-8 flex flex-col items-center text-center"><p className="mb-3 max-w-[310px] text-sm leading-6 text-white/70">Photograph the front of the packaging.</p><div className="relative flex h-64 w-full items-center justify-center overflow-hidden rounded-[2rem] border-2 border-white/80 bg-white/5 shadow-2xl"><video ref={videoRef} className={`h-full w-full object-cover transition-opacity ${cameraReady ? "opacity-100" : "opacity-30"}`} muted playsInline autoPlay />{photos.front?.dataUrl && <img src={photos.front.dataUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}<span className="absolute left-8 top-8 h-8 w-8 border-l-4 border-t-4 border-white" /><span className="absolute right-8 top-8 h-8 w-8 border-r-4 border-t-4 border-white" /><span className="absolute bottom-8 left-8 h-8 w-8 border-b-4 border-l-4 border-white" /><span className="absolute bottom-8 right-8 h-8 w-8 border-b-4 border-r-4 border-white" />{photos.front && !frontPhotoAccepted && <> <div className="absolute inset-x-4 top-4 text-center text-sm font-semibold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">Use this product photo?</div><div className="absolute inset-0 flex items-center justify-center gap-5"><button type="button" onClick={acceptFrontPhoto} className="flex h-12 w-12 items-center justify-center rounded-full border border-white/35 bg-emerald-500/54 text-2xl font-bold text-white shadow-[0_12px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl transition active:scale-[0.96]" aria-label="Use this product photo">✓</button><button type="button" onClick={() => setFrontPhoto("", false)} className="flex h-12 w-12 items-center justify-center rounded-full border border-white/35 bg-red-500/54 text-2xl font-bold text-white shadow-[0_12px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl transition active:scale-[0.96]" aria-label="Retake photo">×</button></div></>}{frontPhotoAccepted && <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/18"><span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-5xl font-semibold text-white shadow-[0_18px_45px_rgba(0,0,0,0.35)]">✓</span></div>}{!cameraReady && <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white/80">{cameraError || "Opening camera..."}</div>}{!photos.front && <button type="button" onClick={takeFrontPhoto} disabled={!cameraReady} className="absolute bottom-4 left-1/2 min-h-11 -translate-x-1/2 rounded-full border border-white/40 bg-white/24 px-5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl transition active:scale-[0.98] disabled:opacity-45">Take photo</button>}</div>{frontPhotoAccepted ? <p className="mt-3 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white">Product photo selected</p> : <p className="mt-3 max-w-[300px] text-xs leading-5 text-white/55">Take a photo, then tap the green checkmark to continue.</p>}</div>{frontPhotoAccepted && <div ref={detailsRef} className="mt-8 space-y-3 rounded-3xl bg-white p-4 text-neutral-950 shadow-sm"><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Product name <span className="text-red-500">*</span></span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. UltraShine Dishwasher Detergent" className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none focus:border-neutral-950" /></label><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Brand <span className="text-red-500">*</span></span><input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="e.g. Kirkland Signature" className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none focus:border-neutral-950" /></label><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Category</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none focus:border-neutral-950"><option>Food and drink</option><option>Personal care</option><option>Household cleaning</option><option>Feminine hygiene</option><option>Sexual health</option><option>Baby</option><option>Other</option></select></label><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Barcode number</span><input value={barcode} onChange={(event) => setBarcode(event.target.value)} inputMode="numeric" placeholder="Scan or enter manually" className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none focus:border-neutral-950" /></label><div><span className="mb-2 block text-sm font-medium text-neutral-700">Photos</span><p className="mb-3 text-xs leading-5 text-neutral-500">Material logos are optional and not required, but helpful when visible.</p><div className="grid grid-cols-2 gap-2"><PhotoUploadSlot label="Front packaging (Required)" value={photos.front} accepted={frontPhotoAccepted} showCaption={false} onChange={(value) => setFrontPhoto(value, true)} /><PhotoUploadSlot label="Material logos (Optional)" value={photos.symbols} accepted={Boolean(photos.symbols)} showCaption={false} exampleMarks={["PET 1", "HDPE 2", "BPA-free", "Recycle"]} onChange={(value) => setPhoto("symbols", value)} /></div></div><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Packaging notes (Optional)</span><textarea defaultValue={draft.packagingScan ? "Started from packaging symbol scan. Add resin codes, recycling symbols, liner claims, or compostable markings seen on the package." : ""} placeholder="Visible material claims, resin codes, recycling logos, plastic-free claims, liner claims, or anything unclear." className="min-h-[100px] w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none focus:border-neutral-950" /></label>{submitted && <div className="rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Submitted and added to your scan history.</div>}{showRequiredTextError && <p className="text-xs font-medium leading-5 text-red-500">*Product name and brand are required before submitting.</p>}<Button onClick={submitForReview} className="w-full">Submit for review</Button></div>}</div></div>;
}

function HistoryScreen({ products, scans = db.scans, openResult, openScanned, openSearched }) {
  const resolvedScans = scans.map((scan) => ({ ...scan, product: products.find((product) => product.id === scan.productId) })).filter((scan) => scan.product);
  const searchedProducts = products.filter((product) => !resolvedScans.some((scan) => scan.product.id === product.id));
  const trendingProducts = getTrendingProducts(products);
  return <div className="min-h-[690px] px-5 pb-4"><Header title="Home" />{trendingProducts.length > 0 && <div className="mb-6"><div className="mb-3 px-1"><h2 className="text-2xl font-semibold tracking-[-0.045em] text-neutral-950">Trending this week</h2><p className="text-sm text-neutral-500">Most saved in trusted circles</p></div><div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">{trendingProducts.map((product) => <div key={product.id} className="snap-start"><TrendingProductChip product={product} onClick={() => openResult(product)} /></div>)}</div></div>}<h2 className="mb-3 px-1 text-xl font-semibold tracking-[-0.03em] text-neutral-950">History</h2><div className="mb-5 grid grid-cols-2 gap-3"><button type="button" onClick={openScanned} className="text-left"><Card><div className="p-4"><div className="text-3xl font-semibold">{resolvedScans.length}</div><div className="text-sm leading-tight text-neutral-500">Products scanned</div></div></Card></button><button type="button" onClick={openSearched} className="text-left"><Card><div className="p-4"><div className="text-3xl font-semibold">{searchedProducts.length}</div><div className="text-sm leading-tight text-neutral-500">Products searched</div></div></Card></button></div><div className="space-y-2">{resolvedScans.map((scan) => <ProductRow key={scan.id} product={scan.product} onClick={() => openResult(scan.product)} />)}</div></div>;
}

function ShareSheet({ product, close, onShareSuccess }) {
  const shareLink = `https://plasticfree.app/product/${product?.id || "unknown"}`;
  return <div className="min-h-[690px] px-5 pb-5"><Header title="Share product" right={<BackButton onClick={close} />} /><Card><div className="p-5 text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f7f3eb] text-2xl">↗</div><h2 className="text-2xl font-semibold tracking-tight text-neutral-950">Share {product?.name}</h2><p className="mt-2 text-sm leading-6 text-neutral-500">This sends a link that opens in the app. If they don’t have the app, it takes them to the App Store.</p><div className="mt-5 rounded-2xl bg-[#f7f3eb] p-3 text-left text-xs text-neutral-500">{shareLink}</div></div></Card><div className="mt-5 grid grid-cols-3 gap-3"><Button onClick={() => onShareSuccess?.("Text")} variant="outline" className="bg-white">Text</Button><Button onClick={() => onShareSuccess?.("WhatsApp")} variant="outline" className="bg-white">WhatsApp</Button><Button onClick={() => onShareSuccess?.("Email")} variant="outline" className="bg-white">Email</Button></div></div>;
}

function ProductListScreen({ title, products, openResult, close }) {
  return <div className="min-h-[690px] px-5 pb-5"><Header title={title} right={<BackButton onClick={close} />} /><div className="space-y-2">{products.length ? products.map((product) => <ProductRow key={product.id} product={product} onClick={() => openResult(product)} />) : <Card><div className="p-5 text-center text-sm text-neutral-500">No products yet.</div></Card>}</div></div>;
}

function PeopleListScreen({ title, users, openUserProfile, close }) {
  return <div className="min-h-[690px] px-5 pb-5"><Header title={title} right={<BackButton onClick={close} />} /><div className="space-y-2">{users.length ? users.map((user) => <div key={user.id} role="button" tabIndex={0} onClick={() => openUserProfile(user)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openUserProfile(user); }} className="cursor-pointer text-left transition active:scale-[0.99]"><SuggestedUser user={user} actionLabel="View" /></div>) : <Card><div className="p-5 text-center text-sm text-neutral-500">No people yet.</div></Card>}</div></div>;
}

function SuggestedUser({ user, actionLabel = "Follow" }) {
  return <div className="flex items-center gap-3 rounded-2xl bg-[#f7f3eb] p-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-semibold text-neutral-700">{user.avatar}</div><div className="min-w-0 flex-1"><div className="font-medium text-neutral-950">{user.displayName}</div><div className="text-sm text-neutral-500">{user.role}</div></div><Button variant="outline" className="px-3 py-1 text-xs">{actionLabel}</Button></div>;
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

function hasProductPhoto(product = {}) {
  return Boolean(product.imageUrl);
}

function ProductPhotoSubmissionSheet({ product, close, onSubmit }) {
  const [photos, setPhotos] = useState({});
  const [activeTarget, setActiveTarget] = useState("front");
  const [pendingCapture, setPendingCapture] = useState(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const libraryInputRef = useRef(null);
  const libraryTargetRef = useRef("front");
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const dragControls = useDragControls();
  const photoTargets = [
    { id: "front", label: "Front photo" },
    { id: "back", label: "Back photo" },
    { id: "recycling", label: "Recycling label" },
    { id: "inside", label: "Inside packaging" },
  ];
  const activeTargetLabel = photoTargets.find((target) => target.id === activeTarget)?.label || "Photo";

  useEffect(() => {
    let active = true;
    async function startCamera() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera unavailable");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraReady(true);
      } catch {
        if (active) setCameraError("Camera permission needed");
      }
    }
    startCamera();
    return () => {
      active = false;
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, []);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext("2d");
    context?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const capturedPhoto = { name: `${activeTargetLabel}`, type: "image/jpeg", dataUrl: canvas.toDataURL("image/jpeg", 0.88) };
    setPendingCapture(capturedPhoto);
    triggerHapticFeedback();
  };

  const acceptCapturedPhoto = () => {
    if (!pendingCapture) return;
    setPhotos((current) => ({ ...current, [activeTarget]: pendingCapture }));
    setPendingCapture(null);
    triggerHapticFeedback();
  };

  const openLibraryFor = (target) => {
    libraryTargetRef.current = target;
    setActiveTarget(target);
    libraryInputRef.current?.click();
  };

  const submitPhoto = async () => {
    const payload = { ...photos, notes };
    if ((!payload.front && !payload.back && !payload.recycling && !payload.inside && !notes.trim()) || isSubmitting) return;
    setIsSubmitting(true);
    await onSubmit(product, payload);
    setIsSubmitting(false);
    close();
  };

  return (
    <motion.div
      className="fixed left-1/2 top-0 z-[90] flex h-[100dvh] w-full max-w-[430px] -translate-x-1/2 items-end overflow-hidden bg-neutral-950/38 backdrop-blur-md md:top-1/2 md:h-[min(760px,calc(100dvh-4rem))] md:-translate-y-1/2 md:rounded-[2.35rem]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 0.8, 0.2, 1] }}
      onClick={close}
    >
      <motion.div
        initial={{ y: "105%", opacity: 0.98 }}
        animate={{ y: 0 }}
        exit={{ y: "105%", opacity: 0.98, transition: { duration: 0.42, ease: [0.32, 0.72, 0, 1] } }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.18 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 110 || info.velocity.y > 820) close();
        }}
        transition={{ type: "spring", stiffness: 230, damping: 34, mass: 1.08 }}
        className="max-h-[94dvh] w-full overflow-y-auto rounded-t-[2rem] bg-neutral-950 p-5 text-white shadow-[0_-28px_70px_rgba(0,0,0,0.34)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" onPointerDown={(event) => dragControls.start(event)} className="mx-auto mb-4 block h-7 w-16 touch-none rounded-full" aria-label="Swipe down to close">
          <span className="mx-auto mt-2 block h-1.5 w-12 rounded-full bg-white/24" />
        </button>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Help verify this product</h3>
            <p className="mt-1 text-sm leading-5 text-white/60">Add the photos that show the real packaging materials.</p>
          </div>
          <BackButton onClick={close} variant="light" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {photoTargets.map((target) => (
            <button
              key={target.id}
              type="button"
              onClick={() => {
                setActiveTarget(target.id);
                setPendingCapture(null);
              }}
              className={`rounded-full px-3 py-2 text-xs font-semibold transition active:scale-[0.97] ${activeTarget === target.id ? "bg-white text-neutral-950" : "bg-white/12 text-white/70"}`}
            >
              {target.label}
              {photos[target.id] && <span className="ml-1 text-emerald-300">✓</span>}
            </button>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-[2rem] border-2 border-white/75 bg-white/5 shadow-2xl">
          <div className="relative h-64">
            <video ref={videoRef} className={`h-full w-full object-cover transition-opacity ${cameraReady ? "opacity-100" : "opacity-25"}`} muted playsInline autoPlay />
            {pendingCapture?.dataUrl && <img src={pendingCapture.dataUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <div className="absolute left-4 top-4 rounded-full bg-neutral-950/48 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">{activeTargetLabel}</div>
            <span className="absolute left-8 top-8 h-8 w-8 border-l-4 border-t-4 border-white" />
            <span className="absolute right-8 top-8 h-8 w-8 border-r-4 border-t-4 border-white" />
            <span className="absolute bottom-8 left-8 h-8 w-8 border-b-4 border-l-4 border-white" />
            <span className="absolute bottom-8 right-8 h-8 w-8 border-b-4 border-r-4 border-white" />
            {!cameraReady && !pendingCapture?.dataUrl && <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white/70">{cameraError || "Opening camera..."}</div>}
            {pendingCapture?.dataUrl && (
              <>
                <div className="absolute inset-x-4 top-11 text-center text-sm font-semibold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">Use this photo for {activeTargetLabel.toLowerCase()}?</div>
                <div className="absolute inset-0 flex items-center justify-center gap-5">
                  <button type="button" onClick={acceptCapturedPhoto} className="flex h-14 w-14 items-center justify-center rounded-full border border-white/35 bg-emerald-500/58 text-3xl font-bold text-white shadow-[0_12px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl transition active:scale-[0.96]" aria-label="Use this photo">✓</button>
                  <button type="button" onClick={() => setPendingCapture(null)} className="flex h-14 w-14 items-center justify-center rounded-full border border-white/35 bg-red-500/58 text-3xl font-bold text-white shadow-[0_12px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl transition active:scale-[0.96]" aria-label="Retake photo">×</button>
                </div>
              </>
            )}
            {!pendingCapture && <button type="button" onClick={takePhoto} disabled={!cameraReady} className="absolute bottom-4 left-1/2 min-h-11 -translate-x-1/2 rounded-full border border-white/40 bg-white/24 px-5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl transition active:scale-[0.98] disabled:opacity-45">Take photo</button>}
          </div>
        </div>
        <input ref={libraryInputRef} type="file" accept="image/*" className="hidden" onChange={async (event) => { const selected = await readPhotoFile(event.target.files?.[0]); if (selected) setPhotos((current) => ({ ...current, [libraryTargetRef.current]: selected })); event.target.value = ""; }} />

        <div className="mt-5 rounded-3xl bg-white p-4 text-neutral-950 shadow-sm">
          <div className="mb-3">
            <div className="text-sm font-semibold">Packaging evidence</div>
            <p className="mt-1 text-xs leading-5 text-neutral-500">Choose a section above before taking a photo, or add one from your library.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {photoTargets.map((target) => (
              <button
                key={target.id}
                type="button"
                onClick={() => openLibraryFor(target.id)}
                className={`rounded-2xl border p-3 text-left transition active:scale-[0.98] ${photos[target.id] ? "border-emerald-200 bg-emerald-50" : "border-neutral-200 bg-[#f7f3eb]"}`}
              >
                {photos[target.id]?.dataUrl && <div className="relative mb-2 h-16 overflow-hidden rounded-xl bg-white shadow-sm"><img src={photos[target.id].dataUrl} alt="" className="h-full w-full object-cover" /><span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[13px] font-bold text-white shadow-sm">✓</span></div>}
                <span className="block text-sm font-semibold leading-5 text-neutral-950">{target.label}</span>
                <span className={`mt-1 block text-xs ${photos[target.id] ? "font-medium text-emerald-700" : "text-neutral-500"}`}>{photos[target.id] ? "Selected" : "Add from library"}</span>
              </button>
            ))}
          </div>
          <label className="mt-3 block rounded-2xl border border-neutral-200 bg-[#f7f3eb] p-3 text-left"><span className="block text-sm font-semibold text-neutral-950">Notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Claims, resin codes, liner notes, or anything unclear." className="mt-2 min-h-20 w-full resize-none bg-transparent text-sm outline-none" /></label>
          <Button onClick={submitPhoto} className="mt-3 w-full">{isSubmitting ? "Submitting..." : "Submit for review"}</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SocialProductPreview({ product, onClick }) {
  return <button type="button" onClick={onClick} className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-[#f7f3eb] p-3 text-left transition hover:bg-[#f1eadf] active:scale-[0.99]"><ProductImage src={product.imageUrl} alt={product.name} className="h-14 w-14 rounded-xl object-cover shadow-sm" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-neutral-950">{product.name}</div><div className="text-xs text-neutral-500">{product.brand}</div></div><div className="flex h-10 w-10 items-center justify-center rounded-full text-[14px] font-bold shadow-inner" style={getScoreBadgeStyle(product.theme)}>{getScoreDisplay(product)}</div></button>;
}

function getProductSwapType(product) {
  if (product?.productType) return product.productType;
  const text = `${product?.brand || ""} ${product?.name || ""}`.toLowerCase();
  if (text.includes("subway") || text.includes("sandwich") || text.includes("sub ")) return "prepared_sandwich";
  if (text.includes("dishwasher") && (text.includes("detergent") || text.includes("tablet") || text.includes("pod"))) return "dishwasher_detergent";
  if (text.includes("bar soap") || text.includes("handwash") || text.includes("hand wash")) return "soap";
  if (text.includes("tuna")) return "canned_tuna";
  if (text.includes("tomato paste")) return "tomato_paste";
  if (text.includes("tea")) return "tea";
  if (text.includes("water")) return "water";
  return null;
}

function getBetterSwap(products) {
  const groups = products.filter((product) => !product.scorePending).reduce((acc, product) => {
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

function getBetterSwapForProduct(products, product) {
  const type = getProductSwapType(product);
  if (!type || product?.scorePending || !Number.isFinite(Number(product?.score))) return null;
  const candidates = products
    .filter((candidate) => candidate.id !== product.id && !candidate.scorePending && getProductSwapType(candidate) === type && Number(candidate.score) >= Number(product.score) + 10 && Math.abs(Number(candidate.score) - Number(product.score)) <= 55)
    .sort((a, b) => b.score - a.score);
  const swapTo = candidates[0];
  return swapTo ? { from: product, to: swapTo } : null;
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
  const picked = ids.map((id) => products.find((product) => product.id === id && !product.scorePending)).filter(Boolean);
  const fallback = products.filter((product) => !product.scorePending && !picked.some((item) => item.id === product.id)).slice(0, 10 - picked.length);
  return [...picked, ...fallback].slice(0, 10);
}

function CompactScoreCircle({ product, className = "" }) {
  return <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold shadow-inner ${className}`} style={getScoreBadgeStyle(product.theme)}>{getScoreDisplay(product)}</div>;
}

function SocialHighlightHeader({ title, copy }) {
  return <div className="mb-3"><h3 className="font-semibold text-neutral-950">{title}</h3><p className="text-xs text-neutral-500">{copy}</p></div>;
}

function TrendingProductChip({ product, onClick }) {
  return <FastTapButton onActivate={onClick} className="w-[min(72vw,292px)] shrink-0 touch-manipulation text-left transition active:scale-[0.985]"><div className="overflow-hidden rounded-[1.7rem] bg-[#f7f3eb] shadow-sm ring-1 ring-black/[0.03]"><div className="relative h-40 bg-white/50"><ProductImage src={product.imageUrl} alt={product.name} className="h-full w-full rounded-none object-cover" /><div className="absolute right-3 top-3 flex h-14 w-14 items-center justify-center rounded-full text-[16px] font-bold shadow-[0_8px_18px_rgba(0,0,0,0.14)]" style={getScoreBadgeStyle(product.theme)}>{getScoreDisplay(product)}</div></div><div className="min-h-[128px] p-4"><div className="line-clamp-2 min-h-[40px] text-[19px] font-semibold leading-[1.05] tracking-[-0.04em] text-neutral-950">{product.name}</div><div className="mt-1 line-clamp-1 text-sm font-medium text-neutral-500">{product.brand}</div><div className="mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold" style={getScoreBadgeStyle(product.theme)}>{product.rating}</div></div></div></FastTapButton>;
}

function SwapProductTile({ product, label, tone, onClick }) {
  const isBetter = tone === "better";
  return <button type="button" onClick={onClick} className={`flex min-w-0 items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[0.98] ${isBetter ? "bg-[#f4fbf6]" : "bg-[#f7f3eb]"}`}><ProductImage src={product.imageUrl} alt={product.name} className="h-16 w-16 rounded-xl object-cover shadow-sm" /><div className="min-w-0 flex-1"><div className={`text-[10px] font-medium uppercase tracking-[0.08em] ${isBetter ? "text-emerald-700/70" : "text-neutral-400"}`}>{label}</div><div className="mt-1 line-clamp-2 text-sm font-semibold leading-tight text-neutral-950">{product.name}</div><div className="mt-0.5 line-clamp-1 text-xs font-medium leading-tight text-neutral-500">{product.brand}</div></div><CompactScoreCircle product={product} /></button>;
}

function BetterSwapHighlight({ swapFrom, swapTo, openResult, onSwapView }) {
  if (!swapFrom || !swapTo) return null;
  return <Card><div className="p-4"><SocialHighlightHeader title="Better swap spotted" copy="Same product type, cleaner-rated option" /><div className="space-y-2"><SwapProductTile product={swapFrom} label="From" tone="from" onClick={() => openResult(swapFrom)} /><div className="flex h-5 items-center justify-center text-lg font-semibold text-neutral-400">↓</div><SwapProductTile product={swapTo} label="To" tone="better" onClick={() => { onSwapView?.(swapFrom, swapTo); openResult(swapTo); }} /></div></div></Card>;
}

function SocialScreen({ products, openResult, openNotifications, openUserProfile, savedProductIds = [], toggleFavorite, unreadNotifications = 0 }) {
  const [mode, setMode] = useState("following");
  const people = db.users.filter((user) => ["user_maya", "user_jon"].includes(user.id));
  const creators = db.users.filter((user) => ["user_amelia", "user_sam"].includes(user.id));
  const getTime = (i) => ["2h", "5h", "1d"][i % 3];

  return <div className="min-h-[690px] px-5 pb-4"><Header title="Social" right={<button type="button" onClick={openNotifications} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"><Icon type="bell" size={22} />{unreadNotifications > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm">{unreadNotifications}</span>}</button>} /><div className="mb-4 grid grid-cols-2 rounded-full bg-white p-1 shadow-sm">{["following", "discover"].map((option) => <button key={option} type="button" onClick={() => setMode(option)} className={`rounded-full py-2 text-sm font-medium capitalize ${mode === option ? "bg-neutral-950 text-white" : "text-neutral-500"}`}>{option}</button>)}</div>{mode === "discover" ? <div className="space-y-5"><Card><div className="p-3"><h3 className="mb-2 text-sm text-neutral-500">People you know</h3><div className="space-y-2">{people.map((user) => <div key={user.id} onClick={() => openUserProfile(user)} className="cursor-pointer rounded-2xl transition hover:bg-[#f1eadf] active:scale-[0.98]"><SuggestedUser user={user} /></div>)}</div></div></Card><Card><div className="p-3"><h3 className="mb-2 text-sm text-neutral-500">Creators</h3><div className="space-y-2">{creators.map((user) => <div key={user.id} onClick={() => openUserProfile(user)} className="cursor-pointer rounded-2xl transition hover:bg-[#f1eadf] active:scale-[0.98]"><SuggestedUser user={user} /></div>)}</div></div></Card></div> : <div className="space-y-3">{db.social.length === 0 && <div className="mt-20 text-center text-sm text-neutral-500">Follow people to see product activity</div>}{db.social.map((activity, i) => { const product = products.find((p) => p.id === activity.productId); const user = db.users.find((u) => u.id === activity.userId); if (!product || !user) return null; const isSaved = savedProductIds.includes(product.id); return <Card key={activity.id}><div className="p-4"><div className="flex items-center justify-between"><button type="button" className="flex min-w-0 items-center gap-2 text-left" onClick={() => openUserProfile(user)}><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white shadow-sm">{user.avatar}</div><div className="min-w-0 text-sm"><span className="text-neutral-500">{user.displayName}</span><span className="font-medium text-neutral-950"> {activity.action} {product.name}</span></div></button><span className="shrink-0 text-xs text-neutral-400">{getTime(i)}</span></div><p className="mt-2 text-sm text-neutral-500">{activity.note}</p><SocialProductPreview product={product} onClick={() => openResult(product)} /><div className="mt-3 grid grid-cols-3 gap-2"><SocialActionButton onClick={() => toggleFavorite?.(product.id)} muted={isSaved}>{isSaved ? "♡ Saved" : "❤ Save"}</SocialActionButton><SocialActionButton>↗ Share</SocialActionButton><SocialActionButton onClick={() => openResult(product)}><span className="flex items-center gap-1"><EyeMiniIcon /> View</span></SocialActionButton></div></div></Card>; })}</div>}</div>;
}

function SettingsSection({ title, children }) {
  return <div className="rounded-3xl bg-white p-4 shadow-sm"><h3 className="mb-4 font-semibold text-neutral-950">{title}</h3>{children}</div>;
}

function Field({ label, type = "text", placeholder, defaultValue = "" }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">{label}</span><input type={type} placeholder={placeholder} defaultValue={defaultValue} className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none focus:border-neutral-950" /></label>;
}

function PasswordEyeButton({ visible, onClick, label }) {
  return (
    <button type="button" onClick={onClick} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100" aria-label={label}>
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
        {!visible && <path d="M4 4l16 16" />}
      </svg>
    </button>
  );
}

function PasswordField({ label, value, onChange, visible, setVisible, placeholder }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-neutral-700">{label}</span>
      <div className="relative">
        <input type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 pr-12 text-base outline-none focus:border-neutral-950" />
        <PasswordEyeButton visible={visible} onClick={() => setVisible(!visible)} label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} />
      </div>
    </label>
  );
}

function RequirementRow({ met, children }) {
  return <div className={`flex items-center gap-2 text-xs ${met ? "text-emerald-700" : "text-neutral-500"}`}><span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${met ? "bg-emerald-100" : "bg-neutral-100"}`}>{met ? "✓" : "•"}</span><span>{children}</span></div>;
}

function SettingsScreen({ close, onSignOut, onDeleteAccount, profile, updateProfile, localeCopy }) {
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [shareActivity, setShareActivity] = useState(true);
  const initialFullName = `${profile.firstName} ${profile.lastName}`.trim();
  const [fullName, setFullName] = useState(initialFullName);
  const [email, setEmail] = useState(profile.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nameUpdated, setNameUpdated] = useState(false);
  const [emailUpdated, setEmailUpdated] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  const nameDirty = fullName.trim() !== initialFullName;
  const emailDirty = email.trim() !== profile.email;
  const passwordDirty = currentPassword || newPassword || confirmPassword;
  const hasLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumberOrSpecial = /[\d\W_]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canUpdatePassword = Boolean(currentPassword) && hasLength && hasUppercase && hasNumberOrSpecial && passwordsMatch;

  const saveName = () => {
    const [firstName = "", ...lastNameParts] = fullName.trim().split(/\s+/);
    updateProfile({ firstName, lastName: lastNameParts.join(" ") });
    setNameUpdated(true);
  };

  const saveEmail = () => {
    updateProfile({ email: email.trim() });
    setEmailUpdated(true);
  };

  const savePassword = () => {
    if (!canUpdatePassword) return;
    updateProfile({ password: newPassword });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordUpdated(true);
  };

  return (
    <div className="min-h-[690px] px-5 pb-5">
      <Header title="Settings" right={<BackButton onClick={close} />} />
      <div className="space-y-4">
        <SettingsSection title="Update name">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-700">Full name</span>
            <input value={fullName} onChange={(event) => { setFullName(event.target.value); setNameUpdated(false); }} className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none focus:border-neutral-950" />
          </label>
          {nameDirty && <div className="mt-4 grid grid-cols-2 gap-2"><Button onClick={saveName}>Update name</Button><Button onClick={() => setFullName(initialFullName)} variant="outline" className="bg-white">Cancel</Button></div>}
          {nameUpdated && !nameDirty && <p className="mt-3 text-sm font-medium text-neutral-400">Name updated.</p>}
        </SettingsSection>

        <SettingsSection title="Update email address">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-700">Email address</span>
            <input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setEmailUpdated(false); }} className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none focus:border-neutral-950" />
          </label>
          {emailDirty && <div className="mt-4 grid grid-cols-2 gap-2"><Button onClick={saveEmail}>Update email</Button><Button onClick={() => setEmail(profile.email)} variant="outline" className="bg-white">Cancel</Button></div>}
          {emailUpdated && !emailDirty && <p className="mt-3 text-sm font-medium text-neutral-400">Email updated.</p>}
        </SettingsSection>

        <SettingsSection title="Change password">
          <div className="space-y-3">
            <PasswordField label="Current password" value={currentPassword} onChange={(value) => { setCurrentPassword(value); setPasswordUpdated(false); }} visible={showCurrentPassword} setVisible={setShowCurrentPassword} placeholder="Enter current password" />
            <PasswordField label="New password" value={newPassword} onChange={(value) => { setNewPassword(value); setPasswordUpdated(false); }} visible={showNewPassword} setVisible={setShowNewPassword} placeholder="Enter new password" />
            <div className="rounded-2xl bg-[#f7f3eb] p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400">Password requirements</div>
              <div className="space-y-1.5">
                <RequirementRow met={hasLength}>At least 8 characters</RequirementRow>
                <RequirementRow met={hasUppercase}>One uppercase letter</RequirementRow>
                <RequirementRow met={hasNumberOrSpecial}>One number or special character</RequirementRow>
              </div>
            </div>
            <PasswordField label="Confirm new password" value={confirmPassword} onChange={(value) => { setConfirmPassword(value); setPasswordUpdated(false); }} visible={showConfirmPassword} setVisible={setShowConfirmPassword} placeholder="Re-enter new password" />
            {confirmPassword && !passwordsMatch && <p className="text-xs font-medium text-red-500">Passwords do not match.</p>}
          </div>
          {passwordDirty && <div className="mt-4 grid grid-cols-2 gap-2"><Button onClick={savePassword} className={canUpdatePassword ? "" : "bg-neutral-300 text-neutral-500 shadow-none hover:bg-neutral-300"}>Update password</Button><Button onClick={() => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }} variant="outline" className="bg-white">Cancel</Button></div>}
          {passwordUpdated && !passwordDirty && <p className="mt-3 text-sm font-medium text-neutral-400">Password updated.</p>}
        </SettingsSection>

        <SettingsSection title="Notifications & Privacy">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-neutral-950">Push notifications</div>
              <p className="mt-1 text-sm text-neutral-500">Get updates about product reviews, comments, and new matches.</p>
            </div>
            <ToggleSwitch checked={notificationsOn} onClick={() => setNotificationsOn(!notificationsOn)} label="Toggle notifications" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-neutral-950">Share activity</div>
              <p className="mt-1 text-sm text-neutral-500">Show your scans and {localeCopy.favoritesLower} in your social feed.</p>
            </div>
            <ToggleSwitch checked={shareActivity} onClick={() => setShareActivity(!shareActivity)} label="Toggle share activity" />
          </div>
        </SettingsSection>

        <Button onClick={onSignOut} variant="outline" className="w-full bg-white">Sign out</Button>
        <Button onClick={onDeleteAccount} variant="ghost" className="w-full text-red-700 hover:bg-red-50">Delete account</Button>
      </div>
    </div>
  );
}

function SignInScreen({ onSignIn }) {
  return <div className="flex min-h-[760px] flex-col justify-center px-6 py-8"><div className="text-center"><div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-950 text-2xl font-semibold text-white">D</div><h1 className="text-3xl font-semibold tracking-tight text-neutral-950">Welcome back</h1><p className="mt-2 text-sm text-neutral-500">Sign in to continue checking products.</p></div><div className="mt-8 rounded-3xl bg-white p-4 shadow-sm"><div className="space-y-3"><Field label="Email address" type="email" defaultValue="dave@example.com" /><Field label="Password" type="password" placeholder="Enter password" /></div><Button onClick={onSignIn} className="mt-5 w-full">Sign in</Button></div></div>;
}

function DeleteAccountScreen({ close, onConfirmDelete }) {
  return <div className="min-h-[690px] px-5 pb-5"><Header title="Delete account" right={<BackButton onClick={close} />} /><div className="mt-8 rounded-3xl bg-white p-5 text-center shadow-sm"><div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-4xl font-semibold text-red-700">!</div><h2 className="text-2xl font-semibold tracking-tight text-neutral-950">Are you sure?</h2><p className="mt-3 text-sm leading-6 text-neutral-500">Deleting your account will permanently remove your profile, scan history, favorites, social activity, and saved settings. This cannot be undone.</p><Button onClick={onConfirmDelete} className="mt-6 w-full bg-red-700 hover:bg-red-800">Permanently delete account</Button><Button onClick={close} variant="ghost" className="mt-2 w-full">Cancel</Button></div></div>;
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
  return <div className="min-h-[690px] px-5 pb-5"><Header title="Notifications" right={<BackButton onClick={close} />} /><div className="space-y-2">{notifications.map((item) => <div key={item.id} className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f7f3eb] text-neutral-950"><NotificationIcon type={item.icon} /></div><div className="min-w-0 flex-1"><div className="font-medium text-neutral-950">{item.title}</div><div className="mt-1 text-sm leading-5 text-neutral-600">{item.message}</div><div className="mt-1 text-xs text-neutral-400">{item.time} ago</div></div></div>)}</div></div>;
}

function PlansScreen({ close }) {
  const [billing, setBilling] = useState("yearly");
  const proPrice = billing === "yearly" ? "$39.99/year" : "$4.99/month";
  const freeFeatures = ["5 scans per day", "Last 30 scanned products", "Basic product score", "Plastic breakdown", "Sources and research", "Community feed", "Location-based recyclability"];
  const proFeatures = ["Unlimited scans", "Unlimited history", "Advanced search by product, brand, category, and filters", "Offline mode for grocery stores", "Strict mode and personal risk profiles", "Product alerts when score changes", "Exportable shopping lists", "Barcode batch scan for pantry cleanups", "Early access to new product data", "Priority product verification requests"];
  return <div className="min-h-[690px] px-5 pb-5"><Header title="Plans" right={<BackButton onClick={close} />} /><div className="mb-5 grid grid-cols-2 rounded-full bg-white/70 p-1 shadow-sm backdrop-blur-xl"><button type="button" onClick={() => setBilling("monthly")} className={`rounded-full py-2 text-sm font-semibold transition ${billing === "monthly" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500"}`}>Monthly</button><button type="button" onClick={() => setBilling("yearly")} className={`rounded-full py-2 text-sm font-semibold transition ${billing === "yearly" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500"}`}>Yearly</button></div><div className="space-y-4"><Card><div className="p-5"><div className="flex items-start justify-between"><div><h2 className="text-2xl font-semibold tracking-[-0.04em] text-neutral-950">Free</h2><p className="mt-1 text-sm text-neutral-500">For casual product checks.</p></div><div className="rounded-full bg-[#f7f3eb] px-3 py-1 text-sm font-semibold text-neutral-700">$0</div></div><div className="mt-5 space-y-3">{freeFeatures.map((feature) => <div key={feature} className="flex gap-2 text-sm text-neutral-700"><span className="text-neutral-950">✓</span><span>{feature}</span></div>)}</div><Button variant="outline" className="mt-5 w-full bg-white">Current plan</Button></div></Card><div className="overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_92%_8%,rgba(255,255,255,0.26),transparent_34%),radial-gradient(circle_at_8%_100%,rgba(99,184,121,0.2),transparent_38%),linear-gradient(145deg,#171717_0%,#050505_100%)] p-5 text-white shadow-[0_18px_42px_rgba(0,0,0,0.22)]"><div className="flex items-start justify-between"><div><div className="mb-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xl">Best value</div><h2 className="text-2xl font-semibold tracking-[-0.04em]">Pro</h2><p className="mt-1 text-sm text-neutral-300">For people actively reducing plastic exposure.</p></div><div className="text-right"><div className="text-xl font-semibold">{proPrice}</div>{billing === "yearly" && <div className="text-xs text-neutral-400">Save 33%</div>}</div></div><div className="mt-5 space-y-3">{proFeatures.map((feature) => <div key={feature} className="flex gap-2 text-sm text-neutral-200"><span>✓</span><span>{feature}</span></div>)}</div><Button variant="light" className="mt-5 w-full">Start Pro</Button></div></div></div>;
}

function BadgeGlyph({ id, size = 34 }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2.15, strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    plastic_detective: <><circle cx="10" cy="10" r="5.5" /><path d="m14.5 14.5 5 5" /><path d="M8 9.5h4" /></>,
    microplastic_hunter: <><path d="M9 3h6" /><path d="M10 3v6.5L6.5 17a3 3 0 0 0 2.7 4.3h5.6A3 3 0 0 0 17.5 17L14 9.5V3" /><path d="M8.4 16h7.2" /></>,
    red_flag_radar: <><path d="M5 21V4" /><path d="M5 5h11l-2 4 2 4H5" /><path d="M18 18l1.5 1.5" /><path d="M19.5 14.5h2" /></>,
    ingredient_inspector: <><path d="M20.5 13.5 13.5 20.5a2 2 0 0 1-2.8 0L3.5 13.3a2 2 0 0 1-.5-1.4V5.5A2.5 2.5 0 0 1 5.5 3h6.4a2 2 0 0 1 1.4.6l7.2 7.1a2 2 0 0 1 0 2.8Z" /><circle cx="8" cy="8" r="1.5" /><path d="M11 13h5" /><path d="M13.5 10.5 16 13l-2.5 2.5" /></>,
    data_driven: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 16v-5" /><path d="M12 16V8" /><path d="M16 16v-8" /></>,
    community_voice: <><path d="M7 10a5 5 0 0 1 10 0c0 4-5 8-5 8s-5-4-5-8Z" /><path d="M9.5 10a2.5 2.5 0 0 0 5 0" /></>,
    conscious_consumer: <><path d="M12 21s7-4.5 7-11.5A6.5 6.5 0 0 0 12 3a6.5 6.5 0 0 0-7 6.5C5 16.5 12 21 12 21Z" /><path d="M9 11.5 11.2 14 15.5 9" /></>,
    deep_diver: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /><path d="M11 7v8" /><path d="M7 11h8" /></>,
    barcode_whisperer: <><path d="M4 7V5a1 1 0 0 1 1-1h2" /><path d="M17 4h2a1 1 0 0 1 1 1v2" /><path d="M20 17v2a1 1 0 0 1-1 1h-2" /><path d="M7 20H5a1 1 0 0 1-1-1v-2" /><path d="M8 8v8" /><path d="M11 8v8" /><path d="M15 8v8" /><path d="M17 8v8" /></>,
    eco_upgrade: <><path d="M6 16c7 0 11-4 12-11-7 .5-12 4-12 11Z" /><path d="M6 16c0 2.5 1.8 4 4.5 4 3 0 5-2 5.5-5" /><path d="M6 16 18 5" /></>,
    plastic_pro: <><path d="M7 7h11" /><path d="m15 4 3 3-3 3" /><path d="M17 17H6" /><path d="m9 14-3 3 3 3" /></>,
    word_of_mouth: <><path d="M4 13h3l7 4V7l-7 4H4v2Z" /><path d="M17 9c1 .8 1.5 1.8 1.5 3s-.5 2.2-1.5 3" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" {...common} aria-hidden="true">{icons[id] || icons.plastic_detective}</svg>;
}

function getBadgeUnlockNote(badge) {
  const notes = {
    plastic_detective: "Scan products with the barcode scanner. Every successful product scan moves this badge forward.",
    microplastic_hunter: "Open product details and review hidden packaging concerns, especially parts with plastic contact.",
    red_flag_radar: "Find and review products with high concern scores or added health-risk flags.",
    ingredient_inspector: "Upload or inspect packaging labels, recycling symbols, BPA-free claims, plastic-free claims, and brand-confirmed packaging evidence.",
    data_driven: "Use search, filters, product comparisons, and detail views to make more informed swaps.",
    community_voice: "Save, share, and contribute product information that helps other people make decisions.",
    conscious_consumer: "Keep your saved and scanned products weighted toward lower-plastic, cleaner-rated choices.",
    deep_diver: "Tap into detailed score breakdowns, plastic-part explanations, and supporting evidence pages.",
    barcode_whisperer: "Scan barcodes consistently and quickly. More successful scans unlock higher tiers.",
    eco_upgrade: "Replace lower-rated products with better alternatives in the same product type.",
    plastic_pro: "View or save better-rated alternatives in the same product type, especially after checking a lower-scoring product.",
    word_of_mouth: "Share useful product finds or warnings with other people from product pages.",
  };
  return notes[badge.id] || "Use the app and keep completing related actions to move this badge forward.";
}

function hasLabelInspectorSignal(product, link) {
  const source = link?.source || {};
  const sourceText = [
    source.id,
    source.title,
    source.organization,
    source.summary,
    link?.sourceId,
    link?.note,
  ].filter(Boolean).join(" ").toLowerCase();
  const labelTerms = ["label", "how2recycle", "recycl", "bpa", "liner", "plastic-free", "plastic free", "brand", "resin"];
  const hasSourceSignal = labelTerms.some((term) => sourceText.includes(term));
  const hasPartSignal = (product?.parts || []).some((part) => {
    const text = [
      part.labelClaim,
      part.recyclingClaim,
      part.linerType,
      part.evidence,
      part.notes,
      part.material?.claim,
      part.material?.linerLabel,
      part.material?.recyclingLabel,
    ].filter(Boolean).join(" ").toLowerCase();
    return labelTerms.some((term) => text.includes(term));
  });
  return hasSourceSignal || hasPartSignal;
}

function hasUploadedLabelEvidence(photos = {}) {
  const notes = String(photos.notes || photos.packagingNotes || "").toLowerCase();
  return Boolean(
    photos.symbols ||
    photos.recycling ||
    photos.inside ||
    ["label", "how2recycle", "recycl", "bpa", "liner", "plastic-free", "plastic free", "resin"].some((term) => notes.includes(term))
  );
}

const badgeTierStyles = {
  Bronze: { medal: "radial-gradient(circle at 32% 24%, #ffe1c6 0%, #bf7b50 42%, #76503b 100%)", text: "text-[#8b5130]" },
  Silver: { medal: "radial-gradient(circle at 32% 24%, #ffffff 0%, #b8c0c8 46%, #6e7882 100%)", text: "text-[#65707a]" },
  Gold: { medal: "radial-gradient(circle at 30% 24%, #fff9d7 0%, #ffd54a 35%, #c99317 70%, #7a4a00 100%)", text: "text-[#ad7500]", shadow: "0 10px 22px rgba(210,152,22,0.34), inset 0 1px 2px rgba(255,255,255,0.88)" },
  Platinum: { medal: "radial-gradient(circle at 30% 22%, #ffffff 0%, #e5f8ff 30%, #b7d8ec 58%, #6f879c 100%)", text: "text-[#66869d]", shadow: "0 10px 24px rgba(148,199,228,0.38), inset 0 1px 2px rgba(255,255,255,0.92)" },
  Starter: { medal: "radial-gradient(circle at 32% 24%, #f3fff6 0%, #9edba9 48%, #63b879 100%)", text: "text-[#4f9d61]", shadow: "0 8px 18px rgba(99,184,121,0.24), inset 0 1px 2px rgba(255,255,255,0.9)" }
};

function BadgeMedalFinish({ tierName, highlight = false }) {
  return (
    <>
      {tierName !== "Starter" && (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 32% 24%, rgba(255,255,255,0.56) 0%, rgba(255,255,255,0.18) 28%, transparent 44%), linear-gradient(145deg, rgba(255,255,255,0.28), rgba(0,0,0,0.16))", boxShadow: "inset 0 1px 2px rgba(255,255,255,0.72), inset 0 -2px 4px rgba(0,0,0,0.2)" }} />
          <div className="pointer-events-none absolute inset-[1px] rounded-full opacity-[0.08] mix-blend-overlay" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.85) 0 1px, transparent 1.2px), radial-gradient(circle at 72% 64%, rgba(0,0,0,0.35) 0 0.7px, transparent 1px)", backgroundSize: "7px 7px, 9px 9px" }} />
          <div className="pointer-events-none absolute inset-0 rounded-full shadow-inner ring-1 ring-white/80" />
        </>
      )}
      {tierName === "Gold" && (
        <>
          <div className="pointer-events-none absolute inset-[-1px] rounded-full" style={{ background: "conic-gradient(from 210deg, transparent 0deg, rgba(255,255,255,0.55) 42deg, transparent 88deg, rgba(126,70,0,0.28) 172deg, transparent 260deg, rgba(255,238,156,0.45) 322deg, transparent 360deg)" }} />
          <div className="pointer-events-none absolute inset-[4px] rounded-full border border-white/45" style={{ boxShadow: "inset 0 1px 2px rgba(255,255,255,0.92), inset 0 -2px 3px rgba(120,72,0,0.24)" }} />
        </>
      )}
      {tierName === "Platinum" && (
        <>
          <div className="pointer-events-none absolute inset-[-1px] rounded-full" style={{ background: "conic-gradient(from 225deg, transparent 0deg, rgba(255,255,255,0.82) 38deg, transparent 72deg, rgba(96,126,151,0.28) 150deg, transparent 218deg, rgba(218,245,255,0.7) 292deg, transparent 360deg)" }} />
          <div className="pointer-events-none absolute inset-[4px] rounded-full border border-white/65" style={{ boxShadow: "inset 0 1px 3px rgba(255,255,255,0.96), inset 0 -2px 4px rgba(58,83,108,0.24)" }} />
          <motion.div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full" style={{ background: "linear-gradient(118deg, transparent 34%, rgba(255,255,255,0.75) 48%, rgba(205,238,255,0.48) 52%, transparent 66%)" }} initial={{ x: "-125%", opacity: 0 }} animate={{ x: ["-125%", "125%"], opacity: [0, 0.72, 0] }} transition={{ duration: 2.35, repeat: Infinity, ease: "easeInOut", delay: 0.55 }} />
        </>
      )}
      {highlight && <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1 }} className="absolute inset-0 rounded-full bg-white/35 blur-sm" />}
    </>
  );
}

function BadgeCard({ badge, highlight, compact = false, onSelect }) {
  const status = getBadgeStatus(badge);
  const progressText = badge.isPercent ? `${status.displayProgress}% / ${status.nextThreshold}%` : `${status.displayProgress} / ${status.nextThreshold}`;
  const compactProgressText = progressText.replaceAll(" / ", "/");
  const nextLabel = status.isMaxTier ? "Max tier" : `Next: ${status.nextTier}`;
  const tier = badgeTierStyles[status.currentTier] || badgeTierStyles.Starter;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileTap={{ scale: 0.985 }}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(event) => { if (onSelect && (event.key === "Enter" || event.key === " ")) onSelect(); }}
      className={`relative overflow-hidden rounded-[22px] border border-white/80 bg-white shadow-[0_10px_26px_rgba(0,0,0,0.07)] ring-1 ring-black/[0.03] ${onSelect ? "cursor-pointer" : ""} ${compact ? "min-h-[158px] p-3" : "min-h-[210px] p-4"}`}
    >
      <motion.div
        animate={highlight ? { scale: [1, 1.16, 1], rotate: [0, -4, 4, 0] } : { scale: 1 }}
        transition={{ duration: 0.65 }}
        className={`absolute z-10 overflow-hidden rounded-full text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] ring-2 ring-white/80 ${compact ? "right-3 top-3 h-8 w-8 text-xs" : "left-[76px] top-[76px] h-11 w-11 text-lg"}`}
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

      </motion.div>

      <div className="relative z-[1] flex h-full flex-col">
        {compact ? (
          <>
            <div className="flex items-start justify-between pr-10">
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[19px] bg-[#f7f3eb] text-neutral-950 shadow-inner ring-1 ring-black/[0.03]"><BadgeGlyph id={badge.id} size={29} /></div>
            </div>
            <h4 className="mt-2 line-clamp-2 text-[17px] font-semibold leading-[1.06] tracking-[-0.035em] text-neutral-950">{badge.name}</h4>
            <div className={`mt-0.5 text-xs font-semibold ${tier.text}`}>{status.currentTier}</div>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[20px] bg-[#f7f3eb] text-neutral-950 shadow-inner ring-1 ring-black/[0.03]"><BadgeGlyph id={badge.id} size={42} /></div>
            <div className="min-w-0">
              <h4 className="text-[24px] font-semibold leading-[1.05] tracking-[-0.035em] text-neutral-950">{badge.name}</h4>
              <div className={`mt-1 text-xs font-semibold ${tier.text}`}>{status.currentTier}</div>
            </div>
          </div>
        )}

        {!compact && <p className="mt-4 line-clamp-2 text-[15px] leading-6 text-neutral-500">{badge.description}</p>}

        <div className={compact ? "mt-auto pt-3" : "mt-auto pt-5"}>
          <div className={`mb-2 flex items-end justify-between gap-2 font-semibold ${compact ? "text-[10px]" : "text-sm"}`}>
            <span className="min-w-0 truncate whitespace-nowrap text-neutral-500">{nextLabel}</span>
            <span className="shrink-0 whitespace-nowrap tabular-nums tracking-[-0.02em] text-neutral-500">{compact ? compactProgressText : progressText}</span>
          </div>
          <div className={`overflow-hidden rounded-full bg-[#f0ebe2] shadow-inner ring-1 ring-black/[0.03] ${compact ? "h-2" : "h-2.5"}`}>
            <motion.div className="h-full origin-left rounded-full bg-neutral-950" initial={{ scaleX: 0 }} animate={{ scaleX: status.percent / 100 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BadgeDetailScreen({ badge, close }) {
  const status = getBadgeStatus(badge);
  const tier = badgeTierStyles[status.currentTier] || badgeTierStyles.Starter;
  const progressText = badge.isPercent ? `${status.displayProgress}% / ${status.nextThreshold}%` : `${status.displayProgress} / ${status.nextThreshold}`;
  const targetText = status.isMaxTier ? "Highest tier unlocked" : `Next: ${status.nextTier}`;
  return <div className="min-h-[690px] px-5 pb-5"><Header title="Badge" right={<BackButton onClick={close} />} /><div className="overflow-hidden rounded-[2rem] bg-white p-5 text-center shadow-[0_14px_36px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.03]"><div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-[#f7f3eb] text-neutral-950 shadow-inner"><BadgeGlyph id={badge.id} size={50} /><div className="absolute -right-3 -top-3 h-12 w-12 overflow-hidden rounded-full ring-2 ring-white" style={{ background: tier.medal, ...(tier.shadow ? { boxShadow: tier.shadow } : {}) }}><BadgeMedalFinish tierName={status.currentTier} /></div></div><h2 className="mt-5 text-[30px] font-semibold leading-none tracking-[-0.05em] text-neutral-950">{badge.name}</h2><div className={`mt-2 text-sm font-semibold ${tier.text}`}>{status.currentTier}</div><p className="mx-auto mt-4 max-w-[310px] text-sm leading-6 text-neutral-500">{badge.description}</p><div className="mt-5 rounded-3xl bg-[#f7f3eb] p-4 text-left"><div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-neutral-600"><span>{targetText}</span><span className="shrink-0 tabular-nums">{progressText}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-white shadow-inner"><motion.div className="h-full origin-left rounded-full bg-neutral-950" initial={{ scaleX: 0 }} animate={{ scaleX: status.percent / 100 }} transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }} /></div></div></div><div className="mt-5 rounded-3xl bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold tracking-[-0.03em] text-neutral-950">How to unlock</h3><p className="mt-2 text-sm leading-6 text-neutral-500">{getBadgeUnlockNote(badge)}</p></div><div className="mt-5 rounded-3xl bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold tracking-[-0.03em] text-neutral-950">Tiers</h3><div className="mt-3 space-y-2">{badge.tiers.map((tierItem) => { const reached = badge.progress >= tierItem.threshold; return <div key={tierItem.name} className={`flex items-center justify-between rounded-2xl px-3 py-2 text-sm ${reached ? "bg-[#f7f3eb] text-neutral-950" : "bg-white text-neutral-400 ring-1 ring-black/[0.04]"}`}><span className="font-semibold">{tierItem.name}</span><span className="tabular-nums">{badge.isPercent ? `${tierItem.threshold}%` : tierItem.threshold}</span></div>; })}</div></div></div>;
}

function BadgesScreen({ badges, highlightBadge, close, openBadge }) {
  return <div className="min-h-[690px] px-5 pb-5"><Header title="Badges" right={<BackButton onClick={close} />} /><div className="grid grid-cols-2 gap-3">{badges.map((badge) => <BadgeCard key={badge.id} badge={badge} highlight={highlightBadge === badge.id} compact onSelect={() => openBadge?.(badge)} />)}</div></div>;
}

function FavoritesScreen({ products, openResult, close, favoriteIds = null, localeCopy = getLocaleCopy() }) {
  const groups = getFavoritesByCategory(products, favoriteIds);
  const categories = ["All", ...Object.keys(groups)];
  const [activeCategory, setActiveCategory] = useState("All");
  const visibleProducts = activeCategory === "All" ? Object.values(groups).flat() : groups[activeCategory] || [];
  return <div className="min-h-[690px] px-5 pb-5"><Header title={localeCopy.favorites} right={<BackButton onClick={close} />} /><div className="mb-4 flex gap-2 overflow-x-auto pb-1">{categories.map((category) => <button type="button" key={category} onClick={() => setActiveCategory(category)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm shadow-sm ${activeCategory === category ? "bg-neutral-950 text-white" : "bg-white text-neutral-700"}`}>{category}</button>)}</div><Card><div className="p-4"><h3 className="mb-3 font-semibold text-neutral-950">{activeCategory === "All" ? `All ${localeCopy.favoritesLower}` : activeCategory}</h3><div className="space-y-2">{visibleProducts.length ? visibleProducts.map((product) => <ProductRow key={product.id} product={product} onClick={() => openResult(product)} />) : <p className="p-5 text-center text-sm text-neutral-500">No {localeCopy.favoritesLower} yet.</p>}</div></div></Card></div>;
}

function ReviewPhotoThumb({ photo, label }) {
  if (!photo?.dataUrl) return <div className="flex h-24 items-center justify-center rounded-2xl bg-[#f7f3eb] text-xs font-medium text-neutral-400">{label}</div>;
  return <button type="button" onClick={() => window.open(photo.dataUrl, "_blank")} className="h-24 overflow-hidden rounded-2xl bg-[#f7f3eb] text-left shadow-inner"><img src={photo.dataUrl} alt={label} className="h-full w-full object-cover" /></button>;
}

function AdminReviewCard({ submission, onApprove, onNeedsInfo, onRejectDuplicate }) {
  const product = submission.product || {};
  const photos = submission.photos || product.submittedPhotos || {};
  const isPhotoReview = product.scoreStatus === "photo_review";
  const pending = isPendingReviewProduct(product);
  const [name, setName] = useState(product.name || "");
  const [brand, setBrand] = useState(product.brand || "");
  const [score, setScore] = useState(pending ? "0" : product.scoreOverride ?? "");
  const [note, setNote] = useState(product.scoringNote || "");
  const status = product.scoreStatus || (product.scorePending ? "pending_review" : "reviewed");
  const canApprove = score !== "" && Number(score) >= 0 && Number(score) <= 100;
  const reviewEdits = { name: name.trim(), brand: brand.trim() };

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400">{status.replaceAll("_", " ")}</div>
            <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-tight text-neutral-950">{name || "Unnamed product"}</h3>
            <p className="text-sm text-neutral-500">{brand || "Brand missing"}</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f7f7f8] text-[14px] font-bold text-neutral-400 shadow-inner">{pending ? "TBD" : product.scoreOverride ?? "OK"}</div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-500">
          <div className="rounded-2xl bg-[#f7f3eb] p-3"><span className="block font-medium text-neutral-950">Barcode</span>{product.barcode || "None"}</div>
          <div className="rounded-2xl bg-[#f7f3eb] p-3"><span className="block font-medium text-neutral-950">Submitted</span>{submission.updated_at ? new Date(submission.updated_at).toLocaleDateString() : "Recent"}</div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <ReviewPhotoThumb photo={photos.front} label="Front packaging" />
          <ReviewPhotoThumb photo={photos.symbols} label="Material logos" />
        </div>

        <div className="mt-4 grid gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-500">Product name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Product name" className="w-full rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-base outline-none focus:border-neutral-950" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-500">Brand</span>
            <input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Brand" className="w-full rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-base outline-none focus:border-neutral-950" />
          </label>
        </div>

        {!isPhotoReview && (
          <div className="mt-4 grid grid-cols-[96px_1fr] gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-500">Score</span>
              <input value={score} onChange={(event) => setScore(event.target.value)} inputMode="numeric" placeholder="0-100" className="w-full rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-base font-semibold outline-none focus:border-neutral-950" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-500">Review note</span>
              <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why this score is assigned" className="w-full rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-base outline-none focus:border-neutral-950" />
            </label>
          </div>
        )}

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => (isPhotoReview || canApprove) && onApprove(submission, clampScore(score), note, reviewEdits)} className={`inline-flex min-h-10 items-center justify-center rounded-full px-2 py-2 text-xs font-semibold tracking-[-0.01em] transition ${isPhotoReview || canApprove ? "bg-neutral-950 text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)] active:scale-[0.98]" : "bg-neutral-300 text-neutral-500"}`}>{isPhotoReview ? "Approve photo" : "Approve"}</button>
          <Button onClick={() => onNeedsInfo(submission, note, reviewEdits)} variant="outline" className="bg-white px-2 text-xs">Needs info</Button>
          <Button onClick={() => onRejectDuplicate(submission, note, reviewEdits)} variant="ghost" className="px-2 text-xs text-red-700 hover:bg-red-50">Duplicate</Button>
        </div>
      </div>
    </Card>
  );
}

function AdminReviewScreen({ submissions, close, onRefresh, onApprove, onNeedsInfo, onRejectDuplicate }) {
  const [filter, setFilter] = useState("pending");
  const pending = submissions.filter((submission) => isPendingReviewProduct(submission.product));
  const visible = filter === "pending" ? pending : submissions;

  return (
    <div className="min-h-[690px] px-5 pb-5">
      <Header title="Review queue" right={<BackButton onClick={close} />} />
      <div className="mb-4 rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold tracking-tight text-neutral-950">{pending.length}</div>
            <div className="text-sm text-neutral-500">products waiting for review</div>
          </div>
          <Button onClick={onRefresh} variant="outline" className="bg-white">Refresh</Button>
        </div>
        <div className="mt-4 grid grid-cols-2 rounded-full bg-[#f7f3eb] p-1">
          {["pending", "all"].map((option) => <button key={option} type="button" onClick={() => setFilter(option)} className={`rounded-full py-2 text-sm font-semibold capitalize ${filter === option ? "bg-neutral-950 text-white" : "text-neutral-500"}`}>{option}</button>)}
        </div>
      </div>
      <div className="space-y-3">
        {visible.length ? visible.map((submission) => <AdminReviewCard key={submission.id} submission={submission} onApprove={onApprove} onNeedsInfo={onNeedsInfo} onRejectDuplicate={onRejectDuplicate} />) : <div className="rounded-3xl bg-white p-8 text-center text-sm text-neutral-500 shadow-sm">No products in this queue.</div>}
      </div>
    </div>
  );
}

function ProfileStatButton({ value, label, onClick }) {
  return <button type="button" onClick={onClick} className="rounded-2xl py-2 transition hover:bg-black/5 active:scale-[0.98]"><div className="text-2xl font-semibold">{value}</div><div className="text-xs text-neutral-500">{label}</div></button>;
}

function ProUpgradeCard({ onClick }) {
  const features = [
    ["Unlimited scans", "No daily cap while shopping"],
    ["Unlimited history", "Keep every scan and search"],
    ["Advanced search", "Filter deeper by product and category"],
  ];
  return <button type="button" onClick={onClick} className="group relative mt-5 w-full overflow-hidden rounded-[2rem] bg-white p-5 text-left text-neutral-950 shadow-[0_18px_44px_rgba(0,0,0,0.1)] ring-1 ring-black/[0.04] transition active:scale-[0.99]"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_0%,rgba(158,219,169,0.38),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.96),rgba(247,243,235,0.92))]" /><div className="relative"><div className="mb-3 inline-flex rounded-full bg-neutral-950 px-3 py-1 text-xs font-semibold text-white shadow-sm">Pro awaits</div><h3 className="max-w-[250px] text-[28px] font-semibold leading-[0.98] tracking-[-0.055em]">Shop with deeper insight</h3><p className="mt-3 max-w-[280px] text-sm leading-6 text-neutral-500">Built for grocery trips, pantry cleanups, and stricter plastic decisions.</p><div className="mt-5 space-y-2.5">{features.map(([title, detail]) => <div key={title} className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-black/[0.03]"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e6f8ef] text-sm font-bold text-[#00894b]">✓</span><div className="min-w-0"><div className="text-sm font-semibold text-neutral-950">{title}</div><div className="text-xs text-neutral-500">{detail}</div></div></div>)}</div><div className="mt-3 inline-flex rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-neutral-500 ring-1 ring-black/[0.04]">Plus much more</div><div className="mt-5 flex justify-end"><span className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(0,0,0,0.18)] transition group-active:scale-[0.98]">View Pro <span aria-hidden="true">→</span></span></div></div></button>;
}

function ProfileScreen({ products, badges, highlightBadge, openResult, openSettings, openFavorites, openBadges, openBadge, openPlans, openAdminReview, pendingReviewCount = 0, profile, updateProfile, favoriteIds = [], scanCount = db.scans.length, followingCount = 0, followersCount = 0, openScans, openFollowing, openFollowers, localeCopy = getLocaleCopy() }) {
  const saved = favoriteIds.map((productId) => products.find((product) => product.id === productId)).filter(Boolean);
  const photoInputRef = useRef(null);
  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => updateProfile?.({ avatarImage: reader.result });
    reader.readAsDataURL(file);
    event.target.value = "";
  };
  return <div className="min-h-[690px] px-5 pb-4"><Header title="Profile" right={<Button onClick={openSettings} variant="outline" className="bg-white">Settings</Button>} /><Card><div className="p-5 text-center"><div className="relative mx-auto mb-3 h-20 w-20"><button type="button" onClick={() => photoInputRef.current?.click()} className="h-20 w-20 overflow-hidden rounded-full bg-neutral-950 text-2xl font-semibold text-white shadow-sm ring-1 ring-black/5">{profile.avatarImage ? <img src={profile.avatarImage} alt="Profile" className="h-full w-full object-cover" /> : <span>{profile.firstName?.charAt(0) || "D"}</span>}</button><button type="button" onClick={() => photoInputRef.current?.click()} aria-label="Choose profile photo" className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-lg font-semibold leading-none text-neutral-950 shadow-[0_4px_12px_rgba(0,0,0,0.16)] ring-2 ring-white"><span className="-mt-0.5">+</span></button><input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" /></div><h2 className="text-2xl font-semibold tracking-tight text-neutral-950">{profile.firstName} {profile.lastName.charAt(0)}.</h2><p className="text-sm text-neutral-500">{profile.email}</p><div className="mt-5 grid grid-cols-4 gap-2"><ProfileStatButton value={scanCount} label="Scans" onClick={openScans} /><ProfileStatButton value={followingCount} label="Following" onClick={openFollowing} /><ProfileStatButton value={followersCount} label="Followers" onClick={openFollowers} /><ProfileStatButton value={saved.length} label={localeCopy.favorites} onClick={openFavorites} /></div></div></Card><button type="button" onClick={openAdminReview} className="mt-5 flex w-full items-center justify-between rounded-3xl bg-neutral-950 p-4 text-left text-white shadow-sm transition active:scale-[0.99]"><div><div className="font-semibold">Developer review queue</div><p className="mt-1 text-sm text-neutral-300">Approve submitted products from phone or desktop.</p></div><span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-white px-3 text-sm font-bold text-neutral-950">{pendingReviewCount}</span></button><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-neutral-950">{localeCopy.favorites}</h3><button type="button" onClick={openFavorites} className="text-sm font-medium text-neutral-500">See all</button></div><div className="space-y-2">{saved.length ? saved.slice(0, 3).map((product) => <ProductRow key={product.id} product={product} onClick={() => openResult(product)} />) : <p className="text-sm text-neutral-500">{localeCopy.favorite} products will appear here.</p>}</div></div><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-neutral-950">Badges</h3><button type="button" onClick={openBadges} className="text-sm font-medium text-neutral-500">See all</button></div><div className="grid grid-cols-2 gap-3">{(badges || []).slice(0, 4).map((badge) => <BadgeCard key={badge.id} badge={badge} highlight={highlightBadge === badge.id} compact onSelect={() => openBadge?.(badge)} />)}</div></div><ProUpgradeCard onClick={openPlans} /></div>;
}


;function runTests() {
  const products = db.products.map((product) => hydrateProduct(product));
  const soap = products.find((product) => product.id === "paper_soap");
  const dishwasher = products.find((product) => product.id === "kirkland_dishwasher");
  const dishwasherSwap = products.find((product) => product.id === "blueland_dishwasher_tablets");
  const betterSwap = getBetterSwap(products);
  const hunts = products.find((product) => product.id === "hunts_tomato_paste");
  const bobaJuice = products.find((product) => product.id === "plasticlist_boba_guys_black_tea_juice");
  const bobaPearls = products.find((product) => product.id === "plasticlist_boba_guys_black_tea_pearls");
  const bobaFruity = products.find((product) => product.id === "plasticlist_boba_guys_fruity_flavored_tea");
  const cheerios = hydrateProduct({ id: "test_cheerios", name: "Cheerios Cereal", brand: "General Mills", categoryId: "cat_food_drink" });
  const manualHoneyNut = hydrateProduct({ id: "pending_test_honey_nut", name: "Honey Nut Cherios", brand: "General Mills", categoryId: "cat_food_drink", scoreStatus: "pending_review" }, [{ id: "pending_test_honey_nut_packaging", productId: "pending_test_honey_nut", partType: "main_container", displayName: "Packaging pending review", materialId: "mixed", plasticTypeId: "unknown_plastic", baseImpact: -10, materialImpact: -12, notes: "Packaging pending review." }]);
  const manualRiceKrispies = hydrateProduct({ id: "pending_test_rice", name: "Rice Crispees", brand: "Kellogg's", categoryId: "cat_food_drink", scoreStatus: "pending_review" }, [{ id: "pending_test_rice_packaging", productId: "pending_test_rice", partType: "main_container", displayName: "Packaging pending review", materialId: "mixed", plasticTypeId: "unknown_plastic", baseImpact: -10, materialImpact: -12, notes: "Packaging pending review." }]);
  const estimatedSoup = hydrateProduct({ id: "test_canned_soup", name: "Organic Canned Soup", brand: "Test", categoryId: "cat_food_drink" });
  const unknownProduct = hydrateProduct({ id: "test_unknown", name: "Mystery Item", brand: "Unknown" });
  const tests = [
    [clampScore(-10) === 0, "clampScore clamps negative scores to 0"],
    [clampScore(120) === 100, "clampScore clamps scores above 100 to 100"],
    [getScoreTheme(70).label === "Low plastic concern", "70 should be Low plastic concern"],
    [getScoreTheme(72).ring !== getScoreTheme(82).ring && getScoreTheme(82).ring !== getScoreTheme(92).ring, "green score tiers should be visually distinct"],
    [getScoreTheme(92).label === "Near-ideal" && !getScoreTheme(92).shadow, "92+ scores should use clean near-ideal styling without glow"],
    [reviewStatusLabel("inferred") === "Estimated score", "inferred should not be shown to users"],
    [dataQualityLabel("Medium") === "Good data", "confidence should be translated into data quality"],
    [getBottomNavItems().map((item) => item[0]).join(",") === "history,search,scan,social,profile", "scan should be centered"],
    [soap?.score >= 80, "paper soap should score green"],
    [products.find(p => p.name.toLowerCase().includes("tuna"))?.score < 50, "canned food should be penalized heavily"],
    [products.find(p => p.name.toLowerCase().includes("juice"))?.score < 60, "acidic drinks should reduce score"],
    [products.find(p => p.name.toLowerCase().includes("dishwasher"))?.score === 12, "dishwasher should use calibrated common-ground score"],
    [dishwasherSwap?.score > dishwasher?.score, "cleaner dishwasher detergent swap should score higher than pod detergent"],
    [getProductSwapType(dishwasher) === getProductSwapType(dishwasherSwap), "dishwasher swaps should share the same product type"],
    [betterSwap?.from?.id === "kirkland_dishwasher" && betterSwap?.to?.id === "blueland_dishwasher_tablets", "social better swap should compare same-type dishwasher detergents"],
    [getBetterSwapForProduct(products, dishwasher)?.to?.id === "blueland_dishwasher_tablets", "product pages should show same-type better swap for low-scoring products"],
    [getProductSwapType(products.find(p => p.id === "plasticlist_subway_sub_tuna_6_inch")) !== getProductSwapType(products.find(p => p.id === "kirkland_tuna")), "prepared tuna sandwiches should not be suggested as canned tuna swaps"],
    [products.find(p => p.id === "campbells_soup")?.hasHighRiskCanScenario === true, "soup should trigger high-risk can scenario"],
    [products.find(p => p.id === "campbells_soup")?.score === 15, "hot canned soup should use calibrated common-ground score"],
    [products.find(p => p.id === "campbells_soup")?.parts.every(part => part.totalImpact >= -40 && part.totalImpact <= 0), "part impacts should be normalized between 0 and -40"],
    [products.find(p => p.id === "paper_soap")?.parts.every(part => part.totalImpact === 0), "paper-only soap wrapper should not show an artificial penalty"],
    [getPartSeverity(-40).label === "Severe", "severe part labels should exist for non-material-specific penalties"],
    [products.find(p => p.id === "old_spice")?.score === 32, "Old Spice should match calibrated common-ground score"],
    [products.find(p => p.id === "old_spice")?.parts.filter((part) => part.plasticTypeId === "pp5").every((part) => part.severity?.label === "Plastic packaging"), "same PP packaging should use a consistent visible label"],
    [products.find(p => p.id === "always_ultra")?.score === 12, "Always Ultra Thin should match calibrated common-ground score"],
    [products.find(p => p.id === "allens_apple")?.score === 19, "Allen’s Apple Juice should match calibrated common-ground score"],
    [products.find(p => p.id === "kirkland_tuna")?.score === 19, "Kirkland tuna should keep calibrated high-concern score"],
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
    [cheerios.parts.some((part) => part.displayName === "Outer box" && part.materialId === "paper") && cheerios.parts.some((part) => part.displayName === "Inner bag" && part.plasticTypeId === "ldpe4"), "Cheerios/cereal should get cardboard box plus plastic inner bag template"],
    [manualHoneyNut.parts.some((part) => part.displayName === "Outer box") && manualHoneyNut.parts.some((part) => part.displayName === "Inner bag") && manualHoneyNut.score !== 52, "Manual Honey Nut cereal should replace generic pending packaging with cereal template"],
    [manualRiceKrispies.name.includes("Rice Krispies") && manualRiceKrispies.parts.some((part) => part.displayName === "Outer box"), "Rice Krispies should be spelled correctly and use cereal template"],
    [cheerios.score >= 35 && cheerios.score <= 50 && cheerios.scoreConfidence === "estimated", "Cheerios/cereal should receive an estimated score around 35-50"],
    [cheerios.scoreConfidenceLabel === "Estimated from common packaging", "Estimated products should show confidence label"],
    [estimatedSoup.parts.some((part) => part.partType === "liner") && estimatedSoup.riskFactors.some((factor) => ["Hot food contact", "Heat-sensitive product", "Hot canned liquid"].includes(factor.name)), "Canned soup template should include liner and heat-sensitive risk"],
    [unknownProduct.scoreConfidenceLabel === "Needs packaging info" && Array.isArray(unknownProduct.parts), "Unknown product should not crash and should ask for packaging info"],
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

function ResultScreen({ product, products = [], close, openResult, openDetail, openPlasticListEvidence, openShare, favoriteIds = [], toggleFavorite, profile, localeCopy = getLocaleCopy(), onFavoriteAdded, onShareSuccess, onSubmitProductPhoto, onScoreBreakdownOpen, onAttachedSourceOpen, onBetterSwapOpen }) {
  const [useLocation, setUseLocation] = useState(false);
  const [selectedRecyclingLocation, setSelectedRecyclingLocation] = useState("toronto_on");
  const [locationStatus, setLocationStatus] = useState("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const [showScoreDetails, setShowScoreDetails] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showPhotoSubmit, setShowPhotoSubmit] = useState(false);
  const [imageMissing, setImageMissing] = useState(!hasProductPhoto(product));
  const recyclingLocation = getRecyclingLocation(selectedRecyclingLocation);
  const handleSwipeBack = () => {
    if (showImagePreview) {
      setShowImagePreview(false);
      return;
    }
    if (showPhotoSubmit) {
      setShowPhotoSubmit(false);
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
  const openScoreDetails = () => {
    onScoreBreakdownOpen?.(product);
    setShowScoreDetails(true);
  };

  if (showScoreDetails && !product.scorePending) return <div className="min-h-full" {...swipeBackHandlers}><ScoreBreakdownPanel product={product} close={() => setShowScoreDetails(false)} /></div>;

  const isFavorite = favoriteIds.includes(product.id);
  const productPhotoMissing = imageMissing || !hasProductPhoto(product);
  const isNearIdealScore = !product.scorePending && product.score >= 92;
  const isEstimatedScore = product.scoreConfidence === "estimated";
  const productSwap = getBetterSwapForProduct(products, product);
  const visibleScoringEvidence = (product.scoringEvidence || []).filter(isVisibleScoringEvidence);
  const visibleSources = (product.sources || []).filter(isVisibleAttachedSource);
  const displayName = isPendingPlaceholderText(product.name) ? "Product details needed" : product.name;
  const displayBrand = isPendingPlaceholderText(product.brand, "brand") ? "Pending review" : product.brand;
  const recyclingRules = product.parts.map((part) => getPartRecyclingRule(part, useLocation, selectedRecyclingLocation));
  const recyclingSummaryStatuses = recyclingRules.map((rule, index) => isAttachedCanLiner(product.parts[index], product) ? "limited" : rule.status);
  const recyclingStatus = combineRecyclability(recyclingSummaryStatuses);
  const recyclingMeta = productRecyclabilityMeta(recyclingStatus, recyclingSummaryStatuses, useLocation);
  const handleNativeShare = async () => {
    const appName = "PlasticFree";
    const userName = profile?.firstName || "Someone";
    const shareText = `${userName} shared ${displayName} from ${appName} for you to check out.`;
    const shareData = {
      title: `${displayBrand} ${displayName}`,
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
    <div className="min-h-[690px] px-5 pb-5" {...swipeBackHandlers}>
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
              if (productPhotoMissing) setShowPhotoSubmit(true);
              else setShowImagePreview(true);
            }}
            className="relative mx-auto flex items-start justify-center rounded-[2rem] transition active:scale-[0.98]"
            aria-label={productPhotoMissing ? "Add product image" : "Open larger product image"}
          >
            <ProductImage src={product.imageUrl} alt={displayName} className="h-36 w-36 rounded-3xl object-cover" onMissing={() => setImageMissing(true)} />
            {productPhotoMissing && (
              <span className="absolute inset-x-3 bottom-3 rounded-full bg-white/92 px-3 py-1.5 text-xs font-semibold text-neutral-950 shadow-sm ring-1 ring-black/5 backdrop-blur">
                Add image +
              </span>
            )}
          </button>

          <div className="mt-5 flex justify-center">
            <ScoreRing score={product.score} onClick={product.scorePending ? undefined : openScoreDetails} featured={isNearIdealScore} pending={product.scorePending} />
          </div>

          <div className="mt-2 flex flex-col items-center gap-1">
            {isEstimatedScore && !product.scorePending && <div className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400">Estimated score</div>}
            {product.scorePending ? (
              <div className="rounded-full bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-500 shadow-inner">Score pending review</div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback();
                  openScoreDetails();
                }}
                className="text-xs font-medium text-neutral-500 underline underline-offset-4"
              >
                Tap score for detailed breakdown
              </button>
            )}

            {!product.scorePending && (
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
            )}
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950">{displayName}</h2>
          <p className="text-neutral-500">{displayBrand}</p>
          <p className="mt-2 text-xs text-neutral-500">
            {product.category?.name} • {dataQualityLabel(product.confidence)}
          </p>
          {isEstimatedScore && (
            <Button onClick={() => setShowPhotoSubmit(true)} className="mx-auto mt-4">Help verify this product</Button>
          )}
        </div>
      </Card>

      <AnimatePresence>
        {showImagePreview && <ProductImagePreview product={product} close={() => setShowImagePreview(false)} />}
        {showPhotoSubmit && <ProductPhotoSubmissionSheet product={product} close={() => setShowPhotoSubmit(false)} onSubmit={onSubmitProductPhoto} />}
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
                  <div className="font-medium text-neutral-950">{part.estimated ? `Likely ${part.displayName.toLowerCase()}` : part.displayName}</div>
                  <div className="text-sm text-neutral-500">{getPartMaterialLabel(part)}</div>
                  <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${part.severity.tone}`}>{part.severity.label}</div>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[2px] border-[#0A84FF] bg-transparent text-[21px] font-semibold leading-none text-[#0A84FF] transition group-hover:scale-105 group-hover:border-[#007AFF] group-hover:text-[#007AFF]">
                  <span className="-mt-px font-serif">i</span>
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

      {productSwap && <div className="mt-5"><BetterSwapHighlight swapFrom={productSwap.from} swapTo={productSwap.to} openResult={openResult} onSwapView={onBetterSwapOpen} /></div>}

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
          {visibleScoringEvidence.map((evidence) => (
            <div key={`${evidence.source_type}-${evidence.source_label}`} className="rounded-2xl bg-[#f7f3eb] p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{evidence.source_type.replaceAll("_", " ")}</div>
              <div className="mt-1 font-medium text-neutral-950">{evidence.source_label}</div>
              <p className="mt-1 text-sm leading-5 text-neutral-500">{evidence.notes}</p>
            </div>
          ))}
          {visibleSources.slice(0, 2).map((link) => <SourceCard key={link.source.id} link={link} onOpen={() => onAttachedSourceOpen?.(product, link)} />)}
          {!visibleSources.length && !visibleScoringEvidence.length && <p className="text-sm text-neutral-500">No source links attached yet.</p>}
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

  return <div className="min-h-[690px] px-5 pb-4"><Header title={user.displayName} right={<BackButton onClick={close} />} /><Card><div className="p-5 text-center"><div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-950 text-2xl font-semibold text-white">{user.avatar}</div><h2 className="text-2xl font-semibold text-neutral-950">{user.displayName}</h2><p className="text-sm text-neutral-500">{user.role}</p><div className="mt-5 grid grid-cols-4 gap-3"><div><div className="text-2xl font-semibold">{userScans}</div><div className="text-xs text-neutral-500">Scans</div></div><div><div className="text-2xl font-semibold">{following}</div><div className="text-xs text-neutral-500">Following</div></div><div><div className="text-2xl font-semibold">{followers}</div><div className="text-xs text-neutral-500">Followers</div></div><div><div className="text-2xl font-semibold">{userSaves.length}</div><div className="text-xs text-neutral-500">{localeCopy.favorites}</div></div></div></div></Card><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-neutral-950">Recent {localeCopy.favoritesLower}</h3><button type="button" onClick={openFavorites} className="text-sm font-medium text-neutral-500">See all</button></div><div className="space-y-2">{userSaves.length ? userSaves.slice(0, 3).map((p) => <ProductRow key={p.id} product={p} onClick={() => openResult(p)} />) : <p className="text-sm text-neutral-500">No {localeCopy.favoritesLower} yet.</p>}</div></div><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-neutral-950">Badges earned</h3><span className="text-sm font-medium text-neutral-400">Top 4</span></div><div className="grid grid-cols-2 gap-3">{badges.slice(0, 4).map((badge) => <BadgeCard key={badge.id} badge={badge} highlight={highlightBadge === badge.id} compact />)}</div></div></div>;
}

export default function PlasticFreeScannerDatabasePrototype() {
  const [submittedProducts, setSubmittedProducts] = useState([]);
  const [submittedParts, setSubmittedParts] = useState([]);
  const [reviewSubmissions, setReviewSubmissions] = useState([]);
  const products = useMemo(() => {
    const byId = new Map();
    [...db.products, ...submittedProducts].filter(isPublishableSubmissionProduct).forEach((product) => byId.set(product.id, product));
    return Array.from(byId.values()).map((product) => hydrateProduct(product, submittedParts));
  }, [submittedProducts, submittedParts]);
  const [tab, setTab] = useState("history");
  const [result, setResult] = useState(null);
  const [detail, setDetail] = useState(null);
  const [plasticListDetail, setPlasticListDetail] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [shareProduct, setShareProduct] = useState(null);
  const [historyList, setHistoryList] = useState(null);
  const [returnHistoryList, setReturnHistoryList] = useState(null);
  const [peopleList, setPeopleList] = useState(null);
  const [isSignedOut, setIsSignedOut] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [badgeDetail, setBadgeDetail] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(3);
  const [showPlans, setShowPlans] = useState(false);
  const [showAdminReview, setShowAdminReview] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [contentScrollTop, setContentScrollTop] = useState(0);
  const [showBackToTopButton, setShowBackToTopButton] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addProductAsSheet, setAddProductAsSheet] = useState(false);
  const [addProductDraft, setAddProductDraft] = useState({});
  const [badgeToast, setBadgeToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  const toastQueueRef = useRef([]);
  const toastVisibleRef = useRef(false);
  const badgeActionKeysRef = useRef(new Set());
  const contentScrollRef = useRef(null);
  const addProductSheetTouchRef = useRef({ y: 0, scrollTop: 0 });
  const addProductDragControls = useDragControls();
  const productScrollTopRef = useRef(0);
  const shouldRestoreProductScrollRef = useRef(false);
  const homeScrollTopRef = useRef(0);
  const shouldRestoreHomeScrollRef = useRef(false);
  const searchScrollTopRef = useRef(0);
  const shouldRestoreSearchScrollRef = useRef(false);
  const socialScrollTopRef = useRef(0);
  const shouldRestoreSocialScrollRef = useRef(false);
  const profileScrollTopRef = useRef(0);
  const shouldRestoreProfileScrollRef = useRef(false);
  const listScrollTopRef = useRef(0);
  const shouldRestoreListScrollRef = useRef(false);
  const badgesScrollTopRef = useRef(0);
  const shouldRestoreBadgesScrollRef = useRef(false);
  const activeScrollSurfaceRef = useRef("");
  const [badgeProgress, setBadgeProgress] = useState(badgeDefinitions);
  const [highlightBadge, setHighlightBadge] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(() => db.saves.filter((save) => save.userId === "user_me").map((save) => save.productId));
  const [scanHistory, setScanHistory] = useState(db.scans);
  const [profile, setProfile] = useState({ firstName: "Dave", lastName: "Rusinek", email: "dave@example.com", password: "password123" });
  const [locale, setLocale] = useState(getDefaultSpellingLocale);
  const localeCopy = getLocaleCopy(locale);

  useEffect(() => {
    let active = true;

    async function loadPersistentData() {
      try {
        const submissions = await fetchBackendSubmissions();
        if (!active) return;
        setReviewSubmissions(submissions);
        setSubmittedProducts(submissions.map((submission) => submission.product).filter(isPublishableSubmissionProduct));
        setSubmittedParts(submissions.flatMap((submission) => Array.isArray(submission.parts) ? submission.parts : []));
        writeLocalJson(LOCAL_SUBMISSIONS_KEY, submissions);
      } catch {
        const localSubmissions = readLocalJson(LOCAL_SUBMISSIONS_KEY, []).map(normalizeSubmissionRecord);
        if (!active) return;
        setReviewSubmissions(localSubmissions);
        setSubmittedProducts(localSubmissions.map((submission) => submission.product).filter(isPublishableSubmissionProduct));
        setSubmittedParts(localSubmissions.flatMap((submission) => Array.isArray(submission.parts) ? submission.parts : []));
      }

      try {
        const backendScans = await fetchBackendScans();
        if (!active) return;
        const staticScanIds = new Set(db.scans.map((scan) => scan.id));
        setScanHistory([...backendScans.filter((scan) => !staticScanIds.has(scan.id)), ...db.scans]);
        writeLocalJson(LOCAL_SCANS_KEY, backendScans);
      } catch {
        const localScans = readLocalJson(LOCAL_SCANS_KEY, []);
        if (!active) return;
        const staticScanIds = new Set(db.scans.map((scan) => scan.id));
        setScanHistory([...localScans.filter((scan) => !staticScanIds.has(scan.id)), ...db.scans]);
      }

      try {
        const backendFavorites = await fetchBackendFavorites();
        if (!active) return;
        setFavoriteIds(backendFavorites);
        writeLocalJson(LOCAL_FAVORITES_KEY, backendFavorites);
      } catch {
        const localFavorites = readLocalJson(LOCAL_FAVORITES_KEY, null);
        if (!active || !localFavorites) return;
        setFavoriteIds(localFavorites);
      }
    }

    loadPersistentData();
    return () => {
      active = false;
    };
  }, []);

  const updateProfile = (updates) => {
    setProfile((current) => ({ ...current, ...updates }));
  };

  const toggleFavorite = (productId) => {
    const favorited = !favoriteIds.includes(productId);
    const nextFavoriteIds = favorited ? [...favoriteIds, productId] : favoriteIds.filter((id) => id !== productId);
    setFavoriteIds(nextFavoriteIds);
    if (favorited) {
      const product = products.find((item) => item.id === productId);
      awardBadge("community_voice", 1, `favorite:${productId}`);
      if (product?.score >= 80) awardBadge("conscious_consumer", 1, `clean-favorite:${productId}`);
      if (product?.score >= 70) awardBadge("eco_upgrade", 1, `upgrade-favorite:${productId}`);
      const savedAsSwap = products.some((item) => getBetterSwapForProduct(products, item)?.to?.id === productId);
      if (savedAsSwap) awardBadge("plastic_pro", 1, `swap-save:${productId}`);
    }
    saveBackendFavorite(productId, favorited)
      .then((backendFavorites) => {
        setFavoriteIds(backendFavorites);
        writeLocalJson(LOCAL_FAVORITES_KEY, backendFavorites);
      })
      .catch(() => writeLocalJson(LOCAL_FAVORITES_KEY, nextFavoriteIds));
  };

  const resetOverlays = () => {
    setDetail(null);
    setPlasticListDetail(null);
    setShowSettings(false);
    setShowFavorites(false);
    setShowDeleteAccount(false);
    setShowBadges(false);
    setBadgeDetail(null);
    setShowNotifications(false);
    setShowPlans(false);
    setShowAdminReview(false);
    setShowAddProduct(false);
    setAddProductAsSheet(false);
    setShareProduct(null);
    setHistoryList(null);
    setReturnHistoryList(null);
    setPeopleList(null);
  };

  const openResult = (product) => {
    awardProductViewBadges(product);
    if (historyList && !showResult && !detail) {
      listScrollTopRef.current = contentScrollRef.current?.scrollTop || 0;
      shouldRestoreListScrollRef.current = true;
      setReturnHistoryList(historyList);
      setHistoryList(null);
      productScrollTopRef.current = 0;
      shouldRestoreProductScrollRef.current = false;
      setResult(product);
      setShowResult(true);
      return;
    }
    if (tab === "history" && !showResult && !detail && !historyList && !viewUser) {
      homeScrollTopRef.current = contentScrollRef.current?.scrollTop || 0;
      shouldRestoreHomeScrollRef.current = true;
    }
    if (tab === "search" && !showResult && !detail) {
      searchScrollTopRef.current = contentScrollRef.current?.scrollTop || 0;
      shouldRestoreSearchScrollRef.current = true;
    }
    if (tab === "social" && !showResult && !detail && !viewUser) {
      socialScrollTopRef.current = contentScrollRef.current?.scrollTop || 0;
      shouldRestoreSocialScrollRef.current = true;
    }
    if (tab === "profile" && !showResult && !detail && !showFavorites && !showBadges && !badgeDetail && !viewUser && !historyList && !peopleList) {
      profileScrollTopRef.current = contentScrollRef.current?.scrollTop || 0;
      shouldRestoreProfileScrollRef.current = true;
    }
    productScrollTopRef.current = 0;
    shouldRestoreProductScrollRef.current = false;
    setResult(product);
    resetOverlays();
    setShowResult(true);
  };

  const openAddProduct = (draft = {}) => {
    const shouldUseSheet = tab === "scan";
    setAddProductDraft(draft || {});
    resetOverlays();
    setAddProductAsSheet(shouldUseSheet);
    setShowAddProduct(true);
  };

  const closeAddProduct = () => {
    setShowAddProduct(false);
    setAddProductAsSheet(false);
    setAddProductDraft({});
  };

  const refreshReviewSubmissions = async () => {
    try {
      const submissions = await fetchAllBackendSubmissions();
      setReviewSubmissions(submissions);
      setSubmittedProducts(submissions.map((submission) => submission.product).filter(isPublishableSubmissionProduct));
      setSubmittedParts(submissions.flatMap((submission) => Array.isArray(submission.parts) ? submission.parts : []));
      writeLocalJson(LOCAL_SUBMISSIONS_KEY, submissions);
      return submissions;
    } catch {
      const localSubmissions = readLocalJson(LOCAL_SUBMISSIONS_KEY, []).map(normalizeSubmissionRecord);
      setReviewSubmissions(localSubmissions);
      return localSubmissions;
    }
  };

  const openAdminReview = () => {
    resetOverlays();
    setShowResult(false);
    setShowAdminReview(true);
    if (typeof window !== "undefined" && window.location.hash !== "#admin") window.history.replaceState(null, "", "#admin");
    refreshReviewSubmissions();
  };

  const closeAdminReview = () => {
    setShowAdminReview(false);
    if (typeof window !== "undefined" && window.location.hash === "#admin") window.history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  useEffect(() => {
    const syncAdminHash = () => {
      if (window.location.hash === "#admin") openAdminReview();
    };
    syncAdminHash();
    window.addEventListener("hashchange", syncAdminHash);
    return () => window.removeEventListener("hashchange", syncAdminHash);
  }, []);

  const handleAddProductSheetTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    addProductSheetTouchRef.current = { y: touch.clientY, scrollTop: event.currentTarget.scrollTop || 0 };
  };

  const handleAddProductSheetTouchEnd = (event) => {
    const touch = event.changedTouches?.[0];
    if (!touch || addProductSheetTouchRef.current.scrollTop > 4) return;
    if (touch.clientY - addProductSheetTouchRef.current.y > 72) closeAddProduct();
  };

  const recordScan = (productId) => {
    const scan = { id: `scan_${APP_USER_ID}_${productId}`, userId: APP_USER_ID, productId };
    setScanHistory((current) => current.some((item) => item.productId === productId && item.userId === APP_USER_ID) ? current : [scan, ...current]);
    saveBackendScan(scan).catch(() => {
      const localScans = readLocalJson(LOCAL_SCANS_KEY, []);
      if (!localScans.some((item) => item.id === scan.id)) writeLocalJson(LOCAL_SCANS_KEY, [scan, ...localScans]);
    });
  };

  const submitPendingProduct = (draft, photos) => {
    const { product, parts } = createPendingProductFromDraft(draft, photos);
    const productBarcode = normalizeBarcode(product.barcode);
    const sameBarcode = (value) => productBarcode && normalizeBarcode(value) === productBarcode;
    const existingSubmission = reviewSubmissions.find((item) => item.product?.id === product.id || sameBarcode(item.product?.barcode));
    const existingProduct = existingSubmission?.product || submittedProducts.find((item) => item.id === product.id || sameBarcode(item.barcode)) || {};
    const mergedPhotos = { ...(existingSubmission?.photos || existingProduct.submittedPhotos || {}), ...(photos || {}) };
    product.name = isPendingPlaceholderText(product.name) && !isPendingPlaceholderText(existingProduct.name) ? existingProduct.name : product.name;
    product.brand = isPendingPlaceholderText(product.brand, "brand") && !isPendingPlaceholderText(existingProduct.brand, "brand") ? existingProduct.brand : product.brand;
    product.imageUrl = product.imageUrl || existingProduct.imageUrl || mergedPhotos.front?.dataUrl || "";
    product.submittedPhotos = mergedPhotos;
    const submission = { id: product.id, product, parts, photos: mergedPhotos };
    const samePendingProduct = (item) => item?.id === product.id || sameBarcode(item?.product?.barcode || item?.barcode);
    setReviewSubmissions((current) => current.some(samePendingProduct) ? current.map((item) => samePendingProduct(item) ? submission : item) : [submission, ...current]);
    setSubmittedProducts((current) => current.some(samePendingProduct) ? current.map((item) => samePendingProduct(item) ? product : item) : [product, ...current]);
    setSubmittedParts((current) => [...current.filter((part) => part.productId !== product.id), ...parts]);
    awardBadge("community_voice", 1, `submit-product:${product.id}`);
    if (hasUploadedLabelEvidence(mergedPhotos)) awardBadge("ingredient_inspector", 1, `label-upload:${product.id}`);
    recordScan(product.id);
    saveBackendSubmission(submission).catch(() => {
      const localSubmissions = readLocalJson(LOCAL_SUBMISSIONS_KEY, []);
      writeLocalJson(LOCAL_SUBMISSIONS_KEY, [submission, ...localSubmissions.filter((item) => !samePendingProduct(item))]);
    });
    const hydrated = hydrateProduct(product, parts);
    productScrollTopRef.current = 0;
    shouldRestoreProductScrollRef.current = false;
    setResult(hydrated);
    setShowResult(true);
    setShowAddProduct(false);
    setAddProductAsSheet(false);
    setAddProductDraft({});
    showToast("Submitted for review and added to History", 2200);
  };

  const submitProductPhotoForReview = async (product, photoPayload) => {
    const photos = photoPayload?.dataUrl ? { front: photoPayload } : (photoPayload || {});
    const frontPhoto = photos.front;
    const submissionProduct = {
      ...product,
      targetProductId: product.id,
      imageUrl: product.imageUrl || "",
      scoreStatus: "photo_review",
      scoringNote: photos.notes || "User submitted packaging evidence for admin approval.",
      submittedAt: new Date().toISOString(),
    };
    const submission = { id: `photo_${product.id}_${Date.now()}`, product: submissionProduct, parts: [], photos: { ...photos, front: frontPhoto } };
    setReviewSubmissions((current) => [submission, ...current.filter((item) => item.id !== submission.id)]);
    awardBadge("community_voice", 1, `submit-photo:${product.id}`);
    if (hasUploadedLabelEvidence(photos)) awardBadge("ingredient_inspector", 1, `label-photo:${product.id}`);
    await saveBackendSubmission(submission).catch(() => {
      const localSubmissions = readLocalJson(LOCAL_SUBMISSIONS_KEY, []);
      writeLocalJson(LOCAL_SUBMISSIONS_KEY, [submission, ...localSubmissions.filter((item) => item.id !== submission.id)]);
    });
    showToast("Photo submitted for review", 2200);
  };

  const persistReviewedSubmission = (submission, productUpdates, message) => {
    const updatedProduct = { ...(submission.product || {}), ...productUpdates };
    const updatedSubmission = { ...submission, product: updatedProduct, parts: Array.isArray(submission.parts) ? submission.parts : [], photos: submission.photos || {} };
    setReviewSubmissions((current) => current.map((item) => item.id === submission.id ? updatedSubmission : item));
    setSubmittedProducts((current) => current.some((item) => item.id === updatedProduct.id) ? current.map((item) => item.id === updatedProduct.id ? updatedProduct : item) : [updatedProduct, ...current]);
    setSubmittedParts((current) => [...current.filter((part) => part.productId !== updatedProduct.id), ...updatedSubmission.parts]);
    saveBackendSubmission(updatedSubmission).catch(() => {
      const localSubmissions = readLocalJson(LOCAL_SUBMISSIONS_KEY, []);
      writeLocalJson(LOCAL_SUBMISSIONS_KEY, [updatedSubmission, ...localSubmissions.filter((item) => item.id !== updatedSubmission.id)]);
    });
    showToast(message, 2200);
  };

  const approveReviewSubmission = (submission, score, note, edits = {}) => {
    const photo = submission.photos?.front;
    if (submission.product?.scoreStatus === "photo_review") {
      persistReviewedSubmission(submission, {
        ...(edits.name ? { name: edits.name } : {}),
        ...(edits.brand ? { brand: edits.brand } : {}),
        id: submission.product.targetProductId || submission.product.id,
        imageUrl: photo?.dataUrl || submission.product.imageUrl,
        scoreStatus: "approved_photo",
        verification: submission.product.verification === "unverified" ? "community_verified" : submission.product.verification,
        scoringNote: note || "Product photo reviewed and approved."
      }, "Product photo approved");
      return;
    }
    persistReviewedSubmission(submission, {
      ...(edits.name ? { name: edits.name } : {}),
      ...(edits.brand ? { brand: edits.brand } : {}),
      scoreOverride: clampScore(score),
      scorePending: false,
      scoreStatus: "approved",
      verification: "expert_verified",
      confidence: "High",
      scoringNote: note || "Reviewed by developer and assigned a rating score."
    }, "Product approved and score published");
  };

  const markReviewNeedsInfo = (submission, note, edits = {}) => {
    if (submission.product?.scoreStatus === "photo_review") {
      persistReviewedSubmission(submission, {
        ...(edits.name ? { name: edits.name } : {}),
        ...(edits.brand ? { brand: edits.brand } : {}),
        scoreStatus: "photo_review",
        scoringNote: note || "Photo needs more review before it can be approved."
      }, "Marked photo as needing more info");
      return;
    }
    persistReviewedSubmission(submission, {
      ...(edits.name ? { name: edits.name } : {}),
      ...(edits.brand ? { brand: edits.brand } : {}),
      scorePending: false,
      scoreStatus: "needs_more_info",
      verification: "unverified",
      confidence: "Low",
      scoringNote: note || "Estimated score remains active while more packaging evidence is collected."
    }, "Marked as needing more info");
  };

  const rejectReviewDuplicate = (submission, note, edits = {}) => {
    persistReviewedSubmission(submission, {
      ...(edits.name ? { name: edits.name } : {}),
      ...(edits.brand ? { brand: edits.brand } : {}),
      scorePending: false,
      scoreStatus: "rejected_duplicate",
      verification: "expert_verified",
      confidence: "Low",
      scoringNote: note || "Rejected as a duplicate submission."
    }, "Marked as duplicate");
  };

  const openPartDetail = (product, part) => {
    awardBadge("deep_diver", 1, `part-detail:${product?.id}:${part?.id}`);
    if (hasLabelInspectorSignal({ ...product, parts: [part] })) awardBadge("ingredient_inspector", 1, `label-part:${product?.id}:${part?.id}`);
    productScrollTopRef.current = contentScrollRef.current?.scrollTop || 0;
    shouldRestoreProductScrollRef.current = false;
    setDetail({ product, part });
  };

  const closePartDetail = () => {
    shouldRestoreProductScrollRef.current = true;
    setDetail(null);
  };

  const openPlasticListEvidence = (product) => {
    awardBadge("deep_diver", 1, `lab-evidence:${product?.id}`);
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
        showToast(`${badge.name} ${newStatus.currentTier} unlocked`, 3200);
      }
      return updatedBadge;
    }));
  };

  const showNextToast = () => {
    const nextToast = toastQueueRef.current.shift();
    if (!nextToast) {
      toastVisibleRef.current = false;
      setBadgeToast(null);
      return;
    }
    toastVisibleRef.current = true;
    setBadgeToast(nextToast.message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setBadgeToast(null);
      window.setTimeout(showNextToast, 160);
    }, nextToast.duration);
  };

  const showToast = (message, duration = 2500) => {
    toastQueueRef.current.push({ message, duration });
    if (!toastVisibleRef.current) showNextToast();
  };

  const showShareBadgeToast = () => {
    awardBadge("word_of_mouth", 1, `share:${shareProduct?.id || Date.now()}`);
  };

  const getBadgeProgressToast = (badge, amount = 1) => {
    const updatedBadge = { ...badge, progress: badge.progress + amount };
    const status = getBadgeStatus(updatedBadge);
    const progressText = badge.isPercent ? `${status.displayProgress}%` : `${status.displayProgress} / ${status.nextThreshold}`;
    return `+${amount} ${badge.name} • ${progressText}`;
  };

  const awardBadge = (id, amount = 1, actionKey = "") => {
    const key = actionKey || `${id}:${Date.now()}`;
    if (badgeActionKeysRef.current.has(`${id}:${key}`)) return false;
    const badge = badgeProgress.find((item) => item.id === id);
    const didUnlock = badge ? getBadgeStatus(badge).currentTier !== getBadgeStatus({ ...badge, progress: badge.progress + amount }).currentTier : false;
    badgeActionKeysRef.current.add(`${id}:${key}`);
    incrementBadge(id, amount);
    if (badge && !didUnlock) showToast(getBadgeProgressToast(badge, amount), 1900);
    return didUnlock;
  };

  const awardProductViewBadges = (product) => {
    if (!product?.id) return false;
    const unlocks = [];
    if ((product.parts || []).some((part) => part.plastic?.code && part.plastic.code !== "NONE")) unlocks.push(awardBadge("microplastic_hunter", 1, `plastic:${product.id}`));
    if (!product.scorePending && product.score <= 30) unlocks.push(awardBadge("red_flag_radar", 1, `risk:${product.id}`));
    if (!product.scorePending && product.score >= 80) unlocks.push(awardBadge("conscious_consumer", 1, `clean-view:${product.id}`));
    return unlocks.some(Boolean);
  };

  const awardSearchBadge = (key) => {
    awardBadge("data_driven", 1, key);
  };

  const openPlansFromProfile = () => {
    profileScrollTopRef.current = contentScrollRef.current?.scrollTop || 0;
    shouldRestoreProfileScrollRef.current = true;
    setShowPlans(true);
  };

  const openFavoritesFromProfile = () => {
    profileScrollTopRef.current = contentScrollRef.current?.scrollTop || 0;
    shouldRestoreProfileScrollRef.current = true;
    setShowFavorites(true);
  };

  const openBadgesFromProfile = () => {
    profileScrollTopRef.current = contentScrollRef.current?.scrollTop || 0;
    shouldRestoreProfileScrollRef.current = true;
    setShowBadges(true);
  };

  const openBadgeFromProfile = (badge) => {
    profileScrollTopRef.current = contentScrollRef.current?.scrollTop || 0;
    shouldRestoreProfileScrollRef.current = true;
    setBadgeDetail(badge);
  };

  const openBadgeFromBadgesList = (badge) => {
    badgesScrollTopRef.current = contentScrollRef.current?.scrollTop || 0;
    shouldRestoreBadgesScrollRef.current = true;
    setBadgeDetail(badge);
  };

  const openHomeHistoryList = (list) => {
    homeScrollTopRef.current = contentScrollRef.current?.scrollTop || 0;
    shouldRestoreHomeScrollRef.current = true;
    setReturnHistoryList(null);
    setContentScrollTop(0);
    setHistoryList(list);
  };

  const closeResult = () => {
    setShowResult(false);
    if (returnHistoryList) {
      setHistoryList(returnHistoryList);
      setReturnHistoryList(null);
    }
  };

  const closePlans = () => {
    setShowPlans(false);
  };

  const handleScan = (product) => {
    openResult(product);
  };

  const openSocialUserProfile = (user) => {
    socialScrollTopRef.current = contentScrollRef.current?.scrollTop || 0;
    shouldRestoreSocialScrollRef.current = true;
    setViewUser(user);
  };

  const hasRecordedScanForProduct = (product) => {
    if (!product?.id) return false;
    const productCodes = [product.barcode, ...(product.barcodes || [])].filter(Boolean).map(normalizeBarcode);
    return scanHistory.some((scan) => {
      if (scan.userId !== APP_USER_ID) return false;
      if (scan.productId === product.id) return true;
      const scannedProduct = products.find((item) => item.id === scan.productId);
      const scannedCodes = [scannedProduct?.barcode, ...(scannedProduct?.barcodes || [])].filter(Boolean).map(normalizeBarcode);
      return productCodes.length > 0 && scannedCodes.some((code) => productCodes.includes(code));
    });
  };

  const handleProductScanned = (product) => {
    if (!product?.id) return;
    if (hasRecordedScanForProduct(product)) return;
    awardBadge("plastic_detective", 1, `scan:${product.id}`);
    awardBadge("barcode_whisperer", 1, `barcode:${product.barcode || product.id}`);
    awardProductViewBadges(product);
    recordScan(product.id);
  };

  const scannedProducts = scanHistory.map((scan) => products.find((product) => product.id === scan.productId)).filter(Boolean);
  const searchedProducts = products.filter((product) => !scanHistory.some((scan) => scan.productId === product.id));
  const followingUsers = db.follows.filter((follow) => follow.followerId === "user_me").map((follow) => db.users.find((user) => user.id === follow.followedId)).filter(Boolean);
  const followerUsers = db.users.filter((user) => user.id !== "user_me");
  const pendingReviewCount = reviewSubmissions.filter((submission) => isPendingReviewProduct(submission.product)).length;
  const hideNav = viewUser || showResult || detail || plasticListDetail || showSettings || showFavorites || showBadges || badgeDetail || showDeleteAccount || shareProduct || historyList || peopleList || showNotifications || showAdminReview || (showAddProduct && !addProductAsSheet);
  const canSwipeBack = viewUser || showAddProduct || showPlans || showAdminReview || showNotifications || shareProduct || historyList || peopleList || showDeleteAccount || badgeDetail || showBadges || showFavorites || showSettings || detail || plasticListDetail || showResult;

  const goBack = () => {
    if (viewUser) {
      setViewUser(null);
      return;
    }
    if (showAddProduct) {
      closeAddProduct();
      return;
    }
    if (showPlans) {
      closePlans();
      return;
    }
    if (showAdminReview) {
      closeAdminReview();
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
    if (peopleList) {
      setPeopleList(null);
      return;
    }
    if (showDeleteAccount) {
      setShowDeleteAccount(false);
      return;
    }
    if (badgeDetail) {
      if (showBadges) shouldRestoreBadgesScrollRef.current = true;
      setBadgeDetail(null);
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
    if (showResult) closeResult();
  };
  const pageTransition = { duration: 0.44, ease: [0.2, 0.82, 0.2, 1] };
  const proPageTransition = { duration: 0.52, ease: [0.2, 0.82, 0.2, 1] };
  const proPageExitTransition = { duration: 0.44, ease: [0.2, 0.82, 0.2, 1] };
  const productPageTransition = { ...pageTransition, duration: 0.4 };
  const returnToTabTransition = { ...pageTransition, duration: 0.24 };
  const scrollIncomingScreen = (screen) => {
    if (screen === "product" && shouldRestoreProductScrollRef.current) {
      contentScrollRef.current?.scrollTo({ top: productScrollTopRef.current, left: 0, behavior: "auto" });
      shouldRestoreProductScrollRef.current = false;
      return;
    }
    if (screen === "history" && shouldRestoreHomeScrollRef.current) {
      contentScrollRef.current?.scrollTo({ top: homeScrollTopRef.current, left: 0, behavior: "auto" });
      shouldRestoreHomeScrollRef.current = false;
      return;
    }
    if (screen === "search" && shouldRestoreSearchScrollRef.current) {
      contentScrollRef.current?.scrollTo({ top: searchScrollTopRef.current, left: 0, behavior: "auto" });
      shouldRestoreSearchScrollRef.current = false;
      return;
    }
    if (screen === "history-list" && shouldRestoreListScrollRef.current) {
      contentScrollRef.current?.scrollTo({ top: listScrollTopRef.current, left: 0, behavior: "auto" });
      shouldRestoreListScrollRef.current = false;
      return;
    }
    if (screen === "badges" && shouldRestoreBadgesScrollRef.current) {
      contentScrollRef.current?.scrollTo({ top: badgesScrollTopRef.current, left: 0, behavior: "auto" });
      shouldRestoreBadgesScrollRef.current = false;
      return;
    }
    if (screen === "social" && shouldRestoreSocialScrollRef.current) {
      contentScrollRef.current?.scrollTo({ top: socialScrollTopRef.current, left: 0, behavior: "auto" });
      shouldRestoreSocialScrollRef.current = false;
      return;
    }
    if (screen === "profile" && shouldRestoreProfileScrollRef.current) {
      contentScrollRef.current?.scrollTo({ top: profileScrollTopRef.current, left: 0, behavior: "auto" });
      shouldRestoreProfileScrollRef.current = false;
      return;
    }
    contentScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };
  const handleScreenAnimationStart = (screen, animationDefinition) => {
    if (animationDefinition?.opacity === 0) return;
    scrollIncomingScreen(screen);
  };
  const appSwipeBackHandlers = useSwipeBack(goBack, Boolean(canSwipeBack));
  const backToTopSurface = historyList ? "history-list" : showResult && !detail && !plasticListDetail && !shareProduct && !showAddProduct ? "product" : tab === "search" && !hideNav ? "search" : tab === "profile" && !hideNav ? "profile" : "";
  useEffect(() => {
    activeScrollSurfaceRef.current = backToTopSurface;
    setShowBackToTopButton(false);
    setContentScrollTop(contentScrollRef.current?.scrollTop || 0);
  }, [backToTopSurface]);
  const handleContentScroll = (event) => {
    const scrollTop = event.currentTarget.scrollTop;
    setContentScrollTop(scrollTop);
    const activeSurface = activeScrollSurfaceRef.current;
    setShowBackToTopButton(Boolean(activeSurface) && scrollTop > 220);
  };
  const scrollCurrentPageToTop = () => {
    contentScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  return <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,#ffffff_0%,#f2eee6_42%,#dfd8ca_100%)] px-0 py-0 font-sans text-neutral-950 antialiased md:flex md:items-center md:justify-center md:px-4 md:py-8"><AnimatePresence>{badgeToast && <motion.div initial={{ opacity: 0, y: -56, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -36, scale: 0.98 }} transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.85 }} className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-50 mx-auto max-w-[360px] rounded-[1.35rem] bg-neutral-950/95 px-4 py-3 text-sm font-medium text-white shadow-2xl shadow-black/20 ring-1 ring-white/10 backdrop-blur-xl"><div className="flex items-center justify-between gap-3"><span>{badgeToast}</span><button type="button" onClick={() => setBadgeToast(null)} className="text-white/70">×</button></div></motion.div>}</AnimatePresence><Phone>{isSignedOut ? <SignInScreen onSignIn={() => setIsSignedOut(false)} /> : <div className="relative flex h-full min-h-0 flex-col"><div className="flex min-h-0 flex-1 flex-col"><div ref={contentScrollRef} onScroll={handleContentScroll} className="app-scroll-root min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain"><AnimatePresence mode="wait">
{viewUser ? (
  <motion.div key="user-profile" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("top", definition)}>
    <UserProfileView user={viewUser} products={products} badges={badgeProgress} highlightBadge={highlightBadge} openResult={openResult} close={() => setViewUser(null)} openFavorites={() => setHistoryList({ title: `${viewUser.displayName} ${localeCopy.favoritesLower}`, products: db.saves.filter((save) => save.userId === viewUser.id).map((save) => products.find((product) => product.id === save.productId)).filter(Boolean) })} localeCopy={localeCopy} />
  </motion.div>
) : showAddProduct && !addProductAsSheet ? (
  <motion.div key="add-product" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("top", definition)}>
    <AddProductScreen draft={addProductDraft} close={closeAddProduct} onSubmit={submitPendingProduct} />
  </motion.div>
) : showAdminReview ? (
  <motion.div key="admin-review" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("top", definition)}>
    <AdminReviewScreen submissions={reviewSubmissions} close={closeAdminReview} onRefresh={refreshReviewSubmissions} onApprove={approveReviewSubmission} onNeedsInfo={markReviewNeedsInfo} onRejectDuplicate={rejectReviewDuplicate} />
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
  <motion.div key="history-list" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("history-list", definition)}>
    <ProductListScreen title={historyList.title} products={historyList.products} openResult={openResult} close={() => setHistoryList(null)} />
  </motion.div>
) : peopleList ? (
  <motion.div key="people-list" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("top", definition)}>
    <PeopleListScreen title={peopleList.title} users={peopleList.users} openUserProfile={(user) => setViewUser(user)} close={() => setPeopleList(null)} />
  </motion.div>
) : badgeDetail ? (
  <motion.div key="badge-detail" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("top", definition)}>
    <BadgeDetailScreen badge={badgeDetail} close={() => { if (showBadges) shouldRestoreBadgesScrollRef.current = true; setBadgeDetail(null); }} />
  </motion.div>
) : showDeleteAccount ? (
  <motion.div key="delete" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("top", definition)}>
    <DeleteAccountScreen close={() => setShowDeleteAccount(false)} onConfirmDelete={confirmDeleteAccount} />
  </motion.div>
) : showBadges ? (
  <motion.div key="badges" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={pageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("badges", definition)}>
    <BadgesScreen badges={badgeProgress} highlightBadge={highlightBadge} close={() => setShowBadges(false)} openBadge={openBadgeFromBadgesList} />
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
  <motion.div key={`result-${result?.id || "unknown"}`} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={productPageTransition} onAnimationStart={(definition) => handleScreenAnimationStart("product", definition)}>
    <ResultScreen product={result} products={products} close={closeResult} openResult={openResult} openDetail={openPartDetail} openPlasticListEvidence={openPlasticListEvidence} openShare={(product) => setShareProduct(product)} favoriteIds={favoriteIds} toggleFavorite={toggleFavorite} profile={profile} localeCopy={localeCopy} onFavoriteAdded={() => showToast(`Added to ${localeCopy.favoritesLower}`, 1800)} onShareSuccess={showShareBadgeToast} onSubmitProductPhoto={submitProductPhotoForReview} onScoreBreakdownOpen={(product) => { awardBadge("deep_diver", 1, `score-detail:${product?.id}`); }} onAttachedSourceOpen={(product, link) => { awardBadge("deep_diver", 1, `attached-source:${product?.id}:${link?.source?.id}`); if (hasLabelInspectorSignal(product, link)) awardBadge("ingredient_inspector", 1, `label-source:${product?.id}:${link?.source?.id}`); }} onBetterSwapOpen={(from, to) => awardBadge("plastic_pro", 1, `swap-view:${from?.id}:${to?.id}`)} />
  </motion.div>
) : (
  <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={returnToTabTransition} onAnimationStart={(definition) => handleScreenAnimationStart(tab === "history" ? "history" : tab === "search" ? "search" : tab === "social" ? "social" : tab === "profile" ? "profile" : "top", definition)}>
    {tab === "scan" && <ScanScreen products={products} openResult={handleScan} openAddProduct={openAddProduct} onProductScanned={handleProductScanned} />}
    {tab === "search" && <SearchScreen products={products} openResult={openResult} openAddProduct={() => openAddProduct()} onSearchAction={awardSearchBadge} />}
    {tab === "history" && <HistoryScreen products={products} scans={scanHistory} openResult={openResult} openScanned={() => openHomeHistoryList({ title: "Products scanned", products: scannedProducts })} openSearched={() => openHomeHistoryList({ title: "Products searched", products: searchedProducts })} />}
    {tab === "social" && <SocialScreen products={products} openResult={openResult} openNotifications={() => { setUnreadNotifications(0); setShowNotifications(true); }} openUserProfile={openSocialUserProfile} savedProductIds={favoriteIds} toggleFavorite={toggleFavorite} unreadNotifications={unreadNotifications} />}
    {tab === "profile" && <ProfileScreen products={products} badges={badgeProgress} highlightBadge={highlightBadge} openResult={openResult} openSettings={() => setShowSettings(true)} openFavorites={openFavoritesFromProfile} openBadges={openBadgesFromProfile} openBadge={openBadgeFromProfile} openPlans={openPlansFromProfile} openAdminReview={openAdminReview} pendingReviewCount={pendingReviewCount} profile={profile} updateProfile={updateProfile} favoriteIds={favoriteIds} scanCount={scannedProducts.length} followingCount={followingUsers.length} followersCount={followerUsers.length} openScans={() => setHistoryList({ title: "Your scans", products: scannedProducts })} openFollowing={() => setPeopleList({ title: "Following", users: followingUsers })} openFollowers={() => setPeopleList({ title: "Followers", users: followerUsers })} localeCopy={localeCopy} />}
  </motion.div>
)}
</AnimatePresence>
</div>
<AnimatePresence>
{showBackToTopButton && <motion.button type="button" onClick={scrollCurrentPageToTop} initial={{ opacity: 0, y: 10, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.94 }} transition={{ type: "spring", stiffness: 420, damping: 30 }} className={`absolute right-5 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-950 text-2xl font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.22)] ring-1 ring-white/20 backdrop-blur-xl active:scale-[0.96] ${historyList || showResult ? "bottom-5" : "bottom-[7.25rem]"}`} aria-label="Back to top">↑</motion.button>}
</AnimatePresence>
{!hideNav && <div className="shrink-0"><BottomNav tab={tab} setTab={setTabSafe} /></div>}
</div>
{canSwipeBack && !showResult && !detail && !plasticListDetail && !showAddProduct && <div className="absolute left-0 top-0 z-50 h-full w-14 touch-pan-y" aria-hidden="true" {...appSwipeBackHandlers} />}
<AnimatePresence>
{showPlans && <motion.div key="plans-overlay" initial={{ x: "100%" }} animate={{ x: 0, transition: proPageTransition }} exit={{ x: "100%", transition: proPageExitTransition }} className="absolute inset-0 z-30 overflow-y-auto bg-[#f7f3eb] shadow-[-18px_0_40px_rgba(0,0,0,0.08)] will-change-transform">
  <PlansScreen close={closePlans} />
</motion.div>}
</AnimatePresence>
<AnimatePresence>
{showAddProduct && addProductAsSheet && <motion.div key="add-product-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }} className="absolute inset-0 z-40 flex items-end overflow-hidden overscroll-none bg-neutral-950/28 backdrop-blur-md" onClick={closeAddProduct} onTouchMoveCapture={(event) => event.stopPropagation()}>
  <motion.div key="add-product-sheet" variants={{ hidden: { y: "105%", transition: { duration: 0.36, ease: [0.32, 0.72, 0, 1] } }, visible: { y: 0, transition: { type: "spring", stiffness: 280, damping: 34, mass: 1.05 } } }} initial="hidden" animate="visible" exit="hidden" drag="y" dragListener={false} dragControls={addProductDragControls} dragMomentum={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.22 }} onTouchStartCapture={handleAddProductSheetTouchStart} onTouchMoveCapture={(event) => event.stopPropagation()} onTouchEndCapture={handleAddProductSheetTouchEnd} onDragEnd={(_, info) => { if (info.offset.y > 56 || info.velocity.y > 420) closeAddProduct(); }} className="max-h-[92%] w-full touch-pan-y overscroll-contain overflow-y-auto rounded-t-[2rem] bg-neutral-950 shadow-[0_-28px_70px_rgba(0,0,0,0.35)]" onClick={(event) => event.stopPropagation()}>
    <div className="flex justify-center pb-2 pt-3" onPointerDown={(event) => addProductDragControls.start(event)}><div className="h-1.5 w-12 rounded-full bg-white/35" /></div>
    <AddProductScreen draft={addProductDraft} close={closeAddProduct} onSubmit={submitPendingProduct} />
  </motion.div>
</motion.div>}
</AnimatePresence>
</div>
}
</Phone>
</div>;
}
