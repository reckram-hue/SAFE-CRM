import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helper: map URL category names to Prisma model delegates
// ---------------------------------------------------------------------------
const getModelDelegate = (category: string) => {
  switch (category.toLowerCase()) {
    case 'towns':
      return prisma.town;
    case 'suburbs':
      return prisma.suburb;
    case 'sectors':
      return prisma.sector;
    case 'estates':
      return prisma.estate;
    case 'services':
      return prisma.service;
    case 'zone-types':
      return prisma.zoneType;
    case 'zone-descriptors':
      return prisma.zoneDescriptor;
    case 'alarm-makes':
      return prisma.alarmMake;
    case 'alarm-models':
      return prisma.alarmModel;
    case 'streets':
      return prisma.street;
    case 'billing-cycles':
      return prisma.billingCycle;
    case 'payment-methods':
      return prisma.paymentMethod;
    default:
      return null;
  }
};

// ---------------------------------------------------------------------------
// GET /api/settings/alarm-models
// ---------------------------------------------------------------------------
router.get('/alarm-models', async (req: Request, res: Response) => {
  try {
    const items = await prisma.alarmMake.findMany({
      include: {
        models: true
      }
    });
    return res.json(items);
  } catch (error) {
    console.error('Error retrieving alarm-models:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/settings/:category
// ---------------------------------------------------------------------------
router.get('/:category', async (req: Request, res: Response) => {
  const { category } = req.params;
  const model = getModelDelegate(category);

  if (!model) {
    return res.status(400).json({ error: `Invalid category: ${category}` });
  }

  try {
    const whereClause: any = {};
    if (category.toLowerCase() === 'streets') {
      const suburbId = req.query.suburbId || req.query.suburb_id;
      const townId = req.query.townId || req.query.town_id;
      if (suburbId) whereClause.suburb_id = parseInt(suburbId as string);
      else if (townId) whereClause.town_id = parseInt(townId as string);
    } else if (category.toLowerCase() === 'suburbs') {
      const townId = req.query.townId || req.query.town_id || req.query.town;
      if (townId) whereClause.town_id = parseInt(townId as string);
    } else if (category.toLowerCase() === 'estates') {
      const suburbId = req.query.suburbId || req.query.suburb_id;
      if (suburbId) whereClause.suburb_id = parseInt(suburbId as string);
    }
    
    // @ts-ignore
    const items = await model.findMany({ where: whereClause });
    return res.json(items);
  } catch (error) {
    console.error(`Error retrieving ${category}:`, error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/settings/:category
// ---------------------------------------------------------------------------
router.post('/:category', async (req: Request, res: Response) => {
  const { category } = req.params;
  const model = getModelDelegate(category);

  if (!model) {
    return res.status(400).json({ error: `Invalid category: ${category}` });
  }

  const { name, label, base_fee, suburb_id, town_id, makeId } = req.body;
  const itemName = name || label;
  
  if (!itemName || typeof itemName !== 'string') {
    return res.status(400).json({ error: 'A valid "name" or "label" is required' });
  }

  try {
    let newItem;
    if (category.toLowerCase() === 'services') {
      const fee = typeof base_fee === 'number' ? base_fee : parseFloat(base_fee);
      if (isNaN(fee)) {
        return res.status(400).json({ error: 'A valid numeric "base_fee" is required for services' });
      }
      // @ts-ignore
      newItem = await prisma.service.create({
        data: { name: itemName, base_fee: fee, is_active: true }
      });
    } else if (category.toLowerCase() === 'zone-types') {
      // @ts-ignore
      newItem = await prisma.zoneType.create({ data: { label: itemName, is_active: true } });
    } else if (category.toLowerCase() === 'zone-descriptors') {
      // @ts-ignore
      newItem = await prisma.zoneDescriptor.create({ data: { label: itemName, is_active: true } });
    } else if (category.toLowerCase() === 'streets') {
      // @ts-ignore
      newItem = await prisma.street.create({
        data: { 
          name: itemName, 
          is_active: true,
          suburb_id: suburb_id ? parseInt(suburb_id.toString()) : null,
          town_id: town_id ? parseInt(town_id.toString()) : null
        }
      });
    } else if (category.toLowerCase() === 'alarm-models') {
      // @ts-ignore
      newItem = await prisma.alarmModel.create({
        data: {
          name: itemName,
          makeId: parseInt(makeId.toString()),
          is_active: true
        }
      });
    } else if (category.toLowerCase() === 'suburbs') {
      // @ts-ignore
      newItem = await prisma.suburb.create({
        data: {
          name: itemName,
          town_id: town_id ? parseInt(town_id.toString()) : null,
          is_active: true
        }
      });
    } else if (category.toLowerCase() === 'estates') {
      // @ts-ignore
      newItem = await prisma.estate.create({
        data: {
          name: itemName,
          suburb_id: suburb_id ? parseInt(suburb_id.toString()) : null,
          is_active: true
        }
      });
    } else {
      // @ts-ignore
      newItem = await model.create({ data: { name: itemName, is_active: true } });
    }
    return res.status(201).json(newItem);
  } catch (error) {
    console.error(`Error creating new item in ${category}:`, error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/settings/:category/:id (Soft Delete)
// ---------------------------------------------------------------------------
router.delete('/:category/:id', async (req: Request, res: Response) => {
  const { category, id } = req.params;
  const model = getModelDelegate(category);

  if (!model) {
    return res.status(400).json({ error: `Invalid category: ${category}` });
  }

  try {
    // @ts-ignore
    await model.update({
      where: { id: parseInt(id) },
      data: { is_active: false }
    });
    return res.status(204).send();
  } catch (error) {
    console.error(`Error deleting item in ${category}:`, error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
