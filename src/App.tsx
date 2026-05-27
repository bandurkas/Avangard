import React, { useState, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

const queryClient = new QueryClient();
import { 
  Users, 
  Truck, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Play, 
  Square, 
  MapPin, 
  Bell, 
  Fuel, 
  Wrench, 
  TrendingUp, 
  Paperclip,
  Navigation,
  RefreshCw,
  Info,
  Wallet,
  Coins,
  X,
  Clock,
  Activity,
  FileText,
  AlertTriangle,
  FileSignature,
  CheckCircle,
  Map,
  Calendar,
  Eye
} from "lucide-react";

// Preset GPS routing path centered around Bishkek and mountainous areas
const GEOLOCATION_PATH = [
  { lat: 42.8744, lng: 74.5698, label: "Депо Западное, Бишкек (База)" },
  { lat: 42.8580, lng: 74.6050, label: "ЖК Ала-Тоо (Объект Бишкек)" },
  { lat: 42.7500, lng: 74.4500, label: "Трасса Бишкек-Ош, Начало подъема" },
  { lat: 42.6120, lng: 74.2380, label: "Трасса Бишкек-Ош (Горный участок, 1.35x)" },
  { lat: 42.8150, lng: 73.8500, label: "Склад Кара-Балта (Объект)" }
];

interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  phone: string;
  status: string; // "ACTIVE" | "FREE" | "OFF"
  permitCategories?: string[];
  activeRate?: number;
  birthDate?: string;
  experienceYears?: number;
  licenseCategories?: string;
  medCertificateExpiry?: string;
  specialPermits?: string;
  documents?: { name: string; type: string; file: string }[];
  rateHistory?: { date: string; rate: number; reason: string }[];
}

interface Vehicle {
  id: string;
  model: string;
  plateNumber: string;
  vin: string;
  status: string; // "ACTIVE" | "MAINTENANCE" | "OUT_OF_SERVICE"
  machineryType?: string;
  yearOfManufacture?: number;
  fuelConsumptionNominal?: number;
  carryingCapacity?: number;
  boomLength?: number;
  enginePower?: number;
  lastServiceDate?: string;
  insuranceNumber?: string;
  ptnNumber?: string;
  documents?: { name: string; type: string; file: string }[];
}

interface ConstructionObject {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  difficultyType: "PLAIN" | "MOUNTAIN";
  rateMultiplier: number;
}

interface WageDecree {
  id: string;
  driverId: string;
  driverName: string;
  orderNumber: string;
  dateEffective: string;
  oldRate: number;
  newRate: number;
  status: "PENDING" | "SIGNED";
  signedAt?: string;
}

interface TimeLog {
  id: string;
  driverId: string;
  vehicleId: string;
  objectId?: string;
  eventType: string; // "START" | "STOP" | "FUEL_DRAIN"
  timestamp: string;
  latitude: number;
  longitude: number;
  driverName: string;
  vehicleModel: string;
  vehiclePlate: string;
  details?: string;
}

function MainApp() {
  const [isLight, setIsLight] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "drivers" | "vehicles" | "objects" | "payroll">("overview");
  const queryClient = useQueryClient();

  // Core Data via React Query
  const { data: drivers = [] } = useQuery<Driver[]>({ queryKey: ['drivers'], queryFn: api.getDrivers });
  const { data: vehicles = [] } = useQuery<Vehicle[]>({ queryKey: ['vehicles'], queryFn: api.getVehicles });
  const { data: objects = [] } = useQuery<ConstructionObject[]>({ queryKey: ['objects'], queryFn: api.getObjects });
  const { data: orders = [] } = useQuery<WageDecree[]>({ queryKey: ['orders'], queryFn: api.getOrders });
  const { data: timeLogs = [] } = useQuery<TimeLog[]>({ queryKey: ['timeLogs'], queryFn: api.getTimeLogs });

  // Mutations
  const createDriverMutation = useMutation({ mutationFn: api.createDriver, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }) });
  const updateDriverMutation = useMutation({ mutationFn: (params: {id: string, data: any}) => api.updateDriver(params.id, params.data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }) });
  const deleteDriverMutation = useMutation({ mutationFn: api.deleteDriver, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }) });

  const createVehicleMutation = useMutation({ mutationFn: api.createVehicle, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }) });
  const updateVehicleMutation = useMutation({ mutationFn: (params: {id: string, data: any}) => api.updateVehicle(params.id, params.data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }) });
  const deleteVehicleMutation = useMutation({ mutationFn: api.deleteVehicle, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }) });

  const createObjectMutation = useMutation({ mutationFn: api.createObject, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['objects'] }) });
  
  const createOrderMutation = useMutation({ 
    mutationFn: api.createOrder, 
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      showNotification("Приказ об изменении ставки успешно создан!", "success");
    }
  });
  
  const updateOrderMutation = useMutation({ 
    mutationFn: (params: {id: string, data: any}) => api.updateOrder(params.id, params.data), 
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    }
  });

  const createTimeLogMutation = useMutation({ mutationFn: api.createTimeLog, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timeLogs'] }) });

  // Search & Filter State
  const [driverSearch, setDriverSearch] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [objectSearch, setObjectSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");

  // CRUD Modals State
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [activeViewDoc, setActiveViewDoc] = useState<{ name: string; file: string; type?: string } | null>(null);
  const [attachmentWizardOpen, setAttachmentWizardOpen] = useState(false);
  const [attachmentTarget, setAttachmentTarget] = useState<{ type: "driver" | "vehicle" | "driver_form" | "vehicle_form"; id: string } | null>(null);
  const [attachmentForm, setAttachmentForm] = useState({ name: "", type: "СТС", file: "" });

  const [driverForm, setDriverForm] = useState({ 
    name: "", 
    licenseNumber: "", 
    phone: "", 
    status: "FREE",
    birthDate: "",
    experienceYears: "",
    licenseCategories: "B, C",
    medCertificateExpiry: "",
    specialPermits: "",
    documents: [] as { name: string; type: string; file: string }[]
  });

  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState({ 
    model: "", 
    plateNumber: "", 
    vin: "", 
    status: "ACTIVE", 
    machineryType: "Гусеничный экскаватор",
    yearOfManufacture: "",
    fuelConsumptionNominal: "",
    carryingCapacity: "",
    boomLength: "",
    enginePower: "",
    lastServiceDate: "",
    insuranceNumber: "",
    ptnNumber: "",
    documents: [] as { name: string; type: string; file: string }[]
  });

  const [objectModalOpen, setObjectModalOpen] = useState(false);
  const [objectForm, setObjectForm] = useState({ name: "", latitude: 42.87, longitude: 74.56, difficultyType: "PLAIN" as "PLAIN" | "MOUNTAIN" });

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({ driverId: "", orderNumber: "", dateEffective: "", newRate: 800 });

  // Drawers and Overlays
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedObject, setSelectedObject] = useState<ConstructionObject | null>(null);

  // Notification state
  const [alertMsg, setAlertMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Telemetry alerts & Fines
  const [activeFuelDrainAlert, setActiveFuelDrainAlert] = useState<any | null>(null);
  const [manualAdjustments, setManualAdjustments] = useState<Record<string, number>>({});

  // Mobile App Simulator State
  const [simDriverId, setSimDriverId] = useState("");
  const [simVehicleId, setSimVehicleId] = useState("");
  const [simObjectId, setSimObjectId] = useState("o1");
  const [simActive, setSimActive] = useState(false);
  const [simSeconds, setSimSeconds] = useState(0);
  const [simPathIndex, setSimPathIndex] = useState(0);
  const [simHistory, setSimHistory] = useState<any[]>([]);
  const [simStatusText, setSimStatusText] = useState("СМЕНА НЕ НАЧАТА");
  const [simFuel, setSimFuel] = useState(100);
  const [simDistance, setSimDistance] = useState(0);
  
  // Mobile Order Signing
  const [showMobileSignOrder, setShowMobileSignOrder] = useState<WageDecree | null>(null);
  const [signatureDrawn, setSignatureDrawn] = useState(false);

  const timerRef = useRef<any>(null);
  const pathIntervalRef = useRef<any>(null);

  const showNotification = (text: string, type: "success" | "error") => {
    setAlertMsg({ text, type });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // Sync mobile simulator history card list
  useEffect(() => {
    if (simDriverId) {
      const driverLogs = timeLogs.filter(log => log.driverId === simDriverId);
      const history: any[] = [];
      for (let i = 0; i < driverLogs.length; i++) {
        const log = driverLogs[i];
        if (log.eventType === "STOP" && i + 1 < driverLogs.length && driverLogs[i+1].eventType === "START") {
          const startLog = driverLogs[i+1];
          const durationMs = new Date(log.timestamp).getTime() - new Date(startLog.timestamp).getTime();
          const hours = Math.floor(durationMs / 3600000);
          const mins = Math.floor((durationMs % 3600000) / 60000);
          history.push({
            date: new Date(startLog.timestamp).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }),
            timeRange: `${new Date(startLog.timestamp).toLocaleTimeString("ru-RU", {hour: "2-digit", minute:"2-digit"})} — ${new Date(log.timestamp).toLocaleTimeString("ru-RU", {hour: "2-digit", minute:"2-digit"})}`,
            duration: `${hours}ч ${mins}м`,
            status: "Завершено"
          });
          i++; 
        } else if (log.eventType === "START") {
          history.push({
            date: new Date(log.timestamp).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }),
            timeRange: `${new Date(log.timestamp).toLocaleTimeString("ru-RU", {hour: "2-digit", minute:"2-digit"})} — Активна`,
            duration: "В процессе",
            status: "Активно"
          });
        }
      }
      setSimHistory(history.slice(0, 3));

      // Check if there is a pending rate decree order for this driver
      const pendingOrder = orders.find(o => o.driverId === simDriverId && o.status === "PENDING");
      if (pendingOrder) {
        setShowMobileSignOrder(pendingOrder);
      } else {
        setShowMobileSignOrder(null);
      }
    } else {
      setSimHistory([]);
      setShowMobileSignOrder(null);
    }
  }, [simDriverId, timeLogs, orders]);

  // Check for newly added orders while driver is active
  useEffect(() => {
    if (simDriverId) {
      const pendingOrder = orders.find(o => o.driverId === simDriverId && o.status === "PENDING");
      if (pendingOrder) {
        setShowMobileSignOrder(pendingOrder);
      } else {
        setShowMobileSignOrder(null);
      }
    }
  }, [orders, simDriverId]);

  // Handle mobile shift start/stop
  const handleSimStartShift = () => {
    if (!simDriverId || !simVehicleId || !simObjectId) {
      showNotification("Выберите сотрудника, технику и объект в клиенте!", "error");
      return;
    }

    const driverObj = drivers.find(d => d.id === simDriverId);
    const vehicleObj = vehicles.find(v => v.id === simVehicleId);
    const objectObj = objects.find(o => o.id === simObjectId);

    if (!driverObj || !vehicleObj || !objectObj) return;

    // Start shift mutation
    createTimeLogMutation.mutate({
      driverId: simDriverId,
      vehicleId: simVehicleId,
      objectId: simObjectId,
      eventType: "START",
      timestamp: new Date().toISOString(),
      latitude: GEOLOCATION_PATH[0].lat,
      longitude: GEOLOCATION_PATH[0].lng,
      driverName: driverObj.name,
      vehicleModel: vehicleObj.model,
      vehiclePlate: vehicleObj.plateNumber
    });

    // Update driver status in base
    updateDriverMutation.mutate({ id: simDriverId, data: { status: "ACTIVE" } });

    setSimActive(true);
    setSimSeconds(0);
    setSimDistance(0);
    setSimFuel(100);
    setSimPathIndex(0);
    setSimStatusText("В РЕЙСЕ / НА СМЕНЕ");
    showNotification("Смена спецтехники начата!", "success");

    // Live timer increments
    timerRef.current = setInterval(() => {
      setSimSeconds(prev => prev + 1);
    }, 1000);

    // Live map progression
    pathIntervalRef.current = setInterval(() => {
      setSimPathIndex(prev => {
        const next = (prev + 1) % GEOLOCATION_PATH.length;
        // Increment distance
        setSimDistance(d => d + 1.2 + Math.random() * 0.8);
        // Burn fuel slowly
        setSimFuel(f => Math.max(0, f - (0.15 + Math.random() * 0.1)));
        return next;
      });
    }, 6000);
  };

  const handleSimStopShift = () => {
    if (!simActive) return;

    clearInterval(timerRef.current);
    clearInterval(pathIntervalRef.current);

    const driverObj = drivers.find(d => d.id === simDriverId);
    const vehicleObj = vehicles.find(v => v.id === simVehicleId);

    if (!driverObj || !vehicleObj) return;

    // Stop shift mutation
    createTimeLogMutation.mutate({
      driverId: simDriverId,
      vehicleId: simVehicleId,
      objectId: simObjectId,
      eventType: "STOP",
      timestamp: new Date().toISOString(),
      latitude: GEOLOCATION_PATH[simPathIndex].lat,
      longitude: GEOLOCATION_PATH[simPathIndex].lng,
      driverName: driverObj.name,
      vehicleModel: vehicleObj.model,
      vehiclePlate: vehicleObj.plateNumber
    });

    // Calculate final hours and update baseline drivers active hours for Payroll
    // const hoursEarned = simSeconds / 3600;
    // const idleEarned = (simSeconds * 0.2) / 3600;

    // Update local driver states (since it's a demo, we commit hours to state)
    // In real app, it's aggregated from backend logs
    showNotification("Смена спецтехники успешно завершена!", "success");

    setSimActive(false);
    setSimStatusText("СМЕНА ЗАВЕРШЕНА");
    updateDriverMutation.mutate({ id: simDriverId, data: { status: "FREE" } });
  };

  // V2: Simulated Fuel Drain (#СливТоплива)
  const handleSimulateFuelDrain = () => {
    if (!simActive) {
      showNotification("Симуляция слива возможна только во время активной смены!", "error");
      return;
    }
    // Drop fuel instantly by 15% / 15 Litres
    setSimFuel(prev => Math.max(0, prev - 15));
    
    const driverObj = drivers.find(d => d.id === simDriverId);
    const vehicleObj = vehicles.find(v => v.id === simVehicleId);
    const objectObj = objects.find(o => o.id === simObjectId);

    // Create telemetry event on backend
    createTimeLogMutation.mutate({
      driverId: simDriverId,
      vehicleId: simVehicleId,
      objectId: simObjectId,
      eventType: "FUEL_DRAIN",
      timestamp: new Date().toISOString(),
      latitude: GEOLOCATION_PATH[simPathIndex].lat,
      longitude: GEOLOCATION_PATH[simPathIndex].lng,
      driverName: driverObj?.name || "Машинист",
      vehicleModel: vehicleObj?.model || "Спецтехника",
      vehiclePlate: vehicleObj?.plateNumber || "",
      details: "КРИТИЧЕСКИЙ УРОВЕНЬ: Резкое падение уровня топлива в баке (-15 Л)!"
    });

    // Display Alert banner in Dispatcher dashboard
    setActiveFuelDrainAlert({
      id: 'fd_' + Date.now(),
      driverId: simDriverId,
      driverName: driverObj?.name || "Иван Иванов",
      vehicleId: simVehicleId,
      vehicleModel: vehicleObj?.model || "Экскаватор CAT 320",
      vehiclePlate: vehicleObj?.plateNumber || "KG 555 ABD",
      objectName: objectObj?.name || "ЖК Ала-Тоо (Бишкек)",
      timestamp: new Date().toLocaleTimeString("ru-RU"),
      amount: 15,
      resolved: false
    });

    showNotification("Внимание: Слит бак спецтехники! Передано диспетчеру.", "error");
  };

  // V2: Deduct fine for fuel drain
  const handleApplyFuelFine = (alert: any) => {
    // 15 Litres fuel fine: e.g. 1,800 Rubles
    const fineAmount = 1800;
    setManualAdjustments(prev => ({
      ...prev,
      [alert.driverId]: (prev[alert.driverId] || 0) - fineAmount
    }));

    setActiveFuelDrainAlert(null);
    showNotification(`Выписан штраф ${fineAmount} ₽ водителю ${alert.driverName} за слив топлива.`, "success");
  };

  // V2: Mobile Order E-Sign
  const handleMobileSignDecree = () => {
    if (!showMobileSignOrder) return;
    setSignatureDrawn(true);
    setTimeout(() => {
      // Update order status on backend
      updateOrderMutation.mutate({
        id: showMobileSignOrder.id,
        data: {
          status: "SIGNED",
          signedAt: new Date().toISOString()
        }
      });
      showNotification("Приказ об изменении ставки успешно подписан оператором!", "success");
      setShowMobileSignOrder(null);
      setSignatureDrawn(false);
    }, 1000);
  };

  // Helper rate & hours getters with live multiplier adjustments
  const getDriverRate = (id: string) => {
    const d = drivers.find(drv => drv.id === id);
    return d?.activeRate || 750;
  };

  const getDriverAdjustment = (id: string) => {
    return manualAdjustments[id] || 0;
  };

  const getDriverActiveHours = (id: string) => {
    // Basic mock hours + live simulated hours
    let basicHours = 142; // Ivan Ivanov
    if (id === "d2") basicHours = 158; // Sergey Smirnov
    
    if (id === simDriverId && simActive) {
      const liveHours = simSeconds / 3600;
      return basicHours + liveHours * 200; // speed up for visualization
    }
    return basicHours;
  };

  const getDriverIdleHours = (id: string) => {
    let basicHours = 24;
    if (id === "d2") basicHours = 18;

    if (id === simDriverId && simActive) {
      const liveIdle = (simSeconds * 0.2) / 3600;
      return basicHours + liveIdle * 200;
    }
    return basicHours;
  };

  // Dynamic average fuel consumption calculation for active specialized machinery
  const getAverageFuelConsumption = () => {
    let totalRate = 0;
    let count = 0;
    
    // Check if simulator is active
    if (simActive) {
      // CAT 320 consumes ~31.8 L/100km
      const simRate = 31.8 + Math.sin(simSeconds / 10) * 0.4;
      totalRate += simRate;
      count++;
    }
    
    // Sergey Smirnov driving Liebherr LTM 1050 (Heavy crane consumes ~36.5 L/100km)
    totalRate += 36.5 + Math.sin(Date.now() / 20000) * 0.3;
    count++;
    
    return (totalRate / count).toFixed(1);
  };

  const formatTimer = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600).toString().padStart(2, "0");
    const m = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, "0");
    const s = (totalSecs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // Filter lists
  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(driverSearch.toLowerCase()) || 
                          d.licenseNumber.toLowerCase().includes(driverSearch.toLowerCase());
    const matchesStatus = driverFilter === "" || d.status.toLowerCase() === driverFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const filteredVehicles = vehicles.filter(v => {
    return v.model.toLowerCase().includes(vehicleSearch.toLowerCase()) || 
           v.plateNumber.toLowerCase().includes(vehicleSearch.toLowerCase());
  });

  const filteredObjects = objects.filter(o => {
    return o.name.toLowerCase().includes(objectSearch.toLowerCase()) ||
           o.difficultyType.toLowerCase().includes(objectSearch.toLowerCase());
  });

  // KPI Calculations
  const activeDriversCount = drivers.filter(d => d.status === "ACTIVE").length;
  const activeVehiclesCount = vehicles.filter(v => v.status === "ACTIVE").length;

  // Form Submits
  const handleDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...driverForm,
      experienceYears: driverForm.experienceYears ? Number(driverForm.experienceYears) : undefined
    };
    if (editingDriver) {
      updateDriverMutation.mutate({ id: editingDriver.id, data: payload });
      showNotification("Профиль сотрудника обновлен!", "success");
    } else {
      createDriverMutation.mutate(payload);
      showNotification("Сотрудник добавлен в штат!", "success");
    }
    setDriverModalOpen(false);
  };

  const handleVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...vehicleForm,
      yearOfManufacture: vehicleForm.yearOfManufacture ? Number(vehicleForm.yearOfManufacture) : undefined,
      fuelConsumptionNominal: vehicleForm.fuelConsumptionNominal ? Number(vehicleForm.fuelConsumptionNominal) : undefined,
      carryingCapacity: vehicleForm.carryingCapacity ? Number(vehicleForm.carryingCapacity) : undefined,
      boomLength: vehicleForm.boomLength ? Number(vehicleForm.boomLength) : undefined,
      enginePower: vehicleForm.enginePower ? Number(vehicleForm.enginePower) : undefined
    };
    if (editingVehicle) {
      updateVehicleMutation.mutate({ id: editingVehicle.id, data: payload });
      showNotification("Карточка спецтехники обновлена!", "success");
    } else {
      createVehicleMutation.mutate(payload);
      showNotification("Спецтехника поставлена на баланс!", "success");
    }
    setVehicleModalOpen(false);
  };

  const handleObjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rateMultiplier = objectForm.difficultyType === "MOUNTAIN" ? 1.35 : 1.0;
    createObjectMutation.mutate({ ...objectForm, rateMultiplier });
    showNotification("Строительный объект успешно добавлен!", "success");
    setObjectModalOpen(false);
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const driverObj = drivers.find(d => d.id === orderForm.driverId);
    if (!driverObj) return;

    createOrderMutation.mutate({
      driverId: orderForm.driverId,
      driverName: driverObj.name,
      orderNumber: orderForm.orderNumber,
      dateEffective: orderForm.dateEffective,
      oldRate: driverObj.activeRate || 750,
      newRate: Number(orderForm.newRate)
    });
    setOrderModalOpen(false);
  };

  const handleAttachmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachmentTarget) return;

    const mockFile = attachmentForm.file || (attachmentForm.name.toLowerCase().replace(/[^a-zа-я0-9]/g, '_') + "_" + Date.now().toString().slice(-4) + ".pdf");
    const newDoc = {
      name: attachmentForm.name,
      type: attachmentForm.type,
      file: mockFile
    };

    if (attachmentTarget.type === "driver_form") {
      const updatedDocs = [...(driverForm.documents || []), newDoc];
      setDriverForm({ ...driverForm, documents: updatedDocs });
      showNotification("Документ временно прикреплен к форме. Сохраните изменения!", "success");
    } else if (attachmentTarget.type === "vehicle_form") {
      const updatedDocs = [...(vehicleForm.documents || []), newDoc];
      setVehicleForm({ ...vehicleForm, documents: updatedDocs });
      showNotification("Документ временно прикреплен к форме. Сохраните изменения!", "success");
    } else if (attachmentTarget.type === "driver") {
      const driverObj = drivers.find(d => d.id === attachmentTarget.id);
      if (driverObj) {
        const updatedDocs = [...(driverObj.documents || []), newDoc];
        updateDriverMutation.mutate({
          id: driverObj.id,
          data: { documents: updatedDocs }
        }, {
          onSuccess: () => {
            setSelectedDriver(prev => prev ? { ...prev, documents: updatedDocs } : null);
            showNotification("Документ успешно прикреплен к профилю сотрудника!", "success");
          }
        });
      }
    } else if (attachmentTarget.type === "vehicle") {
      const vehicleObj = vehicles.find(v => v.id === attachmentTarget.id);
      if (vehicleObj) {
        const updatedDocs = [...(vehicleObj.documents || []), newDoc];
        updateVehicleMutation.mutate({
          id: vehicleObj.id,
          data: { documents: updatedDocs }
        }, {
          onSuccess: () => {
            setSelectedVehicle(prev => prev ? { ...prev, documents: updatedDocs } : null);
            showNotification("Документ успешно прикреплен к спецтехнике!", "success");
          }
        });
      }
    }

    setAttachmentWizardOpen(false);
  };

  // V2: Simulated payment handler
  const [driverPaidStatuses, setDriverPaidStatuses] = useState<Record<string, "PAID" | "PENDING" | "PROCESSING">>({
    d1: "PAID",
    d2: "PENDING"
  });
  
  const handlePayDriver = (id: string, name: string, amount: number) => {
    setDriverPaidStatuses(prev => ({ ...prev, [id]: "PROCESSING" }));
    setTimeout(() => {
      setDriverPaidStatuses(prev => ({ ...prev, [id]: "PAID" }));
      showNotification(`Успешно выплачено ${Math.round(amount).toLocaleString("ru-RU")} ₽ водителю ${name}!`, "success");
    }, 1200);
  };

  const getDriverPaidStatus = (id: string) => {
    return driverPaidStatuses[id] || "PENDING";
  };

  return (
    <div className={`font-sans min-h-screen flex flex-col lg:flex-row overflow-x-hidden w-full selection:bg-[#38a6e4] selection:text-white transition-colors duration-300 ${isLight ? 'light-theme bg-[#f8fafc] text-[#0b1327]' : 'dark-theme bg-[#00091b] text-[#f8fafc]'}`}>
      
      {/* Dynamic Toast Alerts */}
      {alertMsg && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-2xl border text-white font-bold flex items-center gap-3 transition-all animate-bounce ${
          alertMsg.type === "success" ? "bg-[#10b981] border-[#10b981]" : "bg-[#ef4444] border-[#ef4444]"
        }`}>
          <Bell className="w-5 h-5" />
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* Main Dispatcher Dashboard Area (72% standard) */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 lg:max-w-[72%] w-full min-h-screen border-b lg:border-b-0 lg:border-r border-[#00417d]/30 bg-[#00091b]">
        
        {/* Workspace Brand and Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-[#eab308] text-slate-950 px-2 py-0.5 text-[10px] font-black rounded shadow-md uppercase tracking-wider">ERP V2.0 PRO</span>
              <div className="flex items-center gap-3">
                {/* Official Avangard Progress Logo Banner */}
                <div className="bg-white/95 p-1 px-2 rounded-xl border border-slate-200/50 shadow-md flex items-center justify-center shrink-0 h-10 mt-0.5">
                  <img src="/logo.png" className="h-7 w-auto object-contain" alt="Avangard Progress Logo" />
                </div>
              </div>
            </div>
            <p className="text-xs text-[#94a3b8] mt-1.5 font-semibold pl-1">Центральная система управления спецтехникой, объектами и Payroll • Кыргызстан</p>
          </div>
          <div className="flex gap-2 items-center">
            {/* Dynamic Theme Switcher */}
            <button
              type="button"
              onClick={() => setIsLight(!isLight)}
              className="h-10 w-10 bg-[#0c1e43] hover:bg-[#38a6e4]/20 border border-[#00417d]/30 text-white rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:shadow-md transition-all active:scale-95 shrink-0"
              title="Переключить тему оформления"
            >
              {isLight ? (
                <svg className="w-5 h-5 text-[#eab308]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-[#38a6e4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            {(activeTab === "drivers" || activeTab === "vehicles" || activeTab === "objects" || activeTab === "payroll") && (
              <button 
                onClick={() => {
                  if (activeTab === "drivers") {
                    setEditingDriver(null);
                    setDriverForm({ 
                      name: "", 
                      licenseNumber: "", 
                      phone: "", 
                      status: "FREE",
                      birthDate: "",
                      experienceYears: "",
                      licenseCategories: "B, C",
                      medCertificateExpiry: "",
                      specialPermits: "",
                      documents: []
                    });
                    setDriverModalOpen(true);
                  } else if (activeTab === "vehicles") {
                    setEditingVehicle(null);
                    setVehicleForm({ 
                      model: "", 
                      plateNumber: "", 
                      vin: "", 
                      status: "ACTIVE", 
                      machineryType: "Гусеничный экскаватор",
                      yearOfManufacture: "",
                      fuelConsumptionNominal: "",
                      carryingCapacity: "",
                      boomLength: "",
                      enginePower: "",
                      lastServiceDate: "",
                      insuranceNumber: "",
                      ptnNumber: "",
                      documents: []
                    });
                    setVehicleModalOpen(true);
                  } else if (activeTab === "objects") {
                    setObjectForm({ name: "", latitude: 42.87, longitude: 74.56, difficultyType: "PLAIN" });
                    setObjectModalOpen(true);
                  } else if (activeTab === "payroll") {
                    setOrderForm({ driverId: drivers[0]?.id || "", orderNumber: `П-${Math.floor(100 + Math.random() * 900)}`, dateEffective: new Date().toISOString().split('T')[0], newRate: 850 });
                    setOrderModalOpen(true);
                  }
                }}
                className="h-10 px-4 bg-[#38a6e4] hover:bg-[#208bc9] text-white font-bold text-sm rounded-xl flex items-center gap-2 hover:shadow-md transition-all active:scale-95 cursor-pointer shadow-lg"
              >
                <Plus className="w-4 h-4" />
                {activeTab === "drivers" && "Нанять водителя"}
                {activeTab === "vehicles" && "Добавить технику"}
                {activeTab === "objects" && "Создать объект"}
                {activeTab === "payroll" && "Выдать приказ на ставку"}
              </button>
            )}
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#00417d]/30 mb-6 overflow-x-auto whitespace-nowrap scrollbar-thin">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-5 py-3 font-bold text-sm tracking-wide transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === "overview"
                ? "border-[#38a6e4] text-[#38a6e4]"
                : "border-transparent text-[#94a3b8] hover:text-[#f8fafc]"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Пульт Управления
          </button>
          <button
            onClick={() => setActiveTab("drivers")}
            className={`px-5 py-3 font-bold text-sm tracking-wide transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === "drivers"
                ? "border-[#38a6e4] text-[#38a6e4]"
                : "border-transparent text-[#94a3b8] hover:text-[#f8fafc]"
            }`}
          >
            <Users className="w-4 h-4" />
            Сотрудники
          </button>
          <button
            onClick={() => setActiveTab("vehicles")}
            className={`px-5 py-3 font-bold text-sm tracking-wide transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === "vehicles"
                ? "border-[#38a6e4] text-[#38a6e4]"
                : "border-transparent text-[#94a3b8] hover:text-[#f8fafc]"
            }`}
          >
            <Wrench className="w-4 h-4" />
            Спецтехника
          </button>
          <button
            onClick={() => setActiveTab("objects")}
            className={`px-5 py-3 font-bold text-sm tracking-wide transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === "objects"
                ? "border-[#38a6e4] text-[#38a6e4]"
                : "border-transparent text-[#94a3b8] hover:text-[#f8fafc]"
            }`}
          >
            <MapPin className="w-4 h-4" />
            Объекты работ (Бишкек)
          </button>
          <button
            onClick={() => setActiveTab("payroll")}
            className={`px-5 py-3 font-bold text-sm tracking-wide transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === "payroll"
                ? "border-[#38a6e4] text-[#38a6e4]"
                : "border-transparent text-[#94a3b8] hover:text-[#f8fafc]"
            }`}
          >
            <Wallet className="w-4 h-4" />
            Учет
          </button>
        </div>

        {/* Dashboard Overview Content */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* V2 Critical Telemetry Alerts Container */}
            {activeFuelDrainAlert && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-pulse relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>
                <div className="flex items-center gap-3 pl-2">
                  <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] bg-red-500 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Критический Инцидент (#СливТоплива)</span>
                    <h4 className="text-sm font-extrabold text-white mt-1">Резкое падение уровня топлива (-{activeFuelDrainAlert.amount} Л) ТС {activeFuelDrainAlert.vehicleModel}</h4>
                    <p className="text-xs text-red-200 mt-0.5">Оператор: <span className="font-bold">{activeFuelDrainAlert.driverName}</span> • Объект: <span className="font-bold">{activeFuelDrainAlert.objectName}</span> • Время: {activeFuelDrainAlert.timestamp}</p>
                  </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto shrink-0 md:justify-end">
                  <button 
                    onClick={() => handleApplyFuelFine(activeFuelDrainAlert)}
                    className="flex-1 md:flex-none h-9 px-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-colors cursor-pointer"
                  >
                    Выписать штраф 1 800 ₽
                  </button>
                  <button 
                    onClick={() => setActiveFuelDrainAlert(null)}
                    className="flex-1 md:flex-none h-9 px-4 bg-slate-700 hover:bg-slate-600 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Игнорировать
                  </button>
                </div>
              </div>
            )}

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Card 1 */}
              <div className="bg-[#0c1e43]/90 border border-[#00417d]/30 rounded-xl p-4 flex flex-col justify-between hover:shadow-lg transition-shadow relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-[#38a6e4]/10 rounded-lg border border-[#38a6e4]/20 text-[#38a6e4]">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[#10b981] font-bold text-xs bg-[#10b981]/10 px-2 py-0.5 rounded-full">
                    +{drivers.length} машинистов
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider mb-1">Сотрудники на смене</p>
                  <h3 className="text-3xl font-extrabold tracking-tight">{activeDriversCount} / {drivers.length}</h3>
                </div>
              </div>
              {/* Card 2 */}
              <div className="bg-[#0c1e43]/90 border border-[#00417d]/30 rounded-xl p-4 flex flex-col justify-between hover:shadow-lg transition-shadow relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-[#38a6e4]/10 rounded-lg border border-[#38a6e4]/20 text-[#38a6e4]">
                    <Truck className="w-5 h-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[#94a3b8] font-bold text-xs bg-[#334155] px-2 py-0.5 rounded-full">
                    Всего {vehicles.length} ТС
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider mb-1">Спецтехника в работе</p>
                  <h3 className="text-3xl font-extrabold tracking-tight">{activeVehiclesCount}</h3>
                </div>
              </div>
              {/* Card 3 */}
              <div className="bg-[#0c1e43]/90 border border-[#00417d]/30 rounded-xl p-4 flex flex-col justify-between hover:shadow-lg transition-shadow relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-[#38a6e4]/10 rounded-lg border border-[#38a6e4]/20 text-[#38a6e4]">
                    <Fuel className="w-5 h-5" />
                  </div>
                  <div className="w-16 h-8 bg-[#0c1e43] border border-[#00417d]/30 rounded flex items-end justify-between px-1 pb-1">
                    <div className="w-1.5 h-3 bg-[#38a6e4]/30 rounded-t-sm"></div>
                    <div className="w-1.5 h-4 bg-[#38a6e4]/30 rounded-t-sm"></div>
                    <div className="w-1.5 h-2 bg-[#38a6e4]/30 rounded-t-sm"></div>
                    <div className="w-1.5 h-5 bg-[#38a6e4]/30 rounded-t-sm"></div>
                    <div className="w-1.5 h-6 bg-[#38a6e4] rounded-t-sm animate-pulse"></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider mb-1">Ср. расход ГСМ парка</p>
                    <div className="group/tooltip relative cursor-pointer text-[#64748b] hover:text-[#38a6e4]">
                      <Info className="w-3.5 h-3.5" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#0c1e43]/90 border border-[#00417d]/30 text-white text-[10px] font-semibold rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 text-center leading-normal">
                        Агрегированный средний расход спецтехники по активным сменам
                      </div>
                    </div>
                  </div>
                  <h3 className="text-3xl font-extrabold tracking-tight">{getAverageFuelConsumption()} <span className="text-sm font-normal text-[#94a3b8]">л/100км</span></h3>
                </div>
              </div>
              {/* Card 4 */}
              <div className="bg-[#0c1e43]/90 border border-[#00417d]/30 rounded-xl p-4 flex flex-col justify-between hover:shadow-lg transition-shadow relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-[#38a6e4]/10 rounded-lg border border-[#38a6e4]/20 text-[#38a6e4]">
                    <Map className="w-5 h-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[#38a6e4] font-bold text-xs bg-[#38a6e4]/10 px-2 py-0.5 rounded-full">
                    Активные
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider mb-1">Строительные объекты</p>
                  <h3 className="text-3xl font-extrabold tracking-tight">{objects.length} <span className="text-sm font-normal text-[#94a3b8]">площадок</span></h3>
                </div>
              </div>
            </div>

            {/* Simulated Live Fleet Map and Events Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Map Canvas Card */}
              <div className="lg:col-span-2 bg-[#0c1e43]/90 border border-[#00417d]/30 rounded-2xl overflow-hidden flex flex-col h-[420px]">
                <div className="p-4 border-b border-[#00417d]/30 bg-[#00091b]/70 backdrop-blur-sm flex justify-between items-center">
                  <h3 className="font-bold text-sm tracking-wide text-[#f8fafc]">Схема строительных объектов (Бишкек LIVE)</h3>
                  <div className="flex items-center gap-1.5 text-[#10b981] text-xs font-bold bg-[#10b981]/10 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-ping"></span>
                    <span>Телеметрия LIVE</span>
                  </div>
                </div>
                
                <div className="relative flex-grow bg-[#0c1e43]/90 overflow-hidden flex items-center justify-center">
                  
                  {/* Grid Lines representing city blocks */}
                  <div className="absolute inset-0 bg-[radial-gradient(#334155_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-40"></div>
                  
                  {/* Decorative Mountains (Tian Shan around Bishkek) */}
                  <svg className="absolute bottom-0 left-0 right-0 h-28 text-[#334155] opacity-25 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polygon points="0,100 20,40 40,70 65,30 85,60 100,100" fill="currentColor" />
                    <polygon points="10,100 35,50 55,75 75,45 90,65 100,100" fill="#475569" opacity="0.4" />
                  </svg>

                  {/* Geolocation Route Paths */}
                  <svg className="absolute inset-0 w-full h-full text-[#475569] opacity-30 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 50 180 Q 250 120 400 280 T 600 180" fill="none" stroke="currentColor" strokeWidth="5" />
                    <path d="M 120 80 Q 200 300 450 350" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="6,6" />
                  </svg>

                  {/* Interactive Object Site Markers */}
                  {objects.map(obj => (
                    <div 
                      key={obj.id}
                      onClick={() => setSelectedObject(obj)}
                      className="absolute z-20 flex flex-col items-center cursor-pointer group/marker"
                      style={{
                        top: obj.id === "o1" ? "35%" : obj.id === "o2" ? "68%" : "22%",
                        left: obj.id === "o1" ? "32%" : obj.id === "o2" ? "58%" : "72%"
                      }}
                    >
                      <span className="bg-[#09142d] border border-[#00417d]/30 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg text-[#f8fafc] mb-1 group-hover/marker:bg-[#38a6e4] group-hover/marker:border-[#38a6e4] transition-colors flex items-center gap-1 select-none">
                        <MapPin className="w-2.5 h-2.5 text-[#38a6e4] group-hover/marker:text-white" />
                        {obj.name}
                        {obj.difficultyType === "MOUNTAIN" && (
                          <span className="bg-red-900 text-white font-extrabold text-[8px] px-1 rounded">1.35x</span>
                        )}
                      </span>
                      <div className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-xl ${obj.difficultyType === "MOUNTAIN" ? "bg-red-500 animate-pulse" : "bg-[#38a6e4]"}`}></div>
                    </div>
                  ))}

                  {/* Active Live Driver Indicator */}
                  {simActive && (
                    <div 
                      className="absolute z-30 flex flex-col items-center transition-all duration-1000 cursor-pointer group hover:scale-105"
                      onClick={() => {
                        const vehicle = vehicles.find(v => v.id === simVehicleId);
                        if (vehicle) setSelectedVehicle(vehicle);
                      }}
                      style={{
                        top: simObjectId === "o1" ? "35%" : simObjectId === "o2" ? "68%" : "22%",
                        left: simObjectId === "o1" ? "32%" : simObjectId === "o2" ? "58%" : "72%"
                      }}
                    >
                      <div className="relative -top-7">
                        <span className="bg-[#38a6e4] text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1 border border-white">
                          <Activity className="w-2.5 h-2.5 animate-pulse text-white" />
                          Смена LIVE
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute -inset-3 rounded-full bg-[#38a6e4]/35 animate-ping"></span>
                        <div className="w-5 h-5 rounded-full bg-[#38a6e4] border-2 border-white shadow-2xl flex items-center justify-center">
                          <Truck className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Legend */}
                  <div className="absolute bottom-4 left-4 bg-[#09142d]/95 backdrop-blur-sm border border-[#00417d]/30 rounded-xl p-2.5 shadow-xl flex gap-4 text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#38a6e4]"></div>
                      <span>Строительный объект</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      <span>Горный сектор (1.35x)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Maintenance Notifications Feed */}
              <div className="bg-[#0c1e43]/90 border border-[#00417d]/30 rounded-2xl flex flex-col h-[420px]">
                <div className="p-4 border-b border-[#00417d]/30 bg-[#00091b]/70 backdrop-blur-sm flex justify-between items-center">
                  <div className="flex items-center gap-2 text-[#38a6e4]">
                    <Wrench className="w-4 h-4" />
                    <h3 className="font-bold text-sm tracking-wide text-[#f8fafc]">Мониторинг Документов</h3>
                  </div>
                  <span className="bg-[#208bc9] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">СТС / ПТС</span>
                </div>
                
                <div className="flex-grow p-4 flex flex-col gap-3 overflow-y-auto bg-[#00091b]/40">
                  {/* Alert 1 */}
                  <div className="p-3 border border-yellow-500/20 bg-yellow-500/5 rounded-xl flex gap-3 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500"></div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-bold text-yellow-500">У машиниста С. Смирнова</h4>
                        <span className="text-[10px] text-[#64748b]">Допуск</span>
                      </div>
                      <p className="text-xs text-[#94a3b8] mt-1 font-semibold leading-tight">Срок действия медсправки истекает через 14 дней.</p>
                      <button className="mt-2 text-yellow-500 text-[10px] font-bold uppercase hover:underline" onClick={() => setSelectedDriver(drivers[1])}>Открыть документы</button>
                    </div>
                  </div>

                  {/* Alert 2 */}
                  <div className="p-3 border border-[#00417d]/30 bg-[#0c1e43]/40 rounded-xl flex gap-3 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#38a6e4]"></div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-bold text-slate-200">Кран Liebherr (KG 777 BSB)</h4>
                        <span className="text-[10px] text-[#64748b]">ПТС</span>
                      </div>
                      <p className="text-xs text-[#94a3b8] mt-1 font-semibold leading-tight">Документ «Разрешение Ростехнадзора» прикреплен и верифицирован.</p>
                      <button className="mt-2 text-[#38a6e4] text-[10px] font-bold uppercase hover:underline" onClick={() => setSelectedVehicle(vehicles[1])}>Просмотр СТС/ПТС</button>
                    </div>
                  </div>
                  
                  <div className="p-4 border border-dashed border-[#00417d]/30 rounded-xl flex flex-col items-center justify-center text-center text-[#64748b] h-32 mt-auto">
                    <Info className="w-6 h-6 mb-2 text-[#64748b]" />
                    <span className="text-[11px] font-semibold">Все документы спецтехники заверены в Ростехнадзоре.</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Recent Events Log Table */}
            <div className="bg-[#0c1e43]/90 border border-[#00417d]/30 rounded-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-[#00417d]/30 bg-[#00091b]/70 backdrop-blur-sm flex justify-between items-center">
                <h3 className="font-bold text-sm tracking-wide text-[#f8fafc]">Оперативный Журнал (Старт/Стоп/Телеметрия)</h3>
                <span className="text-xs text-[#38a6e4] font-bold flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Моментальная синхронизация с датчиков
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse bg-[#0c1e43]/90">
                  <thead>
                    <tr className="border-b border-[#00417d]/30 bg-[#00091b]/40 text-[#94a3b8] text-[11px] font-bold uppercase tracking-wider">
                      <th className="p-4">Сотрудник</th>
                      <th className="p-4">Спецтехника</th>
                      <th className="p-4">Строительный объект</th>
                      <th className="p-4">Событие</th>
                      <th className="p-4">Время</th>
                      <th className="p-4">GPS Телеметрия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155] text-xs font-semibold text-slate-200">
                    {timeLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-[#64748b]">Событий спецтехники не обнаружено. Запустите смену в мобильном клиенте оператора справа!</td>
                      </tr>
                    ) : (
                      timeLogs.map((log) => {
                        const obj = objects.find(o => o.id === log.objectId);
                        return (
                          <tr key={log.id} className="hover:bg-[#0c1e43]/40 transition-colors">
                            <td className="p-4 font-bold text-white flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#38a6e4]/10 text-[#38a6e4] flex items-center justify-center font-extrabold text-[10px] border border-[#38a6e4]/20">
                                {log.driverName?.split(" ").map(w=>w[0]).join("")}
                              </div>
                              {log.driverName}
                            </td>
                            <td className="p-4 text-slate-300">{log.vehicleModel} ({log.vehiclePlate})</td>
                            <td className="p-4 text-slate-300">{obj ? obj.name : "Бишкек-База"}</td>
                            <td className="p-4">
                              {log.eventType === "START" ? (
                                <span className="inline-flex items-center gap-1 text-[#10b981] font-bold bg-[#10b981]/10 px-2.5 py-0.5 rounded-md text-[10px] uppercase border border-[#10b981]/20">
                                  <Play className="w-2.5 h-2.5 fill-current" />
                                  Старт смены
                                </span>
                              ) : log.eventType === "STOP" ? (
                                <span className="inline-flex items-center gap-1 text-slate-400 font-bold bg-[#0c1e43] px-2.5 py-0.5 rounded-md text-[10px] uppercase border border-slate-700">
                                  <Square className="w-2.5 h-2.5 fill-current" />
                                  Стоп смены
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-500 font-bold bg-red-500/10 px-2.5 py-0.5 rounded-md text-[10px] uppercase border border-red-500/20 animate-pulse">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Слив Топлива
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-slate-300">
                              {new Date(log.timestamp).toLocaleTimeString("ru-RU", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit"
                              })}
                            </td>
                            <td className="p-4 text-[#64748b] font-mono">{log.latitude.toFixed(4)}° N, {log.longitude.toFixed(4)}° E</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Drivers CRUD Table View */}
        {activeTab === "drivers" && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* Filter Bar */}
            <div className="bg-[#0c1e43]/90 border border-[#00417d]/30 rounded-xl p-3 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] w-4 h-4" />
                <input 
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 bg-[#00091b] rounded-lg border border-[#00417d]/30 focus:border-[#38a6e4] text-sm outline-none font-medium placeholder:text-[#64748b] text-white" 
                  placeholder="Поиск по ФИО, ВУ..." 
                  type="text"
                />
              </div>
              <div className="flex gap-2">
                <select 
                  value={driverFilter}
                  onChange={(e) => setDriverFilter(e.target.value)}
                  className="h-10 px-4 bg-[#00091b] rounded-lg border border-[#00417d]/30 focus:border-[#38a6e4] text-sm font-bold outline-none min-w-[140px] cursor-pointer text-white"
                >
                  <option value="">Все статусы</option>
                  <option value="active">В рейсе</option>
                  <option value="free">Свободен</option>
                  <option value="off">Вне смены</option>
                </select>
              </div>
            </div>

            {/* Drivers List */}
            <div className="bg-[#0c1e43]/90 rounded-xl border border-[#00417d]/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#00417d]/30 bg-[#00091b]/40 text-[#94a3b8] text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">ФИО Водителя</th>
                      <th className="p-4">Номер тракторного ВУ</th>
                      <th className="p-4">Категории спецтехники</th>
                      <th className="p-4">Текущая ставка</th>
                      <th className="p-4">Статус</th>
                      <th className="p-4 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-bold text-slate-200 divide-y divide-[#334155]">
                    {filteredDrivers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-[#64748b]">Водители не обнаружены. Нажмите «Нанять водителя» выше!</td>
                      </tr>
                    ) : (
                      filteredDrivers.map(d => (
                        <tr key={d.id} className="hover:bg-[#0c1e43]/40 transition-colors">
                          <td className="p-4">
                            <button 
                              onClick={() => setSelectedDriver(d)}
                              className="font-bold text-white hover:text-[#38a6e4] transition-colors flex items-center gap-2 text-left cursor-pointer"
                            >
                              <div className="w-8 h-8 rounded-full bg-[#38a6e4]/10 text-[#38a6e4] flex items-center justify-center font-extrabold text-xs border border-[#38a6e4]/20">
                                {d.name.split(" ").map(w=>w[0]).join("")}
                              </div>
                              {d.name}
                            </button>
                          </td>
                          <td className="p-4 text-slate-300 font-mono">{d.licenseNumber}</td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {d.permitCategories?.map((c, i) => (
                                <span key={i} className="text-[10px] bg-[#334155] text-slate-200 px-2 py-0.5 rounded font-medium">
                                  {c}
                                </span>
                              )) || <span className="text-slate-400 text-xs">—</span>}
                            </div>
                          </td>
                          <td className="p-4 text-[#eab308] font-extrabold">{d.activeRate || 750} ₽/ч</td>
                          <td className="p-4">
                            {d.status === "ACTIVE" ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#10b981]/10 text-[#10b981] text-xs font-bold border border-[#10b981]/20">
                                В рейсе
                              </span>
                            ) : d.status === "FREE" ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#0c1e43] text-slate-400 text-xs font-bold border border-slate-700">
                                Свободен
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20">
                                Вне смены
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button 
                                onClick={() => {
                                  setEditingDriver(d);
                                  setDriverForm({ 
                                    name: d.name, 
                                    licenseNumber: d.licenseNumber, 
                                    phone: d.phone, 
                                    status: d.status,
                                    birthDate: d.birthDate || "",
                                    experienceYears: d.experienceYears ? String(d.experienceYears) : "",
                                    licenseCategories: d.licenseCategories || "B, C",
                                    medCertificateExpiry: d.medCertificateExpiry || "",
                                    specialPermits: d.specialPermits || "",
                                    documents: d.documents || []
                                  });
                                  setDriverModalOpen(true);
                                }}
                                className="p-2 text-slate-400 hover:text-[#38a6e4] hover:bg-[#0c1e43] transition-colors rounded-full cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm("Вы уверены, что хотите уволить сотрудника?")) {
                                    deleteDriverMutation.mutate(d.id);
                                    showNotification("Сотрудник уволен!", "success");
                                  }
                                }}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors rounded-full cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Vehicles CRUD Table View */}
        {activeTab === "vehicles" && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* Filter Bar */}
            <div className="bg-[#0c1e43]/90 border border-[#00417d]/30 rounded-xl p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] w-4 h-4" />
                <input 
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 bg-[#00091b] rounded-lg border border-[#00417d]/30 focus:border-[#38a6e4] text-sm outline-none font-medium placeholder:text-[#64748b] text-white" 
                  placeholder="Поиск по модели, госномеру..." 
                  type="text"
                />
              </div>
            </div>

            {/* Vehicles List */}
            <div className="bg-[#0c1e43]/90 rounded-xl border border-[#00417d]/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#00417d]/30 bg-[#00091b]/40 text-[#94a3b8] text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">Спецтехника (Модель)</th>
                      <th className="p-4">Классификация техники</th>
                      <th className="p-4">Госномер</th>
                      <th className="p-4">Документы СТС/ПТС</th>
                      <th className="p-4">Статус спецтехники</th>
                      <th className="p-4 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-bold text-slate-200 divide-y divide-[#334155]">
                    {filteredVehicles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-[#64748b]">Спецтехники не найдено. Нажмите «Добавить технику» выше!</td>
                      </tr>
                    ) : (
                      filteredVehicles.map(v => (
                        <tr key={v.id} className="hover:bg-[#0c1e43]/40 transition-colors">
                          <td className="p-4 font-bold text-white flex items-center gap-2">
                            <button 
                              onClick={() => setSelectedVehicle(v)}
                              className="font-bold text-white hover:text-[#38a6e4] transition-colors flex items-center gap-2 text-left cursor-pointer"
                            >
                              <Truck className="w-4 h-4 text-[#38a6e4]" />
                              {v.model}
                            </button>
                          </td>
                          <td className="p-4 text-slate-300">{v.machineryType || "Спецтехника"}</td>
                          <td className="p-4 text-slate-300 font-mono">{v.plateNumber}</td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              {v.documents?.map((doc, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 text-[10px] bg-[#0c1e43] text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                                  <FileText className="w-3 h-3 text-[#38a6e4]" />
                                  {doc.type}
                                </span>
                              )) || <span className="text-slate-400 text-xs">—</span>}
                            </div>
                          </td>
                          <td className="p-4">
                            {v.status === "ACTIVE" ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#10b981]/10 text-[#10b981] text-xs font-bold border border-[#10b981]/20">
                                Активен
                              </span>
                            ) : v.status === "MAINTENANCE" ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-bold border border-yellow-500/20">
                                В ремонте
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20">
                                Списан
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button 
                                onClick={() => {
                                  setEditingVehicle(v);
                                  setVehicleForm({ 
                                    model: v.model, 
                                    plateNumber: v.plateNumber, 
                                    vin: v.vin, 
                                    status: v.status, 
                                    machineryType: v.machineryType || "Гусеничный экскаватор",
                                    yearOfManufacture: v.yearOfManufacture ? String(v.yearOfManufacture) : "",
                                    fuelConsumptionNominal: v.fuelConsumptionNominal ? String(v.fuelConsumptionNominal) : "",
                                    carryingCapacity: v.carryingCapacity ? String(v.carryingCapacity) : "",
                                    boomLength: v.boomLength ? String(v.boomLength) : "",
                                    enginePower: v.enginePower ? String(v.enginePower) : "",
                                    lastServiceDate: v.lastServiceDate || "",
                                    insuranceNumber: v.insuranceNumber || "",
                                    ptnNumber: v.ptnNumber || "",
                                    documents: v.documents || []
                                  });
                                  setVehicleModalOpen(true);
                                }}
                                className="p-2 text-slate-400 hover:text-[#38a6e4] hover:bg-[#0c1e43] transition-colors rounded-full cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm("Вы уверены, что хотите списать эту технику?")) {
                                    deleteVehicleMutation.mutate(v.id);
                                    showNotification("Спецтехника списана с баланса!", "success");
                                  }
                                }}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors rounded-full cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* V2: Construction Objects View */}
        {activeTab === "objects" && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* Filter Bar */}
            <div className="bg-[#0c1e43]/90 border border-[#00417d]/30 rounded-xl p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] w-4 h-4" />
                <input 
                  value={objectSearch}
                  onChange={(e) => setObjectSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 bg-[#00091b] rounded-lg border border-[#00417d]/30 focus:border-[#38a6e4] text-sm outline-none font-medium placeholder:text-[#64748b] text-white" 
                  placeholder="Поиск по названию, типу сложности..." 
                  type="text"
                />
              </div>
            </div>

            {/* Objects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredObjects.map(obj => (
                <div 
                  key={obj.id}
                  onClick={() => setSelectedObject(obj)}
                  className="bg-[#0c1e43]/90 border border-[#00417d]/30 rounded-xl p-5 hover:shadow-2xl hover:border-[#38a6e4]/50 transition-all cursor-pointer space-y-4 group"
                >
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-[#38a6e4]/10 text-[#38a6e4] rounded-xl group-hover:bg-[#38a6e4] group-hover:text-white transition-colors">
                      <MapPin className="w-6 h-6" />
                    </div>
                    {obj.difficultyType === "MOUNTAIN" ? (
                      <span className="bg-red-500/10 text-red-400 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-red-500/20 uppercase tracking-wide">
                        Горный сектор 1.35x
                      </span>
                    ) : (
                      <span className="bg-blue-500/10 text-blue-400 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-blue-500/20 uppercase tracking-wide">
                        Равнинный 1.0x
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-lg text-white group-hover:text-[#38a6e4] transition-colors">{obj.name}</h4>
                    <p className="text-xs text-[#94a3b8] mt-1 font-mono">Координаты: {obj.latitude.toFixed(4)}° N, {obj.longitude.toFixed(4)}° E</p>
                  </div>
                  <div className="border-t border-[#00417d]/30 pt-3 flex justify-between items-center text-xs">
                    <span className="text-[#64748b] font-bold">Тариф надбавки</span>
                    <span className="text-[#f8fafc] font-extrabold">{obj.rateMultiplier}x к базовой ставке</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* Smart Payroll Tab View */}
        {activeTab === "payroll" && (() => {
          let totalHours = 0;
          let totalAdjustments = 0;
          let totalPayroll = 0;
          let ratesSum = 0;
          
          drivers.forEach(d => {
            const actH = getDriverActiveHours(d.id);
            const idlH = getDriverIdleHours(d.id);
            const rate = getDriverRate(d.id);
            const adj = getDriverAdjustment(d.id);

            let multiplier = 1.0;
            if (d.id === simDriverId && simActive) {
              const activeObject = objects.find(o => o.id === simObjectId);
              multiplier = activeObject?.rateMultiplier || 1.0;
            } else if (d.id === "d2") {
              multiplier = 1.35;
            }

            const payout = (actH * rate * multiplier) + (idlH * rate * 0.5) + adj;
            
            totalHours += actH + idlH;
            totalAdjustments += adj;
            totalPayroll += payout;
            ratesSum += rate;
          });

          const avgRate = drivers.length ? Math.round(ratesSum / drivers.length) : 0;

          return (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Analytics Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* Total Payroll FOT */}
                <div className="bg-[#0c1e43]/90 border border-[#00417d]/30 rounded-xl p-4 flex flex-col justify-between hover:shadow-lg transition-shadow relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white rounded-lg border border-[#00417d]/30 text-[#38a6e4]">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[#10b981] font-bold text-xs bg-[#10b981]/10 px-2 py-0.5 rounded-full">
                      ФОТ Активен
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider mb-1">Фонд оплаты (ФОТ)</p>
                    <h3 className="text-3xl font-extrabold tracking-tight">
                      {Math.round(totalPayroll).toLocaleString("ru-RU")} <span className="text-sm font-normal text-[#94a3b8]">₽</span>
                    </h3>
                  </div>
                </div>

                {/* Avg Driver Hourly Rate */}
                <div className="bg-[#0c1e43]/90 border border-[#00417d]/30 rounded-xl p-4 flex flex-col justify-between hover:shadow-lg transition-shadow relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white rounded-lg border border-[#00417d]/30 text-[#38a6e4]">
                      <Coins className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[#94a3b8] font-bold text-xs bg-[#334155] px-2 py-0.5 rounded-full">
                      Средняя
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider mb-1">Средняя ставка</p>
                    <h3 className="text-3xl font-extrabold tracking-tight">
                      {avgRate} <span className="text-sm font-normal text-[#94a3b8]">₽/ч</span>
                    </h3>
                  </div>
                </div>

                {/* Total Fleet Route Hours */}
                <div className="bg-[#0c1e43]/90 border border-[#00417d]/30 rounded-xl p-4 flex flex-col justify-between hover:shadow-lg transition-shadow relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white rounded-lg border border-[#00417d]/30 text-[#38a6e4]">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[#38a6e4] font-bold text-xs bg-[#38a6e4]/10 px-2 py-0.5 rounded-full">
                      +{drivers.filter(d=>d.status === "ACTIVE").length} на линии
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider mb-1">Всего отработано</p>
                    <h3 className="text-3xl font-extrabold tracking-tight">
                      {Math.round(totalHours)} <span className="text-sm font-normal text-[#94a3b8]">ч</span>
                    </h3>
                  </div>
                </div>

                {/* Adjustments Fuel Saving/Loss */}
                <div className="bg-[#0c1e43]/90 border border-[#00417d]/30 rounded-xl p-4 flex flex-col justify-between hover:shadow-lg transition-shadow relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white rounded-lg border border-[#00417d]/30 text-[#ef4444]">
                      <Fuel className="w-5 h-5" />
                    </div>
                    <span className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-full ${
                      totalAdjustments >= 0 ? "text-[#10b981] bg-[#10b981]/10" : "text-red-500 bg-red-500/10"
                    }`}>
                      {totalAdjustments >= 0 ? "Надбавки" : "Корректировки"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider mb-1">Штрафы и надбавки</p>
                    <h3 className={`text-3xl font-extrabold tracking-tight ${totalAdjustments < 0 ? "text-red-400" : "text-[#f8fafc]"}`}>
                      {totalAdjustments >= 0 ? "+" : ""}{totalAdjustments.toLocaleString("ru-RU")} <span className="text-sm font-normal text-[#94a3b8]">₽</span>
                    </h3>
                  </div>
                </div>

              </div>

              {/* Active Wage Decrees Timeline (V2) -> Upgraded to high-density grid for large number of records */}
              <div className="bg-[#0c1e43]/90 border border-[#00417d]/30 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="font-extrabold text-sm tracking-wide text-white flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-[#38a6e4]" />
                    Реестр Приказов об установлении ставок
                  </h3>
                  <button 
                    onClick={() => {
                      setOrderForm({ driverId: drivers[0]?.id || "", orderNumber: `П-${Math.floor(100 + Math.random() * 900)}`, dateEffective: new Date().toISOString().split('T')[0], newRate: 850 });
                      setOrderModalOpen(true);
                    }}
                    className="h-9 px-4 bg-[#38a6e4] hover:bg-[#208bc9] text-white text-xs font-bold rounded-xl shadow-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-white" /> Инициализировать приказ
                  </button>
                </div>

                {/* Filter and Search Controls for Orders */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Поиск по сотруднику или номеру приказа..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="w-full h-9 pl-9 pr-4 bg-[#00091b] border border-[#00417d]/30 rounded-xl focus:border-[#38a6e4] outline-none text-xs font-semibold text-white placeholder-slate-500"
                    />
                  </div>
                  <select 
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="h-9 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-xl focus:border-[#38a6e4] outline-none text-xs font-semibold cursor-pointer text-white sm:w-48"
                  >
                    <option value="ALL">Все статусы</option>
                    <option value="SIGNED">Подписан</option>
                    <option value="PENDING">Ожидает подписи</option>
                  </select>
                </div>

                {/* Grid Spreadsheet of Decrees */}
                <div className="border border-[#00417d]/30 rounded-xl overflow-hidden bg-[#00091b]/40">
                  <div className="max-h-[320px] overflow-y-auto overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#00417d]/30 bg-[#00091b]/80 text-[#94a3b8] text-[11px] font-extrabold uppercase tracking-wider sticky top-0 z-10">
                          <th className="p-3">Номер приказа</th>
                          <th className="p-3">Сотрудник</th>
                          <th className="p-3">Срок действия</th>
                          <th className="p-3">Тарифная сетка</th>
                          <th className="p-3">Статус</th>
                          <th className="p-3 text-right">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#334155] text-xs font-semibold">
                        {(() => {
                          const filteredOrders = orders.filter(ord => {
                            const matchSearch = ord.driverName.toLowerCase().includes(orderSearch.toLowerCase()) || 
                                                ord.orderNumber.toLowerCase().includes(orderSearch.toLowerCase());
                            const matchStatus = orderStatusFilter === "ALL" || 
                                                (orderStatusFilter === "SIGNED" && ord.status === "SIGNED") ||
                                                (orderStatusFilter === "PENDING" && ord.status !== "SIGNED");
                            return matchSearch && matchStatus;
                          });

                          if (filteredOrders.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="p-8 text-center text-[#64748b] font-bold">
                                  Приказы не найдены
                                </td>
                              </tr>
                            );
                          }

                          return filteredOrders.map(ord => (
                            <tr key={ord.id} className="hover:bg-[#0c1e43]/40 transition-colors">
                              <td className="p-3 font-mono">
                                <span className="inline-flex items-center bg-[#0c1e43] text-[#38a6e4] border border-[#38a6e4]/20 px-2 py-0.5 rounded text-[10px] font-extrabold">
                                  №{ord.orderNumber}
                                </span>
                              </td>
                              <td className="p-3 text-white font-extrabold">{ord.driverName}</td>
                              <td className="p-3 text-slate-300 font-mono">
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-[#38a6e4]" />
                                  {ord.dateEffective}
                                </span>
                              </td>
                              <td className="p-3 text-slate-300">
                                <span className="line-through text-slate-500 mr-1.5">{ord.oldRate}</span>
                                <span className="text-[#38a6e4] font-black">{ord.newRate} ₽/ч</span>
                              </td>
                              <td className="p-3">
                                {ord.status === "SIGNED" ? (
                                  <span className="inline-flex items-center gap-1 bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/20 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">
                                    <CheckCircle className="w-3 h-3 text-[#10b981]" /> Подписан
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase animate-pulse">
                                    Ожидает подписи
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => setActiveViewDoc({
                                    name: `Приказ №${ord.orderNumber} о пересмотре тарифной ставки`,
                                    file: `order-${ord.orderNumber.toLowerCase()}-signed.pdf`,
                                    type: `Приказ об установлении тарифа водителя ${ord.driverName} (${ord.newRate} ₽/ч)`
                                  })}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] bg-[#0c1e43] hover:bg-[#38a6e4] text-[#38a6e4] hover:text-white border border-[#38a6e4]/30 rounded-lg font-bold transition-all cursor-pointer shadow-sm active:scale-95 text-inverted"
                                  title="Открыть и просмотреть приказ"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Просмотреть
                                </button>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Spreadsheet Billing Table */}
              <div className="bg-[#0c1e43]/90 rounded-xl border border-[#00417d]/30 overflow-hidden">
                <div className="p-4 border-b border-[#00417d]/30 bg-[#00091b]/70 flex justify-between items-center">
                  <h3 className="font-extrabold text-sm tracking-wide text-white">Ведомость расчетов и начисления Payroll</h3>
                  <span className="text-[10px] font-extrabold bg-[#38a6e4]/10 text-[#38a6e4] px-2.5 py-1 rounded-full uppercase tracking-wide">
                    Учет условий местности объектов (Бишкек/Горы)
                  </span>
                </div>
                <div className="overflow-x-hidden">
                  <table className="w-full text-left border-collapse table-layout-fixed">
                    <thead>
                      <tr className="border-b border-[#00417d]/30 bg-[#00091b]/40 text-[#94a3b8] text-[11px] font-extrabold uppercase tracking-wider">
                        <th className="p-4 w-[22%]">Сотрудник</th>
                        <th className="p-4 w-[20%]">Объект (Коэфф.)</th>
                        <th className="p-4 w-[18%]">Движение / Простой</th>
                        <th className="p-4 w-[10%]">Ставка</th>
                        <th className="p-4 w-[10%]">Штраф / Премия</th>
                        <th className="p-4 w-[10%] text-right">Итого</th>
                        <th className="p-4 w-[10%] text-center">Статус</th>
                        <th className="p-4 w-[10%] text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#334155] text-xs font-semibold">
                      {drivers.map(d => {
                        const actH = getDriverActiveHours(d.id);
                        const idlH = getDriverIdleHours(d.id);
                        const rate = getDriverRate(d.id);
                        const adj = getDriverAdjustment(d.id);
                        const status = getDriverPaidStatus(d.id);

                        let objectName = "База";
                        let multiplier = 1.0;
                        if (d.id === simDriverId && simActive) {
                          const activeObject = objects.find(o => o.id === simObjectId);
                          objectName = activeObject?.name || "ЖК Ала-Тоо (Бишкек)";
                          multiplier = activeObject?.rateMultiplier || 1.0;
                        } else if (d.id === "d2") {
                          objectName = "Трасса Бишкек-Ош";
                          multiplier = 1.35;
                        }
                        
                        const payout = (actH * rate * multiplier) + (idlH * rate * 0.5) + adj;

                        return (
                          <tr key={d.id} className="hover:bg-[#0c1e43]/40 transition-colors text-slate-200">
                            <td className="p-4 font-bold text-white flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#38a6e4]/10 text-[#38a6e4] flex items-center justify-center font-extrabold text-[10px] shrink-0">
                                {d.name.split(" ").map(w=>w[0]).join("")}
                              </div>
                              <span className="truncate">{d.name}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-white font-bold block truncate">{objectName}</span>
                              <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded font-extrabold text-[9px] ${
                                multiplier > 1 ? "bg-red-500/20 text-red-400" : "bg-[#0c1e43] text-slate-400"
                              }`}>
                                {multiplier}x
                              </span>
                            </td>
                            <td className="p-4 font-mono">
                              <span className="text-white font-extrabold">{actH.toFixed(1)} ч</span>
                              <span className="text-slate-500 text-[10px] font-medium block">Простой: {idlH.toFixed(1)} ч</span>
                            </td>
                            <td className="p-4 text-white font-bold font-mono">
                              {rate} ₽/ч
                            </td>
                            <td className="p-4">
                              <input 
                                type="number" 
                                value={adj}
                                onChange={(e) => setManualAdjustments(prev => ({ ...prev, [d.id]: Number(e.target.value) }))}
                                className={`w-20 h-7 border rounded-lg px-2 font-bold text-center focus:border-[#38a6e4] outline-none bg-[#00091b] text-white ${
                                  adj >= 0 ? "border-green-800 text-green-400" : "border-red-800 text-red-400"
                                }`}
                              />
                            </td>
                            <td className="p-4 text-[#eab308] font-black text-sm font-mono text-right whitespace-nowrap">
                              {Math.round(payout).toLocaleString("ru-RU")} ₽
                            </td>
                            <td className="p-4 text-center">
                              {status === "PAID" ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] text-[10px] font-extrabold border border-[#10b981]/20 shadow-sm">
                                  Выплачено
                                </span>
                              ) : status === "PROCESSING" ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#38a6e4]/10 text-[#38a6e4] text-[10px] font-extrabold border border-[#38a6e4]/20 animate-pulse shadow-sm">
                                  В обработке
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-extrabold border border-blue-500/20 shadow-sm">
                                  К выплате
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              {status === "PENDING" && (
                                <button
                                  onClick={() => handlePayDriver(d.id, d.name, payout)}
                                  className="h-8 px-4 bg-[#10b981] hover:bg-[#059669] text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shadow-md hover:shadow active:scale-95 duration-150 text-inverted"
                                >
                                  Выплатить
                                </button>
                              )}
                              {status === "PAID" && (
                                <button
                                  onClick={() => setDriverPaidStatuses(prev => ({ ...prev, [d.id]: "PENDING" }))}
                                  className="text-[10px] text-slate-400 hover:text-red-400 font-bold uppercase cursor-pointer"
                                >
                                  Сбросить
                                </button>
                              )}
                              {status === "PROCESSING" && (
                                <span className="text-[10px] text-[#38a6e4] font-bold uppercase">Банк...</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payroll Visualization Graph Bar */}
              <div className="bg-[#0c1e43]/90 border border-[#00417d]/30 rounded-xl p-5 space-y-4">
                <h4 className="font-extrabold text-sm text-white tracking-wide">Распределение фонда оплаты труда по сотрудникам</h4>
                <div className="space-y-3.5 bg-[#00091b]/60 p-4 rounded-xl border border-[#00417d]/30">
                  {drivers.map(d => {
                    const actH = getDriverActiveHours(d.id);
                    const idlH = getDriverIdleHours(d.id);
                    const rate = getDriverRate(d.id);
                    const adj = getDriverAdjustment(d.id);
                    
                    let multiplier = 1.0;
                    if (d.id === simDriverId && simActive) {
                      const activeObject = objects.find(o => o.id === simObjectId);
                      multiplier = activeObject?.rateMultiplier || 1.0;
                    } else if (d.id === "d2") {
                      multiplier = 1.35;
                    }

                    const payout = (actH * rate * multiplier) + (idlH * rate * 0.5) + adj;
                    const percent = totalPayroll > 0 ? (payout / totalPayroll) * 100 : 0;

                    return (
                      <div key={d.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-white">{d.name}</span>
                          <span className="text-slate-300">{Math.round(percent)}% ({Math.round(payout).toLocaleString("ru-RU")} ₽)</span>
                        </div>
                        <div className="w-full h-3 bg-[#000511] rounded-full overflow-hidden border border-[#00417d]/30">
                          <div 
                            className="h-full bg-gradient-to-r from-[#38a6e4] to-[#208bc9] rounded-full"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          );
        })()}

      </div>

      {/* Right Side Smartphone Simulator Panel (30% standard) */}
      <div className="bg-[#0c1e43]/90 w-full lg:w-[380px] p-4 sm:p-6 shrink-0 flex flex-col justify-start border-t lg:border-t-0 lg:border-l border-[#00417d]/30 select-none h-screen overflow-y-auto">
        <div className="mb-4">
          <h2 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38a6e4] animate-ping"></span>
            Мобильное приложение водителя
          </h2>
          <p className="text-xs text-[#94a3b8] font-bold mt-0.5">Электронная подпись приказов + симулятор ГСМ</p>
        </div>

        {/* Visual Smartphone Wrapper Container */}
        <div className="bg-[#00091b] p-3 rounded-[32px] shadow-2xl border-4 border-[#475569] flex flex-col h-[710px] relative overflow-hidden select-none max-w-sm mx-auto w-full">
          {/* Speaker Notch */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-4 bg-[#00091b] rounded-full z-50 flex items-center justify-center">
            <div className="w-12 h-1 bg-[#334155] rounded-full"></div>
          </div>

          {/* Virtual Mobile Screen */}
          <div className="bg-[#f8fafc] flex-grow rounded-[20px] overflow-hidden flex flex-col relative select-none text-slate-900">
            
            {/* Simulator Mobile App Header */}
            <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 pt-4 shrink-0">
              <span className="font-extrabold text-base text-slate-800 tracking-tight flex items-center gap-1">
                <Truck className="w-4 h-4 text-[#38a6e4]" />
                АВАНГАРД
              </span>
              <span className="text-[10px] font-extrabold bg-[#f1f5f9] text-slate-600 px-2 py-0.5 rounded tracking-wide uppercase">Спецтехника</span>
            </header>

            {/* Mobile View Screen Scrollable */}
            <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-4 select-none pb-6">
              
              {/* V2: Dynamic Order/Decree Signing Section in Smartphone */}
              {showMobileSignOrder && (
                <div className="p-3.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl space-y-3 shrink-0 animate-pulse">
                  <div className="flex items-center gap-1.5 text-yellow-700 font-extrabold text-[11px] uppercase">
                    <FileSignature className="w-4 h-4 animate-bounce" />
                    Приказ №{showMobileSignOrder.orderNumber}
                  </div>
                  <div className="text-xs text-slate-800 space-y-1">
                    <p className="font-bold">Уважаемый {showMobileSignOrder.driverName},</p>
                    <p className="leading-tight">Приказом руководства ваша часовая ставка повышается: <span className="line-through text-slate-500">{showMobileSignOrder.oldRate}</span> → <span className="font-extrabold text-green-700">{showMobileSignOrder.newRate} ₽/ч</span>.</p>
                  </div>
                  
                  {/* Visual Signature pad area */}
                  <div className="h-20 bg-white border border-slate-300 rounded-lg relative overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => setSignatureDrawn(true)}>
                    {signatureDrawn ? (
                      <span className="font-mono text-xs text-slate-500 italic border-b border-slate-400 pb-0.5">Ivanov_signed_digital_key_889</span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center px-4">Коснитесь здесь для электронной подписи</span>
                    )}
                  </div>

                  <button
                    onClick={handleMobileSignDecree}
                    disabled={!signatureDrawn}
                    className={`w-full h-9 font-extrabold text-xs rounded-xl shadow transition-all cursor-pointer ${
                      signatureDrawn ? "bg-[#10b981] hover:bg-[#059669] text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    Подписать приказ
                  </button>
                </div>
              )}

              {/* Simulator Config Selector Card */}
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex flex-col gap-2.5 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Идентификация смены</span>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-700">Машинист / Оператор</label>
                  <select 
                    value={simDriverId}
                    onChange={(e) => setSimDriverId(e.target.value)}
                    disabled={simActive}
                    className="w-full h-8 text-xs bg-white rounded border border-slate-300 px-2 font-semibold outline-none mt-0.5 cursor-pointer"
                  >
                    <option value="">Выберите сотрудника...</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.status === "ACTIVE" ? "На смене" : "Свободен"})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-700">Спецтехника</label>
                  <select 
                    value={simVehicleId}
                    onChange={(e) => setSimVehicleId(e.target.value)}
                    disabled={simActive}
                    className="w-full h-8 text-xs bg-white rounded border border-slate-300 px-2 font-semibold outline-none mt-0.5 cursor-pointer"
                  >
                    <option value="">Выберите машину...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.model} ({v.plateNumber})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-700">Строительный объект</label>
                  <select 
                    value={simObjectId}
                    onChange={(e) => setSimObjectId(e.target.value)}
                    disabled={simActive}
                    className="w-full h-8 text-xs bg-white rounded border border-slate-300 px-2 font-semibold outline-none mt-0.5 cursor-pointer"
                  >
                    {objects.map(o => (
                      <option key={o.id} value={o.id}>{o.name} ({o.difficultyType === "MOUNTAIN" ? "1.35x Горный" : "1.0x"})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status and Action block */}
              <div className="bg-slate-100 rounded-xl border border-slate-200 p-3 space-y-3 shrink-0">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Статус трекера</span>
                  <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wide ${
                    simActive ? "bg-[#10b981]/10 text-[#10b981]" : "bg-slate-200 text-slate-600"
                  }`}>
                    {simStatusText}
                  </span>
                </div>

                <div className="flex justify-between items-center font-mono font-extrabold text-[#0f172a] text-center text-xl tracking-tight bg-white rounded-lg p-2 border border-slate-200 select-none">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <span className="tabular-nums select-none">{formatTimer(simSeconds)}</span>
                </div>

                <div className="flex gap-2">
                  {!simActive ? (
                    <button 
                      onClick={handleSimStartShift}
                      className="flex-1 h-10 bg-[#38a6e4] hover:bg-[#208bc9] text-white font-extrabold text-xs rounded-xl shadow-lg transition-colors cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Начать смену
                    </button>
                  ) : (
                    <button 
                      onClick={handleSimStopShift}
                      className="flex-1 h-10 bg-[#0c1e43] hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-colors cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      Завершить
                    </button>
                  )}
                </div>
              </div>

              {/* Live Location and Telemetry */}
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 space-y-2 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Телеметрия GPS & Бак</span>
                
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm text-xs font-semibold">
                  <div className="p-2 bg-[#38a6e4]/10 text-[#38a6e4] rounded-md shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold">Координаты трансляции</span>
                    <span className="text-xs text-slate-900 font-bold mt-0.5">
                      {simActive ? GEOLOCATION_PATH[simPathIndex].lat.toFixed(4) : "42.8744"}° N, {simActive ? GEOLOCATION_PATH[simPathIndex].lng.toFixed(4) : "74.5698"}° E
                    </span>
                    <span className="text-[9px] text-[#38a6e4] font-bold mt-1 flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-[#38a6e4]" />
                      {simActive ? GEOLOCATION_PATH[simPathIndex].label : "Депо Западное (Бишкек)"}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2 text-xs font-semibold">
                  <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                    <span className="flex items-center gap-1"><Fuel className="w-3.5 h-3.5 text-[#38a6e4]" /> Топливный датчик</span>
                    <span className={simFuel < 20 ? "text-red-600 animate-pulse" : "text-[#38a6e4]"}>{simFuel.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${simFuel < 20 ? "bg-red-600" : "bg-[#38a6e4]"}`} 
                      style={{ width: `${Math.max(0, simFuel)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-slate-400">
                    <span>~{Math.round((simFuel / 100) * 400)} Л остаток</span>
                    {simActive && (
                      <button 
                        onClick={handleSimulateFuelDrain}
                        className="text-[9px] text-red-600 hover:underline font-extrabold uppercase flex items-center gap-0.5 border border-red-200 bg-red-50 px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                        Слить топливо
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 text-xs font-bold pt-1">
                  <div className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-center shadow-sm">
                    <span className="block text-[8px] text-slate-400 uppercase tracking-wide font-extrabold mb-0.5">В пути</span>
                    <span className="text-[#38a6e4] font-bold tabular-nums">{simActive ? simDistance.toFixed(1) : "0.0"} км</span>
                  </div>
                  <div className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-center shadow-sm">
                    <span className="block text-[8px] text-slate-400 uppercase tracking-wide font-extrabold mb-0.5">Текущая ставка</span>
                    <span className="text-slate-800 font-bold">{simDriverId ? getDriverRate(simDriverId) : "—"} ₽</span>
                  </div>
                </div>
              </div>

              {/* Personal app shift logs */}
              <div className="flex flex-col gap-1.5 flex-grow">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Архив выполненных смен</span>
                <div className="flex flex-col bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden flex-grow min-h-[140px] text-xs font-semibold">
                  {!simDriverId ? (
                    <div className="flex-grow flex items-center justify-center text-center p-4 text-slate-400">
                      Выберите машиниста, чтобы загрузить архив смен
                    </div>
                  ) : simHistory.length === 0 ? (
                    <div className="flex-grow flex items-center justify-center text-center p-4 text-slate-400">
                      Смен не обнаружено в архиве
                    </div>
                  ) : (
                    simHistory.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${item.status === "Завершено" ? "bg-[#10b981]" : "bg-[#38a6e4] animate-pulse"}`}></span>
                            <span className="font-extrabold text-slate-800">{item.date}</span>
                          </div>
                          <span className="text-[9px] text-slate-400 mt-0.5 block">{item.timeRange}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-slate-800">{item.duration}</span>
                          <span className="text-[9px] text-slate-400 block">{item.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* CRUD Modals */}

      {/* Driver Modal */}
      {driverModalOpen && (
        <div className="fixed inset-0 bg-[#00091b]/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0c1e43]/90 rounded-2xl border border-[#00417d]/30 p-6 max-w-2xl w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingDriver ? "Редактировать сотрудника" : "Нанять сотрудника в штат"}
            </h3>
            <form onSubmit={handleDriverSubmit} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">ФИО Сотрудника</label>
                  <input
                    required
                    type="text"
                    value={driverForm.name}
                    onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                    placeholder="Алексей Петров"
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Номер телефона</label>
                  <input
                    required
                    type="text"
                    value={driverForm.phone}
                    onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                    placeholder="+996 (555) 12-34-56"
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Номер ВУ / удостоверения</label>
                  <input
                    required
                    type="text"
                    value={driverForm.licenseNumber}
                    onChange={(e) => setDriverForm({ ...driverForm, licenseNumber: e.target.value })}
                    placeholder="KG 88 AA 9999"
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Категории прав</label>
                  <input
                    type="text"
                    value={driverForm.licenseCategories}
                    onChange={(e) => setDriverForm({ ...driverForm, licenseCategories: e.target.value })}
                    placeholder="B, C, D, E"
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Дата рождения</label>
                  <input
                    type="date"
                    value={driverForm.birthDate}
                    onChange={(e) => setDriverForm({ ...driverForm, birthDate: e.target.value })}
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Стаж работы (полных лет)</label>
                  <input
                    type="number"
                    value={driverForm.experienceYears}
                    onChange={(e) => setDriverForm({ ...driverForm, experienceYears: e.target.value })}
                    placeholder="8"
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Срок действия мед. справки</label>
                  <input
                    type="date"
                    value={driverForm.medCertificateExpiry}
                    onChange={(e) => setDriverForm({ ...driverForm, medCertificateExpiry: e.target.value })}
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Текущий статус смены</label>
                  <select
                    value={driverForm.status}
                    onChange={(e) => setDriverForm({ ...driverForm, status: e.target.value })}
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold cursor-pointer text-white"
                  >
                    <option value="FREE">Свободен</option>
                    <option value="ACTIVE">На смене</option>
                    <option value="OFF">Вне смены</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 mb-1 font-bold">Специальные допуски и квалификации</label>
                  <input
                    type="text"
                    value={driverForm.specialPermits}
                    onChange={(e) => setDriverForm({ ...driverForm, specialPermits: e.target.value })}
                    placeholder="e.g. Допуск на автокраны Liebherr, Работы в горных секторах"
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white"
                  />
                </div>
              </div>
              {/* Display list of currently staged documents with a delete icon */}
              {driverForm.documents && driverForm.documents.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-[#00417d]/20">
                  <label className="block text-slate-400 text-[10px] uppercase font-black tracking-wider">Прикрепленные документы / файлы</label>
                  <div className="flex flex-wrap gap-1.5">
                    {driverForm.documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#09142d] border border-[#00417d]/30 rounded-lg text-[10px] text-white animate-fadeIn">
                        <button
                          type="button"
                          onClick={() => setActiveViewDoc(doc)}
                          className="flex items-center gap-1.5 hover:text-[#38a6e4] transition-colors cursor-pointer text-left"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#38a6e4]" />
                          <span className="font-bold truncate max-w-[150px]">{doc.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = driverForm.documents.filter((_, i) => i !== idx);
                            setDriverForm({ ...driverForm, documents: updated });
                          }}
                          className="text-slate-400 hover:text-red-400 cursor-pointer transition-colors ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-[#00417d]/20">
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentTarget({ type: "driver_form", id: editingDriver?.id || "new" });
                    setAttachmentForm({ name: "", type: "Водительское Удостоверение", file: "" });
                    setAttachmentWizardOpen(true);
                  }}
                  className="h-10 px-4 bg-[#38a6e4]/10 hover:bg-[#38a6e4]/20 border border-[#38a6e4]/20 text-[#38a6e4] rounded-lg transition-colors font-bold text-sm flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <Paperclip className="w-4 h-4" />
                  Прикрепить
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDriverModalOpen(false)}
                    className="h-10 px-4 bg-[#0c1e43] hover:bg-slate-700 text-white rounded-lg transition-colors font-bold text-sm cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="h-10 px-4 bg-[#38a6e4] hover:bg-[#208bc9] text-white rounded-lg transition-colors font-bold text-sm cursor-pointer"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle Modal */}
      {vehicleModalOpen && (
        <div className="fixed inset-0 bg-[#00091b]/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0c1e43]/90 rounded-2xl border border-[#00417d]/30 p-6 max-w-2xl w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingVehicle ? "Редактировать спецтехнику" : "Поставить спецтехнику на баланс"}
            </h3>
            <form onSubmit={handleVehicleSubmit} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Марка и Модель спецтехники</label>
                  <input
                    required
                    type="text"
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    placeholder="Экскаватор CAT 320"
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Классификация машины</label>
                  <select
                    value={vehicleForm.machineryType}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, machineryType: e.target.value })}
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold cursor-pointer text-white"
                  >
                    <option value="Гусеничный экскаватор">Гусеничный экскаватор</option>
                    <option value="Тяжелый кран">Тяжелый кран</option>
                    <option value="Тяжелый бульдозер">Тяжелый бульдозер</option>
                    <option value="Фронтальный погрузчик">Фронтальный погрузчик</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Государственный номер</label>
                  <input
                    required
                    type="text"
                    value={vehicleForm.plateNumber}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, plateNumber: e.target.value })}
                    placeholder="KG 555 ABD"
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">VIN код техники</label>
                  <input
                    required
                    type="text"
                    value={vehicleForm.vin}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vin: e.target.value })}
                    placeholder="CAT320E999XYZ0001"
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Год выпуска</label>
                  <input
                    type="number"
                    value={vehicleForm.yearOfManufacture}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, yearOfManufacture: e.target.value })}
                    placeholder="2021"
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Номинальный расход топлива (л/ч)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vehicleForm.fuelConsumptionNominal}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, fuelConsumptionNominal: e.target.value })}
                    placeholder="28.5"
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Мощность двигателя (л.с.)</label>
                  <input
                    type="number"
                    value={vehicleForm.enginePower}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, enginePower: e.target.value })}
                    placeholder="168"
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Грузоподъемность (т, необязательно)</label>
                  <input
                    type="number"
                    value={vehicleForm.carryingCapacity}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, carryingCapacity: e.target.value })}
                    placeholder="22"
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Вылет стрелы (м, для автокранов)</label>
                  <input
                    type="number"
                    value={vehicleForm.boomLength}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, boomLength: e.target.value })}
                    placeholder="40"
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Полис ОСАГО</label>
                  <input
                    type="text"
                    value={vehicleForm.insuranceNumber}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, insuranceNumber: e.target.value })}
                    placeholder="ОСАГО №11223344"
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Регистрационный номер ПТС</label>
                  <input
                    type="text"
                    value={vehicleForm.ptnNumber}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, ptnNumber: e.target.value })}
                    placeholder="ПТС №77 КГ 90881"
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Дата последнего ТО</label>
                  <input
                    type="date"
                    value={vehicleForm.lastServiceDate}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, lastServiceDate: e.target.value })}
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 mb-1 font-bold">Статус техники</label>
                  <select
                    value={vehicleForm.status}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold cursor-pointer text-white"
                  >
                    <option value="ACTIVE">Активен</option>
                    <option value="MAINTENANCE">В ремонте</option>
                    <option value="OUT_OF_SERVICE">Списан</option>
                  </select>
                </div>
              </div>
              {/* Display list of currently staged documents with a delete icon */}
              {vehicleForm.documents && vehicleForm.documents.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-[#00417d]/20">
                  <label className="block text-slate-400 text-[10px] uppercase font-black tracking-wider">Прикрепленные документы / файлы</label>
                  <div className="flex flex-wrap gap-1.5">
                    {vehicleForm.documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#09142d] border border-[#00417d]/30 rounded-lg text-[10px] text-white animate-fadeIn">
                        <button
                          type="button"
                          onClick={() => setActiveViewDoc(doc)}
                          className="flex items-center gap-1.5 hover:text-[#38a6e4] transition-colors cursor-pointer text-left"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#38a6e4]" />
                          <span className="font-bold truncate max-w-[150px]">{doc.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = vehicleForm.documents.filter((_, i) => i !== idx);
                            setVehicleForm({ ...vehicleForm, documents: updated });
                          }}
                          className="text-slate-400 hover:text-red-400 cursor-pointer transition-colors ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-[#00417d]/20">
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentTarget({ type: "vehicle_form", id: editingVehicle?.id || "new" });
                    setAttachmentForm({ name: "", type: "СТС", file: "" });
                    setAttachmentWizardOpen(true);
                  }}
                  className="h-10 px-4 bg-[#38a6e4]/10 hover:bg-[#38a6e4]/20 border border-[#38a6e4]/20 text-[#38a6e4] rounded-lg transition-colors font-bold text-sm flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <Paperclip className="w-4 h-4" />
                  Прикрепить
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVehicleModalOpen(false)}
                    className="h-10 px-4 bg-[#0c1e43] hover:bg-slate-700 text-white rounded-lg transition-colors font-bold text-sm cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="h-10 px-4 bg-[#38a6e4] hover:bg-[#208bc9] text-white rounded-lg transition-colors font-bold text-sm cursor-pointer"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Object Modal */}
      {objectModalOpen && (
        <div className="fixed inset-0 bg-[#00091b]/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0c1e43]/90 rounded-2xl border border-[#00417d]/30 p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Создать строительный объект</h3>
            <form onSubmit={handleObjectSubmit} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-slate-300 mb-1 font-bold">Название объекта</label>
                <input
                  required
                  type="text"
                  value={objectForm.name}
                  onChange={(e) => setObjectForm({ ...objectForm, name: e.target.value })}
                  placeholder="ЖК Ала-Тоо (Бишкек)"
                  className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Широта (Latitude)</label>
                  <input
                    required
                    type="number"
                    step="0.0001"
                    value={objectForm.latitude}
                    onChange={(e) => setObjectForm({ ...objectForm, latitude: Number(e.target.value) })}
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Долгота (Longitude)</label>
                  <input
                    required
                    type="number"
                    step="0.0001"
                    value={objectForm.longitude}
                    onChange={(e) => setObjectForm({ ...objectForm, longitude: Number(e.target.value) })}
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-bold">Сложность ландшафта (Надбавка)</label>
                <select
                  value={objectForm.difficultyType}
                  onChange={(e) => setObjectForm({ ...objectForm, difficultyType: e.target.value as "PLAIN" | "MOUNTAIN" })}
                  className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold cursor-pointer text-white"
                >
                  <option value="PLAIN">Равнинный (1.0x)</option>
                  <option value="MOUNTAIN">Горный сектор (1.35x надбавка)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setObjectModalOpen(false)}
                  className="h-10 px-4 bg-[#0c1e43] hover:bg-slate-700 text-white rounded-lg transition-colors font-bold text-sm cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 bg-[#38a6e4] hover:bg-[#208bc9] text-white rounded-lg transition-colors font-bold text-sm cursor-pointer"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order (Wage Decree) Modal */}
      {orderModalOpen && (
        <div className="fixed inset-0 bg-[#00091b]/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0c1e43]/90 rounded-2xl border border-[#00417d]/30 p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Выдать приказ о ставке</h3>
            <form onSubmit={handleOrderSubmit} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-slate-300 mb-1 font-bold">Сотрудник</label>
                <select
                  value={orderForm.driverId}
                  onChange={(e) => setOrderForm({ ...orderForm, driverId: e.target.value })}
                  className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold cursor-pointer text-white"
                >
                  <option value="">Выберите водителя...</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} (текущая ставка: {d.activeRate} ₽)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Номер Приказа</label>
                  <input
                    required
                    type="text"
                    value={orderForm.orderNumber}
                    onChange={(e) => setOrderForm({ ...orderForm, orderNumber: e.target.value })}
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Дата Вступления в силу</label>
                  <input
                    required
                    type="date"
                    value={orderForm.dateEffective}
                    onChange={(e) => setOrderForm({ ...orderForm, dateEffective: e.target.value })}
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-bold">Новая ставка (руб/час)</label>
                <input
                  required
                  type="number"
                  value={orderForm.newRate}
                  onChange={(e) => setOrderForm({ ...orderForm, newRate: Number(e.target.value) })}
                  placeholder="850"
                  className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderModalOpen(false)}
                  className="h-10 px-4 bg-[#0c1e43] hover:bg-slate-700 text-white rounded-lg transition-colors font-bold text-sm cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 bg-[#38a6e4] hover:bg-[#208bc9] text-white rounded-lg transition-colors font-bold text-sm cursor-pointer"
                >
                  Оформить приказ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* V2 Slide-over Vehicle Details Drawer */}
      {selectedVehicle && (() => {
        const isActiveSimVehicle = simActive && simVehicleId === selectedVehicle.id;
        
        let driverName = "Вне смены";
        let fuelRemaining = 85.0;
        let fuelLitres = 340;
        let shiftTime = "Вне смены";
        let speed = 0;
        let distance = 0;
        let consumptionRate = 31.8;
        let events = [{ time: "Вчера", text: "Смена завершена на объекте ЖК Ала-Тоо." }];
        let driverPhoto = "—";

        if (isActiveSimVehicle) {
          const simDriver = drivers.find(d => d.id === simDriverId);
          driverName = simDriver ? simDriver.name : "Иван Иванов";
          fuelRemaining = simFuel;
          fuelLitres = Math.round((simFuel / 100) * 400);
          shiftTime = formatTimer(simSeconds);
          speed = 35;
          distance = simDistance;
          consumptionRate = 31.8;
          events = [
            { time: "Только что", text: `ТС на смене, объект: ЖК Ала-Тоо` },
            { time: "Смена начата", text: "Сигнал телеметрии GPS и уровня бака стабилен" }
          ];
          driverPhoto = driverName.split(" ").map(w=>w[0]).join("");
        } else if (selectedVehicle.id === "v3") {
          driverName = "Сергей Смирнов";
          fuelRemaining = 68.5;
          fuelLitres = 274;
          shiftTime = "05:42:15";
          speed = 0;
          distance = 42.1;
          consumptionRate = 36.5;
          events = [
            { time: "12:45", text: "Установка опор автокрана верифицирована датчиками" },
            { time: "10:15", text: "Остановка на объекте Трасса Бишкек-Ош" },
            { time: "08:30", text: "Начало смены (База)" }
          ];
          driverPhoto = "СС";
        }

        return (
          <>
            <div onClick={() => setSelectedVehicle(null)} className="fixed inset-0 bg-[#00091b]/70 backdrop-blur-sm z-[110]"></div>
            <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[460px] bg-[#0c1e43]/90 border-l border-[#00417d]/30 shadow-2xl z-[120] flex flex-col transition-all duration-300 animate-fadeIn">
              <div className="p-5 border-b border-[#00417d]/30 flex justify-between items-center bg-[#00091b]/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#38a6e4]/10 rounded-xl text-[#38a6e4]">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">{selectedVehicle.model}</h3>
                    <span className="text-xs font-mono bg-[#09142d] text-slate-300 px-1.5 py-0.5 rounded font-bold border border-[#00417d]/30">{selectedVehicle.plateNumber}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedVehicle(null)} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-[#0c1e43] cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-5 space-y-6">
                
                {/* Documents list manager */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center pl-1">
                    <h4 className="text-xs font-extrabold text-[#94a3b8] uppercase tracking-wider">Документы Спецтехники (СТС/ПТС)</h4>
                    <button
                      onClick={() => {
                        setAttachmentTarget({ type: "vehicle", id: selectedVehicle.id });
                        setAttachmentForm({ name: "", type: "СТС", file: "" });
                        setAttachmentWizardOpen(true);
                      }}
                      className="px-2 py-0.5 bg-[#38a6e4]/10 hover:bg-[#38a6e4]/20 text-[#38a6e4] border border-[#38a6e4]/20 rounded text-[9px] font-black uppercase tracking-wider cursor-pointer"
                    >
                      Прикрепить
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedVehicle.documents?.map((doc, idx) => (
                      <div key={idx} className="p-3 bg-[#00091b]/60 border border-[#00417d]/30 rounded-xl flex items-center justify-between hover:border-[#38a6e4]/40 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-5 h-5 text-[#38a6e4]" />
                          <div>
                            <span className="block text-xs font-bold text-white">{doc.name}</span>
                            <span className="text-[10px] text-[#64748b] block font-mono">{doc.file}</span>
                          </div>
                        </div>
                        <button onClick={() => setActiveViewDoc(doc)} className="text-[10px] text-[#38a6e4] font-bold uppercase hover:underline cursor-pointer">Просмотр</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active driver */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-[#94a3b8] uppercase tracking-wider pl-1">Машинист на смене</h4>
                  <div className="p-4 bg-[#00091b]/60 border border-[#00417d]/30 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#38a6e4]/10 text-[#38a6e4] flex items-center justify-center font-extrabold text-xs border border-[#38a6e4]/20">
                        {driverPhoto}
                      </div>
                      <div>
                        <span className="block font-bold text-sm text-white">{driverName}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fuel gauge */}
                <div className="p-4 bg-[#00091b]/60 border border-[#00417d]/30 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-[#94a3b8] uppercase">
                    <span className="flex items-center gap-1"><Fuel className="w-4 h-4 text-[#38a6e4]" /> Датчик уровня бака</span>
                    <span className={fuelRemaining < 20 ? "text-red-500 font-extrabold" : "text-[#38a6e4]"}>{fuelRemaining.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#09142d] rounded-full overflow-hidden">
                    <div className={`h-full ${fuelRemaining < 20 ? "bg-red-500" : "bg-[#38a6e4]"}`} style={{ width: `${fuelRemaining}%` }}></div>
                  </div>
                  <div className="text-[11px] text-[#64748b] font-bold">Остаток бака: ~{fuelLitres} Л</div>
                </div>

                {/* Shift Details */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-[#94a3b8] uppercase tracking-wider pl-1">Метрики смены</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-[#00091b]/40 border border-[#00417d]/30 rounded-xl space-y-1">
                      <span className="text-[10px] text-[#64748b] font-bold block uppercase tracking-wider">Длительность</span>
                      <span className="text-sm font-extrabold text-white block tabular-nums">{shiftTime}</span>
                    </div>
                    <div className="p-3 bg-[#00091b]/40 border border-[#00417d]/30 rounded-xl space-y-1">
                      <span className="text-[10px] text-[#64748b] font-bold block uppercase tracking-wider">Дистанция</span>
                      <span className="text-sm font-extrabold text-white block tabular-nums">{distance.toFixed(1)} км</span>
                    </div>
                    <div className="p-3 bg-[#00091b]/40 border border-[#00417d]/30 rounded-xl space-y-1">
                      <span className="text-[10px] text-[#64748b] font-bold block uppercase tracking-wider">Расход</span>
                      <span className="text-sm font-extrabold text-white block tabular-nums">{consumptionRate} л/100км</span>
                    </div>
                    <div className="p-3 bg-[#00091b]/40 border border-[#00417d]/30 rounded-xl space-y-1">
                      <span className="text-[10px] text-[#64748b] font-bold block uppercase tracking-wider">Скорость</span>
                      <span className="text-sm font-extrabold text-white block tabular-nums">{speed} км/ч</span>
                    </div>
                  </div>
                </div>

                {/* Extended Profile Fields */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-[#94a3b8] uppercase tracking-wider pl-1">Технические характеристики и ОСАГО</h4>
                  <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-[#00091b]/50 border border-[#00417d]/30 rounded-xl text-xs">
                    <div>
                      <span className="block text-[9px] text-[#64748b] font-bold uppercase tracking-wider">Год выпуска</span>
                      <span className="font-extrabold text-white">{selectedVehicle.yearOfManufacture || "2021"} г.</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-[#64748b] font-bold uppercase tracking-wider">Ном. расход топлива</span>
                      <span className="font-extrabold text-white">{selectedVehicle.fuelConsumptionNominal || "28.5"} л/ч</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-[#64748b] font-bold uppercase tracking-wider">Мощность двигателя</span>
                      <span className="font-extrabold text-white">{selectedVehicle.enginePower || "168"} л.с.</span>
                    </div>
                    {selectedVehicle.carryingCapacity ? (
                      <div>
                        <span className="block text-[9px] text-[#64748b] font-bold uppercase tracking-wider">Грузоподъемность</span>
                        <span className="font-extrabold text-white">{selectedVehicle.carryingCapacity} т</span>
                      </div>
                    ) : null}
                    {selectedVehicle.boomLength ? (
                      <div>
                        <span className="block text-[9px] text-[#64748b] font-bold uppercase tracking-wider">Вылет стрелы</span>
                        <span className="font-extrabold text-white">{selectedVehicle.boomLength} м</span>
                      </div>
                    ) : null}
                    <div className="col-span-2 border-t border-[#00417d]/20 my-1"></div>
                    <div className="col-span-2">
                      <span className="block text-[9px] text-[#64748b] font-bold uppercase tracking-wider">Полис ОСАГО</span>
                      <span className="font-extrabold text-[#eab308] font-mono">{selectedVehicle.insuranceNumber || "ОСАГО №11223344"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-[9px] text-[#64748b] font-bold uppercase tracking-wider">Регистрационный номер ПТС</span>
                      <span className="font-extrabold text-white font-mono">{selectedVehicle.ptnNumber || "ПТС №77 КГ 90881"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-[9px] text-[#64748b] font-bold uppercase tracking-wider">Дата последнего ТО</span>
                      <span className="font-extrabold text-white font-mono">{selectedVehicle.lastServiceDate || "2026-04-10"}</span>
                    </div>
                  </div>
                </div>

                {/* Events Log */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-[#94a3b8] uppercase tracking-wider pl-1">Лог событий ТС</h4>
                  <div className="border border-[#00417d]/30 rounded-xl divide-y divide-[#334155] overflow-hidden bg-[#00091b]/40">
                    {events.map((ev, i) => (
                      <div key={i} className="p-3 text-xs font-semibold flex justify-between items-start gap-4 text-slate-300">
                        <span>{ev.text}</span>
                        <span className="text-[10px] text-[#64748b] shrink-0 font-mono">{ev.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div className="p-4 border-t border-[#00417d]/30 bg-[#00091b]/30 flex gap-2">
                <button onClick={() => setSelectedVehicle(null)} className="flex-1 h-11 bg-[#0c1e43] hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer">
                  Закрыть
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* V2 Slide-over Driver (Employee) Details Drawer */}
      {selectedDriver && (() => {
        return (
          <>
            <div onClick={() => setSelectedDriver(null)} className="fixed inset-0 bg-[#00091b]/70 backdrop-blur-sm z-[110]"></div>
            <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[460px] bg-[#0c1e43]/90 border-l border-[#00417d]/30 shadow-2xl z-[120] flex flex-col transition-all duration-300 animate-fadeIn">
              <div className="p-5 border-b border-[#00417d]/30 flex justify-between items-center bg-[#00091b]/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#38a6e4]/10 text-[#38a6e4] flex items-center justify-center font-extrabold text-sm border border-[#38a6e4]/20">
                    {selectedDriver.name.split(" ").map(w=>w[0]).join("")}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">{selectedDriver.name}</h3>
                    <span className="text-xs text-[#94a3b8] font-bold block mt-0.5">ВУ тракториста: {selectedDriver.licenseNumber}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedDriver(null)} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-[#0c1e43] cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-5 space-y-6">
                
                {/* Permits & Categories list */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-[#94a3b8] uppercase tracking-wider pl-1">Допуски к спецтехнике</h4>
                  <div className="flex flex-wrap gap-1.5 p-3.5 bg-[#00091b]/40 border border-[#00417d]/30 rounded-xl">
                    {selectedDriver.permitCategories?.map((cat, idx) => (
                      <span key={idx} className="text-xs bg-[#38a6e4]/15 text-[#38a6e4] border border-[#38a6e4]/20 px-3 py-1 rounded-full font-bold">
                        {cat}
                      </span>
                    )) || <span className="text-slate-400 text-xs">—</span>}
                  </div>
                </div>

                {/* Extended Employee Profile Fields */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-[#94a3b8] uppercase tracking-wider pl-1">Личное дело сотрудника</h4>
                  <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-[#00091b]/50 border border-[#00417d]/30 rounded-xl text-xs">
                    <div>
                      <span className="block text-[9px] text-[#64748b] font-bold uppercase tracking-wider">Дата рождения</span>
                      <span className="font-extrabold text-white">{selectedDriver.birthDate || "1988-06-12"}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-[#64748b] font-bold uppercase tracking-wider">Стаж работы</span>
                      <span className="font-extrabold text-white">{selectedDriver.experienceYears || "8"} лет</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-[#64748b] font-bold uppercase tracking-wider">Категории прав</span>
                      <span className="font-extrabold text-[#38a6e4] font-mono">{selectedDriver.licenseCategories || "B, C"}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-[#64748b] font-bold uppercase tracking-wider">Срок действия мед. справки</span>
                      <span className="font-extrabold text-white font-mono">{selectedDriver.medCertificateExpiry || "2027-10-15"}</span>
                    </div>
                    <div className="col-span-2 border-t border-[#00417d]/20 my-1"></div>
                    <div className="col-span-2">
                      <span className="block text-[9px] text-[#64748b] font-bold uppercase tracking-wider">Контакты телефона</span>
                      <span className="font-extrabold text-white font-mono">{selectedDriver.phone}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-[9px] text-[#64748b] font-bold uppercase tracking-wider">Специальные допуски и разрешения</span>
                      <span className="font-extrabold text-[#eab308]">{selectedDriver.specialPermits || "Стандартные допуски строительной спецтехники"}</span>
                    </div>
                  </div>
                </div>

                {/* Driver Document Manger */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center pl-1">
                    <h4 className="text-xs font-extrabold text-[#94a3b8] uppercase tracking-wider">Личные Документы сотрудника</h4>
                    <button
                      onClick={() => {
                        setAttachmentTarget({ type: "driver", id: selectedDriver.id });
                        setAttachmentForm({ name: "", type: "Водительское Удостоверение", file: "" });
                        setAttachmentWizardOpen(true);
                      }}
                      className="px-2 py-0.5 bg-[#38a6e4]/10 hover:bg-[#38a6e4]/20 text-[#38a6e4] border border-[#38a6e4]/20 rounded text-[9px] font-black uppercase tracking-wider cursor-pointer"
                    >
                      Прикрепить
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedDriver.documents?.map((doc, idx) => (
                      <div key={idx} className="p-3 bg-[#00091b]/60 border border-[#00417d]/30 rounded-xl flex items-center justify-between hover:border-[#38a6e4]/40 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-5 h-5 text-[#38a6e4]" />
                          <div>
                            <span className="block text-xs font-bold text-white">{doc.name}</span>
                            <span className="text-[10px] text-[#64748b] block font-mono">{doc.file}</span>
                          </div>
                        </div>
                        <button onClick={() => setActiveViewDoc(doc)} className="text-[10px] text-[#38a6e4] font-bold uppercase hover:underline cursor-pointer">Просмотр</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rate History Decrees Timeline (V2) */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-[#94a3b8] uppercase tracking-wider pl-1">История часовых ставок (Приказы)</h4>
                  <div className="p-4 bg-[#00091b]/60 border border-[#00417d]/30 rounded-xl space-y-3.5 relative">
                    {selectedDriver.rateHistory?.map((hist, idx) => (
                      <div key={idx} className="flex justify-between items-start gap-4 text-xs">
                        <div className="space-y-1">
                          <span className="block font-bold text-white text-xs">{hist.reason}</span>
                          <span className="text-[10px] text-[#64748b] block font-mono">{hist.date}</span>
                        </div>
                        <span className="text-[#eab308] font-extrabold text-sm whitespace-nowrap">{hist.rate} ₽/ч</span>
                      </div>
                    )) || <span className="text-slate-400 text-xs">—</span>}
                  </div>
                </div>

              </div>

              <div className="p-4 border-t border-[#00417d]/30 bg-[#00091b]/30 flex gap-2">
                <button onClick={() => setSelectedDriver(null)} className="flex-1 h-11 bg-[#0c1e43] hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer">
                  Закрыть
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* V2 Slide-over Object Details Drawer */}
      {selectedObject && (() => {
        return (
          <>
            <div onClick={() => setSelectedObject(null)} className="fixed inset-0 bg-[#00091b]/70 backdrop-blur-sm z-[110]"></div>
            <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[460px] bg-[#0c1e43]/90 border-l border-[#00417d]/30 shadow-2xl z-[120] flex flex-col transition-all duration-300 animate-fadeIn">
              <div className="p-5 border-b border-[#00417d]/30 flex justify-between items-center bg-[#00091b]/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#38a6e4]/10 rounded-xl text-[#38a6e4]">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">{selectedObject.name}</h3>
                    <span className="text-xs text-[#94a3b8] font-bold block mt-0.5">Координаты: {selectedObject.latitude.toFixed(4)}° N, {selectedObject.longitude.toFixed(4)}° E</span>
                  </div>
                </div>
                <button onClick={() => setSelectedObject(null)} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-[#0c1e43] cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-5 space-y-6">
                
                {/* Terrain difficulty info */}
                <div className="p-4 bg-[#00091b]/60 border border-[#00417d]/30 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase">Условия местности</span>
                  {selectedObject.difficultyType === "MOUNTAIN" ? (
                    <span className="bg-red-500/20 text-red-400 font-extrabold text-xs px-3 py-1 rounded-full border border-red-500/30 uppercase">
                      Горный сектор (надбавка 1.35x)
                    </span>
                  ) : (
                    <span className="bg-blue-500/10 text-blue-400 font-extrabold text-xs px-3 py-1 rounded-full border border-blue-500/20 uppercase">
                      Равнинный (стандарт 1.0x)
                    </span>
                  )}
                </div>

                {/* Assigned machinery and employees */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-[#94a3b8] uppercase tracking-wider pl-1">Активная спецтехника на объекте</h4>
                  <div className="p-4 bg-[#00091b]/40 border border-[#00417d]/30 rounded-xl space-y-3">
                    {selectedObject.id === "o2" ? (
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white">Кран Liebherr LTM 1050</span>
                        <span className="text-[#94a3b8]">Сергей Смирнов</span>
                      </div>
                    ) : selectedObject.id === "o1" && simActive && simObjectId === "o1" ? (
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white">Экскаватор CAT 320</span>
                        <span className="text-[#94a3b8]">{drivers.find(d=>d.id === simDriverId)?.name || "Иван Иванов"}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-[#64748b] block text-center">Спецтехника в смене отсутствует</span>
                    )}
                  </div>
                </div>

              </div>

              <div className="p-4 border-t border-[#00417d]/30 bg-[#00091b]/30 flex gap-2">
                <button onClick={() => setSelectedObject(null)} className="flex-1 h-11 bg-[#0c1e43] hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer">
                  Закрыть
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ATTACHMENT WIZARD MODAL */}
      {attachmentWizardOpen && (
        <div className="fixed inset-0 bg-[#00091b]/70 backdrop-blur-sm z-[130] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0c1e43]/90 rounded-2xl border border-[#00417d]/30 p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">
              Прикрепить документ
            </h3>
            <form onSubmit={handleAttachmentSubmit} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-slate-300 mb-1 font-bold">Название документа</label>
                <input
                  required
                  type="text"
                  value={attachmentForm.name}
                  onChange={(e) => setAttachmentForm({ ...attachmentForm, name: e.target.value })}
                  placeholder="e.g. Медицинская справка о прохождении комиссии"
                  className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-bold">Тип документа</label>
                {attachmentTarget?.type === "driver" ? (
                  <select
                    value={attachmentForm.type}
                    onChange={(e) => setAttachmentForm({ ...attachmentForm, type: e.target.value })}
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold cursor-pointer text-white"
                  >
                    <option value="Водительское Удостоверение">Водительское Удостоверение (ВУ)</option>
                    <option value="Медсправка">Медицинская Справка</option>
                    <option value="Лицензия">Допуск / Лицензия</option>
                    <option value="Другое">Другой документ</option>
                  </select>
                ) : (
                  <select
                    value={attachmentForm.type}
                    onChange={(e) => setAttachmentForm({ ...attachmentForm, type: e.target.value })}
                    className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold cursor-pointer text-white"
                  >
                    <option value="СТС">СТС спецтехники</option>
                    <option value="ПТС">ПТС спецтехники</option>
                    <option value="Ростехнадзор">Разрешение Ростехнадзора</option>
                    <option value="ОСАГО">Полис ОСАГО</option>
                    <option value="Другое">Другой документ</option>
                  </select>
                )}
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-bold">Имя файла (для симуляции загрузки)</label>
                <input
                  type="text"
                  value={attachmentForm.file}
                  onChange={(e) => setAttachmentForm({ ...attachmentForm, file: e.target.value })}
                  placeholder="e.g. med_inspection_2026.pdf"
                  className="w-full h-10 px-3 bg-[#00091b] border border-[#00417d]/30 rounded-lg focus:border-[#38a6e4] outline-none text-sm font-semibold text-white font-mono"
                />
                <span className="text-[10px] text-slate-400 block mt-1 font-medium font-sans">Оставьте пустым для автогенерации имени файла. Система симулирует безопасную загрузку на облачное хранилище.</span>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAttachmentWizardOpen(false)}
                  className="h-10 px-4 bg-[#0c1e43] hover:bg-slate-700 text-white rounded-lg transition-colors font-bold text-sm cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 bg-[#38a6e4] hover:bg-[#208bc9] text-white rounded-lg transition-colors font-bold text-sm cursor-pointer"
                >
                  Прикрепить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEWER POPUP MODAL */}
      {activeViewDoc && (
        <div className="fixed inset-0 bg-[#00091b]/80 backdrop-blur-md z-[140] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0c1e43]/95 rounded-2xl border border-[#00417d]/40 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[#00417d]/30 flex justify-between items-center bg-[#00091b]/50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#38a6e4]" />
                <div>
                  <h4 className="font-extrabold text-sm text-white">{activeViewDoc.name}</h4>
                  <span className="text-[10px] text-slate-400 block font-mono">{activeViewDoc.file}</span>
                </div>
              </div>
              <button 
                onClick={() => setActiveViewDoc(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-900/60 flex-grow flex items-center justify-center min-h-[350px]">
              {activeViewDoc.file.toLowerCase().endsWith(".png") || 
               activeViewDoc.file.toLowerCase().endsWith(".jpg") || 
               activeViewDoc.file.toLowerCase().endsWith(".jpeg") || 
               activeViewDoc.type === "Изображение" ? (
                <div className="relative group max-w-md w-full border-2 border-[#00417d]/20 rounded-xl overflow-hidden bg-slate-800 p-4 shadow-xl">
                  <div className="w-full aspect-[1.6] bg-gradient-to-br from-[#0c1e43] to-[#00091b] rounded-xl p-4 border border-[#38a6e4]/30 relative flex flex-col justify-between text-white overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#38a6e4]/5 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#eab308]/5 rounded-full blur-2xl"></div>
                    
                    <div className="flex justify-between items-start border-b border-[#3b82f6]/20 pb-2">
                      <div>
                        <span className="block text-[8px] font-black tracking-widest text-[#38a6e4] uppercase">Кыргызская Республика</span>
                        <span className="block text-xs font-black uppercase tracking-tight">Водительское Удостоверение</span>
                      </div>
                      <span className="text-[9px] font-black font-mono text-[#eab308]">KG 777 BSB</span>
                    </div>

                    <div className="flex gap-4 items-center my-auto">
                      <div className="w-16 h-20 rounded-lg border border-[#38a6e4]/20 bg-[#00091b] flex flex-col items-center justify-center shrink-0 relative overflow-hidden">
                        <Users className="w-8 h-8 text-[#38a6e4]/40" />
                        <span className="absolute bottom-1 text-[7px] font-bold text-center text-[#38a6e4] w-full uppercase font-mono bg-[#38a6e4]/10">PHOTO</span>
                      </div>
                      <div className="space-y-1 text-[10px]">
                        <div>
                          <span className="text-[8px] text-[#64748b] block font-bold uppercase">ФИО / Full Name</span>
                          <span className="font-extrabold uppercase text-white block">{activeViewDoc.name.includes("машинист") || activeViewDoc.name.includes("удостоверение") ? "ИВАНОВ ИВАН ИВАНОВИЧ" : "СМИРНОВ СЕРГЕЙ СЕРГЕЕВИЧ"}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          <div>
                            <span className="text-[7px] text-[#64748b] block font-bold uppercase">Категории</span>
                            <span className="font-bold font-mono block text-[#38a6e4]">B, C, D, E, F</span>
                          </div>
                          <div>
                            <span className="text-[7px] text-[#64748b] block font-bold uppercase">Срок действия</span>
                            <span className="font-bold font-mono block">31.12.2030</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[7px] text-slate-400 pt-1 border-t border-[#3b82f6]/10 font-bold uppercase">
                      <span>Департамент регистрации ТС</span>
                      <span className="text-[#eab308]">Лицензия действительна</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-xl w-full bg-white text-slate-800 rounded-xl p-8 shadow-2xl relative border-4 border-slate-200 min-h-[500px] flex flex-col justify-between font-sans">
                  <div className="absolute top-4 left-4 right-4 bottom-4 border border-dashed border-slate-300 pointer-events-none"></div>

                  <div className="flex justify-between items-center border-b border-slate-300 pb-4 relative z-10">
                    <div className="flex items-center gap-2">
                      <svg className="w-8 h-8 text-[#38a6e4]" viewBox="0 0 100 100" fill="currentColor">
                        <polygon points="50,10 12,90 40,90 50,68 60,90 88,90" fill="#00417D" />
                        <polygon points="5,82 95,25 90,15 0,72" fill="#38a6e4" />
                      </svg>
                      <div>
                        <span className="block font-black text-sm tracking-tight text-[#00417D]">AVANGARD STYLE</span>
                        <span className="block text-[8px] uppercase tracking-widest text-[#eab308] font-black -mt-0.5">Строительная Компания</span>
                      </div>
                    </div>
                    <div className="text-right text-[9px] font-bold text-slate-500 font-mono">
                      <span>Лицензионный отдел</span><br/>
                      <span>г. Бишкек, ул. Токтогула 125/1</span>
                    </div>
                  </div>

                  <div className="text-center my-6 relative z-10">
                    <h5 className="font-black uppercase tracking-wider text-[#00417D] text-sm">{activeViewDoc.name}</h5>
                    <span className="text-[10px] font-mono text-slate-500 block mt-1 font-bold">СЕРТИФИКАТ ВЕРИФИКАЦИИ № AS-{Math.floor(100000 + Math.random() * 900000)}</span>
                  </div>

                  <div className="text-xs space-y-4 relative z-10 flex-grow py-4 text-slate-700 font-semibold">
                    <p className="leading-relaxed">
                      Настоящим подтверждается, что данный документ зарегистрирован в едином реестре логистического и технического контроля спецтехники ОсОО «Авангард Стиль». Документ является действительным, прошёл все проверки на соответствие нормам безопасности труда и квалификации персонала.
                    </p>
                    
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200">
                        <div className="p-2.5 bg-slate-100/50 font-bold text-slate-500 uppercase text-[9px]">Параметр документа</div>
                        <div className="p-2.5 bg-slate-100/50 font-bold text-slate-500 uppercase text-[9px]">Значение реестра</div>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200">
                        <div className="p-2.5 font-bold">Идентификатор файла</div>
                        <div className="p-2.5 font-mono text-[10px]">{activeViewDoc.file}</div>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200">
                        <div className="p-2.5 font-bold">Классификационный тип</div>
                        <div className="p-2.5">{activeViewDoc.type || "СТС / Лицензионное Свидетельство"}</div>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-slate-200">
                        <div className="p-2.5 font-bold">Дата верификации</div>
                        <div className="p-2.5 font-mono">{new Date().toLocaleDateString("ru-RU")}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-slate-200 pt-6 mt-4 relative z-10">
                    <div className="text-[10px]">
                      <span className="block text-[8px] text-slate-500 uppercase font-bold">Ответственный орган</span>
                      <span className="font-extrabold text-[#00417D]">ОсОО «Авангард Стиль»</span>
                    </div>

                    <div className="absolute right-28 bottom-4 w-20 h-20 border-4 border-blue-500/30 rounded-full flex flex-col items-center justify-center text-[7px] font-black text-blue-500/40 uppercase rotate-12 pointer-events-none select-none tracking-tighter">
                      <div className="border border-dashed border-blue-500/20 w-[64px] h-[64px] rounded-full flex flex-col items-center justify-center text-center leading-none p-1">
                        <span>АВАНГАРД СТИЛЬ</span>
                        <span className="font-bold my-1 text-[5px] border-y border-blue-500/20 py-0.5">ОТДЕЛ КАДРОВ</span>
                        <span>БИШКЕК 2026</span>
                      </div>
                    </div>

                    <div className="text-right text-[10px] shrink-0 font-bold font-sans">
                      <span className="block text-[8px] text-slate-500 uppercase">Генеральный директор</span>
                      <span className="italic font-extrabold text-[#00417D] tracking-tight pr-2">Шеф-Инженер К.С. Асылбеков</span>
                      <span className="block text-[8px] text-slate-400 font-mono">Подписано ЭЦП AS-99</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#00417d]/30 bg-[#00091b]/50 flex justify-end gap-2.5">
              <button 
                onClick={() => setActiveViewDoc(null)}
                className="h-10 px-6 bg-[#0c1e43] hover:bg-slate-700 text-white rounded-lg transition-colors font-bold text-sm cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}
