/**
 * Service definitions and profit calculation logic.
 *
 * A service can be of two types:
 * 1. Unit-profit service: profit = (sellingRate – baseCost) × quantity.
 * 2. Lump-sum profit service: profit = entire payment.
 */

export type ServiceType = 'UNIT' | 'LUMP_SUM';

export interface ServiceDefinition {
  name: string;
  type: ServiceType;
  sellingRate?: number; // per unit
  baseCost?: number;    // per unit cost for unit services
}

// In-memory service master. In a production system this would live in Firestore.
const serviceMaster: Record<string, ServiceDefinition> = {
  'Voice Call': { name: 'Voice Call', type: 'UNIT', sellingRate: 0.70, baseCost: 0.25 },
  'WhatsApp': { name: 'WhatsApp', type: 'LUMP_SUM' },
};

/**
 * Retrieve a service definition by name.
 */
export function getService(name: string): ServiceDefinition | undefined {
  return serviceMaster[name];
}

/**
 * Calculate profit for a service given the amount paid and quantity (if applicable).
 */
export function calculateProfit(service: ServiceDefinition, amount: number, quantity = 1): number {
  if (service.type === 'UNIT') {
    const sellingRate = service.sellingRate ?? 0;
    const baseCost = service.baseCost ?? 0;
    return (sellingRate - baseCost) * quantity;
  }
  return amount;
}
