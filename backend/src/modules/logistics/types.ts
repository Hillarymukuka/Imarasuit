// Logistics module – backend types & row converters

// ─── DB Row Types (snake_case from D1) ───

export interface ContainerRow {
  id: string;
  company_id: string;
  container_code: string;
  name: string;
  vehicle_type: string | null;
  vehicle_number: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  origin: string;
  destination: string;
  status: string;
  departure_time: string | null;
  arrival_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShipmentRow {
  id: string;
  company_id: string;
  tracking_code: string;
  container_id: string | null;
  sender_name: string;
  sender_phone: string | null;
  sender_email: string | null;
  receiver_name: string;
  receiver_phone: string | null;
  receiver_email: string | null;
  origin: string;
  destination: string;
  description: string | null;
  weight_kg: number | null;
  amount: number | null;
  status: string;
  delivered_at: string | null;
  recipient_name: string | null;
  recipient_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusHistoryRow {
  id: string;
  status: string;
  note: string | null;
  timestamp: string;
}

export interface RiderRow {
  id: string;
  company_id: string;
  rider_code: string;
  name: string;
  phone: string;
  email: string | null;
  vehicle_plate: string | null;
  vehicle_model: string | null;
  is_active: number;
  is_available: number;
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_update: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryRow {
  id: string;
  company_id: string;
  delivery_code: string;
  rider_id: string | null;
  pickup_name: string;
  pickup_phone: string | null;
  pickup_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  delivery_name: string;
  delivery_phone: string | null;
  delivery_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  description: string | null;
  package_size: string;
  amount: number | null;
  payment_method: string;
  payment_status: string;
  status: string;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  estimated_pickup_time: string | null;
  estimated_delivery_time: string | null;
  pickup_notes: string | null;
  delivery_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocationRow {
  id: string;
  delivery_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: string;
}

// ─── Row → Response Converters ───

export function containerRowToResponse(row: ContainerRow) {
  return {
    id: row.id,
    containerCode: row.container_code,
    name: row.name,
    vehicleType: row.vehicle_type || undefined,
    vehicleNumber: row.vehicle_number || undefined,
    driverName: row.driver_name || undefined,
    driverPhone: row.driver_phone || undefined,
    origin: row.origin,
    destination: row.destination,
    status: row.status,
    departureTime: row.departure_time || undefined,
    arrivalTime: row.arrival_time || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function shipmentRowToResponse(row: ShipmentRow) {
  return {
    id: row.id,
    trackingCode: row.tracking_code,
    containerId: row.container_id || undefined,
    senderName: row.sender_name,
    senderPhone: row.sender_phone || undefined,
    senderEmail: row.sender_email || undefined,
    receiverName: row.receiver_name,
    receiverPhone: row.receiver_phone || undefined,
    receiverEmail: row.receiver_email || undefined,
    origin: row.origin,
    destination: row.destination,
    description: row.description || undefined,
    weightKg: row.weight_kg ?? undefined,
    amount: row.amount ?? undefined,
    status: row.status,
    deliveredAt: row.delivered_at || undefined,
    recipientName: row.recipient_name || undefined,
    recipientId: row.recipient_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function riderRowToResponse(row: RiderRow) {
  return {
    id: row.id,
    riderCode: row.rider_code,
    name: row.name,
    phone: row.phone,
    email: row.email || undefined,
    vehiclePlate: row.vehicle_plate || undefined,
    vehicleModel: row.vehicle_model || undefined,
    isActive: row.is_active === 1,
    isAvailable: row.is_available === 1,
    currentLat: row.current_latitude ?? undefined,
    currentLng: row.current_longitude ?? undefined,
    lastLocationUpdate: row.last_location_update || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function deliveryRowToResponse(row: DeliveryRow) {
  return {
    id: row.id,
    deliveryCode: row.delivery_code,
    riderId: row.rider_id || undefined,
    pickupName: row.pickup_name,
    pickupPhone: row.pickup_phone || undefined,
    pickupAddress: row.pickup_address,
    pickupLat: row.pickup_latitude ?? undefined,
    pickupLng: row.pickup_longitude ?? undefined,
    deliveryName: row.delivery_name,
    deliveryPhone: row.delivery_phone || undefined,
    deliveryAddress: row.delivery_address,
    deliveryLat: row.delivery_latitude ?? undefined,
    deliveryLng: row.delivery_longitude ?? undefined,
    description: row.description || undefined,
    packageSize: row.package_size,
    amount: row.amount ?? undefined,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    status: row.status,
    assignedAt: row.assigned_at || undefined,
    pickedUpAt: row.picked_up_at || undefined,
    deliveredAt: row.delivered_at || undefined,
    estimatedPickupTime: row.estimated_pickup_time || undefined,
    estimatedDeliveryTime: row.estimated_delivery_time || undefined,
    notes: row.delivery_notes || row.pickup_notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function locationRowToResponse(row: LocationRow) {
  return {
    id: row.id,
    deliveryId: row.delivery_id,
    lat: row.latitude,
    lng: row.longitude,
    accuracy: row.accuracy ?? undefined,
    speed: row.speed ?? undefined,
    heading: row.heading ?? undefined,
    timestamp: row.timestamp,
  };
}

export function statusHistoryToResponse(row: StatusHistoryRow) {
  return {
    id: row.id,
    status: row.status,
    note: row.note || undefined,
    timestamp: row.timestamp,
  };
}
