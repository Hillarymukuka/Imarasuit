// Logistics module – API client
import { apiFetch, getToken } from '@/lib/api-base';
import type {
  Shipment, CreateShipmentData, UpdateShipmentStatusData,
  Container, ContainerDetail, CreateContainerData,
  Rider, RiderDetail, CreateRiderData,
  Delivery, DeliveryDetail, CreateDeliveryData,
  StatusHistoryEntry, LocationPoint, LogisticsStats,
  ReportSummary,
} from '../types';

// ===================== SHIPMENTS =====================

export const shipmentsAPI = {
  list: (params?: { status?: string; search?: string; limit?: number; skip?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.skip) q.set('skip', String(params.skip));
    const qs = q.toString();
    return apiFetch<Shipment[]>(`/logistics/shipments${qs ? '?' + qs : ''}`);
  },
  get: (trackingCode: string) =>
    apiFetch<Shipment>(`/logistics/shipments/${trackingCode}`),
  getHistory: (trackingCode: string) =>
    apiFetch<StatusHistoryEntry[]>(`/logistics/shipments/${trackingCode}/history`),
  create: (data: CreateShipmentData) =>
    apiFetch<Shipment>('/logistics/shipments', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (trackingCode: string, data: UpdateShipmentStatusData) =>
    apiFetch<{ success: boolean }>(`/logistics/shipments/${trackingCode}/status`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),
  delete: (trackingCode: string) =>
    apiFetch<{ success: boolean }>(`/logistics/shipments/${trackingCode}`, { method: 'DELETE' }),
};

// ===================== CONTAINERS =====================

export const containersAPI = {
  list: (params?: { status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return apiFetch<(Container & { shipmentCount: number })[]>(`/logistics/containers${qs ? '?' + qs : ''}`);
  },
  get: (containerCode: string) =>
    apiFetch<ContainerDetail>(`/logistics/containers/${containerCode}`),
  create: (data: CreateContainerData) =>
    apiFetch<Container>('/logistics/containers', { method: 'POST', body: JSON.stringify(data) }),
  update: (containerCode: string, data: Partial<CreateContainerData>) =>
    apiFetch<Container>(`/logistics/containers/${containerCode}`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),
  updateStatus: (containerCode: string, status: string, note?: string, updateShipments = false) =>
    apiFetch<{ success: boolean; shipmentsUpdated: number }>(`/logistics/containers/${containerCode}/status`, {
      method: 'POST', body: JSON.stringify({ status, note, updateShipments }),
    }),
  addShipments: (containerCode: string, trackingCodes: string[]) =>
    apiFetch<{ success: boolean; addedCount: number }>(`/logistics/containers/${containerCode}/shipments`, {
      method: 'POST', body: JSON.stringify({ trackingCodes }),
    }),
  removeShipments: (containerCode: string, trackingCodes: string[]) =>
    apiFetch<{ success: boolean; removedCount: number }>(`/logistics/containers/${containerCode}/shipments`, {
      method: 'DELETE', body: JSON.stringify({ trackingCodes }),
    }),
  getAvailableShipments: (containerCode: string) =>
    apiFetch<Shipment[]>(`/logistics/containers/${containerCode}/available-shipments`),
  delete: (containerCode: string) =>
    apiFetch<{ success: boolean }>(`/logistics/containers/${containerCode}`, { method: 'DELETE' }),
};

// ===================== RIDERS =====================

export const ridersAPI = {
  list: (params?: { active?: boolean; available?: boolean; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.active !== undefined) q.set('active', String(params.active));
    if (params?.available !== undefined) q.set('available', String(params.available));
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return apiFetch<Rider[]>(`/logistics/riders${qs ? '?' + qs : ''}`);
  },
  get: (riderCode: string) =>
    apiFetch<RiderDetail>(`/logistics/riders/${riderCode}`),
  create: (data: CreateRiderData) =>
    apiFetch<Rider>('/logistics/riders', { method: 'POST', body: JSON.stringify(data) }),
  update: (riderCode: string, data: Partial<CreateRiderData & { isActive: boolean; isAvailable: boolean }>) =>
    apiFetch<Rider>(`/logistics/riders/${riderCode}`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),
  updateLocation: (riderCode: string, lat: number, lng: number) =>
    apiFetch<{ success: boolean }>(`/logistics/riders/${riderCode}/location`, {
      method: 'PATCH', body: JSON.stringify({ lat, lng }),
    }),
  delete: (riderCode: string) =>
    apiFetch<{ success: boolean }>(`/logistics/riders/${riderCode}`, { method: 'DELETE' }),
};

// ===================== DELIVERIES =====================

export const deliveriesAPI = {
  list: (params?: { status?: string; riderId?: string; search?: string; limit?: number; skip?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.riderId) q.set('riderId', params.riderId);
    if (params?.search) q.set('search', params.search);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.skip) q.set('skip', String(params.skip));
    const qs = q.toString();
    return apiFetch<Delivery[]>(`/logistics/deliveries${qs ? '?' + qs : ''}`);
  },
  get: (deliveryCode: string) =>
    apiFetch<DeliveryDetail>(`/logistics/deliveries/${deliveryCode}`),
  create: (data: CreateDeliveryData) =>
    apiFetch<Delivery>('/logistics/deliveries', { method: 'POST', body: JSON.stringify(data) }),
  assign: (deliveryCode: string, riderId: string) =>
    apiFetch<{ success: boolean }>(`/logistics/deliveries/${deliveryCode}/assign`, {
      method: 'POST', body: JSON.stringify({ riderId }),
    }),
  updateStatus: (deliveryCode: string, status: string, note?: string) =>
    apiFetch<{ success: boolean }>(`/logistics/deliveries/${deliveryCode}/status`, {
      method: 'PATCH', body: JSON.stringify({ status, note }),
    }),
  updatePayment: (deliveryCode: string, paymentStatus: string) =>
    apiFetch<{ success: boolean }>(`/logistics/deliveries/${deliveryCode}/payment`, {
      method: 'PATCH', body: JSON.stringify({ paymentStatus }),
    }),
  addLocation: (deliveryCode: string, loc: { lat: number; lng: number; accuracy?: number; speed?: number; heading?: number }) =>
    apiFetch<{ success: boolean }>(`/logistics/deliveries/${deliveryCode}/location`, {
      method: 'POST', body: JSON.stringify(loc),
    }),
  getLocations: (deliveryCode: string) =>
    apiFetch<LocationPoint[]>(`/logistics/deliveries/${deliveryCode}/locations`),
  delete: (deliveryCode: string) =>
    apiFetch<{ success: boolean }>(`/logistics/deliveries/${deliveryCode}`, { method: 'DELETE' }),
};

// ===================== STATS =====================

export const logisticsStatsAPI = {
  get: () => apiFetch<LogisticsStats>('/logistics/stats'),
};

// ===================== REPORTS =====================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787/api';

async function downloadFile(path: string, filename: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const reportsAPI = {
  getSummary: () => apiFetch<ReportSummary>('/logistics/reports/summary'),
  downloadShipmentsCsv: (statusFilter?: string) => {
    const q = statusFilter ? `?status_filter=${statusFilter}` : '';
    const date = new Date().toISOString().split('T')[0];
    return downloadFile(`/logistics/reports/shipments-csv${q}`, `shipments_${date}.csv`);
  },
  downloadDeliveriesCsv: (statusFilter?: string) => {
    const q = statusFilter ? `?status_filter=${statusFilter}` : '';
    const date = new Date().toISOString().split('T')[0];
    return downloadFile(`/logistics/reports/deliveries-csv${q}`, `deliveries_${date}.csv`);
  },
};
