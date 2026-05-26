import axios from 'axios';

const api = axios.create({
  baseURL: '/api/fleet',
});

// Drivers (Employees)
export const getDrivers = async () => (await api.get('/drivers')).data;
export const createDriver = async (data: any) => (await api.post('/drivers', data)).data;
export const updateDriver = async (id: string, data: any) => (await api.put(`/drivers/${id}`, data)).data;
export const deleteDriver = async (id: string) => (await api.delete(`/drivers/${id}`)).data;

// Vehicles (Special Machinery)
export const getVehicles = async () => (await api.get('/vehicles')).data;
export const createVehicle = async (data: any) => (await api.post('/vehicles', data)).data;
export const updateVehicle = async (id: string, data: any) => (await api.put(`/vehicles/${id}`, data)).data;
export const deleteVehicle = async (id: string) => (await api.delete(`/vehicles/${id}`)).data;

// Objects (Construction Sites)
export const getObjects = async () => (await api.get('/objects')).data;
export const createObject = async (data: any) => (await api.post('/objects', data)).data;

// Orders (Wage Decrees)
export const getOrders = async () => (await api.get('/orders')).data;
export const createOrder = async (data: any) => (await api.post('/orders', data)).data;
export const updateOrder = async (id: string, data: any) => (await api.put(`/orders/${id}`, data)).data;

// TimeLogs
export const getTimeLogs = async () => (await api.get('/timelogs')).data;
export const createTimeLog = async (data: any) => (await api.post('/timelogs', data)).data;
