import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware to normalize URL paths for Vercel Serverless (if Vercel rewrites /api/xxx to /xxx)
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Version check
app.get('/api/version', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.json({
    version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.BUILD_ID || '2026.08.25-live',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// USERS
// ============================================================
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const user = await prisma.user.create({ data: req.body });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// COMPANIES (Sociétés Sœurs)
// ============================================================
app.get('/api/companies', async (req, res) => {
  try {
    const companies = await prisma.company.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(companies);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/companies', async (req, res) => {
  try {
    const company = await prisma.company.create({ data: req.body });
    res.json(company);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/companies/:id', async (req, res) => {
  try {
    const company = await prisma.company.upsert({
      where: { id: req.params.id },
      create: { id: req.params.id, ...req.body },
      update: req.body,
    });
    res.json(company);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// COMPANY INFO (General Settings)
// ============================================================
app.get('/api/company-info', async (req, res) => {
  try {
    const info = await prisma.companyInfo.findUnique({ where: { id: 'default' } });
    res.json(info || {});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/company-info', async (req, res) => {
  try {
    const info = await prisma.companyInfo.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...req.body },
      update: req.body,
    });
    res.json(info);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PRODUCTS
// ============================================================
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const product = await prisma.product.create({ data: req.body });
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await prisma.$transaction([
      prisma.frigoStockLevel.deleteMany({ where: { productId: req.params.id } }),
      prisma.product.delete({ where: { id: req.params.id } }),
    ]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products/merge', async (req, res) => {
  try {
    const { targetProductId, productIdsToMerge } = req.body;
    if (!targetProductId || !Array.isArray(productIdsToMerge) || productIdsToMerge.length === 0) {
      return res.status(400).json({ error: 'Paramètres cibles ou sources invalides' });
    }

    const targetProduct = await prisma.product.findUnique({ where: { id: targetProductId } });
    if (!targetProduct) {
      return res.status(404).json({ error: 'Produit cible non trouvé' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Move stocks from source products to target product
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
                quantityPallets: targetStock.quantityPallets + sStock.quantityPallets,
              }
            });
          } else {
            await tx.frigoStockLevel.create({
              data: {
                frigoId: sStock.frigoId,
                productId: targetProductId,
                quantityKg: sStock.quantityKg,
                quantityPallets: sStock.quantityPallets,
              }
            });
          }
        }
        await tx.frigoStockLevel.deleteMany({ where: { productId: sourceId } });
        await tx.product.delete({ where: { id: sourceId } });
      }
    });

    res.json({ success: true, message: `${productIdsToMerge.length} produits fusionnés vers ${targetProduct.name}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// COLD STORAGE FRIGOS
// ============================================================
app.get('/api/frigos', async (req, res) => {
  try {
    const frigos = await prisma.coldStorageFrigo.findMany({ orderBy: { code: 'asc' } });
    res.json(frigos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/frigos', async (req, res) => {
  try {
    const frigo = await prisma.coldStorageFrigo.create({ data: req.body });
    res.json(frigo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/frigos/:id', async (req, res) => {
  try {
    const frigo = await prisma.coldStorageFrigo.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(frigo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/frigos/:id', async (req, res) => {
  try {
    await prisma.$transaction([
      prisma.frigoStockLevel.deleteMany({ where: { frigoId: req.params.id } }),
      prisma.coldStorageFrigo.delete({ where: { id: req.params.id } }),
    ]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// STOCKS & MOVEMENTS
// ============================================================
app.get('/api/stocks', async (req, res) => {
  try {
    const stocks = await prisma.frigoStockLevel.findMany();
    res.json(stocks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stocks/adjust', async (req, res) => {
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
          quantityPallets: newPallets,
        },
        update: {
          quantityKg: newKg,
          quantityPallets: newPallets,
        }
      });

      // Log movement
      await tx.productStockMovement.create({
        data: {
          productId,
          productName: product?.name || 'Inconnu',
          productCode: product?.code || '',
          frigoId,
          frigoName: frigo?.name || 'Inconnu',
          type: 'AJUSTEMENT_MANUEL',
          quantityKg: Math.abs(newKg - prevKg),
          previousStockKg: prevKg,
          newStockKg: newKg,
          referenceDoc: 'AJUST-MANUEL',
          performedBy: performedBy || 'Admin',
          notes: notes || 'Ajustement manuel inventaire',
        }
      });

      return updatedStock;
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stocks/transfer', async (req, res) => {
  try {
    const { sourceFrigoId, targetFrigoId, productId, kg, pallets, performedBy } = req.body;
    if (sourceFrigoId === targetFrigoId) {
      return res.status(400).json({ error: 'Le frigo source et destination doivent être différents' });
    }

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      const srcFrigo = await tx.coldStorageFrigo.findUnique({ where: { id: sourceFrigoId } });
      const tgtFrigo = await tx.coldStorageFrigo.findUnique({ where: { id: targetFrigoId } });

      // 1. Source decrement
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

      // 2. Target increment
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

      // Log movement Source
      await tx.productStockMovement.create({
        data: {
          productId,
          productName: product?.name || 'Inconnu',
          productCode: product?.code || '',
          frigoId: sourceFrigoId,
          frigoName: srcFrigo?.name || 'Source',
          type: 'TRANSFERT_INTER_FRIGO',
          quantityKg: kg,
          previousStockKg: srcPrevKg,
          newStockKg: srcNewKg,
          referenceDoc: `TRF -> ${tgtFrigo?.name || targetFrigoId}`,
          performedBy: performedBy || 'Admin',
          notes: `Transfert sortant vers ${tgtFrigo?.name}`,
        }
      });

      // Log movement Target
      await tx.productStockMovement.create({
        data: {
          productId,
          productName: product?.name || 'Inconnu',
          productCode: product?.code || '',
          frigoId: targetFrigoId,
          frigoName: tgtFrigo?.name || 'Cible',
          type: 'TRANSFERT_INTER_FRIGO',
          quantityKg: kg,
          previousStockKg: tgtPrevKg,
          newStockKg: tgtNewKg,
          referenceDoc: `TRF <- ${srcFrigo?.name || sourceFrigoId}`,
          performedBy: performedBy || 'Admin',
          notes: `Transfert entrant depuis ${srcFrigo?.name}`,
        }
      });
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stocks/purge-orphans', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ select: { id: true } });
    const productIds = new Set(products.map(p => p.id));
    const allStocks = await prisma.frigoStockLevel.findMany();
    
    const orphans = allStocks.filter(s => !productIds.has(s.productId));
    if (orphans.length > 0) {
      await prisma.frigoStockLevel.deleteMany({
        where: { id: { in: orphans.map(o => o.id) } }
      });
    }
    res.json({ purgedCount: orphans.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stock-movements', async (req, res) => {
  try {
    const movements = await prisma.productStockMovement.findMany({
      orderBy: { date: 'desc' },
      take: 200,
    });
    res.json(movements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// CLIENTS & SUPPLIERS
// ============================================================
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({ orderBy: { name: 'asc' } });
    res.json(clients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const client = await prisma.client.create({ data: req.body });
    res.json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clients/merge', async (req, res) => {
  try {
    const { targetClientId, clientIdsToMerge } = req.body;
    const target = await prisma.client.findUnique({ where: { id: targetClientId } });
    if (!target) return res.status(404).json({ error: 'Client cible introuvable' });

    await prisma.$transaction(async (tx) => {
      // Update BLs and Invoices to target client
      for (const srcId of clientIdsToMerge) {
        if (srcId === targetClientId) continue;
        await tx.client.delete({ where: { id: srcId } }).catch(() => {});
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/suppliers', async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    res.json(suppliers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/suppliers', async (req, res) => {
  try {
    const supplier = await prisma.supplier.create({ data: req.body });
    res.json(supplier);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/suppliers/:id', async (req, res) => {
  try {
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(supplier);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  try {
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// SALES ORDERS
// ============================================================
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await prisma.salesOrder.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const order = await prisma.salesOrder.create({ data: req.body });
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const order = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    await prisma.salesOrder.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DELIVERY NOTES (BLs)
// ============================================================
app.get('/api/delivery-notes', async (req, res) => {
  try {
    const bls = await prisma.deliveryNoteBL.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(bls);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/delivery-notes', async (req, res) => {
  try {
    const blData = req.body;
    const bl = await prisma.$transaction(async (tx) => {
      const created = await tx.deliveryNoteBL.create({ data: blData });

      if (blData.frigoId && Array.isArray(blData.items)) {
        for (const item of blData.items) {
          if (!item.productId) continue;
          const kg = Number(item.quantityKg) || 0;
          const pallets = Number(item.quantityPallets) || 0;

          const existing = await tx.frigoStockLevel.findUnique({
            where: {
              frigoId_productId: {
                frigoId: blData.frigoId,
                productId: item.productId,
              }
            }
          });

          if (existing) {
            await tx.frigoStockLevel.update({
              where: {
                frigoId_productId: {
                  frigoId: blData.frigoId,
                  productId: item.productId,
                }
              },
              data: {
                quantityKg: Math.max(0, existing.quantityKg - kg),
                quantityPallets: Math.max(0, existing.quantityPallets - pallets),
              }
            });
          }

          await tx.productStockMovement.create({
            data: {
              productId: item.productId,
              frigoId: blData.frigoId,
              type: 'SORTIE',
              quantityKg: kg,
              quantityPallets: pallets,
              performedBy: 'Vente / BL',
              referenceDoc: blData.blNumber || 'Bon de Livraison',
              notes: `Sortie BL ${blData.blNumber || ''} - Client: ${blData.clientName || ''}`,
            }
          });
        }
      }

      return created;
    });

    res.json(bl);
  } catch (error: any) {
    console.error('Error creating BL with stock decrement:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/delivery-notes/import-batch', async (req, res) => {
  try {
    const { bls } = req.body;
    if (!Array.isArray(bls)) return res.status(400).json({ error: 'Array of BLs expected' });
    
    const result = await prisma.$transaction(async (tx) => {
      const createdBLs = [];
      for (const blData of bls) {
        if (!blData.blNumber) continue;
        const existing = await tx.deliveryNoteBL.findUnique({ where: { blNumber: blData.blNumber } });
        if (!existing) {
          const created = await tx.deliveryNoteBL.create({ data: blData });
          createdBLs.push(created);

          // Decrement stock for this imported BL
          if (blData.frigoId && Array.isArray(blData.items)) {
            for (const item of blData.items) {
              if (!item.productId) continue;
              const kg = Number(item.quantityKg) || 0;
              const pallets = Number(item.quantityPallets) || 0;

              const existingStock = await tx.frigoStockLevel.findUnique({
                where: {
                  frigoId_productId: {
                    frigoId: blData.frigoId,
                    productId: item.productId,
                  }
                }
              });

              if (existingStock) {
                await tx.frigoStockLevel.update({
                  where: {
                    frigoId_productId: {
                      frigoId: blData.frigoId,
                      productId: item.productId,
                    }
                  },
                  data: {
                    quantityKg: Math.max(0, existingStock.quantityKg - kg),
                    quantityPallets: Math.max(0, existingStock.quantityPallets - pallets),
                  }
                });
              } else {
                await tx.frigoStockLevel.create({
                  data: {
                    frigoId: blData.frigoId,
                    productId: item.productId,
                    quantityKg: 0,
                    quantityPallets: 0,
                  }
                });
              }

              await tx.productStockMovement.create({
                data: {
                  productId: item.productId,
                  frigoId: blData.frigoId,
                  type: 'SORTIE',
                  quantityKg: kg,
                  quantityPallets: pallets,
                  performedBy: 'Import Excel BL',
                  referenceDoc: blData.blNumber,
                  notes: `Sortie Import Excel BL ${blData.blNumber} - Client: ${blData.clientName || ''}`,
                }
              });
            }
          }
        }
      }
      return createdBLs;
    });

    res.json({ importedCount: result.length, bls: result });
  } catch (error: any) {
    console.error('Error importing batch BLs with stock decrement:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/delivery-notes/:id', async (req, res) => {
  try {
    const bl = await prisma.deliveryNoteBL.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(bl);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/delivery-notes/:id', async (req, res) => {
  try {
    const bl = await prisma.deliveryNoteBL.findUnique({ where: { id: req.params.id } });
    if (bl) {
      await prisma.$transaction(async (tx) => {
        if (bl.frigoId && Array.isArray(bl.items as any)) {
          for (const item of (bl.items as any)) {
            if (!item.productId) continue;
            const kg = Number(item.quantityKg) || 0;
            const pallets = Number(item.quantityPallets) || 0;

            await tx.frigoStockLevel.upsert({
              where: {
                frigoId_productId: {
                  frigoId: bl.frigoId,
                  productId: item.productId,
                }
              },
              create: {
                frigoId: bl.frigoId,
                productId: item.productId,
                quantityKg: kg,
                quantityPallets: pallets,
              },
              update: {
                quantityKg: { increment: kg },
                quantityPallets: { increment: pallets },
              }
            });
          }
        }
        await tx.deliveryNoteBL.delete({ where: { id: req.params.id } });
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting BL with stock restore:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve BL in Frigo (Atomically Decrement Stock + Log Movement)
app.post('/api/delivery-notes/:id/approve-frigo', async (req, res) => {
  try {
    const { employeeName } = req.body;
    const blId = req.params.id;

    const result = await prisma.$transaction(async (tx) => {
      const bl = await tx.deliveryNoteBL.findUnique({ where: { id: blId } });
      if (!bl) throw new Error('Bon de Livraison introuvable');

      const items = (bl.items as any[]) || [];
      const frigoId = bl.frigoId;

      // Decrement stock for each item if not already decremented
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

          // Log movement
          await tx.productStockMovement.create({
            data: {
              productId: item.productId,
              productName: item.productName || 'Produit',
              productCode: item.productCode || '',
              frigoId,
              frigoName: bl.frigoName || 'Frigo',
              type: 'SORTIE_BL',
              quantityKg: item.quantityKg || 0,
              previousStockKg: prevKg,
              newStockKg: newKg,
              referenceDoc: bl.blNumber,
              performedBy: employeeName || 'Responsable Quai',
              notes: `Sortie Quai validée pour ${bl.clientName} (BL: ${bl.blNumber})`,
            }
          });
        }
      }

      const updatedLogs = [
        ...((bl.logs as any[]) || []),
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'Approbation Quai Frigo',
          author: employeeName || 'Responsable Frigo',
          notes: 'Validation chargement camion & décrémentation stock',
        }
      ];

      const updatedBL = await tx.deliveryNoteBL.update({
        where: { id: blId },
        data: {
          status: 'APPROUVÉ_FRIGO',
          frigoEmployeeApproved: true,
          frigoApprovedBy: employeeName || 'Responsable Frigo',
          frigoApprovedAt: new Date().toISOString(),
          stockDecremented: true,
          logs: updatedLogs,
        }
      });

      return updatedBL;
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Recalculate BL prices based on current product prices
app.post('/api/delivery-notes/recalculate-prices', async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    const productPriceMap = new Map<string, number>();
    products.forEach(p => productPriceMap.set(p.id, p.sellingPriceHT));

    const bls = await prisma.deliveryNoteBL.findMany();
    let updatedCount = 0;
    let totalFinancialDiff = 0;

    await prisma.$transaction(async (tx) => {
      for (const bl of bls) {
        const items = (bl.items as any[]) || [];
        let blChanged = false;
        let newTotalHT = 0;

        const updatedItems = items.map(item => {
          const newPrice = productPriceMap.get(item.productId);
          if (newPrice !== undefined && newPrice !== item.unitPriceHT) {
            blChanged = true;
            const updatedItemTotalHT = (item.quantityKg || 0) * newPrice;
            newTotalHT += updatedItemTotalHT;
            return { ...item, unitPriceHT: newPrice, totalHT: updatedItemTotalHT };
          }
          newTotalHT += (item.totalHT || ((item.quantityKg || 0) * (item.unitPriceHT || 0)));
          return item;
        });

        if (blChanged) {
          updatedCount++;
          const newTotalTTC = newTotalHT * 1.20;
          totalFinancialDiff += (newTotalHT - bl.totalHT);

          await tx.deliveryNoteBL.update({
            where: { id: bl.id },
            data: {
              items: updatedItems,
              totalHT: newTotalHT,
              totalTTC: newTotalTTC,
            }
          });
        }
      }
    });

    res.json({
      totalBLsScanned: bls.length,
      updatedBLsCount: updatedCount,
      totalFinancialImpactHT: totalFinancialDiff,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// INVOICES (Factures)
// ============================================================
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(invoices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const invoice = await prisma.invoice.create({ data: req.body });
    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/invoices/:id', async (req, res) => {
  try {
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    await prisma.invoice.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Invoice From BL
app.post('/api/invoices/from-bl/:blId', async (req, res) => {
  try {
    const { blId } = req.params;
    const result = await prisma.$transaction(async (tx) => {
      const bl = await tx.deliveryNoteBL.findUnique({ where: { id: blId } });
      if (!bl) throw new Error('BL introuvable');

      const count = await tx.invoice.count();
      const company = await tx.company.findUnique({ where: { id: bl.companyId || 'STE_1' } });
      const prefix = company?.invoicePrefix || 'FAC';
      const invoiceNumber = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      const client = await tx.client.findUnique({ where: { id: bl.clientId } });
      const invoiceItems = ((bl.items as any[]) || []).map(item => ({
        productId: item.productId,
        productCode: item.productCode || '',
        productName: item.productName || '',
        quantityKg: item.quantityKg || 0,
        quantityPallets: item.quantityPallets || 0,
        unitPriceHT: item.unitPriceHT || 0,
        vatRate: 0.20,
        totalHT: item.totalHT || 0,
        totalTTC: (item.totalHT || 0) * 1.20,
      }));

      const invoice = await tx.invoice.create({
        data: {
          companyId: bl.companyId || 'STE_1',
          invoiceNumber,
          orderId: bl.orderId || '',
          blId: bl.id,
          clientId: bl.clientId,
          clientName: bl.clientName,
          clientICE: client?.ice || '',
          clientAddress: bl.clientAddress || '',
          date: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          items: invoiceItems,
          totalHT: bl.totalHT,
          totalVAT: bl.totalHT * 0.20,
          totalTTC: bl.totalTTC,
          amountPaid: 0,
          remainingAmount: bl.totalTTC,
          status: 'EMISE',
        }
      });

      await tx.deliveryNoteBL.update({
        where: { id: bl.id },
        data: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: 'FACTURÉ',
        }
      });

      return invoice;
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// CHEQUES & EFFETS
// ============================================================
app.get('/api/cheques', async (req, res) => {
  try {
    const cheques = await prisma.chequeEffet.findMany({ orderBy: { dueDate: 'asc' } });
    res.json(cheques);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cheques', async (req, res) => {
  try {
    const cheque = await prisma.chequeEffet.create({ data: req.body });
    res.json(cheque);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/cheques/:id', async (req, res) => {
  try {
    const cheque = await prisma.chequeEffet.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(cheque);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cheques/:id', async (req, res) => {
  try {
    await prisma.chequeEffet.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// TREASURY & EXPENSES
// ============================================================
app.get('/api/treasury', async (req, res) => {
  try {
    const accounts = await prisma.treasuryAccount.findMany({ orderBy: { name: 'asc' } });
    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/treasury', async (req, res) => {
  try {
    const account = await prisma.treasuryAccount.create({ data: req.body });
    res.json(account);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/treasury/:id', async (req, res) => {
  try {
    const account = await prisma.treasuryAccount.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(account);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/treasury/:id', async (req, res) => {
  try {
    await prisma.treasuryAccount.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } });
    res.json(expenses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const expense = await prisma.expense.create({ data: req.body });
    res.json(expense);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  try {
    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(expense);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PURCHASES (Factures d'Achats & Importations)
// ============================================================
app.get('/api/purchases', async (req, res) => {
  try {
    const purchases = await prisma.purchaseImportInvoice.findMany({ orderBy: { dateArrival: 'desc' } });
    res.json(purchases);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/purchases', async (req, res) => {
  try {
    const purchaseData = req.body;
    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseImportInvoice.create({ data: purchaseData });

      if (purchaseData.targetFrigoId && Array.isArray(purchaseData.items)) {
        for (const item of purchaseData.items) {
          if (!item.productId) continue;
          const kg = Number(item.quantityKg) || 0;
          const pallets = Number(item.quantityPallets) || 0;

          await tx.frigoStockLevel.upsert({
            where: {
              frigoId_productId: {
                frigoId: purchaseData.targetFrigoId,
                productId: item.productId,
              }
            },
            create: {
              frigoId: purchaseData.targetFrigoId,
              productId: item.productId,
              quantityKg: kg,
              quantityPallets: pallets,
            },
            update: {
              quantityKg: { increment: kg },
              quantityPallets: { increment: pallets },
            }
          });

          await tx.productStockMovement.create({
            data: {
              productId: item.productId,
              frigoId: purchaseData.targetFrigoId,
              type: 'ENTREE',
              quantityKg: kg,
              quantityPallets: pallets,
              performedBy: 'Achat / Réception',
              referenceDoc: purchaseData.invoiceNumber || 'Facture Achat',
              notes: `Arrivée Achat/Import - Fournisseur: ${purchaseData.supplierName || ''}`,
            }
          });
        }
      }

      return created;
    });

    res.json(purchase);
  } catch (error: any) {
    console.error('Error creating purchase with stock update:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/purchases/:id', async (req, res) => {
  try {
    const purchase = await prisma.purchaseImportInvoice.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(purchase);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/purchases/:id', async (req, res) => {
  try {
    const purchase = await prisma.purchaseImportInvoice.findUnique({ where: { id: req.params.id } });
    if (purchase) {
      await prisma.$transaction(async (tx) => {
        if (purchase.targetFrigoId && Array.isArray(purchase.items as any)) {
          for (const item of (purchase.items as any)) {
            if (!item.productId) continue;
            const kg = Number(item.quantityKg) || 0;
            const pallets = Number(item.quantityPallets) || 0;

            const existing = await tx.frigoStockLevel.findUnique({
              where: {
                frigoId_productId: {
                  frigoId: purchase.targetFrigoId,
                  productId: item.productId,
                }
              }
            });

            if (existing) {
              await tx.frigoStockLevel.update({
                where: {
                  frigoId_productId: {
                    frigoId: purchase.targetFrigoId,
                    productId: item.productId,
                  }
                },
                data: {
                  quantityKg: Math.max(0, existing.quantityKg - kg),
                  quantityPallets: Math.max(0, existing.quantityPallets - pallets),
                }
              });
            }
          }
        }
        await tx.purchaseImportInvoice.delete({ where: { id: req.params.id } });
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting purchase with stock rollback:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// INVENTORY COUNTS
// ============================================================
app.get('/api/inventories', async (req, res) => {
  try {
    const counts = await prisma.multiSiteInventoryCount.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(counts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventories', async (req, res) => {
  try {
    const count = await prisma.multiSiteInventoryCount.create({ data: req.body });
    res.json(count);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/inventories/:id', async (req, res) => {
  try {
    const count = await prisma.multiSiteInventoryCount.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(count);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/inventories/:id', async (req, res) => {
  try {
    await prisma.multiSiteInventoryCount.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// FULL DATA SYNC & BOOTSTRAP (Seamless Migration from Local/Firebase)
// ============================================================
app.post('/api/sync/bootstrap', async (req, res) => {
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
      users,
    } = req.body;

    const importedSummary: Record<string, number> = {};

    // 1. Companies
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
              ice: c.ice || '',
              taxId: c.taxId || '',
              rc: c.rc || '',
              patent: c.patent || '',
              capital: c.capital || '',
              address: c.address || '',
              city: c.city || '',
              phone: c.phone || '',
              email: c.email || '',
              logoUrl: c.logoUrl || '',
              bankName: c.bankName || '',
              bankRib: c.bankRib || '',
              blPrefix: c.blPrefix || 'BL',
              invoicePrefix: c.invoicePrefix || 'FAC',
            },
            update: {
              name: c.name || c.code,
              shortName: c.shortName || c.name || c.code,
              ice: c.ice || '',
              taxId: c.taxId || '',
              rc: c.rc || '',
              patent: c.patent || '',
              capital: c.capital || '',
              address: c.address || '',
              city: c.city || '',
              phone: c.phone || '',
              email: c.email || '',
              logoUrl: c.logoUrl || '',
              bankName: c.bankName || '',
              bankRib: c.bankRib || '',
              blPrefix: c.blPrefix || 'BL',
              invoicePrefix: c.invoicePrefix || 'FAC',
            }
          });
          count++;
        } catch (err) {
          console.warn('Company sync skip:', c.id, err);
        }
      }
      importedSummary.companies = count;
    }

    // 2. Company Info
    if (companyInfo && typeof companyInfo === 'object') {
      try {
        const compName = companyInfo.name || 'MLHMD Sarl';
        await prisma.companyInfo.upsert({
          where: { id: 'default' },
          create: {
            id: 'default',
            name: compName,
            ice: companyInfo.ice || '',
            rc: companyInfo.rc || '',
            if: companyInfo.if || '',
            cnss: companyInfo.cnss || '',
            patente: companyInfo.patente || '',
            address: companyInfo.address || '',
            city: companyInfo.city || '',
            phone: companyInfo.phone || '',
            email: companyInfo.email || '',
            website: companyInfo.website || '',
            logoUrl: companyInfo.logoUrl || '',
            bankName: companyInfo.bankName || '',
            rib: companyInfo.rib || '',
            swift: companyInfo.swift || '',
            capital: companyInfo.capital || '',
          },
          update: {
            name: compName,
            ice: companyInfo.ice || undefined,
            rc: companyInfo.rc || undefined,
            if: companyInfo.if || undefined,
            cnss: companyInfo.cnss || undefined,
            patente: companyInfo.patente || undefined,
            address: companyInfo.address || undefined,
            city: companyInfo.city || undefined,
            phone: companyInfo.phone || undefined,
            email: companyInfo.email || undefined,
            website: companyInfo.website || undefined,
            logoUrl: companyInfo.logoUrl || undefined,
            bankName: companyInfo.bankName || undefined,
            rib: companyInfo.rib || undefined,
            swift: companyInfo.swift || undefined,
            capital: companyInfo.capital || undefined,
          },
        });
        importedSummary.companyInfo = 1;
      } catch (err) {
        console.warn('CompanyInfo sync skip:', err);
      }
    }

    // 3. Frigos
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
              location: f.location || '',
              managerName: f.managerName || '',
              managerPhone: f.managerPhone || '',
              whatsappGroup: f.whatsappGroup || '',
              whatsappGroupLink: f.whatsappGroupLink || '',
              capacityPallets: Number(f.capacityPallets) || 0,
            },
            update: {
              name: f.name,
              location: f.location || '',
              managerName: f.managerName || '',
              managerPhone: f.managerPhone || '',
              whatsappGroup: f.whatsappGroup || '',
              whatsappGroupLink: f.whatsappGroupLink || '',
              capacityPallets: Number(f.capacityPallets) || 0,
            }
          });
          count++;
        } catch (err) {
          console.warn('Frigo sync skip:', f.id, err);
        }
      }
      importedSummary.frigos = count;
    }

    // 4. Products
    if (Array.isArray(products) && products.length > 0) {
      let count = 0;
      for (const p of products) {
        if (!p.id || !p.name) continue;
        try {
          const prdCode = p.code || `PRD-${p.id.slice(0, 6)}`;
          // Check if product with this id or code already exists
          const existingById = await prisma.product.findUnique({ where: { id: p.id } });
          const existingByCode = await prisma.product.findUnique({ where: { code: prdCode } });

          if (existingById) {
            await prisma.product.update({
              where: { id: p.id },
              data: {
                name: p.name,
                category: p.category || 'Autres Produits Alimentaires',
                origin: p.origin || 'Maroc',
                sellingPriceHT: Number(p.sellingPriceHT) || 0,
                unitCostHT: Number(p.unitCostHT) || 0,
                vatRate: Number(p.vatRate) || 0.20,
                kgPerCarton: Number(p.kgPerCarton) || 1,
                cartonsPerPallet: Number(p.cartonsPerPallet) || 1,
                kgPerPallet: Number(p.kgPerPallet) || (Number(p.kgPerCarton) * Number(p.cartonsPerPallet)) || 1,
                minStockAlertKg: Number(p.minStockAlertKg) || 0,
                description: p.description || '',
                imageUrl: p.imageUrl || '',
              }
            });
          } else if (existingByCode) {
            await prisma.product.update({
              where: { id: existingByCode.id },
              data: {
                name: p.name,
                category: p.category || 'Autres Produits Alimentaires',
                origin: p.origin || 'Maroc',
                sellingPriceHT: Number(p.sellingPriceHT) || 0,
                unitCostHT: Number(p.unitCostHT) || 0,
                vatRate: Number(p.vatRate) || 0.20,
                kgPerCarton: Number(p.kgPerCarton) || 1,
                cartonsPerPallet: Number(p.cartonsPerPallet) || 1,
                kgPerPallet: Number(p.kgPerPallet) || (Number(p.kgPerCarton) * Number(p.cartonsPerPallet)) || 1,
                minStockAlertKg: Number(p.minStockAlertKg) || 0,
                description: p.description || '',
                imageUrl: p.imageUrl || '',
              }
            });
          } else {
            await prisma.product.create({
              data: {
                id: p.id,
                code: prdCode,
                name: p.name,
                category: p.category || 'Autres Produits Alimentaires',
                origin: p.origin || 'Maroc',
                sellingPriceHT: Number(p.sellingPriceHT) || 0,
                unitCostHT: Number(p.unitCostHT) || 0,
                vatRate: Number(p.vatRate) || 0.20,
                kgPerCarton: Number(p.kgPerCarton) || 1,
                cartonsPerPallet: Number(p.cartonsPerPallet) || 1,
                kgPerPallet: Number(p.kgPerPallet) || (Number(p.kgPerCarton) * Number(p.cartonsPerPallet)) || 1,
                minStockAlertKg: Number(p.minStockAlertKg) || 0,
                description: p.description || '',
                imageUrl: p.imageUrl || '',
              }
            });
          }
          count++;
        } catch (err) {
          console.warn('Product sync skip:', p.id, err);
        }
      }
      importedSummary.products = count;
    }

    // 5. Stocks
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
              quantityPallets: Number(s.quantityPallets) || 0,
            },
            update: {
              quantityKg: Number(s.quantityKg) || 0,
              quantityPallets: Number(s.quantityPallets) || 0,
            }
          });
          count++;
        } catch (err) {
          console.warn('Stock sync skip:', s.frigoId, s.productId, err);
        }
      }
      importedSummary.stocks = count;
    }

    // 6. Clients
    if (Array.isArray(clients) && clients.length > 0) {
      let count = 0;
      for (const cl of clients) {
        if (!cl.id || !cl.name) continue;
        try {
          const clientCode = cl.code || `CLT-${cl.id.slice(0, 6)}`;
          const existingById = await prisma.client.findUnique({ where: { id: cl.id } });
          const existingByCode = await prisma.client.findUnique({ where: { code: clientCode } });

          if (existingById) {
            await prisma.client.update({
              where: { id: cl.id },
              data: {
                name: cl.name,
                companyName: cl.companyName || '',
                ice: cl.ice || '',
                email: cl.email || '',
                phone: cl.phone || '',
                address: cl.address || '',
                city: cl.city || '',
                creditLimit: Number(cl.creditLimit) || 0,
                currentBalance: Number(cl.currentBalance) || 0,
              }
            });
          } else if (existingByCode) {
            await prisma.client.update({
              where: { id: existingByCode.id },
              data: {
                name: cl.name,
                companyName: cl.companyName || '',
                ice: cl.ice || '',
                email: cl.email || '',
                phone: cl.phone || '',
                address: cl.address || '',
                city: cl.city || '',
                creditLimit: Number(cl.creditLimit) || 0,
                currentBalance: Number(cl.currentBalance) || 0,
              }
            });
          } else {
            await prisma.client.create({
              data: {
                id: cl.id,
                code: clientCode,
                name: cl.name,
                companyName: cl.companyName || '',
                ice: cl.ice || '',
                email: cl.email || '',
                phone: cl.phone || '',
                address: cl.address || '',
                city: cl.city || '',
                creditLimit: Number(cl.creditLimit) || 0,
                currentBalance: Number(cl.currentBalance) || 0,
              }
            });
          }
          count++;
        } catch (err) {
          console.warn('Client sync skip:', cl.id, err);
        }
      }
      importedSummary.clients = count;
    }

    // 7. Suppliers
    if (Array.isArray(suppliers) && suppliers.length > 0) {
      let count = 0;
      for (const sp of suppliers) {
        if (!sp.id || !sp.name) continue;
        try {
          const supplierCode = sp.code || `FRN-${sp.id.slice(0, 6)}`;
          const existingById = await prisma.supplier.findUnique({ where: { id: sp.id } });
          const existingByCode = await prisma.supplier.findUnique({ where: { code: supplierCode } });

          if (existingById) {
            await prisma.supplier.update({
              where: { id: sp.id },
              data: {
                name: sp.name,
                companyName: sp.companyName || '',
                country: sp.country || '',
                iceOrTaxId: sp.iceOrTaxId || '',
                email: sp.email || '',
                phone: sp.phone || '',
                address: sp.address || '',
                type: sp.type || 'LOCAL',
                currentBalance: Number(sp.currentBalance) || 0,
              }
            });
          } else if (existingByCode) {
            await prisma.supplier.update({
              where: { id: existingByCode.id },
              data: {
                name: sp.name,
                companyName: sp.companyName || '',
                country: sp.country || '',
                iceOrTaxId: sp.iceOrTaxId || '',
                email: sp.email || '',
                phone: sp.phone || '',
                address: sp.address || '',
                type: sp.type || 'LOCAL',
                currentBalance: Number(sp.currentBalance) || 0,
              }
            });
          } else {
            await prisma.supplier.create({
              data: {
                id: sp.id,
                code: supplierCode,
                name: sp.name,
                companyName: sp.companyName || '',
                country: sp.country || '',
                iceOrTaxId: sp.iceOrTaxId || '',
                email: sp.email || '',
                phone: sp.phone || '',
                address: sp.address || '',
                type: sp.type || 'LOCAL',
                currentBalance: Number(sp.currentBalance) || 0,
              }
            });
          }
          count++;
        } catch (err) {
          console.warn('Supplier sync skip:', sp.id, err);
        }
      }
      importedSummary.suppliers = count;
    }

    // 8. Delivery Notes (BLs)
    if (Array.isArray(deliveryNotes) && deliveryNotes.length > 0) {
      let count = 0;
      for (const bl of deliveryNotes) {
        if (!bl.id || !bl.blNumber) continue;
        try {
          const existingById = await prisma.deliveryNoteBL.findUnique({ where: { id: bl.id } });
          const existingByNumber = await prisma.deliveryNoteBL.findUnique({ where: { blNumber: bl.blNumber } });

          const blData = {
            companyId: bl.companyId || 'STE_1',
            blNumber: bl.blNumber,
            orderId: bl.orderId || '',
            orderNumber: bl.orderNumber || '',
            clientId: bl.clientId || '',
            clientName: bl.clientName || 'Client',
            clientAddress: bl.clientAddress || '',
            clientPhone: bl.clientPhone || '',
            clientEmail: bl.clientEmail || '',
            frigoId: bl.frigoId || '',
            frigoName: bl.frigoName || 'Frigo',
            date: bl.date || new Date().toISOString().split('T')[0],
            items: bl.items || [],
            totalKg: Number(bl.totalKg) || 0,
            totalCartons: Number(bl.totalCartons) || 0,
            totalPallets: Number(bl.totalPallets) || 0,
            totalHT: Number(bl.totalHT) || 0,
            totalTTC: Number(bl.totalTTC) || 0,
            stockDecremented: Boolean(bl.stockDecremented),
            frigoEmployeeApproved: Boolean(bl.frigoEmployeeApproved),
            frigoApprovedBy: bl.frigoApprovedBy || '',
            frigoApprovedAt: bl.frigoApprovedAt || '',
            bonDeSortiePhotoUrl: bl.bonDeSortiePhotoUrl || '',
            bonDeSortieUploadedBy: bl.bonDeSortieUploadedBy || '',
            bonDeSortieUploadedAt: bl.bonDeSortieUploadedAt || '',
            whatsappSent: Boolean(bl.whatsappSent),
            whatsappSentAt: bl.whatsappSentAt || '',
            clientSignatureUrl: bl.clientSignatureUrl || '',
            signedByName: bl.signedByName || '',
            signedAt: bl.signedAt || '',
            emailSent: Boolean(bl.emailSent),
            emailSentAt: bl.emailSentAt || '',
            emailRecipient: bl.emailRecipient || '',
            invoiceId: bl.invoiceId || '',
            invoiceNumber: bl.invoiceNumber || '',
            status: bl.status || 'EN_ATTENTE_FRIGO',
            logs: bl.logs || [],
          };

          if (existingById) {
            await prisma.deliveryNoteBL.update({
              where: { id: bl.id },
              data: blData,
            });
          } else if (existingByNumber) {
            await prisma.deliveryNoteBL.update({
              where: { id: existingByNumber.id },
              data: blData,
            });
          } else {
            await prisma.deliveryNoteBL.create({
              data: {
                id: bl.id,
                ...blData,
              }
            });
          }
          count++;
        } catch (err) {
          console.warn('BL sync skip:', bl.id, bl.blNumber, err);
        }
      }
      importedSummary.deliveryNotes = count;
    }

    // 9. Invoices
    if (Array.isArray(invoices) && invoices.length > 0) {
      let count = 0;
      for (const inv of invoices) {
        if (!inv.id || !inv.invoiceNumber) continue;
        try {
          const existingById = await prisma.invoice.findUnique({ where: { id: inv.id } });
          const existingByNum = await prisma.invoice.findUnique({ where: { invoiceNumber: inv.invoiceNumber } });

          const invData = {
            companyId: inv.companyId || 'STE_1',
            invoiceNumber: inv.invoiceNumber,
            orderId: inv.orderId || '',
            blId: inv.blId || '',
            clientId: inv.clientId || '',
            clientName: inv.clientName || 'Client',
            clientICE: inv.clientICE || '',
            clientAddress: inv.clientAddress || '',
            date: inv.date || new Date().toISOString().split('T')[0],
            dueDate: inv.dueDate || '',
            items: inv.items || [],
            totalHT: Number(inv.totalHT) || 0,
            totalVAT: Number(inv.totalVAT) || 0,
            totalTTC: Number(inv.totalTTC) || 0,
            amountPaid: Number(inv.amountPaid) || 0,
            remainingAmount: Number(inv.remainingAmount) || 0,
            status: inv.status || 'BROUILLON',
            paymentMethod: inv.paymentMethod || '',
          };

          if (existingById) {
            await prisma.invoice.update({
              where: { id: inv.id },
              data: invData,
            });
          } else if (existingByNum) {
            await prisma.invoice.update({
              where: { id: existingByNum.id },
              data: invData,
            });
          } else {
            await prisma.invoice.create({
              data: {
                id: inv.id,
                ...invData,
              }
            });
          }
          count++;
        } catch (err) {
          console.warn('Invoice sync skip:', inv.id, err);
        }
      }
      importedSummary.invoices = count;
    }

    // 10. Cheques & Effets
    if (Array.isArray(chequesEffets) && chequesEffets.length > 0) {
      let count = 0;
      for (const c of chequesEffets) {
        if (!c.id) continue;
        try {
          await prisma.chequeEffet.upsert({
            where: { id: c.id },
            create: {
              id: c.id,
              referenceNumber: c.referenceNumber || '',
              type: c.type || 'CHEQUE',
              direction: c.direction || 'CLIENT',
              partyId: c.partyId || '',
              partyName: c.partyName || '',
              bankName: c.bankName || '',
              amount: Number(c.amount) || 0,
              issueDate: c.issueDate || '',
              dueDate: c.dueDate || '',
              depositDate: c.depositDate || '',
              clearedDate: c.clearedDate || '',
              status: c.status || 'EN_PORTEFEUILLE',
              notes: c.notes || '',
              invoiceId: c.invoiceId || '',
            },
            update: {
              referenceNumber: c.referenceNumber || '',
              type: c.type || 'CHEQUE',
              direction: c.direction || 'CLIENT',
              partyId: c.partyId || '',
              partyName: c.partyName || '',
              bankName: c.bankName || '',
              amount: Number(c.amount) || 0,
              issueDate: c.issueDate || '',
              dueDate: c.dueDate || '',
              depositDate: c.depositDate || '',
              clearedDate: c.clearedDate || '',
              status: c.status || 'EN_PORTEFEUILLE',
              notes: c.notes || '',
              invoiceId: c.invoiceId || '',
            }
          });
          count++;
        } catch (err) {
          console.warn('Cheque sync skip:', c.id, err);
        }
      }
      importedSummary.cheques = count;
    }

    // 11. Treasury Accounts
    if (Array.isArray(treasuryAccounts) && treasuryAccounts.length > 0) {
      let count = 0;
      for (const t of treasuryAccounts) {
        if (!t.id) continue;
        try {
          await prisma.treasuryAccount.upsert({
            where: { id: t.id },
            create: {
              id: t.id,
              name: t.name || '',
              accountNumber: t.accountNumber || '',
              type: t.type || 'BANQUE',
              balance: Number(t.balance) || 0,
            },
            update: {
              name: t.name || '',
              accountNumber: t.accountNumber || '',
              type: t.type || 'BANQUE',
              balance: Number(t.balance) || 0,
            }
          });
          count++;
        } catch (err) {
          console.warn('Treasury sync skip:', t.id, err);
        }
      }
      importedSummary.treasury = count;
    }

    // 12. Expenses
    if (Array.isArray(expenses) && expenses.length > 0) {
      let count = 0;
      for (const e of expenses) {
        if (!e.id) continue;
        try {
          await prisma.expense.upsert({
            where: { id: e.id },
            create: {
              id: e.id,
              expenseNumber: e.expenseNumber || `DEP-${e.id.slice(0, 6)}`,
              date: e.date || new Date().toISOString().split('T')[0],
              category: e.category || 'Divers',
              frigoId: e.frigoId || '',
              supplierOrPayee: e.supplierOrPayee || '',
              amountHT: Number(e.amountHT) || 0,
              vatAmount: Number(e.vatAmount) || 0,
              amountTTC: Number(e.amountTTC) || 0,
              paymentMethod: e.paymentMethod || 'VIREMENT',
              notes: e.notes || '',
              receiptUrl: e.receiptUrl || '',
            },
            update: {
              expenseNumber: e.expenseNumber || `DEP-${e.id.slice(0, 6)}`,
              date: e.date || new Date().toISOString().split('T')[0],
              category: e.category || 'Divers',
              frigoId: e.frigoId || '',
              supplierOrPayee: e.supplierOrPayee || '',
              amountHT: Number(e.amountHT) || 0,
              vatAmount: Number(e.vatAmount) || 0,
              amountTTC: Number(e.amountTTC) || 0,
              paymentMethod: e.paymentMethod || 'VIREMENT',
              notes: e.notes || '',
              receiptUrl: e.receiptUrl || '',
            }
          });
          count++;
        } catch (err) {
          console.warn('Expense sync skip:', e.id, err);
        }
      }
      importedSummary.expenses = count;
    }

    // 13. Purchase Invoices
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
              supplierId: pi.supplierId || '',
              supplierName: pi.supplierName || 'Fournisseur',
              dateArrival: pi.dateArrival || new Date().toISOString().split('T')[0],
              targetFrigoId: pi.targetFrigoId || '',
              isImport: Boolean(pi.isImport),
              containerNumber: pi.containerNumber || '',
              customsCostsHT: Number(pi.customsCostsHT) || 0,
              freightCostsHT: Number(pi.freightCostsHT) || 0,
              totalProductsHT: Number(pi.totalProductsHT) || 0,
              totalLandedCostHT: Number(pi.totalLandedCostHT) || 0,
              paidAmount: Number(pi.paidAmount) || 0,
              remainingBalance: Number(pi.remainingBalance) || 0,
              items: pi.items || [],
              notes: pi.notes || '',
              paymentStatus: pi.paymentStatus || 'NON_PAYÉ',
              payments: pi.payments || [],
            },
            update: {
              supplierId: pi.supplierId || '',
              supplierName: pi.supplierName || 'Fournisseur',
              dateArrival: pi.dateArrival || new Date().toISOString().split('T')[0],
              targetFrigoId: pi.targetFrigoId || '',
              isImport: Boolean(pi.isImport),
              containerNumber: pi.containerNumber || '',
              customsCostsHT: Number(pi.customsCostsHT) || 0,
              freightCostsHT: Number(pi.freightCostsHT) || 0,
              totalProductsHT: Number(pi.totalProductsHT) || 0,
              totalLandedCostHT: Number(pi.totalLandedCostHT) || 0,
              paidAmount: Number(pi.paidAmount) || 0,
              remainingBalance: Number(pi.remainingBalance) || 0,
              items: pi.items || [],
              notes: pi.notes || '',
              paymentStatus: pi.paymentStatus || 'NON_PAYÉ',
              payments: pi.payments || [],
            }
          });
          count++;
        } catch (err) {
          console.warn('Purchase sync skip:', pi.id, err);
        }
      }
      importedSummary.purchases = count;
    }

    res.json({
      success: true,
      message: 'Toutes les données ont été synchronisées avec succès vers PostgreSQL.',
      importedSummary,
    });
  } catch (error: any) {
    console.error('Error during data bootstrap:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset all ERP data
app.post('/api/sync/reset-all', async (req, res) => {
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
      prisma.coldStorageFrigo.deleteMany(),
    ]);

    res.json({ success: true, message: 'Base de données réinitialisée avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// BOOTSTRAP / SERVER START
// ============================================================
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 EZ-ERP PostgreSQL API Server listening on port ${PORT}`);
  });
}

export { app, prisma };
export default app;
