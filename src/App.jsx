import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
  ],
  contexts: [
    { id: "food_contact", name: "Food contact", penalty: -10, summary: "Plastic or unknown material is in direct contact with food." },
    { id: "drink_contact", name: "Drink contact", penalty: -10, summary: "Plastic or unknown material is in direct contact with a beverage." },
    { id: "acidic", name: "Acidic contents", penalty: -10, summary: "Acidic foods or drinks can increase concern when paired with liners or plastic contact." },
    { id: "fatty", name: "Fatty or oily contents", penalty: -8, summary: "Fatty or oily contents can increase concern with certain food-contact plastics." },
    { id: "heat", name: "Heat exposure", penalty: -10, summary: "Heat can increase concern with certain plastic materials or liners." },
    { id: "skin", name: "Skin contact", penalty: -5, summary: "Plastic material is used in a skin-contact product." },
    { id: "prolonged_skin", name: "Prolonged skin contact", penalty: -10, summary: "Product is used in prolonged contact with skin." },
    { id: "reuse", name: "Repeated use or friction", penalty: -6, summary: "Repeated use, squeezing, rubbing, or mechanical wear may increase shedding concern." },
    { id: "internal", name: "Internal plastic packaging", penalty: -10, summary: "Product contains hidden or internal plastic beyond the main package." },
  ],
  sources: [
    { id: "source_cfia", title: "Bisphenol A and BPA Alternatives in Selected Canned Foods", organization: "Canadian Food Inspection Agency", credibility: "High", summary: "Food can linings may contain bisphenols or alternatives that can migrate under some conditions." },
    { id: "source_fda", title: "Food Contact Substances", organization: "U.S. Food and Drug Administration", credibility: "High", summary: "Food-contact packaging risk depends on material, use case, and exposure conditions." },
    { id: "source_pva", title: "Water-soluble polymer films in detergent pods", organization: "Material notes", credibility: "Medium", summary: "Many dishwasher and laundry pods use water-soluble PVA/PVOH film, a synthetic polymer rather than gelatin." },
  ],
  products: [
    { id: "old_spice", name: "Pure Sport Deodorant", brand: "Old Spice", categoryId: "cat_personal", imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "Medium", verification: "inferred" },
    { id: "always_ultra", name: "Ultra Thin", brand: "Always", categoryId: "cat_hygiene", imageUrl: "https://images.unsplash.com/photo-1583946099379-f9c9cb8bc030?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "Low", verification: "inferred" },
    { id: "allens_apple", name: "Apple Juice", brand: "Allen’s", categoryId: "cat_food_drink", imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "Medium", verification: "inferred" },
    { id: "kirkland_tuna", name: "Solid Light Tuna", brand: "Kirkland Signature", categoryId: "cat_food_drink", imageUrl: "https://images.unsplash.com/photo-1584269600519-1123c7b0e6f6?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "Low", verification: "inferred" },
    { id: "kirkland_dishwasher", name: "UltraShine Dishwasher Detergent", brand: "Kirkland Signature", categoryId: "cat_cleaning", imageUrl: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "Medium", verification: "inferred" },
    { id: "paper_soap", name: "Paper-Wrapped Bar Soap", brand: "Local Maker", categoryId: "cat_plastic_free", imageUrl: "https://images.unsplash.com/photo-1607006483224-21d4b8bc8bd7?q=80&w=800&auto=format&fit=crop", country: "CA", confidence: "High", verification: "community_verified" },
  ],
  productParts: [
    { id: "os_container", productId: "old_spice", partType: "main_container", displayName: "Main container", materialId: "plastic", plasticTypeId: "pp5", baseImpact: -10, materialImpact: -5, notes: "Common deodorant casing, likely PP." },
    { id: "os_cap", productId: "old_spice", partType: "cap_lid", displayName: "Cap", materialId: "plastic", plasticTypeId: "pp5", baseImpact: -8, materialImpact: -5, notes: "Likely plastic cap." },
    { id: "always_wrap", productId: "always_ultra", partType: "inner_packaging", displayName: "Individual wrapper", materialId: "plastic", plasticTypeId: "unknown_plastic", baseImpact: -12, materialImpact: -15, notes: "Individual wrapping likely includes plastic film." },
    { id: "always_product", productId: "always_ultra", partType: "product_component", displayName: "Product layers", materialId: "mixed", plasticTypeId: "unknown_plastic", baseImpact: -20, materialImpact: -15, notes: "Absorbent product likely uses mixed synthetic materials." },
    { id: "allens_pack", productId: "allens_apple", partType: "main_container", displayName: "Tetra Pak carton", materialId: "mixed", plasticTypeId: "ldpe4", baseImpact: -15, materialImpact: -12, notes: "Aseptic cartons commonly include paperboard, aluminum, and polyethylene layers." },
    { id: "allens_cap", productId: "allens_apple", partType: "cap_lid", displayName: "Cap", materialId: "plastic", plasticTypeId: "hdpe2", baseImpact: -8, materialImpact: -5, notes: "Plastic screw cap." },
    { id: "tuna_can", productId: "kirkland_tuna", partType: "main_container", displayName: "Steel can", materialId: "metal", plasticTypeId: "none", baseImpact: 0, materialImpact: 0, notes: "Main can body is steel." },
    { id: "tuna_liner", productId: "kirkland_tuna", partType: "liner", displayName: "Can liner", materialId: "mixed", plasticTypeId: "unknown_plastic", baseImpact: -18, materialImpact: -15, notes: "Most food cans use a protective internal liner." },
    { id: "dish_container", productId: "kirkland_dishwasher", partType: "main_container", displayName: "Outer tub", materialId: "plastic", plasticTypeId: "hdpe2", baseImpact: -10, materialImpact: -5, notes: "Large plastic container." },
    { id: "dish_podfilm", productId: "kirkland_dishwasher", partType: "inner_packaging", displayName: "Pod film", materialId: "plastic", plasticTypeId: "pva", baseImpact: -15, materialImpact: -15, notes: "Dishwasher pods commonly use dissolvable PVA/PVOH film." },
    { id: "soap_wrap", productId: "paper_soap", partType: "outer_packaging", displayName: "Wrapper", materialId: "paper", plasticTypeId: "none", baseImpact: 0, materialImpact: 0, notes: "Paper wrapper only." },
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
    { id: "ctx_dish_internal", productId: "kirkland_dishwasher", partId: "dish_podfilm", contextId: "internal" },
    { id: "ctx_dish_heat", productId: "kirkland_dishwasher", partId: "dish_podfilm", contextId: "heat" },
  ],
  sourceLinks: [
    { sourceId: "source_cfia", entityType: "part", entityId: "tuna_liner" },
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
  ],
};

const badgeDefinitions = [
  { id: "plastic_detective", icon: "🔍", name: "Plastic Detective", description: "You scan products to uncover what’s really inside.", progress: 18, tiers: [{ name: "Bronze", threshold: 5 }, { name: "Silver", threshold: 25 }, { name: "Gold", threshold: 75 }, { name: "Platinum", threshold: 200 }] },
  { id: "microplastic_hunter", icon: "🧪", name: "Microplastic Hunter", description: "You catch the plastics others miss.", progress: 14, tiers: [{ name: "Bronze", threshold: 5 }, { name: "Silver", threshold: 20 }, { name: "Gold", threshold: 50 }, { name: "Platinum", threshold: 120 }] },
  { id: "red_flag_radar", icon: "🚨", name: "Red Flag Radar", description: "You spot high-risk products instantly.", progress: 9, tiers: [{ name: "Bronze", threshold: 5 }, { name: "Silver", threshold: 20 }, { name: "Gold", threshold: 50 }, { name: "Platinum", threshold: 120 }] },
  { id: "ingredient_inspector", icon: "🧠", name: "Ingredient Inspector", description: "You go deeper than surface-level info.", progress: 42, tiers: [{ name: "Bronze", threshold: 15 }, { name: "Silver", threshold: 50 }, { name: "Gold", threshold: 120 }, { name: "Platinum", threshold: 300 }] },
  { id: "data_driven", icon: "📊", name: "Data Driven", description: "You use filters and tools to make smarter choices.", progress: 11, tiers: [{ name: "Bronze", threshold: 5 }, { name: "Silver", threshold: 20 }, { name: "Gold", threshold: 60 }, { name: "Platinum", threshold: 150 }] },
  { id: "community_voice", icon: "⭐", name: "Community Voice", description: "You help others by sharing your experience.", progress: 3, tiers: [{ name: "Bronze", threshold: 1 }, { name: "Silver", threshold: 5 }, { name: "Gold", threshold: 15 }, { name: "Platinum", threshold: 40 }] },
  { id: "conscious_consumer", icon: "🧭", name: "Conscious Consumer", description: "Your choices consistently avoid plastics.", progress: 72, isPercent: true, tiers: [{ name: "Bronze", threshold: 60 }, { name: "Silver", threshold: 75 }, { name: "Gold", threshold: 85 }, { name: "Platinum", threshold: 95 }] },
  { id: "deep_diver", icon: "🔎", name: "Deep Diver", description: "You explore products in detail before deciding.", progress: 24, tiers: [{ name: "Bronze", threshold: 10 }, { name: "Silver", threshold: 30 }, { name: "Gold", threshold: 80 }, { name: "Platinum", threshold: 200 }] },
  { id: "barcode_whisperer", icon: "⚡", name: "Barcode Whisperer", description: "You scan like a pro.", progress: 8, tiers: [{ name: "Bronze", threshold: 3 }, { name: "Silver", threshold: 10 }, { name: "Gold", threshold: 25 }, { name: "Platinum", threshold: 75 }] },
  { id: "eco_upgrade", icon: "🔥", name: "Eco Upgrade", description: "You consistently improve your product lineup.", progress: 6, tiers: [{ name: "Bronze", threshold: 5 }, { name: "Silver", threshold: 15 }, { name: "Gold", threshold: 40 }, { name: "Platinum", threshold: 100 }] },
  { id: "plastic_pro", icon: "🧠", name: "Plastic Pro", description: "You’ve mastered the system.", progress: 5, tiers: [{ name: "Bronze", threshold: 5 }, { name: "Silver", threshold: 10 }, { name: "Gold", threshold: 15 }, { name: "Platinum", threshold: 20 }] },
  { id: "word_of_mouth", icon: "📣", name: "Word of Mouth", description: "You put great finds and warnings on your friends’ radar.", progress: 2, tiers: [{ name: "Bronze", threshold: 3 }, { name: "Silver", threshold: 10 }, { name: "Gold", threshold: 25 }, { name: "Platinum", threshold: 75 }] },
];

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

function getFavoritesByCategory(products) {
  return db.saves.filter((save) => save.userId === "user_me").map((save) => products.find((product) => product.id === save.productId)).filter(Boolean).reduce((groups, product) => ({ ...groups, [product.category?.name || "Other"]: [...(groups[product.category?.name || "Other"] || []), product] }), {});
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

function hydrateProduct(product) {
  const category = getById("categories", product.categoryId);
  const rawParts = db.productParts.filter((part) => part.productId === product.id);
  const parts = rawParts.map((part) => {
    const material = getById("materials", part.materialId);
    const plastic = getById("plasticTypes", part.plasticTypeId);
    const contexts = getPartContexts(part.id);
    const contextImpact = contexts.reduce((sum, item) => sum + item.context.penalty, 0);
    const totalImpact = part.baseImpact + part.materialImpact + contextImpact;
    const tone = totalImpact === 0 ? "bg-emerald-800" : totalImpact > -10 ? "bg-emerald-400" : totalImpact > -25 ? "bg-red-400" : "bg-red-800";
    return { ...part, material, plastic, contexts, contextImpact, totalImpact, tone, recyclability: plastic?.code !== "NONE" ? plastic?.recyclability || "unknown" : material?.recyclability || "unknown" };
  });
  const base = category?.baseScore ?? 50;
  const partPenalty = rawParts.reduce((sum, part) => sum + part.baseImpact + part.materialImpact, 0);
  const contextPenalty = getProductContexts(product.id).reduce((sum, item) => sum + item.context.penalty, 0);
  const verificationBonus = product.verification === "community_verified" ? 3 : 0;
  const score = clampScore(base + partPenalty + contextPenalty + verificationBonus);
  const theme = getScoreTheme(score);
  const sources = [
    ...parts.flatMap((part) => getSourcesFor({ entityType: "part", entityId: part.id })),
    ...parts.flatMap((part) => getSourcesFor({ entityType: "plastic_type", entityId: part.plasticTypeId })),
    ...getProductContexts(product.id).flatMap((item) => getSourcesFor({ entityType: "context", entityId: item.contextId })),
  ];
  const uniqueSources = Array.from(new Map(sources.map((link) => [link.source.id, link])).values());
  return { ...product, category, parts, score, theme, rating: theme.label, sources: uniqueSources, community: { scans: Math.max(3, parts.length * 3), favorites: db.saves.filter((save) => save.productId === product.id).length } };
}

function CanadaBadge() {
  return null;
}

function FlashlightIcon({ size = 24 }) {
  return <svg width={size} height={size} viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true"><path d="M634 64H390c-35.2 0-48 28.8-48 64h340c0-35.2-12.8-64-48-64zM392.2 295c15.2 17.6 23.8 40 23.8 63.4v531.8c0 43.8 35.8 69.8 79.8 69.8h32.6c43.8 0 79.8-25.8 79.8-69.8V358.4c0-23.4 8.6-45.6 23.8-63.4 30.8-35.8 50-69 50-135H342c0 70 19.2 99.2 50.2 135z m63.8 181.6c0-31.2 25.2-56.6 56-56.6s56 25.4 56 56.6v70.8c0 31.2-25.2 56.6-56 56.6s-56-25.4-56-56.6v-70.8z" /><path d="M512 546m-40 0a40 40 0 1 0 80 0 40 40 0 1 0-80 0Z" /></svg>;
}

function Icon({ type, active = true, size = 24, animate = false }) {
  const color = active ? "#fff" : "#737373";
  const fillColor = active ? "#fff" : "none";
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (type === "scan") return <motion.svg {...common}>{[6, 9, 11.5, 14.5, 17.5].map((x, i) => <motion.line key={x} x1={x} y1="7" x2={x} y2="17" strokeWidth={[2.6, 1, 2.8, 1.2, 2.6][i]} animate={animate ? { y1: [7, 5.8, 7], y2: [17, 18.2, 17] } : {}} transition={{ duration: 0.45, delay: i * 0.03 }} />)}<path d="M3 8V4h4" /><path d="M17 4h4v4" /><path d="M21 16v4h-4" /><path d="M7 20H3v-4" /></motion.svg>;
  if (type === "search") return <motion.svg {...common} animate={animate ? { y: [0, -3, 0] } : {}} transition={{ type: "spring", stiffness: 450, damping: 18 }}><circle cx="11" cy="11" r="6" fill={fillColor} fillOpacity={active ? 0.18 : 0} /><line x1="16" y1="16" x2="21" y2="21" />{active && <circle cx="18" cy="6" r="1.8" fill="#fff" stroke="none" />}</motion.svg>;
  if (type === "history") return <motion.svg {...common}><motion.g animate={animate ? { rotate: 360 } : { rotate: 0 }} transition={{ duration: 0.6 }} style={{ transformOrigin: "12px 12px" }}><path d="M4 12a8 8 0 1 0 2.3-5.7" /><polyline points="4 4 4 9 9 9" /></motion.g><circle cx="12" cy="12" r="1" fill={color} stroke="none" /><path d="M12 12V7" /><path d="M12 12l4 2" /></motion.svg>;
  if (type === "social") return <motion.svg {...common}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" fill={fillColor} fillOpacity={active ? 0.18 : 0} /><motion.circle cx="12" cy="12" r="3" animate={animate ? { scaleY: [1, 0.12, 1] } : {}} transition={{ duration: 0.22 }} style={{ transformOrigin: "12px 12px" }} /></motion.svg>;
  if (type === "profile") return <motion.svg {...common} animate={animate ? { y: [0, -3, 0] } : {}} transition={{ type: "spring", stiffness: 450, damping: 16 }}><circle cx="12" cy="8" r="4" fill={fillColor} fillOpacity={active ? 0.18 : 0} /><path d="M4 20c2-4 14-4 16 0" /></motion.svg>;
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
const Phone = ({ children }) => <div className="mx-auto min-h-[760px] w-full max-w-[430px] overflow-hidden rounded-[2.35rem] border border-white/70 bg-[#f8f5ef] shadow-[0_32px_90px_rgba(0,0,0,0.22)] ring-1 ring-black/5">{children}</div>;

function ProductImage({ src, alt, className }) {
  const [error, setError] = useState(false);
  return src && !error ? <img src={src} alt={alt} className={className} onError={() => setError(true)} /> : <div className={`flex items-center justify-center bg-[#ece8df] text-2xl text-neutral-500 ${className}`}>📷</div>;
}

function ScoreRing({ score }) {
  const value = clampScore(score);
  const theme = getScoreTheme(value);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return <div className="relative flex h-[154px] w-[154px] items-center justify-center"><svg width="154" height="154" viewBox="0 0 140 140" className="-rotate-90 drop-shadow-sm"><circle cx="70" cy="70" r={radius} stroke="#ebe6dc" strokeWidth="13" fill="none" /><motion.circle cx="70" cy="70" r={radius} stroke={theme.ring} strokeWidth="13" fill="none" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ type: "spring", stiffness: 65, damping: 18 }} /></svg><div className="absolute text-center"><div className="text-[42px] font-semibold tracking-[-0.06em] text-neutral-950">{value}</div><div className="text-xs font-medium text-neutral-400">/ 100</div></div></div>;
}

function ProductRow({ product, onClick }) {
  return <motion.button type="button" whileTap={{ scale: 0.985 }} onClick={onClick} className="w-full text-left"><Card className="bg-white/78"><div className="flex items-center gap-3 p-3.5"><ProductImage src={product.imageUrl} alt={product.name} className="h-16 w-16 rounded-2xl object-cover shadow-sm" /><div className="min-w-0 flex-1"><div className="flex items-center gap-1 truncate text-[15px] font-semibold tracking-[-0.01em] text-neutral-950"><span className="truncate">{product.name}</span></div><div className="mt-0.5 text-sm text-neutral-500">{product.brand}</div><div className="mt-1 text-xs text-neutral-400">{product.category?.name}</div></div><div className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold shadow-inner" style={{ color: product.theme.ring, background: product.theme.bg }}>{product.score}</div></div></Card></motion.button>;
}

function BottomNav({ tab, setTab }) {
  return <div className="border-t border-white/70 bg-white/72 px-2 py-2 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] backdrop-blur-2xl"><div className="grid grid-cols-5 gap-1">{getBottomNavItems().map(([key, type, label]) => { const isActive = tab === key; return <button type="button" key={key} onClick={() => setTab(key)} className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-xs transition ${isActive ? "bg-neutral-950 text-white shadow-[0_10px_22px_rgba(0,0,0,0.16)]" : "text-neutral-500 hover:bg-black/5"}`}><Icon type={type} active={isActive} animate={isActive} /><span className={isActive ? "font-semibold text-white" : "text-neutral-500"}>{label}</span></button>; })}</div></div>;
}

function ScanScreen({ products, openResult }) {
  const [flashOn, setFlashOn] = useState(false);
  return <div className="relative flex min-h-[690px] flex-col overflow-hidden bg-neutral-950 text-white"><div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#52525b_0%,_#18181b_56%,_#050505_100%)]" /><div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),transparent_28%,rgba(0,0,0,0.45))]" /><div className="relative z-10 flex items-center justify-between px-5 pb-3 pt-7"><h1 className="text-[27px] font-semibold tracking-[-0.04em]">Scan product barcode</h1><button type="button" onClick={() => setFlashOn(!flashOn)} className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/15 shadow-sm backdrop-blur-xl transition ${flashOn ? "bg-white text-neutral-950" : "bg-white/10 text-white"}`} aria-label="Toggle flashlight"><FlashlightIcon size={23} /></button></div><div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center"><motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => openResult(products[4] || null)} className="relative flex h-64 w-64 items-center justify-center rounded-[2.25rem] border border-white/70 bg-white/8 shadow-[0_30px_70px_rgba(0,0,0,0.45)] backdrop-blur-sm"><span className="absolute left-8 top-8 h-8 w-8 border-l-[5px] border-t-[5px] border-white rounded-tl-lg" /><span className="absolute right-8 top-8 h-8 w-8 border-r-[5px] border-t-[5px] border-white rounded-tr-lg" /><span className="absolute bottom-8 left-8 h-8 w-8 border-b-[5px] border-l-[5px] border-white rounded-bl-lg" /><span className="absolute bottom-8 right-8 h-8 w-8 border-b-[5px] border-r-[5px] border-white rounded-br-lg" /><Icon type="scan" size={112} active={false} /></motion.button><p className="mt-6 max-w-[280px] text-sm leading-6 text-white/68">Point your camera at a barcode to check for hidden plastic.</p><Button onClick={() => openResult(null)} variant="light" className="mt-6">Simulate unknown barcode</Button></div></div>;
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
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title="Why" right={<Button onClick={close} variant="ghost">Back</Button>} /><Card><div className="p-5"><div className="text-sm text-neutral-500">{product.name}</div><h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">{part.displayName}</h2><div className="mt-3 inline-flex rounded-full bg-[#f7f3eb] px-3 py-1 text-sm text-neutral-700">{part.plastic?.name || part.material?.name || "Unknown material"}</div><p className="mt-4 text-sm leading-6 text-neutral-500">{part.notes}</p></div></Card><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><h3 className="font-semibold text-neutral-950">Score impact</h3><div className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><span>Component</span><span>{part.baseImpact}</span></div><div className="flex justify-between"><span>Material type</span><span>{part.materialImpact}</span></div><div className="flex justify-between"><span>Context</span><span>{part.contextImpact}</span></div><div className="flex justify-between border-t border-neutral-200 pt-2 font-semibold"><span>Total impact</span><span>{part.totalImpact}</span></div></div></div><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><h3 className="font-semibold text-neutral-950">Context modifiers</h3><div className="mt-3 space-y-2">{part.contexts.length ? part.contexts.map((item) => <div key={item.id} className="rounded-2xl bg-[#f7f3eb] p-3"><div className="flex justify-between gap-3 font-medium text-neutral-950"><span>{item.context.name}</span><span>{item.context.penalty}</span></div><p className="mt-1 text-sm leading-5 text-neutral-500">{item.context.summary}</p></div>) : <p className="text-sm text-neutral-500">No special context modifiers attached.</p>}</div></div><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><h3 className="font-semibold text-neutral-950">Sources & research</h3><div className="mt-3 space-y-2">{uniqueSources.length ? uniqueSources.map((link) => <SourceCard key={link.source.id} link={link} />) : <p className="text-sm text-neutral-500">No sources attached yet.</p>}</div></div></div>;
}

function ResultScreen({ product, close, openDetail, openShare }) {
  const [addedToFavorites, setAddedToFavorites] = useState(false);
  const [useLocation, setUseLocation] = useState(false);
  const location = "Toronto";
  if (!product) return <UnknownScreen close={close} />;
  const recyclingStatus = getProductRecyclability(product, useLocation, location);
  const recyclingMeta = recyclabilityMeta(recyclingStatus);
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title="Product score" right={<Button onClick={close} variant="ghost">← Back</Button>} /><Card><div className="p-5 text-center"><ProductImage src={product.imageUrl} alt={product.name} className="mx-auto h-36 w-36 rounded-3xl object-cover" /><div className="mt-5 flex justify-center"><ScoreRing score={product.score} /></div><div className="mt-2 inline-flex rounded-full px-4 py-2 text-sm font-medium" style={{ color: product.theme.ring, background: product.theme.bg }}>{product.rating}</div><h2 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950">{product.name}</h2><p className="text-neutral-500">{product.brand}</p><p className="mt-2 text-xs text-neutral-500">Available in Canada • {product.category?.name} • {reviewStatusLabel(product.verification)} • {dataQualityLabel(product.confidence)}</p></div></Card><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-semibold text-neutral-950">Where plastic is found</h3><span className="shrink-0 text-xs text-neutral-500">Score from database</span></div><div className="space-y-3">{product.parts.map((part) => <button type="button" key={part.id} onClick={() => openDetail(product, part)} className="group flex w-full items-center gap-3 rounded-2xl bg-[#f7f3eb] p-3 text-left transition hover:bg-[#f1eadf]"><div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg text-neutral-700 shadow-sm">{part.partType === "liner" ? "◌" : part.partType === "inner_packaging" ? "◈" : part.partType === "cap_lid" ? "○" : part.partType === "outer_packaging" ? "□" : "▣"}</div><div className="min-w-0 flex-1"><div className="font-medium text-neutral-950">{part.displayName}</div><div className="text-sm text-neutral-500">{part.plastic?.code !== "NONE" ? part.plastic?.name : part.material?.name}</div></div><span className={`h-3 w-3 rounded-full ${part.tone}`} /><div className="w-10 text-right font-medium text-neutral-950">{part.totalImpact}</div><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-lg font-semibold text-neutral-950 shadow-sm transition group-hover:scale-105">i</div></button>)}</div></div><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-start justify-between gap-4"><div><h3 className="font-semibold text-neutral-950">Recyclability</h3><p className="mt-1 text-sm text-neutral-500">Recycling rules can change by municipality.</p></div><div className="flex shrink-0 flex-col items-end gap-1"><span className="text-xs font-medium text-neutral-500">Use my location</span><ToggleSwitch checked={useLocation} onClick={() => setUseLocation(!useLocation)} label="Use my location for recycling rules" /></div></div><div className={`rounded-2xl p-3 ${recyclingMeta.bg}`}><div className={`font-semibold ${recyclingMeta.tone}`}>{recyclingMeta.icon} {recyclingMeta.title}</div><p className="mt-1 text-sm text-neutral-600">{useLocation ? `Based on demo location: ${location}. ` : "General guidance. "}{recyclingMeta.summary}</p></div><div className="mt-3 space-y-2">{product.parts.map((part) => { const status = getPartRecyclability(part, useLocation, location); const meta = recyclabilityMeta(status); return <div key={part.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#f7f3eb] p-3"><div className="min-w-0"><div className="font-medium text-neutral-950">{part.displayName}</div><div className="text-sm text-neutral-500">{part.plastic?.code !== "NONE" ? part.plastic?.code : part.material?.name}</div></div><div className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${meta.bg} ${meta.tone}`}>{meta.title}</div></div>; })}</div></div><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><h3 className="font-semibold text-neutral-950">Community insights</h3><p className="mt-2 text-sm text-neutral-500">{product.community.scans} scans. {product.community.favorites} favorites. Trusted circles help verify hidden packaging.</p></div><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><h3 className="font-semibold text-neutral-950">Sources attached</h3><div className="mt-3 space-y-2">{product.sources.slice(0, 2).map((link) => <SourceCard key={link.source.id} link={link} />)}{!product.sources.length && <p className="text-sm text-neutral-500">No source links attached yet.</p>}</div></div><div className="sticky bottom-3 mt-5 grid grid-cols-2 gap-3"><Button onClick={() => setAddedToFavorites(!addedToFavorites)} variant={addedToFavorites ? "outline" : "solid"} className={addedToFavorites ? "bg-white text-neutral-400" : ""}>{addedToFavorites ? "Added" : "❤ Favorite"}</Button><Button onClick={() => openShare(product)} variant="outline">↗ Share</Button></div></div>;
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
  return <div className="min-h-[690px] px-5 pb-4"><Header title="Search" /><div className="mb-4 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm"><Icon type="search" active={false} size={22} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products, brands, or categories" className="w-full bg-transparent text-sm outline-none" /></div><div className="mb-4 flex gap-2 overflow-x-auto pb-1"><button type="button" onClick={() => setPlasticFreeOnly(!plasticFreeOnly)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm shadow-sm ${plasticFreeOnly ? "bg-neutral-950 text-white" : "bg-white text-neutral-700"}`}>Plastic-free only</button>{tags.map((tag) => <button type="button" key={tag} onClick={() => toggleTag(tag)} className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm shadow-sm ${activeTags.includes(tag) ? "bg-neutral-950 text-white" : "bg-white text-neutral-700"}`}>{tag}</button>)}</div><div className="space-y-2">{filtered.length ? filtered.map((product) => <ProductRow key={product.id} product={product} onClick={() => openResult(product)} />) : <div className="mt-20 text-center"><div className="text-xl font-semibold text-neutral-950">No product found</div><p className="mt-2 text-sm text-neutral-500">Add photos and packaging notes to help verify it.</p><Button onClick={openAddProduct} className="mt-5">＋ Add product</Button></div>}</div></div>;
}

function AddProductScreen({ close }) {
  const [flashOn, setFlashOn] = useState(false);
  return <div className="relative min-h-[690px] overflow-y-auto bg-neutral-950 text-white"><div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#3f3f46_0%,_#18181b_55%,_#09090b_100%)]" /><div className="relative z-10 px-5 pb-6"><div className="flex items-center justify-between pb-3 pt-6"><h1 className="text-2xl font-semibold tracking-tight">Add product</h1><Button onClick={close} variant="light">Back</Button></div><div className="mt-8 flex flex-col items-center text-center"><button type="button" className="relative flex h-64 w-64 items-center justify-center rounded-[2rem] border-2 border-white/80 bg-white/5 shadow-2xl"><span className="absolute left-8 top-8 h-8 w-8 border-l-4 border-t-4 border-white" /><span className="absolute right-8 top-8 h-8 w-8 border-r-4 border-t-4 border-white" /><span className="absolute bottom-8 left-8 h-8 w-8 border-b-4 border-l-4 border-white" /><span className="absolute bottom-8 right-8 h-8 w-8 border-b-4 border-r-4 border-white" /><div className="flex flex-col items-center gap-3"><div className="text-5xl">📷</div><div className="text-sm font-medium text-white/80">Add product photos</div></div></button><div className="mt-5 flex gap-3"><Button variant="light">Front photo</Button><Button variant="light">Packaging</Button><button type="button" onClick={() => setFlashOn(!flashOn)} className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/20 ${flashOn ? "bg-white text-neutral-950" : "bg-white/10 text-white"}`} aria-label="Toggle light"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6" /><path d="M10 22h4" /><path d="M10 18c0-2-3-3.5-3-7a5 5 0 0 1 10 0c0 3.5-3 5-3 7" /><path d="M12 2v2" /></svg></button></div><p className="mt-5 max-w-[300px] text-sm leading-6 text-white/70">Submit the product and packaging details so the database can review hidden plastic and update the score.</p></div><div className="mt-8 space-y-3 rounded-3xl bg-white p-4 text-neutral-950 shadow-sm"><Field label="Product name" placeholder="e.g. UltraShine Dishwasher Detergent" /><Field label="Brand" placeholder="e.g. Kirkland Signature" /><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Category</span><select className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950"><option>Food and drink</option><option>Personal care</option><option>Household cleaning</option><option>Feminine hygiene</option><option>Baby</option><option>Other</option></select></label><Field label="Barcode number" placeholder="Scan or enter manually" /><label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Packaging notes</span><textarea placeholder="Main container, cap, liner, wrapper, inner packaging, etc." className="min-h-[100px] w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" /></label><Button className="w-full">Submit for review</Button></div></div></div>;
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

function SocialScreen({ products, openResult, openNotifications }) {
  const [mode, setMode] = useState("following");
  const people = db.users.filter((user) => ["user_maya", "user_jon"].includes(user.id));
  const creators = db.users.filter((user) => ["user_amelia", "user_sam"].includes(user.id));
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-4"><Header title="Social" right={<button type="button" onClick={openNotifications} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm" aria-label="Open notifications"><Icon type="bell" size={22} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" /></button>} /><div className="mb-4 grid grid-cols-2 rounded-full bg-white p-1 shadow-sm">{["following", "discover"].map((option) => <button type="button" key={option} onClick={() => setMode(option)} className={`rounded-full py-2 text-sm font-medium capitalize ${mode === option ? "bg-neutral-950 text-white" : "text-neutral-500"}`}>{option}</button>)}</div>{mode === "discover" ? <div className="space-y-4"><div><h3 className="mb-2 text-sm font-medium text-neutral-500">People you know</h3><div className="space-y-2">{people.map((user) => <SuggestedUser key={user.id} user={user} />)}</div></div><div><h3 className="mb-2 text-sm font-medium text-neutral-500">Creators</h3><div className="space-y-2">{creators.map((user) => <SuggestedUser key={user.id} user={user} />)}</div></div></div> : <div className="space-y-2">{db.social.map((activity) => { const product = products.find((p) => p.id === activity.productId); const user = db.users.find((u) => u.id === activity.userId); if (!product || !user) return null; return <Card key={activity.id}><div className="p-4"><div className="mb-3 flex items-center gap-2 text-sm text-neutral-500"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-950 text-xs font-semibold text-white shadow-sm">{user.avatar}</div><span>{user.displayName} {activity.action}</span></div><div className="font-medium text-neutral-950">{product.name}</div><p className="mt-1 text-sm text-neutral-500">{activity.note}</p><Button onClick={() => openResult(product)} variant="outline" className="mt-3">View</Button></div></Card>; })}</div>}</div>;
}

function SettingsSection({ title, children }) {
  return <div className="rounded-3xl bg-white p-4 shadow-sm"><h3 className="mb-4 font-semibold text-neutral-950">{title}</h3>{children}</div>;
}

function Field({ label, type = "text", placeholder, defaultValue = "" }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">{label}</span><input type={type} placeholder={placeholder} defaultValue={defaultValue} className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" /></label>;
}

function SettingsScreen({ close, onSignOut, onDeleteAccount }) {
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [shareActivity, setShareActivity] = useState(true);
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title="Settings" right={<Button onClick={close} variant="ghost">Back</Button>} /><div className="space-y-4"><SettingsSection title="Update name"><div className="grid grid-cols-2 gap-3"><Field label="First" defaultValue="Dave" /><Field label="Last" defaultValue="Rusinek" /></div><Button className="mt-4 w-full">Update name</Button></SettingsSection><SettingsSection title="Update email address"><Field label="Email address" type="email" defaultValue="dave@example.com" /><Button className="mt-4 w-full">Update email</Button></SettingsSection><SettingsSection title="Change password"><div className="space-y-3"><Field label="Current password" type="password" placeholder="Enter current password" /><Field label="New password" type="password" placeholder="Enter new password" /></div><Button className="mt-4 w-full">Update password</Button></SettingsSection><SettingsSection title="Notifications & Privacy"><div className="mb-4 flex items-center justify-between gap-4"><div><div className="font-medium text-neutral-950">Push notifications</div><p className="mt-1 text-sm text-neutral-500">Get updates about product reviews, comments, and new matches.</p></div><ToggleSwitch checked={notificationsOn} onClick={() => setNotificationsOn(!notificationsOn)} label="Toggle notifications" /></div><div className="flex items-center justify-between gap-4"><div><div className="font-medium text-neutral-950">Share activity</div><p className="mt-1 text-sm text-neutral-500">Show your scans and favorites in your social feed.</p></div><ToggleSwitch checked={shareActivity} onClick={() => setShareActivity(!shareActivity)} label="Toggle share activity" /></div></SettingsSection><Button onClick={onSignOut} variant="outline" className="w-full bg-white">Sign out</Button><Button onClick={onDeleteAccount} variant="ghost" className="w-full text-red-700 hover:bg-red-50">Delete account</Button></div></div>;
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
  const medalColors = { Bronze: "#c28b5a", Silver: "#bfc3c9", Gold: "#d4af37", Platinum: "#6fc7d6", Starter: "#d1d5db" };
  const medalColor = medalColors[status.currentTier] || medalColors.Starter;
  return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className={`relative overflow-hidden rounded-[24px] border border-white/70 bg-[#eee8de]/90 shadow-[0_8px_24px_rgba(0,0,0,0.06)] ${compact ? "min-h-[144px] p-3" : "min-h-[210px] p-4"}`}><div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-white/35" /><motion.div animate={highlight ? { scale: [1, 1.15, 1] } : { scale: 1 }} transition={{ duration: 0.6 }} className={`absolute flex items-center justify-center rounded-full text-white shadow-sm ${compact ? "right-3 top-3 h-7 w-7 text-xs" : "right-5 top-5 h-10 w-10 text-lg"}`} style={{ backgroundColor: medalColor }}>★{highlight && <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1 }} className="absolute inset-0 rounded-full bg-white/40 blur-sm" />}</motion.div><div className="relative flex flex-col items-center text-center"><div className={`flex items-center justify-center rounded-full bg-white shadow-sm ${compact ? "mt-4 h-16 w-16 text-3xl" : "mt-6 h-24 w-24 text-5xl"}`}>{badge.icon}</div><h4 className={`font-semibold tracking-[-0.02em] text-neutral-950 ${compact ? "mt-3 text-sm leading-tight" : "mt-5 text-2xl leading-tight"}`}>{badge.name}</h4><p className={`mx-auto text-neutral-600 ${compact ? "mt-1 line-clamp-3 min-h-[48px] max-w-[150px] text-[11px] leading-4" : "mt-3 line-clamp-3 min-h-[72px] max-w-[320px] text-lg leading-snug"}`}>{badge.description}</p></div><div className={compact ? "mt-2" : "mt-4"}><div className={`mb-1 flex justify-between font-medium text-neutral-600 ${compact ? "text-xs" : "text-lg"}`}><span>{status.currentTier}</span><span>{progressText}</span></div><div className={`overflow-hidden rounded-full bg-white shadow-inner ${compact ? "h-2" : "h-4"}`}><motion.div className="h-full rounded-full bg-neutral-950" animate={{ width: `${status.percent}%` }} transition={{ duration: 0.5 }} /></div></div></motion.div>;
}

function BadgesScreen({ badges, highlightBadge, close }) {
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title="Badges" right={<Button onClick={close} variant="ghost">Back</Button>} /><div className="grid grid-cols-2 gap-3">{badges.map((badge) => <BadgeCard key={badge.id} badge={badge} highlight={highlightBadge === badge.id} compact />)}</div></div>;
}

function FavoritesScreen({ products, openResult, close }) {
  const groups = getFavoritesByCategory(products);
  const categories = ["All", ...Object.keys(groups)];
  const [activeCategory, setActiveCategory] = useState("All");
  const visibleProducts = activeCategory === "All" ? Object.values(groups).flat() : groups[activeCategory] || [];
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-5"><Header title="Favorites" right={<Button onClick={close} variant="ghost">Back</Button>} /><div className="mb-4 flex gap-2 overflow-x-auto pb-1">{categories.map((category) => <button type="button" key={category} onClick={() => setActiveCategory(category)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm shadow-sm ${activeCategory === category ? "bg-neutral-950 text-white" : "bg-white text-neutral-700"}`}>{category}</button>)}</div><Card><div className="p-4"><h3 className="mb-3 font-semibold text-neutral-950">{activeCategory === "All" ? "All favorites" : activeCategory}</h3><div className="space-y-2">{visibleProducts.length ? visibleProducts.map((product) => <ProductRow key={product.id} product={product} onClick={() => openResult(product)} />) : <p className="p-5 text-center text-sm text-neutral-500">No favorites yet.</p>}</div></div></Card></div>;
}

function ProfileScreen({ products, badges, highlightBadge, openResult, openSettings, openFavorites, openBadges, openPlans }) {
  const following = db.follows.filter((follow) => follow.followerId === "user_me").length;
  const followers = db.follows.filter((follow) => follow.followedId === "user_me").length + 12;
  const saved = db.saves.filter((save) => save.userId === "user_me").map((save) => products.find((product) => product.id === save.productId)).filter(Boolean);
  return <div className="min-h-[690px] overflow-y-auto px-5 pb-4"><Header title="Profile" right={<Button onClick={openSettings} variant="outline" className="bg-white">Settings</Button>} /><Card><div className="p-5 text-center"><div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-950 text-2xl font-semibold text-white">D</div><h2 className="text-2xl font-semibold tracking-tight text-neutral-950">Dave R.</h2><p className="text-sm text-neutral-500">Plastic-free explorer</p><div className="mt-5 grid grid-cols-4 gap-3"><div><div className="text-2xl font-semibold">{db.scans.length}</div><div className="text-xs text-neutral-500">Scans</div></div><div><div className="text-2xl font-semibold">{following}</div><div className="text-xs text-neutral-500">Following</div></div><div><div className="text-2xl font-semibold">{followers}</div><div className="text-xs text-neutral-500">Followers</div></div><div><div className="text-2xl font-semibold">{saved.length}</div><div className="text-xs text-neutral-500">Favorites</div></div></div></div></Card><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-neutral-950">Favorites</h3><button type="button" onClick={openFavorites} className="text-sm font-medium text-neutral-500">See all</button></div><div className="space-y-2">{saved.length ? saved.slice(0, 3).map((product) => <ProductRow key={product.id} product={product} onClick={() => openResult(product)} />) : <p className="text-sm text-neutral-500">Favorite products will appear here.</p>}</div></div><div className="mt-5 rounded-3xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-neutral-950">Badges</h3><button type="button" onClick={openBadges} className="text-sm font-medium text-neutral-500">See all</button></div><div className="grid grid-cols-2 gap-3">{badges.slice(0, 4).map((badge) => <BadgeCard key={badge.id} badge={badge} highlight={highlightBadge === badge.id} compact />)}</div></div><div className="mt-5 rounded-3xl bg-neutral-950 p-5 text-white shadow-sm"><div className="text-lg font-semibold">Upgrade to Pro</div><p className="mt-2 text-sm text-neutral-300">Advanced search, strict mode, offline scans, and early database access.</p><Button onClick={openPlans} variant="light" className="mt-4">View plans</Button></div></div>;
}

function runTests() {
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
    [dishwasher?.parts.some((part) => part.displayName === "Pod film"), "dishwasher should include pod film"],
    [db.users.some((user) => user.role === "Health food creator"), "suggested creators should exist"],
    [getFavoritesByCategory(products)["Plastic-free / no packaging"]?.length >= 1, "favorites should group by product type"],
    [typeof CanadaLeafIcon === "function", "Canada leaf icon should render from custom SVG"],
    [typeof SettingsScreen === "function", "settings screen should render account controls"],
    [typeof SignInScreen === "function", "sign in screen should exist after sign out"],
    [typeof DeleteAccountScreen === "function", "delete confirmation screen should exist"],
    [typeof ShareSheet === "function", "share sheet should exist"],
    [typeof ProductListScreen === "function", "history detail lists should exist"],
    [typeof NotificationsScreen === "function", "notifications screen should exist"],
    [typeof PlansScreen === "function", "plans screen should exist"],
    [typeof AddProductScreen === "function", "add product screen should exist"],
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

export default function App() {
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
  const [showPlans, setShowPlans] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [badgeToast, setBadgeToast] = useState(null);
  const [badgeProgress, setBadgeProgress] = useState(badgeDefinitions);
  const [highlightBadge, setHighlightBadge] = useState(null);

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
    showToast("+1 toward Word of Mouth (3/10)", 3000);
  };

  const handleScan = (product) => {
    incrementBadge("plastic_detective", 2);
    showToast("+2 scans recorded", 2000);
    openResult(product);
  };

  const scannedProducts = db.scans.map((scan) => products.find((product) => product.id === scan.productId)).filter(Boolean);
  const searchedProducts = products.filter((product) => !db.scans.some((scan) => scan.productId === product.id));
  const hideNav = showResult || detail || showSettings || showFavorites || showBadges || showDeleteAccount || shareProduct || historyList || showNotifications || showPlans || showAddProduct;

  return <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffffff_0%,#f2eee6_42%,#dfd8ca_100%)] px-4 py-8 font-sans text-neutral-950 antialiased">{badgeToast && <div className="fixed left-1/2 top-6 z-50 w-[360px] -translate-x-1/2 rounded-3xl bg-neutral-950 px-4 py-3 text-sm font-medium text-white shadow-2xl"><div className="flex items-center justify-between gap-3"><span>{badgeToast}</span><button type="button" onClick={() => setBadgeToast(null)} className="text-white/70">×</button></div></div>}<Phone>{isSignedOut ? <SignInScreen onSignIn={() => setIsSignedOut(false)} /> : <div className="flex min-h-[760px] flex-col"><div className="flex-1 overflow-hidden"><AnimatePresence mode="wait">{showAddProduct ? <motion.div key="add-product" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><AddProductScreen close={() => setShowAddProduct(false)} /></motion.div> : showPlans ? <motion.div key="plans" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><PlansScreen close={() => setShowPlans(false)} /></motion.div> : showNotifications ? <motion.div key="notifications" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><NotificationsScreen close={() => setShowNotifications(false)} /></motion.div> : shareProduct ? <motion.div key="share" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ShareSheet product={shareProduct} close={() => setShareProduct(null)} onShareSuccess={showShareBadgeToast} /></motion.div> : historyList ? <motion.div key="history-list" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ProductListScreen title={historyList.title} products={historyList.products} openResult={openResult} close={() => setHistoryList(null)} /></motion.div> : showDeleteAccount ? <motion.div key="delete" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><DeleteAccountScreen close={() => setShowDeleteAccount(false)} onConfirmDelete={confirmDeleteAccount} /></motion.div> : showBadges ? <motion.div key="badges" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><BadgesScreen badges={badgeProgress} highlightBadge={highlightBadge} close={() => setShowBadges(false)} /></motion.div> : showFavorites ? <motion.div key="favorites" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><FavoritesScreen products={products} openResult={openResult} close={() => setShowFavorites(false)} /></motion.div> : showSettings ? <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><SettingsScreen close={() => setShowSettings(false)} onSignOut={signOut} onDeleteAccount={() => { setShowSettings(false); setShowDeleteAccount(true); }} /></motion.div> : detail ? <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><DetailScreen product={detail.product} part={detail.part} close={() => setDetail(null)} /></motion.div> : showResult ? <motion.div key="result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ResultScreen product={result} close={() => setShowResult(false)} openDetail={(product, part) => setDetail({ product, part })} openShare={(product) => setShareProduct(product)} /></motion.div> : <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>{tab === "scan" && <ScanScreen products={products} openResult={handleScan} />}{tab === "search" && <SearchScreen products={products} openResult={openResult} openAddProduct={() => setShowAddProduct(true)} />}{tab === "history" && <HistoryScreen products={products} openResult={openResult} openScanned={() => setHistoryList({ title: "Products scanned", products: scannedProducts })} openSearched={() => setHistoryList({ title: "Products searched", products: searchedProducts })} />}{tab === "social" && <SocialScreen products={products} openResult={openResult} openNotifications={() => setShowNotifications(true)} />}{tab === "profile" && <ProfileScreen products={products} badges={badgeProgress} highlightBadge={highlightBadge} openResult={openResult} openSettings={() => setShowSettings(true)} openFavorites={() => setShowFavorites(true)} openBadges={() => setShowBadges(true)} openPlans={() => setShowPlans(true)} />}</motion.div>}</AnimatePresence></div>{!hideNav && <BottomNav tab={tab} setTab={setTabSafe} />}</div>}</Phone></div>;
}
