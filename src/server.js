const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 8080);
const SERVICE_NAME = process.env.SERVICE_NAME || "gateway";
const DATA_FILE = process.env.DATA_FILE || `${SERVICE_NAME}.json`;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILES = fs.readdirSync(DATA_DIR).filter(file => file.endsWith(".json"));

const upstreams = {
  menu: process.env.MENU_URL || "http://restaurant-platform-menu:8080",
  orders: process.env.ORDERS_URL || "http://restaurant-platform-orders:8080",
  reservations: process.env.RESERVATIONS_URL || "http://restaurant-platform-reservations:8080",
  tables: process.env.TABLES_URL || "http://restaurant-platform-tables:8080",
  kitchen: process.env.KITCHEN_URL || "http://restaurant-platform-kitchen:8080",
  inventory: process.env.INVENTORY_URL || "http://restaurant-platform-inventory:8080",
  payments: process.env.PAYMENTS_URL || "http://restaurant-platform-payments:8080",
  loyalty: process.env.LOYALTY_URL || "http://restaurant-platform-loyalty:8080",
  notifications: process.env.NOTIFICATIONS_URL || "http://restaurant-platform-notifications:8080",
  reviews: process.env.REVIEWS_URL || "http://restaurant-platform-reviews:8080"
};

const serviceStores = Object.fromEntries(
  DATA_FILES.map(file => {
    const name = path.basename(file, ".json");
    const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf8");
    return [name, JSON.parse(raw)];
  })
);

function send(res, status, body, type = "application/json") {
  const payload = type === "application/json" ? JSON.stringify(body, null, 2) : body;
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
    "x-service-name": SERVICE_NAME
  });
  res.end(payload);
}

function getStore(serviceName = SERVICE_NAME) {
  const dataName = serviceName === "gateway" ? path.basename(DATA_FILE, ".json") : serviceName;
  return serviceStores[dataName];
}

function readBody(req) {
  if (req.parsedBody) {
    return Promise.resolve(req.parsedBody);
  }

  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body is too large"));
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        req.parsedBody = JSON.parse(body);
        resolve(req.parsedBody);
      } catch (error) {
        reject(new Error("Request body must be valid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function responseFor(serviceName) {
  return {
    service: serviceName,
    version: process.env.APP_VERSION || "0.1.0",
    generatedAt: new Date().toISOString(),
    data: getStore(serviceName)
  };
}

function createOrder(payload) {
  const store = getStore("orders");
  const nextNumber = 1051 + store.orders.length;
  const order = {
    id: `ORD-${nextNumber}`,
    table: Number(payload.table || 1),
    items: Array.isArray(payload.items) && payload.items.length ? payload.items : ["Chef tasting menu"],
    status: "queued"
  };
  store.orders.unshift(order);

  const kitchen = getStore("kitchen");
  kitchen.tickets.unshift({
    station: "Expo",
    item: order.items[0],
    elapsedMinutes: 0,
    priority: order.items.length > 2 ? "high" : "normal"
  });

  const tables = getStore("tables");
  const table = tables.tables.find(row => row.number === order.table);
  if (table) table.status = "occupied";

  return order;
}

function createReservation(payload) {
  const reservation = {
    guest: String(payload.guest || "Walk-in Guest").slice(0, 80),
    time: String(payload.time || "19:30").slice(0, 10),
    partySize: Number(payload.partySize || 2),
    note: String(payload.note || "Standard seating").slice(0, 120),
    status: "confirmed"
  };
  getStore("reservations").reservations.unshift(reservation);
  return reservation;
}

function createReview(payload) {
  const review = {
    guest: String(payload.guest || "Guest").slice(0, 80),
    rating: Math.max(1, Math.min(5, Number(payload.rating || 5))),
    comment: String(payload.comment || "Lovely experience.").slice(0, 180)
  };
  getStore("reviews").reviews.unshift(review);
  return review;
}

function advanceKitchen() {
  const kitchen = getStore("kitchen");
  kitchen.tickets = kitchen.tickets.map(ticket => ({
    ...ticket,
    elapsedMinutes: ticket.elapsedMinutes + 2,
    priority: ticket.elapsedMinutes >= 10 ? "high" : ticket.priority
  }));

  const orders = getStore("orders");
  const flow = ["queued", "firing", "plated", "served"];
  orders.orders = orders.orders.map(order => {
    const index = flow.indexOf(order.status);
    return { ...order, status: flow[Math.min(index + 1, flow.length - 1)] };
  });

  return {
    tickets: kitchen.tickets,
    orders: orders.orders
  };
}

function contentType(filePath) {
  const ext = path.extname(filePath);
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "text/plain; charset=utf-8";
}

function serveStatic(req, res) {
  const requestedPath = new URL(req.url, "http://localhost").pathname;
  const safePath = requestedPath === "/" ? "/index.html" : requestedPath;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    send(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, { error: "File not found" });
      return;
    }
    send(res, 200, data, contentType(filePath));
  });
}

async function proxyToService(req, res) {
  const url = new URL(req.url, "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);
  const service = parts[1];
  const upstream = upstreams[service];

  if (!upstream) {
    send(res, 404, { error: `Unknown service '${service}'` });
    return;
  }

  const target = `${upstream}/api`;

  try {
    const body = ["POST", "PUT", "PATCH"].includes(req.method) ? JSON.stringify(await readBody(req)) : undefined;
    const response = await fetch(target, {
      method: req.method,
      headers: { "content-type": req.headers["content-type"] || "application/json" },
      body
    });
    const responseBody = await response.text();
    res.writeHead(response.status, {
      "content-type": response.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
      "x-gateway-target": service
    });
    res.end(responseBody);
  } catch (error) {
    await serviceApi(req, res, service);
  }
}

async function serviceApi(req, res, serviceName = SERVICE_NAME) {
  if (!getStore(serviceName)) {
    send(res, 404, { error: `Unknown service '${serviceName}'` });
    return;
  }

  if (req.method === "GET") {
    send(res, 200, responseFor(serviceName));
    return;
  }

  if (req.method === "POST" && serviceName === "orders") {
    const order = createOrder(await readBody(req));
    send(res, 201, { ...responseFor(serviceName), created: order });
    return;
  }

  if (req.method === "POST" && serviceName === "reservations") {
    const reservation = createReservation(await readBody(req));
    send(res, 201, { ...responseFor(serviceName), created: reservation });
    return;
  }

  if (req.method === "POST" && serviceName === "reviews") {
    const review = createReview(await readBody(req));
    send(res, 201, { ...responseFor(serviceName), created: review });
    return;
  }

  if (req.method === "PATCH" && serviceName === "kitchen") {
    send(res, 200, { service: serviceName, generatedAt: new Date().toISOString(), data: advanceKitchen() });
    return;
  }

  send(res, 405, { error: `${req.method} is not supported by ${serviceName}` });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/healthz" || url.pathname === "/readyz") {
    send(res, 200, { status: "ok", service: SERVICE_NAME });
    return;
  }

  if (SERVICE_NAME === "gateway") {
    if (url.pathname.startsWith("/api/")) {
      proxyToService(req, res);
      return;
    }
    serveStatic(req, res);
    return;
  }

  if (url.pathname === "/api") {
    serviceApi(req, res);
    return;
  }

  send(res, 404, { error: "Not found", service: SERVICE_NAME });
});

server.listen(PORT, () => {
  console.log(`${SERVICE_NAME} listening on ${PORT}`);
});
