// Logistics module – Frontend types

// ===================== SHIPMENTS =====================

export type ShipmentStatus = 'registered' | 'pending' | 'processing' | 'dispatched' | 'in_transit' | 'arrived' | 'delivered' | 'cancelled';

export interface Shipment {
  id: string;
  companyId: string;
  trackingCode: string;
  containerId: string | null;
  containerCode?: string;
  containerName?: string;
  senderName: string;
  senderPhone: string;
  senderEmail: string | null;
  receiverName: string;
  receiverPhone: string;
  receiverEmail: string | null;
  origin: string;
  destination: string;
  description: string | null;
  weightKg: number | null;
  amount: number;
  status: ShipmentStatus;
  deliveredAt: string | null;
  recipientName: string | null;
  recipientId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateShipmentStatusData {
  status: ShipmentStatus;
  note?: string;
  recipientName?: string;
  recipientId?: string;
  deliveryTime?: string;
}

export interface CreateShipmentData {
  senderName: string;
  senderPhone: string;
  senderEmail?: string;
  receiverName: string;
  receiverPhone: string;
  receiverEmail?: string;
  origin: string;
  destination: string;
  description?: string;
  weightKg?: number;
  amount?: number;
  containerId?: string;
}

// ===================== CONTAINERS =====================

export type ContainerStatus = 'loading' | 'dispatched' | 'in_transit' | 'arrived' | 'delivered' | 'cancelled';

export interface Container {
  id: string;
  companyId: string;
  containerCode: string;
  name: string;
  vehicleType: string | null;
  vehicleNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  origin: string;
  destination: string;
  status: ContainerStatus;
  departureTime: string | null;
  arrivalTime: string | null;
  createdAt: string;
  updatedAt: string;
  shipmentCount?: number;
  totalWeight?: number;
  totalAmount?: number;
}

export interface ContainerDetail extends Container {
  shipments: Shipment[];
  statusHistory: StatusHistoryEntry[];
}

export interface CreateContainerData {
  name: string;
  vehicleType?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  origin: string;
  destination: string;
  departureTime?: string;
}

// ===================== RIDERS =====================

export interface Rider {
  id: string;
  companyId: string;
  riderCode: string;
  name: string;
  phone: string;
  email: string | null;
  vehiclePlate: string | null;
  vehicleModel: string | null;
  isActive: boolean;
  isAvailable: boolean;
  currentLat: number | null;
  currentLng: number | null;
  lastLocationUpdate: string | null;
  createdAt: string;
  updatedAt: string;
  activeDeliveries?: number;
}

export interface RiderDetail extends Rider {
  recentDeliveries: Delivery[];
}

export interface CreateRiderData {
  name: string;
  phone: string;
  email?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
}

// ===================== DELIVERIES =====================

export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cash' | 'mobile_money' | 'card' | 'bank_transfer';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type PackageSize = 'small' | 'medium' | 'large' | 'extra_large';

export interface Delivery {
  id: string;
  companyId: string;
  deliveryCode: string;
  riderId: string | null;
  pickupName: string;
  pickupPhone: string;
  pickupAddress: string;
  pickupLat: number | null;
  pickupLng: number | null;
  deliveryName: string;
  deliveryPhone: string;
  deliveryAddress: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
  description: string | null;
  packageSize: PackageSize;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: DeliveryStatus;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  estimatedPickupTime: string | null;
  estimatedDeliveryTime: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  riderName?: string | null;
}

export interface DeliveryDetail extends Delivery {
  riderCode?: string | null;
  riderPhone?: string | null;
  statusHistory: StatusHistoryEntry[];
  locations: LocationPoint[];
}

export interface CreateDeliveryData {
  riderId?: string;
  pickupName: string;
  pickupPhone: string;
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  deliveryName: string;
  deliveryPhone: string;
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
  description?: string;
  packageSize?: PackageSize;
  amount?: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

// ===================== SHARED =====================

export interface StatusHistoryEntry {
  id: string;
  status: string;
  note: string | null;
  timestamp: string;
}

export interface LocationPoint {
  id: string;
  deliveryId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: string;
}

// ===================== REPORTS =====================

export interface ReportSummary {
  total_shipments: number;
  by_status: Record<string, number>;
  total_amount: number;
  average_amount: number;
  total_weight: number;
  average_weight: number;
  delivery_rate: number;
  pending_shipments: number;
  total_containers: number;
  containers_by_status: Record<string, number>;
  shipments_in_containers: number;
  standalone_shipments: number;
  top_routes: Array<{ origin: string; destination: string; count: number }>;
  recent_shipments_7d: number;
  today_shipments: number;
  riders: { total: number; active: number };
  deliveries: { total: number; by_status: Record<string, number> };
  timestamp: string;
}

export interface LogisticsStats {
  riders: {
    total: number;
    active: number;
    available: number;
  };
  deliveries: {
    total: number;
    pending: number;
    active: number;
    completed: number;
  };
  containers: { total: number };
  shipments: {
    total: number;
    inTransit: number;
  };
}
