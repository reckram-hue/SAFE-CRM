import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// GET /api/contacts/search
// ---------------------------------------------------------------------------
router.get('/search', async (req: Request, res: Response) => {
  const { q } = req.query;
  try {
    if (!q || typeof q !== 'string') {
      return res.json([]);
    }
    const contacts = await prisma.emergencyContact.findMany({
      where: {
        OR: [
          { full_name: { contains: q } },
          { primary_phone: { contains: q } }
        ]
      },
      take: 10
    });
    res.json(contacts);
  } catch (error) {
    console.error('Error searching contacts:', error);
    res.status(500).json({ error: 'Failed to search contacts' });
  }
});

export default router;
