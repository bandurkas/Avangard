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
  Download, 
  Navigation,
  RefreshCw,
  Info,
  Wallet,
  Coins,
  X,
  Clock,
  Activity,
  ShieldAlert
} from "lucide-react";

// Preset GPS routing path for simulator progression
const GEOLOCATION_PATH = [
  { lat: 55.7558, lng: 37.6173, label: "Депо А, Главное" },
  { lat: 55.7610, lng: 37.6205, label: "Трасса М4, 10 км" },
  { lat: 55.7675, lng: 37.6258, label: "Трасса М4, 25 км" },
  { lat: 55.7720, lng: 37.6310, label: "Трасса М4, 42 км" },
  { lat: 55.7788, lng: 37.6365, label: "Пост ГИБДД, Южный сектор" },
  { lat: 55.7825, lng: 37.6402, label: "Клиент 44" },
  { lat: 55.7860, lng: 37.6448, label: "Северная промзона" },
  { lat: 55.7915, lng: 37.6512, label: "Складской терминал B" },
  { lat: 55.7958, lng: 37.6558, label: "Депо Б, Северный сектор" }
];

interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  phone: string;
  status: string; // "ACTIVE" | "FREE" | "OFF"
}

interface Vehicle {
  id: string;
  model: string;
  plateNumber: string;
  vin: string;
  status: string; // "ACTIVE" | "MAINTENANCE" | "OUT_OF_SERVICE"
}

interface TimeLog {
  id: string;
  driverId: string;
  vehicleId: string;
  eventType: string; // "START" | "STOP"
  timestamp: string;
  latitude: number;
  longitude: number;
  driverName: string;
  vehicleModel: string;
  vehiclePlate: string;
}



function MainApp() {
  const [activeTab, setActiveTab] = useState<"overview" | "drivers" | "vehicles" | "payroll">("overview");

  const queryClient = useQueryClient();

  // Additional stats for Payroll and Vehicle Drawer
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);

  const [driverRates, setDriverRates] = useState<Record<string, number>>({
    d1: 800,
    d2: 850
  });

  const [driverAdjustments, setDriverAdjustments] = useState<Record<string, number>>({
    d1: 4500,
    d2: -2100
  });

  const [driverPaidStatuses, setDriverPaidStatuses] = useState<Record<string, "PAID" | "PENDING" | "PROCESSING">>({
    d1: "PAID",
    d2: "PENDING"
  });

  const [driverActiveHours, setDriverActiveHours] = useState<Record<string, number>>({
    d1: 142,
    d2: 158
  });

  const [driverIdleHours, setDriverIdleHours] = useState<Record<string, number>>({
    d1: 24,
    d2: 18
  });



  // Dynamic average fuel consumption calculation for active shifts
  const getAverageFuelConsumption = () => {
    let totalRate = 0;
    let count = 0;
    
    // Check if simulator is active
    if (simActive) {
      // Calculate realistic fuel rate based on current simFuel and simDistance
      const simRate = 31.8 + Math.sin(simSeconds / 10) * 0.4;
      totalRate += simRate;
      count++;
    }
    
    // Mock other active vehicle Sergey Smirnov driving Scania R450
    // Scania R450 consumes ~29.5 L/100km
    totalRate += 29.5 + Math.sin(Date.now() / 20000) * 0.2;
    count++;
    
    return (totalRate / count).toFixed(1);
  };

  const getDriverRate = (id: string) => driverRates[id] || 750;
  const getDriverAdjustment = (id: string) => driverAdjustments[id] || 0;
  const getDriverPaidStatus = (id: string) => driverPaidStatuses[id] || "PENDING";
  
  const getDriverActiveHours = (id: string) => {
    if (id === simDriverId && simActive) {
      const liveHours = simSeconds / 3600;
      return (driverActiveHours[id] || 0) + liveHours;
    }
    return driverActiveHours[id] || 0;
  };
  
  const getDriverIdleHours = (id: string) => {
    if (id === simDriverId && simActive) {
      const liveIdle = (simSeconds * 0.2) / 3600;
      return (driverIdleHours[id] || 0) + liveIdle;
    }
    return driverIdleHours[id] || 0;
  };

  const handlePayDriver = (id: string, name: string, amount: number) => {
    setDriverPaidStatuses(prev => ({ ...prev, [id]: "PROCESSING" }));
    setTimeout(() => {
      setDriverPaidStatuses(prev => ({ ...prev, [id]: "PAID" }));
      showNotification(`Успешно выплачено ${Math.round(amount).toLocaleString("ru-RU")} ₽ водителю ${name}!`, "success");
    }, 1200);
  };

  // Core Data via React Query
  const { data: drivers = [] } = useQuery<Driver[]>({ queryKey: ['drivers'], queryFn: api.getDrivers });
  const { data: vehicles = [] } = useQuery<Vehicle[]>({ queryKey: ['vehicles'], queryFn: api.getVehicles });
  const { data: timeLogs = [] } = useQuery<TimeLog[]>({ queryKey: ['timeLogs'], queryFn: api.getTimeLogs });

  const createDriverMutation = useMutation({ mutationFn: api.createDriver, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }) });
  const updateDriverMutation = useMutation({ mutationFn: (params: {id: string, data: any}) => api.updateDriver(params.id, params.data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }) });
  const deleteDriverMutation = useMutation({ mutationFn: api.deleteDriver, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }) });

  const createVehicleMutation = useMutation({ mutationFn: api.createVehicle, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }) });
  const updateVehicleMutation = useMutation({ mutationFn: (params: {id: string, data: any}) => api.updateVehicle(params.id, params.data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }) });
  const deleteVehicleMutation = useMutation({ mutationFn: api.deleteVehicle, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }) });

  const createTimeLogMutation = useMutation({ mutationFn: api.createTimeLog, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timeLogs'] }) });

  // Automatically initialize stats for newly added drivers
  useEffect(() => {
    drivers.forEach(d => {
      if (driverRates[d.id] === undefined) {
        setDriverRates(prev => ({ ...prev, [d.id]: 750 }));
        setDriverAdjustments(prev => ({ ...prev, [d.id]: 0 }));
        setDriverPaidStatuses(prev => ({ ...prev, [d.id]: "PENDING" }));
        setDriverActiveHours(prev => ({ ...prev, [d.id]: 0 }));
        setDriverIdleHours(prev => ({ ...prev, [d.id]: 0 }));
      }
    });
  }, [drivers]);

  // Search & Filter State
  const [driverSearch, setDriverSearch] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");

  // CRUD Modals State
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [driverForm, setDriverForm] = useState({ name: "", licenseNumber: "", phone: "", status: "FREE" });

  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState({ model: "", plateNumber: "", vin: "", status: "ACTIVE" });

  // Notification state
  const [alertMsg, setAlertMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Mobile App Simulator State
  const [simDriverId, setSimDriverId] = useState("");
  const [simVehicleId, setSimVehicleId] = useState("");
  const [simActive, setSimActive] = useState(false);
  const [simSeconds, setSimSeconds] = useState(0);
  const [simPathIndex, setSimPathIndex] = useState(0);
  const [simHistory, setSimHistory] = useState<any[]>([]);
  const [simStatusText, setSimStatusText] = useState("СМЕНА НЕ НАЧАТА");
  const [simFuel, setSimFuel] = useState(100);
  const [simDistance, setSimDistance] = useState(0);

  const timerRef = useRef<any>(null);
  const pathIntervalRef = useRef<any>(null);

  // Sync mobile simulator history card list when simDriverId changes
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
    } else {
      setSimHistory([]);
    }
  }, [simDriverId, timeLogs]);

  // Handle shift simulator path steps and timers
  useEffect(() => {
    if (simActive) {
      setSimStatusText("СМЕНА АКТИВНА");
      timerRef.current = setInterval(() => {
        setSimSeconds(prev => prev + 1);
        setSimFuel(prev => Math.max(0, prev - (0.01 + Math.random() * 0.02))); // slow burn
      }, 1000);

      pathIntervalRef.current = setInterval(() => {
        setSimPathIndex(prev => (prev + 1) % GEOLOCATION_PATH.length);
        setSimDistance(prev => prev + 2.5 + Math.random() * 0.5); // distance increase
      }, 7000); 
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pathIntervalRef.current) clearInterval(pathIntervalRef.current);
      setSimStatusText(simSeconds > 0 ? "СМЕНА ЗАВЕРШЕНА" : "СМЕНА НЕ НАЧАТА");
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pathIntervalRef.current) clearInterval(pathIntervalRef.current);
    };
  }, [simActive]);

  const showNotification = (text: string, type: "success" | "error") => {
    setAlertMsg({ text, type });
    setTimeout(() => setAlertMsg(null), 3000);
  };

  // Driver CRUD operations
  const handleDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDriver) {
      updateDriverMutation.mutate({ id: editingDriver.id, data: driverForm });
      showNotification("Водитель успешно обновлен!", "success");
    } else {
      createDriverMutation.mutate(driverForm);
      showNotification("Водитель добавлен!", "success");
    }
    setDriverModalOpen(false);
    setEditingDriver(null);
    setDriverForm({ name: "", licenseNumber: "", phone: "", status: "FREE" });
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setDriverForm({
      name: driver.name,
      licenseNumber: driver.licenseNumber,
      phone: driver.phone,
      status: driver.status
    });
    setDriverModalOpen(true);
  };

  const handleDeleteDriver = (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить водителя?")) return;
    deleteDriverMutation.mutate(id);
    showNotification("Водитель удален!", "success");
  };

  // Vehicle CRUD operations
  const handleVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVehicle) {
      updateVehicleMutation.mutate({ id: editingVehicle.id, data: vehicleForm });
      showNotification("Транспорт обновлен!", "success");
    } else {
      createVehicleMutation.mutate(vehicleForm);
      showNotification("Транспорт добавлен!", "success");
    }
    setVehicleModalOpen(false);
    setEditingVehicle(null);
    setVehicleForm({ model: "", plateNumber: "", vin: "", status: "ACTIVE" });
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm({
      model: vehicle.model,
      plateNumber: vehicle.plateNumber,
      vin: vehicle.vin,
      status: vehicle.status
    });
    setVehicleModalOpen(true);
  };

  const handleDeleteVehicle = (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить транспорт?")) return;
    deleteVehicleMutation.mutate(id);
    showNotification("Транспорт удален!", "success");
  };

  // Mobile App Shift Toggle (START/STOP)
  const handleToggleShift = () => {
    if (!simDriverId || !simVehicleId) {
      showNotification("Выберите водителя и ТС в симуляторе!", "error");
      return;
    }

    const driver = drivers.find(d => d.id === simDriverId);
    const vehicle = vehicles.find(v => v.id === simVehicleId);
    if (!driver || !vehicle) return;

    const eventType = simActive ? "STOP" : "START";
    const currentLoc = GEOLOCATION_PATH[simPathIndex];

    // Vibrate feedback
    if (navigator.vibrate) {
      navigator.vibrate(60);
    }

    // Create New Log via Mutation
    createTimeLogMutation.mutate({
      driverId: simDriverId,
      vehicleId: simVehicleId,
      eventType,
      timestamp: new Date().toISOString(),
      latitude: currentLoc.lat,
      longitude: currentLoc.lng,
      driverName: driver.name,
      vehicleModel: vehicle.model,
      vehiclePlate: vehicle.plateNumber
    });

    // Update driver status in DB
    updateDriverMutation.mutate({
      id: simDriverId,
      data: { status: eventType === "START" ? "ACTIVE" : "FREE" }
    });

    if (!simActive) {
      setSimActive(true);
      setSimSeconds(0);
      setSimFuel(100);
      setSimDistance(0);
      showNotification("Смена начата!", "success");
    } else {
      setSimActive(false);
      showNotification("Смена завершена!", "success");
    }
  };

  const formatTimer = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600).toString().padStart(2, "0");
    const m = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, "0");
    const s = (totalSecs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // Search/Filters
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

  // Dynamic Statistics
  const activeDriversCount = drivers.filter(d => d.status === "ACTIVE").length;
  const onRouteVehiclesCount = drivers.filter(d => d.status === "ACTIVE").length;

  return (
    <div className="bg-[#fcf8fb] text-[#1b1b1d] font-sans min-h-screen flex flex-col lg:flex-row overflow-x-hidden w-full">
      
      {/* Dynamic Toast Alerts */}
      {alertMsg && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-2xl border text-white font-bold flex items-center gap-3 transition-all animate-bounce ${
          alertMsg.type === "success" ? "bg-[#34C759] border-[#34C759]" : "bg-[#ba1a1a] border-[#ba1a1a]"
        }`}>
          <Bell className="w-5 h-5" />
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* Dispatcher Workspace Dashboard Area (70% standard) */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 lg:max-w-[72%] w-full min-h-screen border-b lg:border-b-0 lg:border-r border-[#e4e2e4]">
        
        {/* Workspace Brand and Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#0058bc] text-white px-2 py-0.5 text-xs font-bold rounded">MVP PRO</span>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#0058bc]">Авангард</h1>
            </div>
            <p className="text-sm text-[#414755] mt-1 font-semibold">Центральный пульт управления автопарком • Автономный режим</p>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 border border-[#717786] bg-white text-[#1b1b1d] font-bold text-sm rounded-xl flex items-center gap-2 hover:bg-[#f6f3f5] transition-colors shadow-sm cursor-pointer">
              <Download className="w-4 h-4" />
              Экспорт
            </button>
            {(activeTab === "drivers" || activeTab === "vehicles") && (
              <button 
                onClick={() => {
                  if (activeTab === "drivers") {
                    setEditingDriver(null);
                    setDriverForm({ name: "", licenseNumber: "", phone: "", status: "FREE" });
                    setDriverModalOpen(true);
                  } else if (activeTab === "vehicles") {
                    setEditingVehicle(null);
                    setVehicleForm({ model: "", plateNumber: "", vin: "", status: "ACTIVE" });
                    setVehicleModalOpen(true);
                  }
                }}
                className="h-10 px-4 bg-[#0058bc] text-white font-bold text-sm rounded-xl flex items-center gap-2 hover:bg-[#0070eb] transition-all shadow-md cursor-pointer animate-fadeIn"
              >
                <Plus className="w-4 h-4" />
                {activeTab === "vehicles" ? "Добавить ТС" : "Добавить водителя"}
              </button>
            )}
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#e4e2e4] mb-6 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-3 font-bold text-sm tracking-wide transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === "overview"
                ? "border-[#0058bc] text-[#0058bc]"
                : "border-transparent text-[#414755] hover:text-[#1b1b1d]"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Панель управления
          </button>
          <button
            onClick={() => setActiveTab("drivers")}
            className={`px-6 py-3 font-bold text-sm tracking-wide transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === "drivers"
                ? "border-[#0058bc] text-[#0058bc]"
                : "border-transparent text-[#414755] hover:text-[#1b1b1d]"
            }`}
          >
            <Users className="w-4 h-4" />
            Водители
          </button>
          <button
            onClick={() => setActiveTab("vehicles")}
            className={`px-6 py-3 font-bold text-sm tracking-wide transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === "vehicles"
                ? "border-[#0058bc] text-[#0058bc]"
                : "border-transparent text-[#414755] hover:text-[#1b1b1d]"
            }`}
          >
            <Truck className="w-4 h-4" />
            Автопарк
          </button>
          <button
            onClick={() => setActiveTab("payroll")}
            className={`px-6 py-3 font-bold text-sm tracking-wide transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === "payroll"
                ? "border-[#0058bc] text-[#0058bc]"
                : "border-transparent text-[#414755] hover:text-[#1b1b1d]"
            }`}
          >
            <Wallet className="w-4 h-4" />
            Расчеты (Payroll)
          </button>
        </div>

        {/* Dashboard Overview Content */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Card 1 */}
              <div className="bg-[#f0edef] border border-[#e4e2e4] rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-white rounded-lg border border-[#e4e2e4] text-[#0058bc]">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[#34C759] font-bold text-xs bg-[#34C759]/10 px-2 py-0.5 rounded-full">
                    +{drivers.length} водителей
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[#414755] font-bold uppercase tracking-wider mb-1">Активные водители</p>
                  <h3 className="text-3xl font-extrabold tracking-tight">{activeDriversCount} / {drivers.length}</h3>
                </div>
              </div>
              {/* Card 2 */}
              <div className="bg-[#f0edef] border border-[#e4e2e4] rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-white rounded-lg border border-[#e4e2e4] text-[#0058bc]">
                    <Truck className="w-5 h-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[#414755] font-bold text-xs bg-[#e4e2e4] px-2 py-0.5 rounded-full">
                    Всего {vehicles.length} ТС
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[#414755] font-bold uppercase tracking-wider mb-1">Транспорта в рейсе</p>
                  <h3 className="text-3xl font-extrabold tracking-tight">{onRouteVehiclesCount}</h3>
                </div>
              </div>
              {/* Card 3 */}
              <div className="bg-[#f0edef] border border-[#e4e2e4] rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-white rounded-lg border border-[#e4e2e4] text-[#0058bc]">
                    <Fuel className="w-5 h-5" />
                  </div>
                  <div className="w-16 h-8 bg-white border border-[#e4e2e4] rounded flex items-end justify-between px-1 pb-1">
                    <div className="w-1.5 h-3 bg-[#adc6ff] rounded-t-sm"></div>
                    <div className="w-1.5 h-4 bg-[#adc6ff] rounded-t-sm"></div>
                    <div className="w-1.5 h-2 bg-[#adc6ff] rounded-t-sm"></div>
                    <div className="w-1.5 h-5 bg-[#adc6ff] rounded-t-sm"></div>
                    <div className="w-1.5 h-6 bg-[#0058bc] rounded-t-sm animate-pulse"></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-[#414755] font-bold uppercase tracking-wider mb-1">Ср. расход топлива</p>
                    <div className="group/tooltip relative cursor-pointer text-[#8e8e93] hover:text-[#0058bc]">
                      <Info className="w-3.5 h-3.5" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#1b1b1d] text-white text-[10px] font-semibold rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 text-center leading-normal">
                        Агрегированный средний расход топлива по всем ТС на линии
                      </div>
                    </div>
                  </div>
                  <h3 className="text-3xl font-extrabold tracking-tight">
                    {getAverageFuelConsumption()} <span className="text-sm font-normal text-[#414755]">л/100км</span>
                  </h3>
                </div>
              </div>
              {/* Card 4 */}
              <div className="bg-[#f0edef] border border-[#FF9500]/30 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute inset-0 bg-[#FF9500]/5 pointer-events-none"></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-[#FF9500]/10 rounded-lg border border-[#FF9500]/20 text-[#FF9500]">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[#FF9500] font-bold text-xs bg-[#FF9500]/10 px-2 py-0.5 rounded-full">
                    Внимание
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[#414755] font-bold uppercase tracking-wider mb-1">Ожидает ТО</p>
                  <h3 className="text-3xl font-extrabold tracking-tight text-[#1b1b1d]">1</h3>
                </div>
              </div>
            </div>

            {/* Simulated Live Fleet Map and Events Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Map Canvas Card */}
              <div className="lg:col-span-2 bg-[#f0edef] border border-[#e4e2e4] rounded-xl overflow-hidden flex flex-col h-[420px]">
                <div className="p-4 border-b border-[#e4e2e4] bg-white flex justify-between items-center">
                  <h3 className="font-bold text-sm tracking-wide text-[#1b1b1d]">Карта автопарка</h3>
                  <div className="flex items-center gap-1.5 text-[#34C759] text-xs font-bold bg-[#34C759]/10 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-[#34C759] rounded-full animate-ping"></span>
                    <span>Спутниковый радар LIVE</span>
                  </div>
                </div>
                
                <div className="relative flex-grow bg-[#dcd9dc] overflow-hidden flex items-center justify-center">
                  
                  {/* Grid Lines */}
                  <div className="absolute inset-0 bg-[radial-gradient(#adc6ff_1px,transparent_1px)] [background-size:16px_16px] opacity-35"></div>
                  
                  {/* Decorative Highways */}
                  <svg className="absolute inset-0 w-full h-full text-[#717786] opacity-30 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 0 100 Q 150 150 300 100 T 600 100" fill="none" stroke="currentColor" strokeWidth="6" />
                    <path d="M 100 0 C 150 200 80 300 200 400" fill="none" stroke="currentColor" strokeWidth="4" />
                    <path d="M 0 350 L 600 250" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
                  </svg>

                  {/* Active Live Driver Indicator */}
                  {simActive && (
                    <div 
                      onClick={() => {
                        const v = vehicles.find(vh => vh.id === simVehicleId);
                        if (v) setSelectedVehicle(v);
                      }}
                      className="absolute z-30 flex flex-col items-center transition-all duration-1000 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                      style={{
                        top: `${30 + (simPathIndex * 7)}%`,
                        left: `${20 + (simPathIndex * 8)}%`
                      }}
                    >
                      <span className="bg-[#0058bc] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1 mb-1 border border-white">
                        <Navigation className="w-2.5 h-2.5 animate-spin" />
                        Рейс в симуляторе
                      </span>
                      <div className="relative">
                        <span className="absolute -inset-2.5 rounded-full bg-[#0058bc]/35 animate-ping"></span>
                        <div className="w-4.5 h-4.5 rounded-full bg-[#0058bc] border-2 border-white shadow flex items-center justify-center"></div>
                      </div>
                    </div>
                  )}

                  {/* Static Mock Markers */}
                  <div 
                    onClick={() => {
                      const v = vehicles.find(vh => vh.id === "v1") || vehicles[0];
                      if (v) setSelectedVehicle(v);
                    }}
                    className="absolute top-[45%] left-[25%] flex flex-col items-center cursor-pointer hover:scale-110 active:scale-95 transition-transform z-20"
                  >
                    <span className="bg-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md text-[#1b1b1d] mb-1 hover:bg-[#0058bc] hover:text-white transition-colors">ГРУЗ-402 (КАМАЗ)</span>
                    <div className="w-3.5 h-3.5 rounded-full bg-[#34C759] border-2 border-white shadow"></div>
                  </div>
                  <div 
                    onClick={() => {
                      const v = vehicles.find(vh => vh.id === "v3") || vehicles[1];
                      if (v) setSelectedVehicle(v);
                    }}
                    className="absolute top-[25%] left-[75%] flex flex-col items-center cursor-pointer hover:scale-110 active:scale-95 transition-transform z-20"
                  >
                    <span className="bg-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md text-[#1b1b1d] mb-1 hover:bg-[#0058bc] hover:text-white transition-colors">ФУР-092 (Scania)</span>
                    <div className="w-3.5 h-3.5 rounded-full bg-[#34C759] border-2 border-white shadow"></div>
                  </div>
                  <div 
                    onClick={() => {
                      const v = vehicles.find(vh => vh.id === "v1") || vehicles[0];
                      if (v) setSelectedVehicle(v);
                    }}
                    className="absolute top-[70%] left-[65%] flex flex-col items-center cursor-pointer hover:scale-110 active:scale-95 transition-transform z-20"
                  >
                    <span className="bg-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md text-[#1b1b1d] mb-1 hover:bg-red-600 hover:text-white transition-colors">ФУР-118</span>
                    <div className="w-3.5 h-3.5 rounded-full bg-[#ba1a1a] border-2 border-white shadow"></div>
                  </div>

                  {/* Legend */}
                  <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm border border-[#e4e2e4] rounded-lg p-2.5 shadow-md flex gap-4 text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#34C759]"></div>
                      <span>В движении</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FF9500]"></div>
                      <span>Ожидание</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]"></div>
                      <span>Остановлен</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Maintenance Notifications Feed */}
              <div className="bg-[#f0edef] border border-[#e4e2e4] rounded-xl flex flex-col h-[420px]">
                <div className="p-4 border-b border-[#e4e2e4] bg-white flex justify-between items-center">
                  <div className="flex items-center gap-2 text-[#FF9500]">
                    <Wrench className="w-4 h-4" />
                    <h3 className="font-bold text-sm tracking-wide text-[#1b1b1d]">Уведомления системы</h3>
                  </div>
                  <span className="bg-[#FF9500] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">1 Внимание</span>
                </div>
                
                <div className="flex-grow p-3 flex flex-col gap-3 overflow-y-auto bg-white">
                  {/* Alert 1 */}
                  <div className="p-3 border border-[#FF9500]/20 bg-[#FF9500]/5 rounded-lg flex gap-3 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF9500]"></div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-extrabold text-[#FF9500]">Lada Largus (К147МР 77)</h4>
                        <span className="text-[10px] text-[#8e8e93]">1ч назад</span>
                      </div>
                      <p className="text-xs text-[#414755] mt-1 font-semibold leading-tight">Запланировано техническое обслуживание (ТО-2).</p>
                      <button className="mt-2 text-[#FF9500] text-[10px] font-bold uppercase hover:underline">Подробнее</button>
                    </div>
                  </div>
                  
                  <div className="p-4 border border-dashed border-[#e4e2e4] rounded-xl flex flex-col items-center justify-center text-center text-[#8e8e93] h-full">
                    <Info className="w-8 h-8 mb-2 text-[#717786]" />
                    <span className="text-xs font-semibold">Новых критических инцидентов не зафиксировано.</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Recent Events Log Table */}
            <div className="bg-[#f0edef] border border-[#e4e2e4] rounded-xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-[#e4e2e4] bg-white flex justify-between items-center">
                <h3 className="font-bold text-sm tracking-wide text-[#1b1b1d]">Последние события смен (Start/Stop)</h3>
                <span className="text-xs text-[#0058bc] font-bold flex items-center gap-1.5 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Мгновенная реактивная синхронизация
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="border-b border-[#e4e2e4] bg-[#f6f3f5] text-[#414755] text-[11px] font-bold uppercase tracking-wider">
                      <th className="p-4">Водитель</th>
                      <th className="p-4">Транспортное Средство</th>
                      <th className="p-4">Событие</th>
                      <th className="p-4">Время события</th>
                      <th className="p-4">GPS Локация</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4e2e4] text-xs font-semibold">
                    {timeLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-[#8e8e93]">Событий не обнаружено. Перейдите к симулятору водителя справа и запустите смену!</td>
                      </tr>
                    ) : (
                      timeLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#f6f3f5] transition-colors">
                          <td className="p-4 font-bold text-[#1b1b1d] flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#0058bc]/10 text-[#0058bc] flex items-center justify-center font-extrabold text-[10px]">
                              {log.driverName?.split(" ").map(w=>w[0]).join("")}
                            </div>
                            {log.driverName}
                          </td>
                          <td className="p-4 text-[#414755]">{log.vehicleModel} ({log.vehiclePlate})</td>
                          <td className="p-4">
                            {log.eventType === "START" ? (
                              <span className="inline-flex items-center gap-1 text-[#34C759] font-bold bg-[#34C759]/10 px-2 py-0.5 rounded-md text-[10px] uppercase">
                                <Play className="w-2.5 h-2.5 fill-current" />
                                Старт смены
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[#ba1a1a] font-bold bg-[#ba1a1a]/10 px-2 py-0.5 rounded-md text-[10px] uppercase">
                                <Square className="w-2.5 h-2.5 fill-current" />
                                Стоп смены
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-[#414755]">
                            {new Date(log.timestamp).toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit"
                            })}
                          </td>
                          <td className="p-4 text-[#8e8e93] font-mono">{log.latitude.toFixed(4)}° N, {log.longitude.toFixed(4)}° E</td>
                        </tr>
                      ))
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
            <div className="bg-[#f0edef] border border-[#e4e2e4] rounded-xl p-3 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#717786] w-4 h-4" />
                <input 
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 bg-white rounded border border-[#e4e2e4] focus:border-[#0058bc] text-sm outline-none font-medium placeholder:text-[#8e8e93]" 
                  placeholder="Поиск по ФИО, ВУ..." 
                  type="text"
                />
              </div>
              <div className="flex gap-2">
                <select 
                  value={driverFilter}
                  onChange={(e) => setDriverFilter(e.target.value)}
                  className="h-10 px-4 bg-white rounded border border-[#e4e2e4] focus:border-[#0058bc] text-sm font-bold outline-none min-w-[140px] cursor-pointer"
                >
                  <option value="">Все статусы</option>
                  <option value="active">В рейсе</option>
                  <option value="free">Свободен</option>
                  <option value="off">Вне смены</option>
                </select>
              </div>
            </div>

            {/* Drivers List */}
            <div className="bg-white rounded-xl border border-[#e4e2e4] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#e4e2e4] bg-[#f6f3f5] text-[#414755] text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">ФИО Водителя</th>
                      <th className="p-4">Номер удостоверения</th>
                      <th className="p-4">Телефон</th>
                      <th className="p-4">Статус</th>
                      <th className="p-4 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-bold text-[#1b1b1d] divide-y divide-[#e4e2e4]">
                    {filteredDrivers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-[#8e8e93]">Водители не найдены. Добавьте нового!</td>
                      </tr>
                    ) : (
                      filteredDrivers.map(d => (
                        <tr key={d.id} className="hover:bg-[#f6f3f5] transition-colors">
                          <td className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#0058bc]/10 text-[#0058bc] border border-[#e4e2e4] flex items-center justify-center font-extrabold text-sm">
                              {d.name.split(" ").map(w=>w[0]).join("")}
                            </div>
                            <div>
                              <div className="font-bold text-[#1b1b1d]">{d.name}</div>
                              <div className="md:hidden text-xs text-[#8e8e93] mt-0.5">ВУ: {d.licenseNumber}</div>
                            </div>
                          </td>
                          <td className="p-4 text-[#414755]">{d.licenseNumber}</td>
                          <td className="p-4 text-[#414755]">{d.phone || "—"}</td>
                          <td className="p-4">
                            {d.status === "ACTIVE" ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#E5F2FF] text-[#0058bc] text-xs font-bold">
                                В рейсе
                              </span>
                            ) : d.status === "FREE" ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#E8F8EE] text-[#34C759] text-xs font-bold">
                                Свободен
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#f6f3f5] text-[#8e8e93] text-xs font-bold border border-[#e4e2e4]">
                                Вне смены
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button 
                                onClick={() => handleEditDriver(d)}
                                className="p-2 text-[#717786] hover:text-[#0058bc] hover:bg-[#f6f3f5] transition-colors rounded-full cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteDriver(d.id)}
                                className="p-2 text-[#717786] hover:text-[#ba1a1a] hover:bg-[#ba1a1a]/10 transition-colors rounded-full cursor-pointer"
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
            <div className="bg-[#f0edef] border border-[#e4e2e4] rounded-xl p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#717786] w-4 h-4" />
                <input 
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 bg-white rounded border border-[#e4e2e4] focus:border-[#0058bc] text-sm outline-none font-medium placeholder:text-[#8e8e93]" 
                  placeholder="Поиск по модели, госномеру..." 
                  type="text"
                />
              </div>
            </div>

            {/* Vehicles List */}
            <div className="bg-white rounded-xl border border-[#e4e2e4] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#e4e2e4] bg-[#f6f3f5] text-[#414755] text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">Транспортное средство</th>
                      <th className="p-4">Госномер</th>
                      <th className="p-4">VIN код</th>
                      <th className="p-4">Статус ТС</th>
                      <th className="p-4 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-bold text-[#1b1b1d] divide-y divide-[#e4e2e4]">
                    {filteredVehicles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-[#8e8e93]">ТС не найдено. Создайте новый!</td>
                      </tr>
                    ) : (
                      filteredVehicles.map(v => (
                        <tr key={v.id} className="hover:bg-[#f6f3f5] transition-colors">
                          <td className="p-4 font-bold text-[#1b1b1d] flex items-center gap-2">
                            <button 
                              onClick={() => setSelectedVehicle(v)}
                              className="font-bold text-[#1b1b1d] hover:text-[#0058bc] transition-colors flex items-center gap-2 text-left cursor-pointer"
                            >
                              <Truck className="w-4 h-4 text-[#0058bc]" />
                              {v.model}
                            </button>
                          </td>
                          <td className="p-4 text-[#414755] font-mono">{v.plateNumber}</td>
                          <td className="p-4 text-[#414755] font-mono text-xs">{v.vin}</td>
                          <td className="p-4">
                            {v.status === "ACTIVE" ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#E8F8EE] text-[#34C759] text-xs font-bold">
                                Активен
                              </span>
                            ) : v.status === "MAINTENANCE" ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#FF9500]/10 text-[#FF9500] text-xs font-bold border border-[#FF9500]/20">
                                В ремонте
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#f6f3f5] text-[#8e8e93] text-xs font-bold border border-[#e4e2e4]">
                                Списан
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button 
                                onClick={() => handleEditVehicle(v)}
                                className="p-2 text-[#717786] hover:text-[#0058bc] hover:bg-[#f6f3f5] transition-colors rounded-full cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteVehicle(v.id)}
                                className="p-2 text-[#717786] hover:text-[#ba1a1a] hover:bg-[#ba1a1a]/10 transition-colors rounded-full cursor-pointer"
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

        {/* Smart Payroll Tab View */}
        {activeTab === "payroll" && (() => {
          // Sum up metrics for analytics cards
          let totalHours = 0;
          let totalAdjustments = 0;
          let totalPayroll = 0;
          let ratesSum = 0;
          
          drivers.forEach(d => {
            const actH = getDriverActiveHours(d.id);
            const idlH = getDriverIdleHours(d.id);
            const rate = getDriverRate(d.id);
            const adj = getDriverAdjustment(d.id);
            const payout = (actH * rate) + (idlH * rate * 0.5) + adj;
            
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
                <div className="bg-[#f0edef] border border-[#e4e2e4] rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white rounded-lg border border-[#e4e2e4] text-[#0058bc]">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[#34C759] font-bold text-xs bg-[#34C759]/10 px-2 py-0.5 rounded-full">
                      ФОТ Активен
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-[#414755] font-bold uppercase tracking-wider mb-1">Фонд оплаты (ФОТ)</p>
                    <h3 className="text-3xl font-extrabold tracking-tight">
                      {Math.round(totalPayroll).toLocaleString("ru-RU")} <span className="text-sm font-normal text-[#414755]">₽</span>
                    </h3>
                  </div>
                </div>

                {/* Avg Driver Hourly Rate */}
                <div className="bg-[#f0edef] border border-[#e4e2e4] rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white rounded-lg border border-[#e4e2e4] text-[#0058bc]">
                      <Coins className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[#414755] font-bold text-xs bg-[#e4e2e4] px-2 py-0.5 rounded-full">
                      Средняя
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-[#414755] font-bold uppercase tracking-wider mb-1">Средняя ставка</p>
                    <h3 className="text-3xl font-extrabold tracking-tight">
                      {avgRate} <span className="text-sm font-normal text-[#414755]">₽/ч</span>
                    </h3>
                  </div>
                </div>

                {/* Total Fleet Route Hours */}
                <div className="bg-[#f0edef] border border-[#e4e2e4] rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white rounded-lg border border-[#e4e2e4] text-[#0058bc]">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[#0058bc] font-bold text-xs bg-[#0058bc]/10 px-2 py-0.5 rounded-full">
                      +{drivers.filter(d=>d.status === "ACTIVE").length} на линии
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-[#414755] font-bold uppercase tracking-wider mb-1">Всего отработано</p>
                    <h3 className="text-3xl font-extrabold tracking-tight">
                      {Math.round(totalHours)} <span className="text-sm font-normal text-[#414755]">ч</span>
                    </h3>
                  </div>
                </div>

                {/* Adjustments Fuel Saving/Loss */}
                <div className="bg-[#f0edef] border border-[#e4e2e4] rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white rounded-lg border border-[#e4e2e4] text-[#FF9500]">
                      <Fuel className="w-5 h-5" />
                    </div>
                    <span className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-full ${
                      totalAdjustments >= 0 ? "text-[#34C759] bg-[#34C759]/10" : "text-[#ba1a1a] bg-[#ba1a1a]/10"
                    }`}>
                      {totalAdjustments >= 0 ? "Экономия" : "Перерасход"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-[#414755] font-bold uppercase tracking-wider mb-1">Корректировки ГСМ</p>
                    <h3 className="text-3xl font-extrabold tracking-tight">
                      {totalAdjustments >= 0 ? "+" : ""}{totalAdjustments.toLocaleString("ru-RU")} <span className="text-sm font-normal text-[#414755]">₽</span>
                    </h3>
                  </div>
                </div>

              </div>

              {/* Billing Period and Excel Export */}
              <div className="bg-[#f0edef] border border-[#e4e2e4] rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <span className="text-xs font-bold text-[#414755] uppercase tracking-wider">Период расчета:</span>
                  <select className="h-9 px-3 bg-white rounded-lg border border-[#e4e2e4] focus:border-[#0058bc] text-xs font-bold outline-none cursor-pointer bg-white">
                    <option>Май 2026 (Текущий)</option>
                    <option>Апрель 2026</option>
                    <option>Март 2026</option>
                  </select>
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <button className="h-9 px-4 border border-[#e4e2e4] bg-white text-[#1b1b1d] font-bold text-xs rounded-lg flex items-center gap-2 hover:bg-[#f6f3f5] transition-colors cursor-pointer shadow-sm">
                    <Download className="w-4 h-4" />
                    Скачать ведомость (XLSX)
                  </button>
                </div>
              </div>

              {/* Spreadsheet Billing Table */}
              <div className="bg-white rounded-xl border border-[#e4e2e4] overflow-hidden">
                <div className="p-4 border-b border-[#e4e2e4] bg-[#fcf8fb] flex justify-between items-center">
                  <h3 className="font-extrabold text-sm tracking-wide text-[#1b1b1d]">Детализированный расчет зарплаты водителей</h3>
                  <span className="text-[10px] font-extrabold bg-[#0058bc]/10 text-[#0058bc] px-2.5 py-1 rounded-full uppercase tracking-wide">
                    Учет корректировок в реальном времени
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse bg-white">
                    <thead>
                      <tr className="border-b border-[#e4e2e4] bg-[#f6f3f5] text-[#414755] text-[11px] font-extrabold uppercase tracking-wider">
                        <th className="p-4">Водитель</th>
                        <th className="p-4">Активное ТС</th>
                        <th className="p-4">В движении (ч)</th>
                        <th className="p-4">Простой (ч)</th>
                        <th className="p-4">Ставка (₽/ч)</th>
                        <th className="p-4">Коррекция ГСМ (₽)</th>
                        <th className="p-4">Итого к выплате</th>
                        <th className="p-4">Статус</th>
                        <th className="p-4 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e4e2e4] text-xs font-semibold">
                      {drivers.map(d => {
                        const actH = getDriverActiveHours(d.id);
                        const idlH = getDriverIdleHours(d.id);
                        const rate = getDriverRate(d.id);
                        const adj = getDriverAdjustment(d.id);
                        const status = getDriverPaidStatus(d.id);
                        
                        const payout = (actH * rate) + (idlH * rate * 0.5) + adj;

                        // Find driver's active vehicle
                        const activeLog = timeLogs.find(l => l.driverId === d.id && l.eventType === "START");
                        const activeVehicleModel = activeLog ? activeLog.vehicleModel : "—";
                        const activeVehiclePlate = activeLog ? activeLog.vehiclePlate : "";

                        return (
                          <tr key={d.id} className="hover:bg-[#f6f3f5] transition-colors">
                            <td className="p-4 font-bold text-[#1b1b1d] flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#0058bc]/10 text-[#0058bc] flex items-center justify-center font-extrabold text-[10px]">
                                {d.name.split(" ").map(w=>w[0]).join("")}
                              </div>
                              {d.name}
                            </td>
                            <td className="p-4 text-[#414755]">
                              {activeVehicleModel} {activeVehiclePlate && `(${activeVehiclePlate})`}
                            </td>
                            <td className="p-4 text-[#1b1b1d] tabular-nums font-bold">{actH.toFixed(1)}</td>
                            <td className="p-4 text-[#414755] tabular-nums">{idlH.toFixed(1)}</td>
                            <td className="p-4 text-[#1b1b1d] tabular-nums">
                              <input 
                                type="number" 
                                value={rate}
                                onChange={(e) => setDriverRates(prev => ({ ...prev, [d.id]: Number(e.target.value) }))}
                                className="w-16 h-7 bg-[#f6f3f5] border border-[#e4e2e4] rounded px-1.5 font-bold text-[#1b1b1d] text-center focus:border-[#0058bc] outline-none"
                              />
                            </td>
                            <td className="p-4 tabular-nums">
                              <input 
                                type="number" 
                                value={adj}
                                onChange={(e) => setDriverAdjustments(prev => ({ ...prev, [d.id]: Number(e.target.value) }))}
                                className={`w-20 h-7 border rounded px-1.5 font-bold text-center focus:border-[#0058bc] outline-none ${
                                  adj >= 0 ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
                                }`}
                              />
                            </td>
                            <td className="p-4 text-[#0058bc] font-extrabold text-sm tabular-nums">
                              {Math.round(payout).toLocaleString("ru-RU")} ₽
                            </td>
                            <td className="p-4">
                              {status === "PAID" ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#E8F8EE] text-[#34C759] text-[10px] font-extrabold border border-[#34C759]/20 shadow-sm">
                                  Выплачено
                                </span>
                              ) : status === "PROCESSING" ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#FF9500]/10 text-[#FF9500] text-[10px] font-extrabold border border-[#FF9500]/20 animate-pulse shadow-sm">
                                  В обработке
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#adc6ff]/20 text-[#0058bc] text-[10px] font-extrabold border border-[#0058bc]/20 shadow-sm">
                                  К выплате
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              {status === "PENDING" && (
                                <button
                                  onClick={() => handlePayDriver(d.id, d.name, payout)}
                                  className="h-8 px-3 bg-[#34C759] hover:bg-[#2fb34f] text-white font-extrabold text-xs rounded-lg transition-colors cursor-pointer shadow-sm hover:shadow active:scale-95 duration-150"
                                >
                                  Выплатить
                                </button>
                              )}
                              {status === "PAID" && (
                                <button
                                  onClick={() => setDriverPaidStatuses(prev => ({ ...prev, [d.id]: "PENDING" }))}
                                  className="text-[10px] text-[#8e8e93] hover:text-[#ba1a1a] font-bold uppercase cursor-pointer"
                                >
                                  Сбросить
                                </button>
                              )}
                              {status === "PROCESSING" && (
                                <span className="text-[10px] text-[#FF9500] font-bold uppercase">Банк...</span>
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
              <div className="bg-[#f0edef] border border-[#e4e2e4] rounded-xl p-5 space-y-4 animate-fadeIn">
                <h4 className="font-extrabold text-sm text-[#1b1b1d] tracking-wide">Распределение фонда оплаты труда по водителям</h4>
                <div className="space-y-3.5 bg-white p-4 rounded-lg border border-[#e4e2e4]">
                  {drivers.map(d => {
                    const actH = getDriverActiveHours(d.id);
                    const idlH = getDriverIdleHours(d.id);
                    const rate = getDriverRate(d.id);
                    const adj = getDriverAdjustment(d.id);
                    const payout = (actH * rate) + (idlH * rate * 0.5) + adj;
                    const percent = totalPayroll > 0 ? (payout / totalPayroll) * 100 : 0;

                    return (
                      <div key={d.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-[#1b1b1d]">{d.name}</span>
                          <span className="text-[#414755]">{Math.round(percent)}% ({Math.round(payout).toLocaleString("ru-RU")} ₽)</span>
                        </div>
                        <div className="w-full h-3 bg-[#f6f3f5] rounded-full overflow-hidden border border-[#e4e2e4]">
                          <div 
                            className="h-full bg-gradient-to-r from-[#0058bc] to-[#0070eb] rounded-full"
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
      <div className="bg-[#f6f3f5] w-full lg:w-[380px] p-4 sm:p-6 shrink-0 flex flex-col justify-start border-t lg:border-t-0 lg:border-l border-[#e4e2e4] select-none h-screen overflow-y-auto">
        <div className="mb-4">
          <h2 className="text-lg font-extrabold tracking-tight text-[#1b1b1d] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0058bc] animate-ping"></span>
            Simulator-Мобильный Клиент
          </h2>
          <p className="text-xs text-[#8e8e93] font-bold mt-0.5">Start/Stop сессии + передача GPS координат</p>
        </div>

        {/* Visual Smartphone Wrapper Container */}
        <div className="bg-[#1b1b1d] p-3 rounded-[32px] shadow-2xl border-4 border-[#717786] flex flex-col h-[710px] relative overflow-hidden select-none max-w-sm mx-auto w-full">
          {/* Speaker Notch */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-4 bg-[#1b1b1d] rounded-full z-50 flex items-center justify-center">
            <div className="w-12 h-1 bg-[#414755] rounded-full"></div>
          </div>

          {/* Virtual Mobile Screen */}
          <div className="bg-white flex-grow rounded-[20px] overflow-hidden flex flex-col relative select-none">
            
            {/* Simulator Mobile App Header */}
            <header className="h-14 bg-white border-b border-[#e4e2e4] flex items-center justify-between px-4 pt-4 shrink-0">
              <span className="font-extrabold text-lg text-[#1b1b1d] tracking-tight">Авангард</span>
              <span className="text-[10px] font-extrabold bg-[#f0edef] text-[#414755] px-2 py-0.5 rounded tracking-wide uppercase">Учёт времени</span>
            </header>

            {/* Mobile View Screen Scrollable */}
            <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-4 select-none pb-6">
              
              {/* Simulator Config Selector Card */}
              <div className="p-3 bg-[#f0edef] rounded-xl border border-[#e4e2e4] flex flex-col gap-2.5 shrink-0">
                <span className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider">Идентификация водителя</span>
                <div>
                  <label className="text-[10px] font-extrabold text-[#414755]">Водитель</label>
                  <select 
                    value={simDriverId}
                    onChange={(e) => setSimDriverId(e.target.value)}
                    disabled={simActive}
                    className="w-full h-8 text-xs bg-white rounded border border-[#e4e2e4] px-2 font-semibold outline-none mt-0.5 cursor-pointer"
                  >
                    <option value="">Выберите водителя...</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.status === "ACTIVE" ? "В рейсе" : "Свободен"})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-[#414755]">Транспортное средство</label>
                  <select 
                    value={simVehicleId}
                    onChange={(e) => setSimVehicleId(e.target.value)}
                    disabled={simActive}
                    className="w-full h-8 text-xs bg-white rounded border border-[#e4e2e4] px-2 font-semibold outline-none mt-0.5 cursor-pointer"
                  >
                    <option value="">Выберите ТС...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.model} ({v.plateNumber})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Shift Actions Card */}
              <div className={`p-4 bg-[#f0edef] rounded-xl border border-[#e4e2e4] flex flex-col items-center gap-3 transition-all duration-300 ${
                simActive ? "border-[#0058bc] bg-white ring-2 ring-[#0058bc]/20" : ""
              }`}>
                {/* Status chip */}
                <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 ${
                  simActive ? "bg-[#E5F2FF] text-[#0058bc]" : "bg-[#e4e2e4] text-[#414755]"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${simActive ? "bg-[#0058bc] animate-ping" : "bg-[#8e8e93]"}`}></span>
                  <span className="text-[10px] font-bold uppercase tracking-wide">{simStatusText}</span>
                </div>

                {/* Duration Timer */}
                <span className="text-4xl font-extrabold tracking-tighter tabular-nums text-[#1b1b1d] select-all">
                  {formatTimer(simSeconds)}
                </span>

                {/* START/STOP button */}
                <button
                  onClick={handleToggleShift}
                  disabled={!simDriverId || !simVehicleId}
                  className={`w-full h-12 rounded-xl font-bold text-sm tracking-wide text-white flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] shadow-md select-none cursor-pointer ${
                    !simDriverId || !simVehicleId 
                      ? "bg-[#8e8e93] cursor-not-allowed opacity-60" 
                      : simActive 
                        ? "bg-[#ba1a1a] hover:bg-[#ba1a1a]/90" 
                        : "bg-[#0058bc] hover:bg-[#0058bc]/90"
                  }`}
                >
                  {simActive ? (
                    <>
                      <Square className="w-4 h-4 fill-current" />
                      СТОП СМЕНЫ
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      СТАРТ СМЕНЫ
                    </>
                  )}
                </button>
              </div>

              {/* Geo summary block */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <span className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider pl-1">Текущий GPS Статус</span>
                <div className="bg-[#f0edef] rounded-xl border border-[#e4e2e4] p-3 space-y-2.5 text-xs font-semibold">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 border border-[#e4e2e4] text-[#414755]">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#8e8e93] font-bold">Координаты трансляции</span>
                      <span className="text-xs text-[#1b1b1d] font-bold mt-0.5">
                        {GEOLOCATION_PATH[simPathIndex].lat.toFixed(4)}° N, {GEOLOCATION_PATH[simPathIndex].lng.toFixed(4)}° E
                      </span>
                      <span className="text-[10px] text-[#0058bc] font-bold mt-1 flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-[#0058bc] animate-pulse" />
                        {GEOLOCATION_PATH[simPathIndex].label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Telemetry block */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <span className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider pl-1">Телеметрия ТС</span>
                <div className="bg-[#f0edef] rounded-xl border border-[#e4e2e4] p-3 space-y-3 text-xs font-semibold">
                  
                  {/* Engine & Distance */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${simActive ? "bg-[#34C759] shadow-[0_0_8px_rgba(52,199,89,0.8)]" : "bg-[#ba1a1a]"}`}></div>
                      <span className="text-[#1b1b1d] font-bold">{simActive ? "Двигатель заведен" : "Двигатель заглушен"}</span>
                    </div>
                    <div className="text-[#414755] font-bold">
                      {simDistance.toFixed(1)} км
                    </div>
                  </div>

                  {/* Fuel Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-extrabold text-[#414755] uppercase tracking-wide">
                      <span className="flex items-center gap-1"><Fuel className="w-3 h-3"/> Топливо</span>
                      <span className={simFuel < 20 ? "text-[#ba1a1a]" : "text-[#0058bc]"}>{simFuel.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#e4e2e4] rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${simFuel < 20 ? "bg-[#ba1a1a]" : "bg-[#0058bc]"}`} 
                        style={{ width: `${Math.max(0, simFuel)}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-[#8e8e93] text-right">~{Math.round((simFuel / 100) * 400)} Л остаток</div>
                  </div>

                  {/* Shift Analytics */}
                  <div className="flex gap-2 pt-1">
                    <div className="flex-1 bg-white border border-[#e4e2e4] rounded-lg p-2 text-center shadow-sm">
                      <span className="block text-[9px] text-[#8e8e93] uppercase tracking-wide font-extrabold mb-0.5">В движении</span>
                      <span className="text-[#0058bc] font-bold tabular-nums">{formatTimer(Math.floor(simSeconds * 0.8))}</span>
                    </div>
                    <div className="flex-1 bg-white border border-[#e4e2e4] rounded-lg p-2 text-center shadow-sm">
                      <span className="block text-[9px] text-[#8e8e93] uppercase tracking-wide font-extrabold mb-0.5">Простой</span>
                      <span className="text-[#414755] font-bold tabular-nums">{formatTimer(Math.floor(simSeconds * 0.2))}</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Personal app shift logs */}
              <div className="flex flex-col gap-1.5 flex-grow">
                <span className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider pl-1">Логи водителя в приложении</span>
                <div className="flex flex-col bg-white border border-[#e4e2e4] rounded-xl divide-y divide-[#e4e2e4] overflow-hidden flex-grow min-h-[140px] text-xs font-semibold">
                  {!simDriverId ? (
                    <div className="flex-grow flex items-center justify-center text-center p-4 text-[#8e8e93]">
                      Выберите водителя, чтобы загрузить его архив смен
                    </div>
                  ) : simHistory.length === 0 ? (
                    <div className="flex-grow flex items-center justify-center text-center p-4 text-[#8e8e93]">
                      Смен не обнаружено в архиве
                    </div>
                  ) : (
                    simHistory.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${item.status === "Завершено" ? "bg-[#34C759]" : "bg-[#0058bc] animate-pulse"}`}></span>
                            <span className="font-extrabold text-[#1b1b1d]">{item.date}</span>
                          </div>
                          <span className="text-[10px] text-[#8e8e93] mt-0.5 block">{item.timeRange}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-[#1b1b1d]">{item.duration}</span>
                          <span className="text-[10px] text-[#8e8e93] block">{item.status}</span>
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-xl border border-[#e4e2e4] p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-[#1b1b1d] mb-4">
              {editingDriver ? "Редактировать водителя" : "Добавить нового водителя"}
            </h3>
            <form onSubmit={handleDriverSubmit} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-[#414755] mb-1 font-bold">ФИО Водителя</label>
                <input
                  required
                  type="text"
                  value={driverForm.name}
                  onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                  placeholder="Иван Иванов"
                  className="w-full h-10 px-3 border border-[#e4e2e4] rounded-lg focus:border-[#0058bc] outline-none text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-[#414755] mb-1 font-bold">Водительское Удостоверение (ВУ)</label>
                <input
                  required
                  type="text"
                  value={driverForm.licenseNumber}
                  onChange={(e) => setDriverForm({ ...driverForm, licenseNumber: e.target.value })}
                  placeholder="77 АВ 123456"
                  className="w-full h-10 px-3 border border-[#e4e2e4] rounded-lg focus:border-[#0058bc] outline-none text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-[#414755] mb-1 font-bold">Номер телефона</label>
                <input
                  required
                  type="text"
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                  className="w-full h-10 px-3 border border-[#e4e2e4] rounded-lg focus:border-[#0058bc] outline-none text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-[#414755] mb-1 font-bold">Статус</label>
                <select
                  value={driverForm.status}
                  onChange={(e) => setDriverForm({ ...driverForm, status: e.target.value })}
                  className="w-full h-10 px-3 border border-[#e4e2e4] rounded-lg focus:border-[#0058bc] outline-none text-sm font-semibold cursor-pointer"
                >
                  <option value="FREE">Свободен</option>
                  <option value="ACTIVE">В рейсе</option>
                  <option value="OFF">Вне смены</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDriverModalOpen(false)}
                  className="h-10 px-4 bg-[#f0edef] hover:bg-[#e4e2e4] text-[#1b1b1d] rounded-lg transition-colors font-bold text-sm cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 bg-[#0058bc] hover:bg-[#0070eb] text-white rounded-lg transition-colors font-bold text-sm cursor-pointer"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle Modal */}
      {vehicleModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-xl border border-[#e4e2e4] p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-[#1b1b1d] mb-4">
              {editingVehicle ? "Редактировать ТС" : "Добавить новое ТС"}
            </h3>
            <form onSubmit={handleVehicleSubmit} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-[#414755] mb-1 font-bold">Модель ТС</label>
                <input
                  required
                  type="text"
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                  placeholder="КАМАЗ 54901"
                  className="w-full h-10 px-3 border border-[#e4e2e4] rounded-lg focus:border-[#0058bc] outline-none text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-[#414755] mb-1 font-bold">Государственный номер</label>
                <input
                  required
                  type="text"
                  value={vehicleForm.plateNumber}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, plateNumber: e.target.value })}
                  placeholder="А123ВС 77"
                  className="w-full h-10 px-3 border border-[#e4e2e4] rounded-lg focus:border-[#0058bc] outline-none text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-[#414755] mb-1 font-bold">VIN код</label>
                <input
                  required
                  type="text"
                  value={vehicleForm.vin}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vin: e.target.value })}
                  placeholder="KMZ54901A123BC077"
                  className="w-full h-10 px-3 border border-[#e4e2e4] rounded-lg focus:border-[#0058bc] outline-none text-sm font-semibold font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-[#414755] mb-1 font-bold">Статус ТС</label>
                <select
                  value={vehicleForm.status}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}
                  className="w-full h-10 px-3 border border-[#e4e2e4] rounded-lg focus:border-[#0058bc] outline-none text-sm font-semibold cursor-pointer"
                >
                  <option value="ACTIVE">Активен</option>
                  <option value="MAINTENANCE">В ремонте</option>
                  <option value="OUT_OF_SERVICE">Списан</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVehicleModalOpen(false)}
                  className="h-10 px-4 bg-[#f0edef] hover:bg-[#e4e2e4] text-[#1b1b1d] rounded-lg transition-colors font-bold text-sm cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 bg-[#0058bc] hover:bg-[#0070eb] text-white rounded-lg transition-colors font-bold text-sm cursor-pointer"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-over Vehicle Details Drawer */}
      {selectedVehicle && (() => {
        // Find active driver if any
        const isActiveSimVehicle = simActive && simVehicleId === selectedVehicle.id;
        
        let driverName = "Нет водителя";
        let driverId = "";
        let fuelRemaining = 100;
        let fuelLitres = 400;
        let shiftTime = "00:00:00";
        let speed = 0;
        let distance = 0;
        // let isEngineRunning = false;
        let consumptionRate = 0;
        let events = [];
        let driverPhoto = "D";

        if (isActiveSimVehicle) {
          const simDriver = drivers.find(d => d.id === simDriverId);
          driverName = simDriver ? simDriver.name : "Иван Иванов";
          driverId = simDriverId;
          fuelRemaining = simFuel;
          fuelLitres = Math.round((simFuel / 100) * 400);
          shiftTime = formatTimer(simSeconds);
          speed = 65;
          distance = simDistance;
          // isEngineRunning = true;
          consumptionRate = 31.8;
          events = [
            { time: "10 мин назад", text: "Прохождение контрольной точки: " + GEOLOCATION_PATH[Math.max(0, simPathIndex - 1)].label },
            { time: "В начале смены", text: "Смена успешно начата водительским клиентом" }
          ];
          driverPhoto = driverName.split(" ").map(w=>w[0]).join("");
        } else if (selectedVehicle.id === "v3" || selectedVehicle.id === "v1") {
          // Mock data for the Scania or KAMAZ active mock shifts
          driverName = "Сергей Смирнов";
          driverId = "d2";
          fuelRemaining = 68.5;
          fuelLitres = 274;
          shiftTime = "05:42:15";
          speed = 72;
          distance = 284.4;
          // isEngineRunning = true;
          consumptionRate = 29.5;
          events = [
            { time: "12:45", text: "Предупреждение: Превышение скорости (92 км/ч)" },
            { time: "10:15", text: "Остановка на отдых (15 мин)" },
            { time: "08:30", text: "Начало смены (Депо А)" }
          ];
          driverPhoto = "СС";
        } else {
          // Off shift vehicle
          fuelRemaining = selectedVehicle.status === "MAINTENANCE" ? 45.0 : 85.0;
          fuelLitres = Math.round((fuelRemaining / 100) * 400);
          shiftTime = "Вне смены";
          speed = 0;
          distance = 0;
          // isEngineRunning = false;
          consumptionRate = 0;
          events = [
            { time: "Вчера", text: "Смена завершена в Депо А. Общий пробег: 182 км" }
          ];
        }

        return (
          <>
            {/* Backdrop */}
            <div 
              onClick={() => setSelectedVehicle(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] transition-opacity"
            ></div>
            
            {/* Drawer Container */}
            <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[460px] bg-white border-l border-[#e4e2e4] shadow-2xl z-[120] flex flex-col transition-all duration-300 transform animate-fadeIn">
              
              {/* Header */}
              <div className="p-5 border-b border-[#e4e2e4] flex justify-between items-center bg-[#fcf8fb]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#0058bc]/10 rounded-xl text-[#0058bc]">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#1b1b1d] tracking-tight">{selectedVehicle.model}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono bg-[#f0edef] text-[#414755] px-1.5 py-0.5 rounded font-bold">{selectedVehicle.plateNumber}</span>
                      <span className="text-[10px] font-mono text-[#8e8e93] font-bold">VIN: {selectedVehicle.vin}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedVehicle(null)}
                  className="p-2 text-[#717786] hover:text-[#1b1b1d] hover:bg-[#f0edef] transition-colors rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-grow overflow-y-auto p-5 space-y-6">
                
                {/* Status Indicator */}
                <div className="flex justify-between items-center bg-[#f6f3f5] p-3 rounded-xl border border-[#e4e2e4]">
                  <span className="text-xs font-bold text-[#414755] uppercase tracking-wide">Статус ТС</span>
                  {selectedVehicle.status === "ACTIVE" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F8EE] text-[#34C759] text-xs font-extrabold shadow-sm">
                      <span className="w-1.5 h-1.5 bg-[#34C759] rounded-full animate-pulse"></span>
                      На смене / Активен
                    </span>
                  ) : selectedVehicle.status === "MAINTENANCE" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF9500]/10 text-[#FF9500] text-xs font-extrabold border border-[#FF9500]/20 shadow-sm">
                      В ремонте
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f0edef] text-[#8e8e93] text-xs font-extrabold border border-[#e4e2e4] shadow-sm">
                      Списан
                    </span>
                  )}
                </div>

                {/* Driver on Shift Info */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-[#414755] uppercase tracking-wider pl-1">Водитель на смене</h4>
                  <div className="p-4 bg-white border border-[#e4e2e4] rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-[#0058bc]/10 text-[#0058bc] flex items-center justify-center font-extrabold text-sm border border-[#0058bc]/20">
                        {driverPhoto}
                      </div>
                      <div>
                        <span className="block font-bold text-sm text-[#1b1b1d]">{driverName}</span>
                        <span className="text-[11px] text-[#8e8e93] font-bold block mt-0.5">ID: {driverId || "—"}</span>
                      </div>
                    </div>
                    {driverId ? (
                      <span className="text-[10px] font-bold bg-[#0058bc]/10 text-[#0058bc] px-2.5 py-1 rounded-full uppercase tracking-wide">
                        В рейсе
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-[#e4e2e4] text-[#717786] px-2.5 py-1 rounded-full uppercase tracking-wide">
                        Свободен
                      </span>
                    )}
                  </div>
                </div>

                {/* Shift Details */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-[#414755] uppercase tracking-wider pl-1">Метрики смены</h4>
                  <div className="grid grid-cols-2 gap-3">
                    
                    <div className="p-3.5 bg-white border border-[#e4e2e4] rounded-xl shadow-sm space-y-1">
                      <span className="text-[10px] text-[#8e8e93] font-bold uppercase tracking-wider block">Длительность</span>
                      <span className="text-lg font-extrabold text-[#1b1b1d] block tabular-nums">{shiftTime}</span>
                    </div>

                    <div className="p-3.5 bg-white border border-[#e4e2e4] rounded-xl shadow-sm space-y-1">
                      <span className="text-[10px] text-[#8e8e93] font-bold uppercase tracking-wider block">Дистанция</span>
                      <span className="text-lg font-extrabold text-[#1b1b1d] block tabular-nums">
                        {distance > 0 ? `${distance.toFixed(1)} км` : "0.0 км"}
                      </span>
                    </div>

                    <div className="p-3.5 bg-white border border-[#e4e2e4] rounded-xl shadow-sm space-y-1">
                      <span className="text-[10px] text-[#8e8e93] font-bold uppercase tracking-wider block">Скорость</span>
                      <span className="text-lg font-extrabold text-[#1b1b1d] flex items-center gap-1.5">
                        <Activity className={`w-4 h-4 ${speed > 0 ? "text-[#34C759] animate-pulse" : "text-[#717786]"}`} />
                        <span className="tabular-nums">{speed} км/ч</span>
                      </span>
                    </div>

                    <div className="p-3.5 bg-white border border-[#e4e2e4] rounded-xl shadow-sm space-y-1">
                      <span className="text-[10px] text-[#8e8e93] font-bold uppercase tracking-wider block">Расход топлива</span>
                      <span className="text-lg font-extrabold text-[#1b1b1d] block tabular-nums">
                        {consumptionRate > 0 ? `${consumptionRate.toFixed(1)} л/100км` : "—"}
                      </span>
                    </div>

                  </div>
                </div>

                {/* Fuel Tank Status */}
                <div className="p-4 bg-white border border-[#e4e2e4] rounded-xl shadow-sm space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-[#414755] uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Fuel className="w-4 h-4 text-[#0058bc]" /> Уровень топлива</span>
                    <span className={fuelRemaining < 20 ? "text-[#ba1a1a]" : "text-[#0058bc]"}>{fuelRemaining.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#e4e2e4] rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${fuelRemaining < 20 ? "bg-[#ba1a1a]" : "bg-[#0058bc]"}`}
                      style={{ width: `${Math.max(0, fuelRemaining)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-[#8e8e93] font-bold">
                    <span>Остаток: ~{fuelLitres} Л</span>
                    {fuelRemaining < 20 && (
                      <span className="text-[#ba1a1a] font-extrabold flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> Требуется заправка!
                      </span>
                    )}
                  </div>
                </div>

                {/* Live Geolocation */}
                {isActiveSimVehicle && (
                  <div className="p-4 bg-white border border-[#e4e2e4] rounded-xl shadow-sm space-y-2">
                    <span className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider block">Текущая геолокация LIVE</span>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#0058bc]/10 rounded-lg text-[#0058bc]">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-mono font-bold block text-[#1b1b1d]">
                          {GEOLOCATION_PATH[simPathIndex].lat.toFixed(5)}° N, {GEOLOCATION_PATH[simPathIndex].lng.toFixed(5)}° E
                        </span>
                        <span className="text-[11px] font-bold text-[#0058bc] block mt-0.5">
                          {GEOLOCATION_PATH[simPathIndex].label}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Events Log */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-[#414755] uppercase tracking-wider pl-1">Лента событий ТС</h4>
                  <div className="border border-[#e4e2e4] rounded-xl divide-y divide-[#e4e2e4] overflow-hidden bg-white shadow-sm">
                    {events.map((ev, idx) => (
                      <div key={idx} className="p-3 text-xs font-semibold flex justify-between items-start gap-4">
                        <span className="text-[#1b1b1d] leading-tight">{ev.text}</span>
                        <span className="text-[10px] text-[#8e8e93] shrink-0 font-bold">{ev.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Footer action */}
              <div className="p-4 border-t border-[#e4e2e4] bg-[#fcf8fb] flex gap-2">
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="flex-1 h-11 bg-[#f0edef] hover:bg-[#e4e2e4] text-[#1b1b1d] font-bold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Закрыть
                </button>
              </div>

            </div>
          </>
        );
      })()}

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
