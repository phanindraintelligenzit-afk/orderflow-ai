import axios from 'axios';

const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export interface OrderItem {
  id: string;
  order_id: string;
  sku: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface WorkflowState {
  id: string;
  order_id: string;
  agent_name: string;
  status: string;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  retry_count: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  total_amount: number;
  currency: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  workflow_states: WorkflowState[];
}

export interface OrderListItem {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  items_count: number;
}

export interface DashboardMetrics {
  total_orders: number;
  orders_by_status: Record<string, number>;
  total_revenue: number;
  avg_processing_time_hours?: number;
  recent_exceptions: number;
}

export interface CreateOrderPayload {
  customer_id: string;
  items: { sku: string; quantity: number; unit_price: number }[];
  notes?: string;
}

export async function getDashboard(): Promise<DashboardMetrics> {
  const { data } = await client.get('/metrics/dashboard');
  return data;
}

export async function listOrders(params?: {
  status?: string;
  customer_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<OrderListItem[]> {
  const { data } = await client.get('/orders', { params });
  return data;
}

export async function getOrder(id: string): Promise<Order> {
  const { data } = await client.get(`/orders/${id}`);
  return data;
}

export async function getOrderGraph(id: string) {
  const { data } = await client.get(`/orders/${id}/graph`);
  return data;
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const { data } = await client.post('/orders', payload);
  return data;
}

export async function retryWorkflow(orderId: string) {
  const { data } = await client.post(`/workflow/${orderId}/retry`);
  return data;
}