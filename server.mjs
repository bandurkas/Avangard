import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

let drivers = [
  { id: "d1", name: "Иван Иванов", licenseNumber: "77 АВ 123456", phone: "+7 (999) 111-22-33", status: "FREE" },
  { id: "d2", name: "Сергей Смирнов", licenseNumber: "77 ВС 654321", phone: "+7 (999) 222-33-44", status: "ACTIVE" }
];

let vehicles = [
  { id: "v1", model: "КАМАЗ 54901", plateNumber: "А123ВС 77", vin: "KMZ54901A123BC077", status: "ACTIVE" },
  { id: "v3", model: "Scania R450", plateNumber: "Е789ОК 77", vin: "SCNIAR450E789OK077", status: "ACTIVE" }
];

let timeLogs = [];

// Drivers
app.get('/api/fleet/drivers', (req, res) => res.json(drivers));
app.post('/api/fleet/drivers', (req, res) => {
  const newDriver = { id: 'd_' + Date.now(), ...req.body };
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

// Vehicles
app.get('/api/fleet/vehicles', (req, res) => res.json(vehicles));
app.post('/api/fleet/vehicles', (req, res) => {
  const newVehicle = { id: 'v_' + Date.now(), ...req.body };
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
