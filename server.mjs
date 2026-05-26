import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

let drivers = [
  { 
    id: "d1", 
    name: "Иван Иванов", 
    licenseNumber: "77 АВ 123456", 
    phone: "+7 (999) 111-22-33", 
    status: "FREE",
    permitCategories: ["Гусеничный экскаватор", "Фронтальный погрузчик"],
    activeRate: 800,
    documents: [
      { name: "Удостоверение тракториста-машиниста", type: "ВУ", file: "traktorist_d1.pdf" },
      { name: "Медицинская книжка водителя", type: "Медсправка", file: "med_d1.pdf" }
    ],
    rateHistory: [
      { date: "2026-01-10", rate: 600, reason: "Приказ о приеме на работу П-02" },
      { date: "2026-05-01", rate: 800, reason: "Приказ об индексации ставки П-104" }
    ]
  },
  { 
    id: "d2", 
    name: "Сергей Смирнов", 
    licenseNumber: "77 ВС 654321", 
    phone: "+7 (999) 222-33-44", 
    status: "ACTIVE",
    permitCategories: ["Кран стреловой Liebherr", "Тяжелый бульдозер"],
    activeRate: 850,
    documents: [
      { name: "Допуск машиниста крана Liebherr", type: "Лицензия", file: "crane_d2.pdf" },
      { name: "Действующая медсправка", type: "Медсправка", file: "med_d2.pdf" }
    ],
    rateHistory: [
      { date: "2026-02-15", rate: 650, reason: "Приказ о приеме на работу П-15" },
      { date: "2026-05-15", rate: 850, reason: "Приказ о повышении квалификации П-112" }
    ]
  }
];

let vehicles = [
  { 
    id: "v1", 
    model: "Экскаватор CAT 320", 
    plateNumber: "KG 555 ABD", 
    vin: "CAT320E999XYZ0001", 
    status: "ACTIVE",
    machineryType: "Гусеничный экскаватор",
    documents: [
      { name: "СТС спецтехники", type: "СТС", file: "sts_v1.pdf" },
      { name: "ПТС спецтехники", type: "ПТС", file: "pts_v1.pdf" }
    ]
  },
  { 
    id: "v3", 
    model: "Кран Liebherr LTM 1050", 
    plateNumber: "KG 777 BSB", 
    vin: "LBH1050TM888ABC12", 
    status: "ACTIVE",
    machineryType: "Тяжелый кран",
    documents: [
      { name: "СТС автокрана", type: "СТС", file: "sts_v3.pdf" },
      { name: "ПТС автокрана", type: "ПТС", file: "pts_v3.pdf" },
      { name: "Разрешение Ростехнадзора", type: "Ростехнадзор", file: "rosteh_v3.pdf" }
    ]
  },
  { 
    id: "v4", 
    model: "Бульдозер Shantui SD16", 
    plateNumber: "KG 111 BUL", 
    vin: "SHTSD16X777BULK01", 
    status: "MAINTENANCE",
    machineryType: "Тяжелый бульдозер",
    documents: [
      { name: "СТС бульдозера", type: "СТС", file: "sts_v4.pdf" },
      { name: "ПТС бульдозера", type: "ПТС", file: "pts_v4.pdf" }
    ]
  }
];

let objects = [
  { id: "o1", name: "ЖК Ала-Тоо (Бишкек)", latitude: 42.8580, longitude: 74.6050, difficultyType: "PLAIN", rateMultiplier: 1.0 },
  { id: "o2", name: "Трасса Бишкек-Ош (Горный участок)", latitude: 42.6120, longitude: 74.2380, difficultyType: "MOUNTAIN", rateMultiplier: 1.35 },
  { id: "o3", name: "Склад Кара-Балта", latitude: 42.8150, longitude: 73.8500, difficultyType: "PLAIN", rateMultiplier: 1.0 }
];

let orders = [
  { id: "ord1", driverId: "d1", driverName: "Иван Иванов", orderNumber: "П-104", dateEffective: "2026-05-01", oldRate: 600, newRate: 800, status: "SIGNED", signedAt: "2026-05-01T08:15:00Z" },
  { id: "ord2", driverId: "d2", driverName: "Сергей Смирнов", orderNumber: "П-112", dateEffective: "2026-05-15", oldRate: 650, newRate: 850, status: "SIGNED", signedAt: "2026-05-15T09:20:00Z" }
];

let timeLogs = [];

// Drivers (Employees)
app.get('/api/fleet/drivers', (req, res) => res.json(drivers));
app.post('/api/fleet/drivers', (req, res) => {
  const newDriver = { 
    id: 'd_' + Date.now(), 
    permitCategories: ["Гусеничный экскаватор"],
    activeRate: 750,
    documents: [
      { name: "Удостоверение машиниста тракториста", type: "ВУ", file: "traktorist_new.pdf" },
      { name: "Медицинская книжка", type: "Медсправка", file: "med_new.pdf" }
    ],
    rateHistory: [{ date: new Date().toISOString().split('T')[0], rate: 750, reason: "Начальная ставка" }],
    ...req.body 
  };
  drivers.push(newDriver);
  res.json(newDriver);
});
app.put('/api/fleet/drivers/:id', (req, res) => {
  drivers = drivers.map(d => d.id === req.params.id ? { ...d, ...req.body } : d);
  res.json({ success: true });
});
app.delete('/api/fleet/drivers/:id', (req, res) => {
  drivers = drivers.filter(d => d.id !== req.params.id);
  res.json({ success: true });
});

// Vehicles (Special Machinery)
app.get('/api/fleet/vehicles', (req, res) => res.json(vehicles));
app.post('/api/fleet/vehicles', (req, res) => {
  const newVehicle = { 
    id: 'v_' + Date.now(), 
    machineryType: req.body.machineryType || "Строительная спецтехника",
    documents: [
      { name: "СТС спецтехники", type: "СТС", file: "sts_new.pdf" },
      { name: "ПТС спецтехники", type: "ПТС", file: "pts_new.pdf" }
    ],
    ...req.body 
  };
  vehicles.push(newVehicle);
  res.json(newVehicle);
});
app.put('/api/fleet/vehicles/:id', (req, res) => {
  vehicles = vehicles.map(v => v.id === req.params.id ? { ...v, ...req.body } : v);
  res.json({ success: true });
});
app.delete('/api/fleet/vehicles/:id', (req, res) => {
  vehicles = vehicles.filter(v => v.id !== req.params.id);
  res.json({ success: true });
});

// Objects (Construction Sites)
app.get('/api/fleet/objects', (req, res) => res.json(objects));
app.post('/api/fleet/objects', (req, res) => {
  const newObject = { id: 'o_' + Date.now(), ...req.body };
  objects.push(newObject);
  res.json(newObject);
});

// Orders (Wage Decrees)
app.get('/api/fleet/orders', (req, res) => res.json(orders));
app.post('/api/fleet/orders', (req, res) => {
  const newOrder = { id: 'ord_' + Date.now(), status: "PENDING", ...req.body };
  orders.push(newOrder);
  res.json(newOrder);
});
app.put('/api/fleet/orders/:id', (req, res) => {
  orders = orders.map(o => {
    if (o.id === req.params.id) {
      const updated = { ...o, ...req.body };
      // If signed, let's also update the driver's activeRate and rateHistory!
      if (updated.status === "SIGNED") {
        drivers = drivers.map(d => {
          if (d.id === updated.driverId) {
            return {
              ...d,
              activeRate: updated.newRate,
              rateHistory: [
                ...d.rateHistory,
                { date: updated.dateEffective || new Date().toISOString().split('T')[0], rate: updated.newRate, reason: `Приказ о пересмотре ставки ${updated.orderNumber}` }
              ]
            };
          }
          return d;
        });
      }
      return updated;
    }
    return o;
  });
  res.json({ success: true });
});

// TimeLogs
app.get('/api/fleet/timelogs', (req, res) => res.json(timeLogs));
app.post('/api/fleet/timelogs', (req, res) => {
  const newLog = { id: 'l_' + Date.now(), ...req.body };
  timeLogs.unshift(newLog); // prepend to have newest first
  res.json(newLog);
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Avangard Standalone API running on http://localhost:${PORT}`);
});
