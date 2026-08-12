import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// GET /api/reports/tariff-negotiations
// ---------------------------------------------------------------------------
router.get('/tariff-negotiations', async (req: Request, res: Response) => {
  try {
    const audits = await prisma.auditTariffAdjustment.findMany({
      include: {
        client: {
          select: {
            company_name: true,
            id_passport_no: true,
            customer_no: true,
            client_type: true
          }
        },
        service: {
          select: { name: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const formattedAudits = audits.map((audit) => {
      const clientName =
        audit.client.client_type === 'BUSINESS'
          ? audit.client.company_name
          : audit.client.id_passport_no;

      return {
        id: audit.id,
        customer_no: audit.client.customer_no,
        client_name: clientName || 'Unknown',
        service_name: audit.service.name,
        base_fee: audit.base_fee,
        negotiated_fee: audit.negotiated_fee,
        variance: audit.variance,
        reason: audit.reason,
        captured_by: audit.captured_by,
        created_at: audit.created_at
      };
    });

    res.json(formattedAudits);
  } catch (error) {
    console.error('Error fetching negotiations report:', error);
    res.status(500).json({ error: 'Failed to fetch negotiations report' });
  }
});

export default router;
