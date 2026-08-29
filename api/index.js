// server/index.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// server/prisma.ts
import { PrismaClient } from "@prisma/client";
var DEFAULT_DATABASE_URL = "postgres://postgres:vYdIRb2wOZldM1oKK2ROwQAPNKxvU4OECFv4rCxCU7kRdS6SoNFpvRGlYvqdBQX3@41.251.253.166:5657/postgres";
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || DEFAULT_DATABASE_URL
    }
  },
  log: ["warn", "error"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// server/index.ts
dotenv.config();
var app = express();
var PORT = process.env.PORT || 3001;
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith("/api")) {
    req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  }
  next();
});
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected", time: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});
app.get("/api/version", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
  res.json({
    version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.BUILD_ID || "2026.08.25-live",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/users", async (req, res) => {
  try {
    const user = await prisma.user.create({ data: req.body });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.put("/api/users/:id", async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.delete("/api/users/:id", async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/companies", async (req, res) => {
  try {
    const companies = await prisma.company.findMany({ orderBy: { createdAt: "asc" } });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/companies", async (req, res) => {
  try {
    const company = await prisma.company.create({ data: req.body });
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.put("/api/companies/:id", async (req, res) => {
  try {
    const company = await prisma.company.upsert({
      where: { id: req.params.id },
      create: { id: req.params.id, ...req.body },
      update: req.body
    });
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/company-info", async (req, res) => {
  try {
    const info = await prisma.companyInfo.findUnique({ where: { id: "default" } });
    res.json(info || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.put("/api/company-info", async (req, res) => {
  try {
    const info = await prisma.companyInfo.upsert({
      where: { id: "default" },
      create: { id: "default", ...req.body },
      update: req.body
    });
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/products", async (req, res) => {
  try {
    const product = await prisma.product.create({ data: req.body });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.put("/api/products/:id", async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.delete("/api/products/:id", async (req, res) => {
  try {
    await prisma.$transaction([
      prisma.frigoStockLevel.deleteMany({ where: { productId: req.params.id } }),
      prisma.product.delete({ where: { id: req.params.id } })
    ]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/products/merge", async (req, res) => {
  try {
    const { targetProductId, productIdsToMerge } = req.body;
    if (!targetProductId || !Array.isArray(productIdsToMerge) || productIdsToMerge.length === 0) {
      return res.status(400).json({ error: "Param\xE8tres cibles ou sources invalides" });
    }
    const targetProduct = await prisma.product.findUnique({ where: { id: targetProductId } });
    if (!targetProduct) {
      return res.status(404).json({ error: "Produit cible non trouv\xE9" });
    }
    await prisma.$transaction(async (tx) => {
      for (const sourceId of productIdsToMerge) {
        if (sourceId === targetProductId) continue;
        const sourceStocks = await tx.frigoStockLevel.findMany({ where: { productId: sourceId } });
        for (const sStock of sourceStocks) {
          const targetStock = await tx.frigoStockLevel.findUnique({
            where: { frigoId_productId: { frigoId: sStock.frigoId, productId: targetProductId } }
          });
          if (targetStock) {
            await tx.frigoStockLevel.update({
              where: { id: targetStock.id },
              data: {
                quantityKg: targetStock.quantityKg + sStock.quantityKg,
                quantityPallets: targetStock.quantityPallets + sStock.quantityPallets
              }
            });
          } else {
            await tx.frigoStockLevel.create({
              data: {
                frigoId: sStock.frigoId,
                productId: targetProductId,
                quantityKg: sStock.quantityKg,
                quantityPallets: sStock.quantityPallets
              }
            });
          }
        }
        await tx.frigoStockLevel.deleteMany({ where: { productId: sourceId } });
        await tx.product.delete({ where: { id: sourceId } });
      }
    });
    res.json({ success: true, message: `${productIdsToMerge.length} produits fusionn\xE9s vers ${targetProduct.name}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/frigos", async (req, res) => {
  try {
    const frigos = await prisma.coldStorageFrigo.findMany({ orderBy: { code: "asc" } });
    res.json(frigos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/frigos", async (req, res) => {
  try {
    const frigo = await prisma.coldStorageFrigo.create({ data: req.body });
    res.json(frigo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.put("/api/frigos/:id", async (req, res) => {
  try {
    const frigo = await prisma.coldStorageFrigo.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(frigo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.delete("/api/frigos/:id", async (req, res) => {
  try {
    await prisma.$transaction([
      prisma.frigoStockLevel.deleteMany({ where: { frigoId: req.params.id } }),
      prisma.coldStorageFrigo.delete({ where: { id: req.params.id } })
    ]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/stocks", async (req, res) => {
  try {
    const stocks = await prisma.frigoStockLevel.findMany();
    res.json(stocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/stocks/adjust", async (req, res) => {
  try {
    const { frigoId, productId, newKg, newPallets, performedBy, notes } = req.body;
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      const frigo = await tx.coldStorageFrigo.findUnique({ where: { id: frigoId } });
      const currentStock = await tx.frigoStockLevel.findUnique({
        where: { frigoId_productId: { frigoId, productId } }
      });
      const prevKg = currentStock?.quantityKg || 0;
      const updatedStock = await tx.frigoStockLevel.upsert({
        where: { frigoId_productId: { frigoId, productId } },
        create: {
          frigoId,
          productId,
          quantityKg: newKg,
          quantityPallets: newPallets
        },
        update: {
          quantityKg: newKg,
          quantityPallets: newPallets
        }
      });
      await tx.productStockMovement.create({
        data: {
          productId,
          productName: product?.name || "Inconnu",
          productCode: product?.code || "",
          frigoId,
          frigoName: frigo?.name || "Inconnu",
          type: "AJUSTEMENT_MANUEL",
          quantityKg: Math.abs(newKg - prevKg),
          previousStockKg: prevKg,
          newStockKg: newKg,
          referenceDoc: "AJUST-MANUEL",
          performedBy: performedBy || "Admin",
          notes: notes || "Ajustement manuel inventaire"
        }
      });
      return updatedStock;
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/stocks/transfer", async (req, res) => {
  try {
    const { sourceFrigoId, targetFrigoId, productId, kg, pallets, performedBy } = req.body;
    if (sourceFrigoId === targetFrigoId) {
      return res.status(400).json({ error: "Le frigo source et destination doivent \xEAtre diff\xE9rents" });
    }
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      const srcFrigo = await tx.coldStorageFrigo.findUnique({ where: { id: sourceFrigoId } });
      const tgtFrigo = await tx.coldStorageFrigo.findUnique({ where: { id: targetFrigoId } });
      const srcStock = await tx.frigoStockLevel.findUnique({
        where: { frigoId_productId: { frigoId: sourceFrigoId, productId } }
      });
      const srcPrevKg = srcStock?.quantityKg || 0;
      const srcNewKg = Math.max(0, srcPrevKg - kg);
      const srcPrevPallets = srcStock?.quantityPallets || 0;
      const srcNewPallets = Math.max(0, srcPrevPallets - pallets);
      await tx.frigoStockLevel.upsert({
        where: { frigoId_productId: { frigoId: sourceFrigoId, productId } },
        create: { frigoId: sourceFrigoId, productId, quantityKg: srcNewKg, quantityPallets: srcNewPallets },
        update: { quantityKg: srcNewKg, quantityPallets: srcNewPallets }
      });
      const tgtStock = await tx.frigoStockLevel.findUnique({
        where: { frigoId_productId: { frigoId: targetFrigoId, productId } }
      });
      const tgtPrevKg = tgtStock?.quantityKg || 0;
      const tgtNewKg = tgtPrevKg + kg;
      const tgtPrevPallets = tgtStock?.quantityPallets || 0;
      const tgtNewPallets = tgtPrevPallets + pallets;
      await tx.frigoStockLevel.upsert({
        where: { frigoId_productId: { frigoId: targetFrigoId, productId } },
        create: { frigoId: targetFrigoId, productId, quantityKg: tgtNewKg, quantityPallets: tgtNewPallets },
        update: { quantityKg: tgtNewKg, quantityPallets: tgtNewPallets }
      });
      await tx.productStockMovement.create({
        data: {
          productId,
          productName: product?.name || "Inconnu",
          productCode: product?.code || "",
          frigoId: sourceFrigoId,
          frigoName: srcFrigo?.name || "Source",
          type: "TRANSFERT_INTER_FRIGO",
          quantityKg: kg,
          previousStockKg: srcPrevKg,
          newStockKg: srcNewKg,
          referenceDoc: `TRF -> ${tgtFrigo?.name || targetFrigoId}`,
          performedBy: performedBy || "Admin",
          notes: `Transfert sortant vers ${tgtFrigo?.name}`
        }
      });
      await tx.productStockMovement.create({
        data: {
          productId,
          productName: product?.name || "Inconnu",
          productCode: product?.code || "",
          frigoId: targetFrigoId,
          frigoName: tgtFrigo?.name || "Cible",
          type: "TRANSFERT_INTER_FRIGO",
          quantityKg: kg,
          previousStockKg: tgtPrevKg,
          newStockKg: tgtNewKg,
          referenceDoc: `TRF <- ${srcFrigo?.name || sourceFrigoId}`,
          performedBy: performedBy || "Admin",
          notes: `Transfert entrant depuis ${srcFrigo?.name}`
        }
      });
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/stocks/purge-orphans", async (req, res) => {
  try {
    const products = await prisma.product.findMany({ select: { id: true } });
    const productIds = new Set(products.map((p) => p.id));
    const allStocks = await prisma.frigoStockLevel.findMany();
    const orphans = allStocks.filter((s) => !productIds.has(s.productId));
    if (orphans.length > 0) {
      await prisma.frigoStockLevel.deleteMany({
        where: { id: { in: orphans.map((o) => o.id) } }
      });
    }
    res.json({ purgedCount: orphans.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/stocks/clear", async (req, res) => {
  try {
    const { frigoId, productId, performedBy, notes } = req.body;
    const whereClause = {};
    if (frigoId) whereClause.frigoId = frigoId;
    if (productId) whereClause.productId = productId;
    const stocksToClear = await prisma.frigoStockLevel.findMany({
      where: whereClause,
      include: { product: true, frigo: true }
    });
    await prisma.frigoStockLevel.updateMany({
      where: whereClause,
      data: {
        quantityKg: 0,
        quantityPallets: 0
      }
    });
    for (const st of stocksToClear) {
      if (st.quantityKg > 0 || st.quantityPallets > 0) {
        await prisma.productStockMovement.create({
          data: {
            productId: st.productId,
            productName: st.product?.name || "Inconnu",
            productCode: st.product?.code || "",
            frigoId: st.frigoId,
            frigoName: st.frigo?.name || "Inconnu",
            type: "AJUSTEMENT_MANUEL",
            quantityKg: st.quantityKg,
            previousStockKg: st.quantityKg,
            newStockKg: 0,
            referenceDoc: "VIDAGE-STOCK",
            performedBy: performedBy || "Admin",
            notes: notes || `Remise \xE0 z\xE9ro du stock (${st.frigo?.name || "Frigo"})`
          }
        });
      }
    }
    res.json({ success: true, clearedCount: stocksToClear.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/stock-movements", async (req, res) => {
  try {
    const movements = await prisma.productStockMovement.findMany({
      orderBy: { date: "desc" },
      take: 200
    });
    res.json(movements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/clients", async (req, res) => {
  try {
    const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/clients", async (req, res) => {
  try {
    const client = await prisma.client.create({ data: req.body });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.put("/api/clients/:id", async (req, res) => {
  try {
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.delete("/api/clients/:id", async (req, res) => {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/clients/merge", async (req, res) => {
  try {
    const { targetClientId, clientIdsToMerge } = req.body;
    if (!targetClientId || !Array.isArray(clientIdsToMerge)) {
      return res.status(400).json({ error: "targetClientId et clientIdsToMerge requis" });
    }
    const target = await prisma.client.findUnique({ where: { id: targetClientId } });
    if (!target) return res.status(404).json({ error: "Client cible introuvable" });
    const secondariesToMerge = clientIdsToMerge.filter((id) => id && id !== targetClientId);
    if (secondariesToMerge.length === 0) {
      return res.json({ success: true, count: 0 });
    }
    const secondaryClients = await prisma.client.findMany({
      where: { id: { in: secondariesToMerge } }
    });
    await prisma.$transaction(async (tx) => {
      const updatedData = {};
      for (const sec of secondaryClients) {
        if (!target.ice && sec.ice) updatedData.ice = sec.ice;
        if (!target.phone && sec.phone) updatedData.phone = sec.phone;
        if (!target.email && sec.email) updatedData.email = sec.email;
        if (!target.address && sec.address) updatedData.address = sec.address;
        if (!target.companyName && sec.companyName) updatedData.companyName = sec.companyName;
      }
      if (Object.keys(updatedData).length > 0) {
        await tx.client.update({
          where: { id: targetClientId },
          data: updatedData
        });
      }
      await tx.deliveryNoteBL.updateMany({
        where: { clientId: { in: secondariesToMerge } },
        data: {
          clientId: target.id,
          clientName: target.name || target.companyName || "Client",
          clientAddress: target.address || "",
          clientPhone: target.phone || "",
          clientEmail: target.email || ""
        }
      });
      await tx.invoice.updateMany({
        where: { clientId: { in: secondariesToMerge } },
        data: {
          clientId: target.id,
          clientName: target.name || target.companyName || "Client",
          clientICE: target.ice || "",
          clientAddress: target.address || ""
        }
      });
      await tx.salesOrder.updateMany({
        where: { clientId: { in: secondariesToMerge } },
        data: {
          clientId: target.id,
          clientName: target.name || target.companyName || "Client",
          clientICE: target.ice || "",
          clientPhone: target.phone || "",
          clientEmail: target.email || ""
        }
      });
      await tx.chequeEffet.updateMany({
        where: { partyId: { in: secondariesToMerge } },
        data: {
          partyId: target.id,
          partyName: target.name || target.companyName || "Client"
        }
      });
      await tx.client.deleteMany({
        where: { id: { in: secondariesToMerge } }
      });
    });
    res.json({ success: true, count: secondariesToMerge.length });
  } catch (error) {
    console.error("Client merge error:", error);
    res.status(500).json({ error: error.message });
  }
});
function smartNormalizeClientName(name) {
  if (!name) return "";
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\/\.\,\-\_\#\@\(\)\:\;]/g, " ").replace(/\b(el|al|le|la|bel|ben|si|sidi)\b/gi, "").replace(/kh/g, "k").replace(/gh/g, "g").replace(/ou/g, "u").replace(/oo/g, "u").replace(/aa/g, "a").replace(/ee/g, "i").replace(/q/g, "k").replace(/g/g, "k").replace(/h/g, "").replace(/(.)\1+/g, "$1").replace(/t\b/g, "").replace(/\s+e\b/g, "").replace(/e\b/g, "").replace(/\s+/g, " ").trim();
}
app.post("/api/clients/deduplicate-all", async (req, res) => {
  try {
    const allClients = await prisma.client.findMany({ orderBy: { createdAt: "asc" } });
    const groups = /* @__PURE__ */ new Map();
    for (const c of allClients) {
      const norm = smartNormalizeClientName(c.name || c.companyName || "");
      if (!norm) continue;
      if (!groups.has(norm)) groups.set(norm, []);
      groups.get(norm).push(c);
    }
    let totalMerged = 0;
    const mergeDetails = [];
    for (const [groupName, clts] of groups.entries()) {
      if (clts.length <= 1) continue;
      const primary = clts.find((c) => c.ice && c.ice.trim()) || clts[0];
      const secondaries = clts.filter((c) => c.id !== primary.id);
      const secondaryIds = secondaries.map((c) => c.id);
      await prisma.$transaction(async (tx) => {
        const updatedData = {};
        for (const sec of secondaries) {
          if (!primary.ice && sec.ice) updatedData.ice = sec.ice;
          if (!primary.phone && sec.phone) updatedData.phone = sec.phone;
          if (!primary.email && sec.email) updatedData.email = sec.email;
          if (!primary.address && sec.address) updatedData.address = sec.address;
          if (!primary.companyName && sec.companyName) updatedData.companyName = sec.companyName;
        }
        if (Object.keys(updatedData).length > 0) {
          await tx.client.update({
            where: { id: primary.id },
            data: updatedData
          });
        }
        await tx.deliveryNoteBL.updateMany({
          where: { clientId: { in: secondaryIds } },
          data: {
            clientId: primary.id,
            clientName: primary.name || primary.companyName || "Client",
            clientAddress: primary.address || "",
            clientPhone: primary.phone || "",
            clientEmail: primary.email || ""
          }
        });
        await tx.invoice.updateMany({
          where: { clientId: { in: secondaryIds } },
          data: {
            clientId: primary.id,
            clientName: primary.name || primary.companyName || "Client",
            clientICE: primary.ice || "",
            clientAddress: primary.address || ""
          }
        });
        await tx.salesOrder.updateMany({
          where: { clientId: { in: secondaryIds } },
          data: {
            clientId: primary.id,
            clientName: primary.name || primary.companyName || "Client",
            clientICE: primary.ice || "",
            clientPhone: primary.phone || "",
            clientEmail: primary.email || ""
          }
        });
        await tx.chequeEffet.updateMany({
          where: { partyId: { in: secondaryIds } },
          data: {
            partyId: primary.id,
            partyName: primary.name || primary.companyName || "Client"
          }
        });
        await tx.client.deleteMany({
          where: { id: { in: secondaryIds } }
        });
      });
      totalMerged += secondaryIds.length;
      mergeDetails.push(`Fusion de ${clts.length} comptes "${primary.name}" -> Principal: ${primary.code}`);
    }
    res.json({ success: true, count: totalMerged, details: mergeDetails });
  } catch (error) {
    console.error("Deduplicate all error:", error);
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/suppliers", async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/suppliers", async (req, res) => {
  try {
    const supplier = await prisma.supplier.create({ data: req.body });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.put("/api/suppliers/:id", async (req, res) => {
  try {
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.delete("/api/suppliers/:id", async (req, res) => {
  try {
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/orders", async (req, res) => {
  try {
    const orders = await prisma.salesOrder.findMany({ orderBy: { createdAt: "desc" } });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/orders", async (req, res) => {
  try {
    const order = await prisma.salesOrder.create({ data: req.body });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.put("/api/orders/:id", async (req, res) => {
  try {
    const order = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.delete("/api/orders/:id", async (req, res) => {
  try {
    await prisma.salesOrder.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/delivery-notes", async (req, res) => {
  try {
    const bls = await prisma.deliveryNoteBL.findMany({ orderBy: { createdAt: "desc" } });
    res.json(bls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/delivery-notes", async (req, res) => {
  try {
    const blData = req.body;
    const bl = await prisma.$transaction(async (tx) => {
      let finalClientId = blData.clientId;
      if (blData.clientId) {
        const existingById = await tx.client.findUnique({ where: { id: blData.clientId } });
        if (existingById) {
          finalClientId = existingById.id;
        }
      }
      if (!finalClientId && blData.clientName && blData.clientName.trim()) {
        const normName = blData.clientName.trim();
        let existingClient = await tx.client.findFirst({
          where: {
            OR: [
              { name: { equals: normName, mode: "insensitive" } },
              { companyName: { equals: normName, mode: "insensitive" } }
            ]
          }
        });
        if (!existingClient) {
          const clientCount = await tx.client.count();
          existingClient = await tx.client.create({
            data: {
              code: `CLT-${String(clientCount + 1).padStart(3, "0")}`,
              name: normName,
              companyName: normName,
              city: "Casablanca",
              creditLimit: 3e5,
              currentBalance: Number(blData.totalTTC) || 0
            }
          });
        }
        finalClientId = existingClient.id;
      }
      const created = await tx.deliveryNoteBL.create({
        data: {
          ...blData,
          clientId: finalClientId || blData.clientId || ""
        }
      });
      if (blData.frigoId && Array.isArray(blData.items)) {
        for (const item of blData.items) {
          if (!item.productId) continue;
          const kg = Number(item.quantityKg) || 0;
          const pallets = Number(item.quantityPallets) || 0;
          const existing = await tx.frigoStockLevel.findUnique({
            where: {
              frigoId_productId: {
                frigoId: blData.frigoId,
                productId: item.productId
              }
            }
          });
          if (existing) {
            await tx.frigoStockLevel.update({
              where: {
                frigoId_productId: {
                  frigoId: blData.frigoId,
                  productId: item.productId
                }
              },
              data: {
                quantityKg: Math.max(0, existing.quantityKg - kg),
                quantityPallets: Math.max(0, existing.quantityPallets - pallets)
              }
            });
          }
          await tx.productStockMovement.create({
            data: {
              productId: item.productId,
              frigoId: blData.frigoId,
              type: "SORTIE",
              quantityKg: kg,
              quantityPallets: pallets,
              performedBy: "Vente / BL",
              referenceDoc: blData.blNumber || "Bon de Livraison",
              notes: `Sortie BL ${blData.blNumber || ""} - Client: ${blData.clientName || ""}`
            }
          });
        }
      }
      return created;
    });
    res.json(bl);
  } catch (error) {
    console.error("Error creating BL with stock decrement:", error);
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/delivery-notes/import-batch", async (req, res) => {
  try {
    const { bls } = req.body;
    if (!Array.isArray(bls)) return res.status(400).json({ error: "Array of BLs expected" });
    const result = await prisma.$transaction(async (tx) => {
      const createdBLs = [];
      for (const blData of bls) {
        if (!blData.blNumber) continue;
        const existing = await tx.deliveryNoteBL.findUnique({ where: { blNumber: blData.blNumber } });
        if (!existing) {
          const created = await tx.deliveryNoteBL.create({ data: blData });
          createdBLs.push(created);
          if (blData.frigoId && Array.isArray(blData.items)) {
            for (const item of blData.items) {
              if (!item.productId) continue;
              const kg = Number(item.quantityKg) || 0;
              const pallets = Number(item.quantityPallets) || 0;
              const existingStock = await tx.frigoStockLevel.findUnique({
                where: {
                  frigoId_productId: {
                    frigoId: blData.frigoId,
                    productId: item.productId
                  }
                }
              });
              if (existingStock) {
                await tx.frigoStockLevel.update({
                  where: {
                    frigoId_productId: {
                      frigoId: blData.frigoId,
                      productId: item.productId
                    }
                  },
                  data: {
                    quantityKg: Math.max(0, existingStock.quantityKg - kg),
                    quantityPallets: Math.max(0, existingStock.quantityPallets - pallets)
                  }
                });
              } else {
                await tx.frigoStockLevel.create({
                  data: {
                    frigoId: blData.frigoId,
                    productId: item.productId,
                    quantityKg: 0,
                    quantityPallets: 0
                  }
                });
              }
              await tx.productStockMovement.create({
                data: {
                  productId: item.productId,
                  frigoId: blData.frigoId,
                  type: "SORTIE",
                  quantityKg: kg,
                  quantityPallets: pallets,
                  performedBy: "Import Excel BL",
                  referenceDoc: blData.blNumber,
                  notes: `Sortie Import Excel BL ${blData.blNumber} - Client: ${blData.clientName || ""}`
                }
              });
            }
          }
        }
      }
      return createdBLs;
    });
    res.json({ importedCount: result.length, bls: result });
  } catch (error) {
    console.error("Error importing batch BLs with stock decrement:", error);
    res.status(500).json({ error: error.message });
  }
});
app.put("/api/delivery-notes/:id", async (req, res) => {
  try {
    const bl = await prisma.deliveryNoteBL.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(bl);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.delete("/api/delivery-notes/:id", async (req, res) => {
  try {
    const bl = await prisma.deliveryNoteBL.findUnique({ where: { id: req.params.id } });
    if (bl) {
      await prisma.$transaction(async (tx) => {
        if (bl.frigoId && Array.isArray(bl.items)) {
          for (const item of bl.items) {
            if (!item.productId) continue;
            const kg = Number(item.quantityKg) || 0;
            const pallets = Number(item.quantityPallets) || 0;
            await tx.frigoStockLevel.upsert({
              where: {
                frigoId_productId: {
                  frigoId: bl.frigoId,
                  productId: item.productId
                }
              },
              create: {
                frigoId: bl.frigoId,
                productId: item.productId,
                quantityKg: kg,
                quantityPallets: pallets
              },
              update: {
                quantityKg: { increment: kg },
                quantityPallets: { increment: pallets }
              }
            });
          }
        }
        await tx.deliveryNoteBL.delete({ where: { id: req.params.id } });
      });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting BL with stock restore:", error);
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/delivery-notes/:id/approve-frigo", async (req, res) => {
  try {
    const { employeeName } = req.body;
    const blId = req.params.id;
    const result = await prisma.$transaction(async (tx) => {
      const bl = await tx.deliveryNoteBL.findUnique({ where: { id: blId } });
      if (!bl) throw new Error("Bon de Livraison introuvable");
      const items = bl.items || [];
      const frigoId = bl.frigoId;
      if (!bl.stockDecremented) {
        for (const item of items) {
          if (!item.productId) continue;
          const currentStock = await tx.frigoStockLevel.findUnique({
            where: { frigoId_productId: { frigoId, productId: item.productId } }
          });
          const prevKg = currentStock?.quantityKg || 0;
          const prevPallets = currentStock?.quantityPallets || 0;
          const newKg = Math.max(0, prevKg - (item.quantityKg || 0));
          const newPallets = Math.max(0, prevPallets - (item.quantityPallets || 0));
          await tx.frigoStockLevel.upsert({
            where: { frigoId_productId: { frigoId, productId: item.productId } },
            create: { frigoId, productId: item.productId, quantityKg: newKg, quantityPallets: newPallets },
            update: { quantityKg: newKg, quantityPallets: newPallets }
          });
          await tx.productStockMovement.create({
            data: {
              productId: item.productId,
              productName: item.productName || "Produit",
              productCode: item.productCode || "",
              frigoId,
              frigoName: bl.frigoName || "Frigo",
              type: "SORTIE_BL",
              quantityKg: item.quantityKg || 0,
              previousStockKg: prevKg,
              newStockKg: newKg,
              referenceDoc: bl.blNumber,
              performedBy: employeeName || "Responsable Quai",
              notes: `Sortie Quai valid\xE9e pour ${bl.clientName} (BL: ${bl.blNumber})`
            }
          });
        }
      }
      const updatedLogs = [
        ...bl.logs || [],
        {
          id: `log-${Date.now()}`,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          action: "Approbation Quai Frigo",
          author: employeeName || "Responsable Frigo",
          notes: "Validation chargement camion & d\xE9cr\xE9mentation stock"
        }
      ];
      const updatedBL = await tx.deliveryNoteBL.update({
        where: { id: blId },
        data: {
          status: "APPROUV\xC9_FRIGO",
          frigoEmployeeApproved: true,
          frigoApprovedBy: employeeName || "Responsable Frigo",
          frigoApprovedAt: (/* @__PURE__ */ new Date()).toISOString(),
          stockDecremented: true,
          logs: updatedLogs
        }
      });
      return updatedBL;
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/delivery-notes/recalculate-prices", async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    const productPriceMap = /* @__PURE__ */ new Map();
    products.forEach((p) => productPriceMap.set(p.id, p.sellingPriceHT));
    const bls = await prisma.deliveryNoteBL.findMany();
    let updatedCount = 0;
    let totalFinancialDiff = 0;
    await prisma.$transaction(async (tx) => {
      for (const bl of bls) {
        const items = bl.items || [];
        let blChanged = false;
        let newTotalHT = 0;
        const updatedItems = items.map((item) => {
          const newPrice = productPriceMap.get(item.productId);
          if (newPrice !== void 0 && newPrice !== item.unitPriceHT) {
            blChanged = true;
            const updatedItemTotalHT = (item.quantityKg || 0) * newPrice;
            newTotalHT += updatedItemTotalHT;
            return { ...item, unitPriceHT: newPrice, totalHT: updatedItemTotalHT };
          }
          newTotalHT += item.totalHT || (item.quantityKg || 0) * (item.unitPriceHT || 0);
          return item;
        });
        if (blChanged) {
          updatedCount++;
          const newTotalTTC = newTotalHT * 1.2;
          totalFinancialDiff += newTotalHT - bl.totalHT;
          await tx.deliveryNoteBL.update({
            where: { id: bl.id },
            data: {
              items: updatedItems,
              totalHT: newTotalHT,
              totalTTC: newTotalTTC
            }
          });
        }
      }
    });
    res.json({
      totalBLsScanned: bls.length,
      updatedBLsCount: updatedCount,
      totalFinancialImpactHT: totalFinancialDiff
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/invoices", async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({ orderBy: { createdAt: "desc" } });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/invoices", async (req, res) => {
  try {
    const inv = req.body;
    const sanitized = {
      companyId: inv.companyId || "STE_1",
      invoiceNumber: inv.invoiceNumber || `FAC-${Date.now()}`,
      orderId: inv.orderId || "",
      blId: inv.blId || "",
      clientId: inv.clientId || "",
      clientName: inv.clientName || "",
      clientICE: inv.clientICE || "",
      clientAddress: inv.clientAddress || "",
      date: inv.date ? String(inv.date).slice(0, 10) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      dueDate: inv.dueDate ? String(inv.dueDate).slice(0, 10) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      items: inv.items || [],
      totalHT: Number(inv.totalHT) || 0,
      totalVAT: Number(inv.totalVAT) || 0,
      totalTTC: Number(inv.totalTTC) || 0,
      amountPaid: Number(inv.amountPaid) || 0,
      remainingAmount: inv.remainingAmount !== void 0 ? Number(inv.remainingAmount) : (Number(inv.totalTTC) || 0) - (Number(inv.amountPaid) || 0),
      status: inv.status || "BROUILLON",
      paymentMethod: inv.paymentMethod || ""
    };
    if (inv.id) sanitized.id = inv.id;
    const invoice = await prisma.invoice.upsert({
      where: { invoiceNumber: sanitized.invoiceNumber },
      create: sanitized,
      update: sanitized
    });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.put("/api/invoices/:id", async (req, res) => {
  try {
    const inv = req.body;
    const sanitized = {};
    if (inv.companyId !== void 0) sanitized.companyId = inv.companyId;
    if (inv.invoiceNumber !== void 0) sanitized.invoiceNumber = inv.invoiceNumber;
    if (inv.orderId !== void 0) sanitized.orderId = inv.orderId;
    if (inv.blId !== void 0) sanitized.blId = inv.blId;
    if (inv.clientId !== void 0) sanitized.clientId = inv.clientId;
    if (inv.clientName !== void 0) sanitized.clientName = inv.clientName;
    if (inv.clientICE !== void 0) sanitized.clientICE = inv.clientICE;
    if (inv.clientAddress !== void 0) sanitized.clientAddress = inv.clientAddress;
    if (inv.date !== void 0) sanitized.date = String(inv.date).slice(0, 10);
    if (inv.dueDate !== void 0) sanitized.dueDate = String(inv.dueDate).slice(0, 10);
    if (inv.items !== void 0) sanitized.items = inv.items;
    if (inv.totalHT !== void 0) sanitized.totalHT = Number(inv.totalHT) || 0;
    if (inv.totalVAT !== void 0) sanitized.totalVAT = Number(inv.totalVAT) || 0;
    if (inv.totalTTC !== void 0) sanitized.totalTTC = Number(inv.totalTTC) || 0;
    if (inv.amountPaid !== void 0) sanitized.amountPaid = Number(inv.amountPaid) || 0;
    if (inv.remainingAmount !== void 0) sanitized.remainingAmount = Number(inv.remainingAmount) || 0;
    if (inv.status !== void 0) sanitized.status = inv.status;
    if (inv.paymentMethod !== void 0) sanitized.paymentMethod = inv.paymentMethod;
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: sanitized
    });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.delete("/api/invoices/:id", async (req, res) => {
  try {
    await prisma.invoice.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/invoices/from-bl/:blId", async (req, res) => {
  try {
    const { blId } = req.params;
    const result = await prisma.$transaction(async (tx) => {
      const bl = await tx.deliveryNoteBL.findUnique({ where: { id: blId } });
      if (!bl) throw new Error("BL introuvable");
      const count = await tx.invoice.count();
      const company = await tx.company.findUnique({ where: { id: bl.companyId || "STE_1" } });
      const prefix = company?.invoicePrefix || "FAC";
      const invoiceNumber = `${prefix}-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(count + 1).padStart(4, "0")}`;
      const client = await tx.client.findUnique({ where: { id: bl.clientId } });
      const invoiceItems = (bl.items || []).map((item) => ({
        productId: item.productId,
        productCode: item.productCode || "",
        productName: item.productName || "",
        quantityKg: item.quantityKg || 0,
        quantityPallets: item.quantityPallets || 0,
        unitPriceHT: item.unitPriceHT || 0,
        vatRate: 0.2,
        totalHT: item.totalHT || 0,
        totalTTC: (item.totalHT || 0) * 1.2
      }));
      const invoice = await tx.invoice.create({
        data: {
          companyId: bl.companyId || "STE_1",
          invoiceNumber,
          orderId: bl.orderId || "",
          blId: bl.id,
          clientId: bl.clientId,
          clientName: bl.clientName,
          clientICE: client?.ice || "",
          clientAddress: bl.clientAddress || "",
          date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          dueDate: new Date(Date.now() + 30 * 864e5).toISOString().split("T")[0],
          items: invoiceItems,
          totalHT: bl.totalHT,
          totalVAT: bl.totalHT * 0.2,
          totalTTC: bl.totalTTC,
          amountPaid: 0,
          remainingAmount: bl.totalTTC,
          status: "EMISE"
        }
      });
      await tx.deliveryNoteBL.update({
        where: { id: bl.id },
        data: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: "FACTUR\xC9"
        }
      });
      return invoice;
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/cheques", async (req, res) => {
  try {
    const cheques = await prisma.chequeEffet.findMany({ orderBy: { dueDate: "asc" } });
    res.json(cheques);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/cheques", async (req, res) => {
  try {
    const cheque = await prisma.chequeEffet.create({ data: req.body });
    res.json(cheque);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.put("/api/cheques/:id", async (req, res) => {
  try {
    const cheque = await prisma.chequeEffet.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(cheque);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.delete("/api/cheques/:id", async (req, res) => {
  try {
    await prisma.chequeEffet.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/treasury", async (req, res) => {
  try {
    const accounts = await prisma.treasuryAccount.findMany({ orderBy: { name: "asc" } });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/treasury", async (req, res) => {
  try {
    const account = await prisma.treasuryAccount.create({ data: req.body });
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.put("/api/treasury/:id", async (req, res) => {
  try {
    const account = await prisma.treasuryAccount.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.delete("/api/treasury/:id", async (req, res) => {
  try {
    await prisma.treasuryAccount.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/expenses", async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/expenses", async (req, res) => {
  try {
    const expense = await prisma.expense.create({ data: req.body });
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.put("/api/expenses/:id", async (req, res) => {
  try {
    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.delete("/api/expenses/:id", async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/purchases", async (req, res) => {
  try {
    const purchases = await prisma.purchaseImportInvoice.findMany({ orderBy: { dateArrival: "desc" } });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/purchases", async (req, res) => {
  try {
    const p = req.body;
    const sanitizedData = {
      invoiceNumber: p.invoiceNumber || `PUR-${Date.now()}`,
      supplierId: p.supplierId || "",
      supplierName: p.supplierName || "",
      dateArrival: p.dateArrival ? String(p.dateArrival).slice(0, 10) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      targetFrigoId: p.targetFrigoId || "",
      isImport: !!p.isImport,
      containerNumber: p.containerNumber || "",
      customsCostsHT: Number(p.customsCostsHT) || 0,
      freightCostsHT: Number(p.freightCostsHT) || 0,
      totalProductsHT: Number(p.totalProductsHT) || 0,
      totalLandedCostHT: Number(p.totalLandedCostHT) || 0,
      paidAmount: Number(p.paidAmount) || 0,
      remainingBalance: p.remainingBalance !== void 0 ? Number(p.remainingBalance) : (Number(p.totalLandedCostHT) || 0) - (Number(p.paidAmount) || 0),
      items: p.items || [],
      notes: p.notes || "",
      paymentStatus: p.paymentStatus || "NON_PAY\xC9",
      payments: p.payments || [],
      timeArrival: p.timeArrival || ""
    };
    if (p.id) sanitizedData.id = p.id;
    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseImportInvoice.upsert({
        where: { invoiceNumber: sanitizedData.invoiceNumber },
        create: sanitizedData,
        update: sanitizedData
      });
      if (sanitizedData.targetFrigoId && Array.isArray(sanitizedData.items)) {
        for (const item of sanitizedData.items) {
          if (!item.productId) continue;
          const kg = Number(item.quantityKg) || 0;
          const pallets = Number(item.quantityPallets) || 0;
          await tx.frigoStockLevel.upsert({
            where: {
              frigoId_productId: {
                frigoId: sanitizedData.targetFrigoId,
                productId: item.productId
              }
            },
            create: {
              frigoId: sanitizedData.targetFrigoId,
              productId: item.productId,
              quantityKg: kg,
              quantityPallets: pallets
            },
            update: {
              quantityKg: { increment: kg },
              quantityPallets: { increment: pallets }
            }
          });
          await tx.productStockMovement.create({
            data: {
              productId: item.productId,
              frigoId: sanitizedData.targetFrigoId,
              type: "ENTREE",
              quantityKg: kg,
              quantityPallets: pallets,
              performedBy: "Achat / R\xE9ception",
              referenceDoc: sanitizedData.invoiceNumber || "Facture Achat",
              notes: `Arriv\xE9e Achat/Import - Fournisseur: ${sanitizedData.supplierName || ""}`
            }
          });
        }
      }
      return created;
    });
    res.json(purchase);
  } catch (error) {
    console.error("Error creating purchase with stock update:", error);
    res.status(500).json({ error: error.message });
  }
});
app.put("/api/purchases/:id", async (req, res) => {
  try {
    const p = req.body;
    const sanitizedData = {};
    if (p.invoiceNumber !== void 0) sanitizedData.invoiceNumber = p.invoiceNumber;
    if (p.supplierId !== void 0) sanitizedData.supplierId = p.supplierId;
    if (p.supplierName !== void 0) sanitizedData.supplierName = p.supplierName;
    if (p.dateArrival !== void 0) sanitizedData.dateArrival = String(p.dateArrival).slice(0, 10);
    if (p.targetFrigoId !== void 0) sanitizedData.targetFrigoId = p.targetFrigoId;
    if (p.isImport !== void 0) sanitizedData.isImport = !!p.isImport;
    if (p.containerNumber !== void 0) sanitizedData.containerNumber = p.containerNumber;
    if (p.customsCostsHT !== void 0) sanitizedData.customsCostsHT = Number(p.customsCostsHT) || 0;
    if (p.freightCostsHT !== void 0) sanitizedData.freightCostsHT = Number(p.freightCostsHT) || 0;
    if (p.totalProductsHT !== void 0) sanitizedData.totalProductsHT = Number(p.totalProductsHT) || 0;
    if (p.totalLandedCostHT !== void 0) sanitizedData.totalLandedCostHT = Number(p.totalLandedCostHT) || 0;
    if (p.paidAmount !== void 0) sanitizedData.paidAmount = Number(p.paidAmount) || 0;
    if (p.remainingBalance !== void 0) sanitizedData.remainingBalance = Number(p.remainingBalance) || 0;
    if (p.items !== void 0) sanitizedData.items = p.items;
    if (p.notes !== void 0) sanitizedData.notes = p.notes;
    if (p.paymentStatus !== void 0) sanitizedData.paymentStatus = p.paymentStatus;
    if (p.payments !== void 0) sanitizedData.payments = p.payments;
    if (p.timeArrival !== void 0) sanitizedData.timeArrival = p.timeArrival;
    const purchase = await prisma.purchaseImportInvoice.update({
      where: { id: req.params.id },
      data: sanitizedData
    });
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.delete("/api/purchases/:id", async (req, res) => {
  try {
    const purchase = await prisma.purchaseImportInvoice.findUnique({ where: { id: req.params.id } });
    if (purchase) {
      await prisma.$transaction(async (tx) => {
        if (purchase.targetFrigoId && Array.isArray(purchase.items)) {
          for (const item of purchase.items) {
            if (!item.productId) continue;
            const kg = Number(item.quantityKg) || 0;
            const pallets = Number(item.quantityPallets) || 0;
            const existing = await tx.frigoStockLevel.findUnique({
              where: {
                frigoId_productId: {
                  frigoId: purchase.targetFrigoId,
                  productId: item.productId
                }
              }
            });
            if (existing) {
              await tx.frigoStockLevel.update({
                where: {
                  frigoId_productId: {
                    frigoId: purchase.targetFrigoId,
                    productId: item.productId
                  }
                },
                data: {
                  quantityKg: Math.max(0, existing.quantityKg - kg),
                  quantityPallets: Math.max(0, existing.quantityPallets - pallets)
                }
              });
            }
          }
        }
        await tx.purchaseImportInvoice.delete({ where: { id: req.params.id } });
      });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting purchase with stock rollback:", error);
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/inventories", async (req, res) => {
  try {
    const counts = await prisma.multiSiteInventoryCount.findMany({ orderBy: { createdAt: "desc" } });
    res.json(counts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/inventories", async (req, res) => {
  try {
    const count = await prisma.multiSiteInventoryCount.create({ data: req.body });
    res.json(count);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.put("/api/inventories/:id", async (req, res) => {
  try {
    const count = await prisma.multiSiteInventoryCount.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(count);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.delete("/api/inventories/:id", async (req, res) => {
  try {
    await prisma.multiSiteInventoryCount.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/sync/bootstrap", async (req, res) => {
  try {
    const {
      products,
      frigos,
      stocks,
      clients,
      suppliers,
      deliveryNotes,
      invoices,
      chequesEffets,
      treasuryAccounts,
      expenses,
      purchaseInvoices,
      salesOrders,
      inventoryCounts,
      companyInfo,
      companies,
      users
    } = req.body;
    const importedSummary = {};
    if (Array.isArray(companies) && companies.length > 0) {
      let count = 0;
      for (const c of companies) {
        if (!c.id || !c.code) continue;
        try {
          await prisma.company.upsert({
            where: { id: c.id },
            create: {
              id: c.id,
              code: c.code,
              name: c.name || c.code,
              shortName: c.shortName || c.name || c.code,
              ice: c.ice || "",
              taxId: c.taxId || "",
              rc: c.rc || "",
              patent: c.patent || "",
              capital: c.capital || "",
              address: c.address || "",
              city: c.city || "",
              phone: c.phone || "",
              email: c.email || "",
              logoUrl: c.logoUrl || "",
              bankName: c.bankName || "",
              bankRib: c.bankRib || "",
              blPrefix: c.blPrefix || "BL",
              invoicePrefix: c.invoicePrefix || "FAC"
            },
            update: {
              name: c.name || c.code,
              shortName: c.shortName || c.name || c.code,
              ice: c.ice || "",
              taxId: c.taxId || "",
              rc: c.rc || "",
              patent: c.patent || "",
              capital: c.capital || "",
              address: c.address || "",
              city: c.city || "",
              phone: c.phone || "",
              email: c.email || "",
              logoUrl: c.logoUrl || "",
              bankName: c.bankName || "",
              bankRib: c.bankRib || "",
              blPrefix: c.blPrefix || "BL",
              invoicePrefix: c.invoicePrefix || "FAC"
            }
          });
          count++;
        } catch (err) {
          console.warn("Company sync skip:", c.id, err);
        }
      }
      importedSummary.companies = count;
    }
    if (companyInfo && typeof companyInfo === "object") {
      try {
        const compName = companyInfo.name || "MLHMD Sarl";
        await prisma.companyInfo.upsert({
          where: { id: "default" },
          create: {
            id: "default",
            name: compName,
            ice: companyInfo.ice || "",
            rc: companyInfo.rc || "",
            if: companyInfo.if || "",
            cnss: companyInfo.cnss || "",
            patente: companyInfo.patente || "",
            address: companyInfo.address || "",
            city: companyInfo.city || "",
            phone: companyInfo.phone || "",
            email: companyInfo.email || "",
            website: companyInfo.website || "",
            logoUrl: companyInfo.logoUrl || "",
            bankName: companyInfo.bankName || "",
            rib: companyInfo.rib || "",
            swift: companyInfo.swift || "",
            capital: companyInfo.capital || ""
          },
          update: {
            name: compName,
            ice: companyInfo.ice || void 0,
            rc: companyInfo.rc || void 0,
            if: companyInfo.if || void 0,
            cnss: companyInfo.cnss || void 0,
            patente: companyInfo.patente || void 0,
            address: companyInfo.address || void 0,
            city: companyInfo.city || void 0,
            phone: companyInfo.phone || void 0,
            email: companyInfo.email || void 0,
            website: companyInfo.website || void 0,
            logoUrl: companyInfo.logoUrl || void 0,
            bankName: companyInfo.bankName || void 0,
            rib: companyInfo.rib || void 0,
            swift: companyInfo.swift || void 0,
            capital: companyInfo.capital || void 0
          }
        });
        importedSummary.companyInfo = 1;
      } catch (err) {
        console.warn("CompanyInfo sync skip:", err);
      }
    }
    if (Array.isArray(frigos) && frigos.length > 0) {
      let count = 0;
      for (const f of frigos) {
        if (!f.id || !f.name) continue;
        try {
          await prisma.coldStorageFrigo.upsert({
            where: { id: f.id },
            create: {
              id: f.id,
              code: f.code || `FRG-${f.id.slice(0, 4)}`,
              name: f.name,
              location: f.location || "",
              managerName: f.managerName || "",
              managerPhone: f.managerPhone || "",
              whatsappGroup: f.whatsappGroup || "",
              whatsappGroupLink: f.whatsappGroupLink || "",
              capacityPallets: Number(f.capacityPallets) || 0
            },
            update: {
              name: f.name,
              location: f.location || "",
              managerName: f.managerName || "",
              managerPhone: f.managerPhone || "",
              whatsappGroup: f.whatsappGroup || "",
              whatsappGroupLink: f.whatsappGroupLink || "",
              capacityPallets: Number(f.capacityPallets) || 0
            }
          });
          count++;
        } catch (err) {
          console.warn("Frigo sync skip:", f.id, err);
        }
      }
      importedSummary.frigos = count;
    }
    if (Array.isArray(products) && products.length > 0) {
      try {
        const existingProducts = await prisma.product.findMany({ select: { id: true, code: true } });
        const existingIdSet = new Set(existingProducts.map((p) => p.id));
        const existingCodeSet = new Set(existingProducts.map((p) => p.code));
        const toCreate = [];
        for (const p of products) {
          if (!p.id || !p.name) continue;
          const prdCode = p.code || `PRD-${p.id.slice(0, 6)}`;
          if (!existingIdSet.has(p.id) && !existingCodeSet.has(prdCode)) {
            toCreate.push({
              id: p.id,
              code: prdCode,
              name: p.name,
              category: p.category || "Autres Produits Alimentaires",
              origin: p.origin || "Maroc",
              sellingPriceHT: Number(p.sellingPriceHT) || 0,
              unitCostHT: Number(p.unitCostHT) || 0,
              vatRate: Number(p.vatRate) || 0.2,
              kgPerCarton: Number(p.kgPerCarton) || 1,
              cartonsPerPallet: Number(p.cartonsPerPallet) || 1,
              kgPerPallet: Number(p.kgPerPallet) || Number(p.kgPerCarton) * Number(p.cartonsPerPallet) || 1,
              minStockAlertKg: Number(p.minStockAlertKg) || 0,
              description: p.description || "",
              imageUrl: p.imageUrl || ""
            });
            existingIdSet.add(p.id);
            existingCodeSet.add(prdCode);
          } else {
            await prisma.product.updateMany({
              where: { OR: [{ id: p.id }, { code: prdCode }] },
              data: {
                name: p.name,
                category: p.category || "Autres Produits Alimentaires",
                origin: p.origin || "Maroc",
                sellingPriceHT: Number(p.sellingPriceHT) || 0,
                unitCostHT: Number(p.unitCostHT) || 0,
                vatRate: Number(p.vatRate) || 0.2,
                kgPerCarton: Number(p.kgPerCarton) || 1,
                cartonsPerPallet: Number(p.cartonsPerPallet) || 1,
                kgPerPallet: Number(p.kgPerPallet) || Number(p.kgPerCarton) * Number(p.cartonsPerPallet) || 1,
                minStockAlertKg: Number(p.minStockAlertKg) || 0,
                description: p.description || "",
                imageUrl: p.imageUrl || ""
              }
            });
          }
        }
        if (toCreate.length > 0) {
          await prisma.product.createMany({ data: toCreate, skipDuplicates: true });
        }
        importedSummary.products = products.length;
      } catch (err) {
        console.warn("Products bulk sync warning:", err);
      }
    }
    if (Array.isArray(stocks) && stocks.length > 0) {
      let count = 0;
      for (const s of stocks) {
        if (!s.frigoId || !s.productId) continue;
        try {
          await prisma.frigoStockLevel.upsert({
            where: { frigoId_productId: { frigoId: s.frigoId, productId: s.productId } },
            create: {
              frigoId: s.frigoId,
              productId: s.productId,
              quantityKg: Number(s.quantityKg) || 0,
              quantityPallets: Number(s.quantityPallets) || 0
            },
            update: {
              quantityKg: Number(s.quantityKg) || 0,
              quantityPallets: Number(s.quantityPallets) || 0
            }
          });
          count++;
        } catch (err) {
          console.warn("Stock sync skip:", s.frigoId, s.productId, err);
        }
      }
      importedSummary.stocks = count;
    }
    if (Array.isArray(clients) && clients.length > 0) {
      try {
        const existingClients = await prisma.client.findMany({ select: { id: true, code: true } });
        const existingIdSet = new Set(existingClients.map((c) => c.id));
        const existingCodeSet = new Set(existingClients.map((c) => c.code));
        const toCreate = [];
        for (const cl of clients) {
          if (!cl.id || !cl.name) continue;
          const clientCode = cl.code || `CLT-${cl.id.slice(0, 6)}`;
          if (!existingIdSet.has(cl.id) && !existingCodeSet.has(clientCode)) {
            toCreate.push({
              id: cl.id,
              code: clientCode,
              name: cl.name,
              companyName: cl.companyName || "",
              ice: cl.ice || "",
              email: cl.email || "",
              phone: cl.phone || "",
              address: cl.address || "",
              city: cl.city || "",
              creditLimit: Number(cl.creditLimit) || 0,
              currentBalance: Number(cl.currentBalance) || 0
            });
            existingIdSet.add(cl.id);
            existingCodeSet.add(clientCode);
          } else {
            await prisma.client.updateMany({
              where: { OR: [{ id: cl.id }, { code: clientCode }] },
              data: {
                name: cl.name,
                companyName: cl.companyName || "",
                ice: cl.ice || "",
                email: cl.email || "",
                phone: cl.phone || "",
                address: cl.address || "",
                city: cl.city || "",
                creditLimit: Number(cl.creditLimit) || 0,
                currentBalance: Number(cl.currentBalance) || 0
              }
            });
          }
        }
        if (toCreate.length > 0) {
          await prisma.client.createMany({ data: toCreate, skipDuplicates: true });
        }
        importedSummary.clients = clients.length;
      } catch (err) {
        console.warn("Clients bulk sync warning:", err);
      }
    }
    if (Array.isArray(suppliers) && suppliers.length > 0) {
      try {
        const existingSuppliers = await prisma.supplier.findMany({ select: { id: true, code: true } });
        const existingIdSet = new Set(existingSuppliers.map((s) => s.id));
        const existingCodeSet = new Set(existingSuppliers.map((s) => s.code));
        const toCreate = [];
        for (const sp of suppliers) {
          if (!sp.id || !sp.name) continue;
          const supplierCode = sp.code || `FRN-${sp.id.slice(0, 6)}`;
          if (!existingIdSet.has(sp.id) && !existingCodeSet.has(supplierCode)) {
            toCreate.push({
              id: sp.id,
              code: supplierCode,
              name: sp.name,
              companyName: sp.companyName || "",
              country: sp.country || "",
              iceOrTaxId: sp.iceOrTaxId || "",
              email: sp.email || "",
              phone: sp.phone || "",
              address: sp.address || "",
              type: sp.type || "LOCAL",
              currentBalance: Number(sp.currentBalance) || 0
            });
            existingIdSet.add(sp.id);
            existingCodeSet.add(supplierCode);
          } else {
            await prisma.supplier.updateMany({
              where: { OR: [{ id: sp.id }, { code: supplierCode }] },
              data: {
                name: sp.name,
                companyName: sp.companyName || "",
                country: sp.country || "",
                iceOrTaxId: sp.iceOrTaxId || "",
                email: sp.email || "",
                phone: sp.phone || "",
                address: sp.address || "",
                type: sp.type || "LOCAL",
                currentBalance: Number(sp.currentBalance) || 0
              }
            });
          }
        }
        if (toCreate.length > 0) {
          await prisma.supplier.createMany({ data: toCreate, skipDuplicates: true });
        }
        importedSummary.suppliers = suppliers.length;
      } catch (err) {
        console.warn("Suppliers bulk sync warning:", err);
      }
    }
    if (Array.isArray(deliveryNotes) && deliveryNotes.length > 0) {
      try {
        const existingBLs = await prisma.deliveryNoteBL.findMany({ select: { id: true, blNumber: true } });
        const existingIdSet = new Set(existingBLs.map((b) => b.id));
        const existingNumberSet = new Set(existingBLs.map((b) => b.blNumber));
        const toCreate = [];
        const toUpdate = [];
        for (const bl of deliveryNotes) {
          if (!bl.id || !bl.blNumber) continue;
          const blRecord = {
            id: bl.id,
            companyId: bl.companyId || "STE_1",
            blNumber: bl.blNumber,
            orderId: bl.orderId || "",
            orderNumber: bl.orderNumber || "",
            clientId: bl.clientId || "",
            clientName: bl.clientName || "Client",
            clientAddress: bl.clientAddress || "",
            clientPhone: bl.clientPhone || "",
            clientEmail: bl.clientEmail || "",
            frigoId: bl.frigoId || "",
            frigoName: bl.frigoName || "Frigo",
            date: bl.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
            items: bl.items || [],
            totalKg: Number(bl.totalKg) || 0,
            totalCartons: Number(bl.totalCartons) || 0,
            totalPallets: Number(bl.totalPallets) || 0,
            totalHT: Number(bl.totalHT) || 0,
            totalTTC: Number(bl.totalTTC) || 0,
            stockDecremented: Boolean(bl.stockDecremented),
            frigoEmployeeApproved: Boolean(bl.frigoEmployeeApproved),
            frigoApprovedBy: bl.frigoApprovedBy || "",
            frigoApprovedAt: bl.frigoApprovedAt || "",
            bonDeSortiePhotoUrl: bl.bonDeSortiePhotoUrl || "",
            bonDeSortieUploadedBy: bl.bonDeSortieUploadedBy || "",
            bonDeSortieUploadedAt: bl.bonDeSortieUploadedAt || "",
            whatsappSent: Boolean(bl.whatsappSent),
            whatsappSentAt: bl.whatsappSentAt || "",
            clientSignatureUrl: bl.clientSignatureUrl || "",
            signedByName: bl.signedByName || "",
            signedAt: bl.signedAt || "",
            emailSent: Boolean(bl.emailSent),
            emailSentAt: bl.emailSentAt || "",
            emailRecipient: bl.emailRecipient || "",
            invoiceId: bl.invoiceId || "",
            invoiceNumber: bl.invoiceNumber || "",
            status: bl.status || "EN_ATTENTE_FRIGO",
            logs: bl.logs || []
          };
          if (!existingIdSet.has(bl.id) && !existingNumberSet.has(bl.blNumber)) {
            toCreate.push(blRecord);
            existingIdSet.add(bl.id);
            existingNumberSet.add(bl.blNumber);
          } else {
            toUpdate.push(blRecord);
          }
        }
        if (toCreate.length > 0) {
          await prisma.deliveryNoteBL.createMany({
            data: toCreate,
            skipDuplicates: true
          });
        }
        if (toUpdate.length > 0) {
          const updateChunks = [];
          for (let i = 0; i < toUpdate.length; i += 20) {
            const slice = toUpdate.slice(i, i + 20);
            updateChunks.push(
              Promise.all(slice.map(
                (bl) => prisma.deliveryNoteBL.updateMany({
                  where: { OR: [{ id: bl.id }, { blNumber: bl.blNumber }] },
                  data: bl
                })
              ))
            );
          }
          await Promise.all(updateChunks);
        }
        importedSummary.deliveryNotes = deliveryNotes.length;
      } catch (err) {
        console.warn("DeliveryNotes bulk sync warning:", err);
      }
    }
    if (Array.isArray(invoices) && invoices.length > 0) {
      try {
        const existingInvoices = await prisma.invoice.findMany({ select: { id: true, invoiceNumber: true } });
        const existingIdSet = new Set(existingInvoices.map((i) => i.id));
        const existingNumSet = new Set(existingInvoices.map((i) => i.invoiceNumber));
        const toCreate = [];
        for (const inv of invoices) {
          if (!inv.id || !inv.invoiceNumber) continue;
          const invRecord = {
            id: inv.id,
            companyId: inv.companyId || "STE_1",
            invoiceNumber: inv.invoiceNumber,
            orderId: inv.orderId || "",
            blId: inv.blId || "",
            clientId: inv.clientId || "",
            clientName: inv.clientName || "Client",
            clientICE: inv.clientICE || "",
            clientAddress: inv.clientAddress || "",
            date: inv.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
            dueDate: inv.dueDate || "",
            items: inv.items || [],
            totalHT: Number(inv.totalHT) || 0,
            totalVAT: Number(inv.totalVAT) || 0,
            totalTTC: Number(inv.totalTTC) || 0,
            amountPaid: Number(inv.amountPaid) || 0,
            remainingAmount: Number(inv.remainingAmount) || 0,
            status: inv.status || "BROUILLON",
            paymentMethod: inv.paymentMethod || ""
          };
          if (!existingIdSet.has(inv.id) && !existingNumSet.has(inv.invoiceNumber)) {
            toCreate.push(invRecord);
            existingIdSet.add(inv.id);
            existingNumSet.add(inv.invoiceNumber);
          } else {
            await prisma.invoice.updateMany({
              where: { OR: [{ id: inv.id }, { invoiceNumber: inv.invoiceNumber }] },
              data: invRecord
            });
          }
        }
        if (toCreate.length > 0) {
          await prisma.invoice.createMany({ data: toCreate, skipDuplicates: true });
        }
        importedSummary.invoices = invoices.length;
      } catch (err) {
        console.warn("Invoices bulk sync warning:", err);
      }
    }
    if (Array.isArray(chequesEffets) && chequesEffets.length > 0) {
      try {
        const existingCheques = await prisma.chequeEffet.findMany({ select: { id: true } });
        const existingIdSet = new Set(existingCheques.map((c) => c.id));
        const toCreate = [];
        for (const c of chequesEffets) {
          if (!c.id) continue;
          const chequeRecord = {
            id: c.id,
            referenceNumber: c.referenceNumber || "",
            type: c.type || "CHEQUE",
            direction: c.direction || "CLIENT",
            partyId: c.partyId || "",
            partyName: c.partyName || "",
            bankName: c.bankName || "",
            amount: Number(c.amount) || 0,
            issueDate: c.issueDate || "",
            dueDate: c.dueDate || "",
            depositDate: c.depositDate || "",
            clearedDate: c.clearedDate || "",
            status: c.status || "EN_PORTEFEUILLE",
            notes: c.notes || "",
            invoiceId: c.invoiceId || ""
          };
          if (!existingIdSet.has(c.id)) {
            toCreate.push(chequeRecord);
            existingIdSet.add(c.id);
          } else {
            await prisma.chequeEffet.updateMany({
              where: { id: c.id },
              data: chequeRecord
            });
          }
        }
        if (toCreate.length > 0) {
          await prisma.chequeEffet.createMany({ data: toCreate, skipDuplicates: true });
        }
        importedSummary.cheques = chequesEffets.length;
      } catch (err) {
        console.warn("Cheques bulk sync warning:", err);
      }
    }
    if (Array.isArray(treasuryAccounts) && treasuryAccounts.length > 0) {
      let count = 0;
      for (const t of treasuryAccounts) {
        if (!t.id) continue;
        try {
          await prisma.treasuryAccount.upsert({
            where: { id: t.id },
            create: {
              id: t.id,
              name: t.name || "",
              accountNumber: t.accountNumber || "",
              type: t.type || "BANQUE",
              balance: Number(t.balance) || 0
            },
            update: {
              name: t.name || "",
              accountNumber: t.accountNumber || "",
              type: t.type || "BANQUE",
              balance: Number(t.balance) || 0
            }
          });
          count++;
        } catch (err) {
          console.warn("Treasury sync skip:", t.id, err);
        }
      }
      importedSummary.treasury = count;
    }
    if (Array.isArray(expenses) && expenses.length > 0) {
      try {
        const existingExpenses = await prisma.expense.findMany({ select: { id: true } });
        const existingIdSet = new Set(existingExpenses.map((e) => e.id));
        const toCreate = [];
        for (const e of expenses) {
          if (!e.id) continue;
          const expRecord = {
            id: e.id,
            expenseNumber: e.expenseNumber || `DEP-${e.id.slice(0, 6)}`,
            date: e.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
            category: e.category || "Divers",
            frigoId: e.frigoId || "",
            supplierOrPayee: e.supplierOrPayee || "",
            amountHT: Number(e.amountHT) || 0,
            vatAmount: Number(e.vatAmount) || 0,
            amountTTC: Number(e.amountTTC) || 0,
            paymentMethod: e.paymentMethod || "VIREMENT",
            notes: e.notes || "",
            receiptUrl: e.receiptUrl || ""
          };
          if (!existingIdSet.has(e.id)) {
            toCreate.push(expRecord);
            existingIdSet.add(e.id);
          } else {
            await prisma.expense.updateMany({
              where: { id: e.id },
              data: expRecord
            });
          }
        }
        if (toCreate.length > 0) {
          await prisma.expense.createMany({ data: toCreate, skipDuplicates: true });
        }
        importedSummary.expenses = expenses.length;
      } catch (err) {
        console.warn("Expenses bulk sync warning:", err);
      }
    }
    if (Array.isArray(purchaseInvoices) && purchaseInvoices.length > 0) {
      let count = 0;
      for (const pi of purchaseInvoices) {
        if (!pi.id || !pi.invoiceNumber) continue;
        try {
          await prisma.purchaseImportInvoice.upsert({
            where: { id: pi.id },
            create: {
              id: pi.id,
              invoiceNumber: pi.invoiceNumber,
              supplierId: pi.supplierId || "",
              supplierName: pi.supplierName || "Fournisseur",
              dateArrival: pi.dateArrival || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
              targetFrigoId: pi.targetFrigoId || "",
              isImport: Boolean(pi.isImport),
              containerNumber: pi.containerNumber || "",
              customsCostsHT: Number(pi.customsCostsHT) || 0,
              freightCostsHT: Number(pi.freightCostsHT) || 0,
              totalProductsHT: Number(pi.totalProductsHT) || 0,
              totalLandedCostHT: Number(pi.totalLandedCostHT) || 0,
              paidAmount: Number(pi.paidAmount) || 0,
              remainingBalance: Number(pi.remainingBalance) || 0,
              items: pi.items || [],
              notes: pi.notes || "",
              paymentStatus: pi.paymentStatus || "NON_PAY\xC9",
              payments: pi.payments || []
            },
            update: {
              supplierId: pi.supplierId || "",
              supplierName: pi.supplierName || "Fournisseur",
              dateArrival: pi.dateArrival || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
              targetFrigoId: pi.targetFrigoId || "",
              isImport: Boolean(pi.isImport),
              containerNumber: pi.containerNumber || "",
              customsCostsHT: Number(pi.customsCostsHT) || 0,
              freightCostsHT: Number(pi.freightCostsHT) || 0,
              totalProductsHT: Number(pi.totalProductsHT) || 0,
              totalLandedCostHT: Number(pi.totalLandedCostHT) || 0,
              paidAmount: Number(pi.paidAmount) || 0,
              remainingBalance: Number(pi.remainingBalance) || 0,
              items: pi.items || [],
              notes: pi.notes || "",
              paymentStatus: pi.paymentStatus || "NON_PAY\xC9",
              payments: pi.payments || []
            }
          });
          count++;
        } catch (err) {
          console.warn("Purchase sync skip:", pi.id, err);
        }
      }
      importedSummary.purchases = count;
    }
    res.json({
      success: true,
      message: "Toutes les donn\xE9es ont \xE9t\xE9 synchronis\xE9es avec succ\xE8s vers PostgreSQL.",
      importedSummary
    });
  } catch (error) {
    console.error("Error during data bootstrap:", error);
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/sync/reset-all", async (req, res) => {
  try {
    await prisma.$transaction([
      prisma.productStockMovement.deleteMany(),
      prisma.deliveryNoteBL.deleteMany(),
      prisma.invoice.deleteMany(),
      prisma.salesOrder.deleteMany(),
      prisma.purchaseImportInvoice.deleteMany(),
      prisma.multiSiteInventoryCount.deleteMany(),
      prisma.chequeEffet.deleteMany(),
      prisma.expense.deleteMany(),
      prisma.frigoStockLevel.deleteMany(),
      prisma.client.deleteMany(),
      prisma.supplier.deleteMany(),
      prisma.product.deleteMany(),
      prisma.coldStorageFrigo.deleteMany()
    ]);
    res.json({ success: true, message: "Base de donn\xE9es r\xE9initialis\xE9e avec succ\xE8s." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\u{1F680} EZ-ERP PostgreSQL API Server listening on port ${PORT}`);
  });
}
function handler(req, res) {
  return app(req, res);
}
export {
  app,
  handler as default,
  prisma
};
