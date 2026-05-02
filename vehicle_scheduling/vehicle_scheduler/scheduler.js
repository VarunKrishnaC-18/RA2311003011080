const axios = require('axios');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJ2azU0NzlAc3JtaXN0LmVkdS5pbiIsImV4cCI6MTc3NzcwMzMyMSwiaWF0IjoxNzc3NzAyNDIxLCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiYzFiOTM2NDAtNzFiOS00NDZlLWI0NTUtY2YzM2IxMWM0NTExIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoidmFydW4ga3Jpc2huYSBjIiwic3ViIjoiNTIxMTM1NDYtYjcyMS00YjU5LTgwOGUtZmViOWRhNDFiZDI5In0sImVtYWlsIjoidms1NDc5QHNybWlzdC5lZHUuaW4iLCJuYW1lIjoidmFydW4ga3Jpc2huYSBjIiwicm9sbE5vIjoicmEyMzExMDAzMDExMDgwIiwiYWNjZXNzQ29kZSI6IlFrYnB4SCIsImNsaWVudElEIjoiNTIxMTM1NDYtYjcyMS00YjU5LTgwOGUtZmViOWRhNDFiZDI5IiwiY2xpZW50U2VjcmV0IjoiQU14RXlyYUdnamJxblJGWSJ9.FwfCPVayjCkjLYafcB7Q1zo6nf_h7oj8xAhUcWa9JyA';
const DEPOTS_API = 'http://20.207.122.201/evaluation-service/depots';
const VEHICLES_API = 'http://20.207.122.201/evaluation-service/vehicles';
const MAX_HOURS = 8;

const fallbackDepots = [
  { ID: 1, MechanicHours: 8 },
  { ID: 2, MechanicHours: 6 }
];

const fallbackVehicles = [
  { TaskID: 101, Duration: 1, Impact: 30, DepotID: 1 },
  { TaskID: 102, Duration: 2, Impact: 50, DepotID: 1 },
  { TaskID: 103, Duration: 3, Impact: 70, DepotID: 1 },
  { TaskID: 201, Duration: 1, Impact: 35, DepotID: 2 },
  { TaskID: 202, Duration: 2, Impact: 55, DepotID: 2 },
  { TaskID: 203, Duration: 2.5, Impact: 65, DepotID: 2 }
];

const fetchApi = async (url) => {
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`
    }
  });

  console.log(`API response for ${url}:`, JSON.stringify(response.data, null, 2));
  return response.data;
};

const toArray = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.data)) {
    return data.data;
  }

  if (data && Array.isArray(data.depots)) {
    return data.depots;
  }

  if (data && Array.isArray(data.vehicles)) {
    return data.vehicles;
  }

  return [];
};

const getDepotId = (depot) => {
  return depot && (depot.ID || depot.id || depot.DepotID || depot.depotId);
};

const getMechanicHours = (depot) => {
  return Number(
    depot && (
      depot.MechanicHours ||
      depot.mechanicHours ||
      depot.mechanic_hours ||
      depot.hours ||
      MAX_HOURS
    )
  );
};

const getTaskId = (task) => {
  return task && (task.TaskID || task.taskId || task.id || task.ID);
};

const getDuration = (task) => {
  return Number(task && (task.Duration || task.duration || task.hours || 0));
};

const getImpact = (task) => {
  return Number(task && (task.Impact || task.impact || task.score || 0));
};

const getDepotTasks = (depot, vehicles) => {
  if (!depot) {
    return [];
  }

  if (Array.isArray(depot.tasks)) {
    return depot.tasks;
  }

  if (Array.isArray(depot.vehicles)) {
    return depot.vehicles;
  }

  if (Array.isArray(depot.vehicleIds)) {
    let list = [];
    for (let id of depot.vehicleIds) {
      const found = vehicles.find((task) => String(getTaskId(task)) === String(id));
      if (found) {
        list.push(found);
      }
    }
    return list;
  }

  if (Array.isArray(depot.VehicleIDs)) {
    let list = [];
    for (let id of depot.VehicleIDs) {
      const found = vehicles.find((task) => String(getTaskId(task)) === String(id));
      if (found) {
        list.push(found);
      }
    }
    return list;
  }

  let depotId = getDepotId(depot);
  if (depotId === undefined || depotId === null) {
    return [];
  }

  return vehicles.filter((task) => String(task.DepotID || task.depotId || task.depotID || '') === String(depotId));
};

const greedyPick = (tasks, mechanicHours) => {
  let safeTasks = Array.isArray(tasks) ? tasks : [];
  let sorted = [...safeTasks].sort((a, b) => {
    let aDuration = getDuration(a) || 1;
    let bDuration = getDuration(b) || 1;
    let aRatio = getImpact(a) / aDuration;
    let bRatio = getImpact(b) / bDuration;
    return bRatio - aRatio;
  });

  let selectedTasks = [];
  let totalTime = 0;
  let totalImpact = 0;

  for (let task of sorted) {
    let duration = getDuration(task);
    let impact = getImpact(task);

    if (duration > 0 && totalTime + duration <= mechanicHours) {
      selectedTasks.push(getTaskId(task));
      totalTime += duration;
      totalImpact += impact;
    }
  }

  return {
    selectedTasks,
    totalTime,
    totalImpact
  };
};

const getSchedule = async () => {
  let depots = fallbackDepots;
  let vehicles = fallbackVehicles;

  try {
    const depotData = await fetchApi(DEPOTS_API);
    const depotList = toArray(depotData);
    if (depotList.length > 0) {
      depots = depotList;
    }
  } catch (error) {
    console.log('Depot API error:', error.message);
  }

  try {
    const vehicleData = await fetchApi(VEHICLES_API);
    const vehicleList = toArray(vehicleData);
    if (vehicleList.length > 0) {
      vehicles = vehicleList;
    }
  } catch (error) {
    console.log('Vehicle API error:', error.message);
  }

  let results = [];

  for (let depot of depots) {
    let mechanicHours = getMechanicHours(depot);
    let tasks = getDepotTasks(depot, vehicles);
    let picked = greedyPick(tasks, mechanicHours || MAX_HOURS);

    results.push({
      depotId: getDepotId(depot),
      totalTime: picked.totalTime,
      totalImpact: picked.totalImpact,
      selectedTasks: picked.selectedTasks
    });
  }

  if (results.length === 0) {
    let picked = greedyPick(vehicles, MAX_HOURS);
    results.push({
      depotId: 1,
      totalTime: picked.totalTime,
      totalImpact: picked.totalImpact,
      selectedTasks: picked.selectedTasks
    });
  }

  return {
    results
  };
};

module.exports = {
  getSchedule
};
