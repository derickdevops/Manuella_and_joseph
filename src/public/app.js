const services = [
  ["menu", "Menu, pricing, and availability"],
  ["orders", "Recent guest orders"],
  ["reservations", "Bookings and party sizes"],
  ["tables", "Dining room table states"],
  ["kitchen", "Stations and ticket queue"],
  ["inventory", "Ingredients and stock"],
  ["payments", "Settlement summaries"],
  ["loyalty", "Guest profiles and tiers"],
  ["notifications", "Message delivery events"],
  ["reviews", "Ratings and guest notes"]
];

const serviceCatalog = {
  menu: {
    title: "Menu service",
    view: "Chef recommendations",
    description: "Guests can browse signature dishes, prices, descriptions, and add plates to a live table order.",
    image: "/assets/service-menu.png",
    accent: "Dining room menu"
  },
  orders: {
    title: "Orders service",
    view: "Table order workspace",
    description: "Servers build table orders, submit them to the platform, and follow the current order status.",
    image: "/assets/service-menu.png",
    accent: "Live order flow"
  },
  reservations: {
    title: "Reservations service",
    view: "Booking desk",
    description: "The host team creates bookings, tracks party sizes, and keeps notes for guest preferences.",
    image: "/assets/service-booking.png",
    accent: "Guest arrivals"
  },
  tables: {
    title: "Tables service",
    view: "Dining room booking space",
    description: "The floor manager sees available, occupied, and cleaning tables before seating each party.",
    image: "/assets/service-booking.png",
    accent: "Floor plan"
  },
  kitchen: {
    title: "Kitchen service",
    view: "Kitchen ticket queue",
    description: "The kitchen team monitors station tickets, elapsed time, and priority while advancing dishes.",
    image: "/assets/service-kitchen.png",
    accent: "Back of house"
  },
  inventory: {
    title: "Inventory service",
    view: "Stock watch",
    description: "Chefs and managers watch ingredients, quantities, and low-stock signals before service gets busy.",
    image: "/assets/service-kitchen.png",
    accent: "Ingredient control"
  },
  payments: {
    title: "Payments service",
    view: "Settlement summary",
    description: "Cashiers review paid tabs, payment methods, and total settlement value for the dinner period.",
    image: "/assets/service-guest.png",
    accent: "Guest checkout"
  },
  loyalty: {
    title: "Loyalty service",
    view: "Guest profiles",
    description: "The restaurant recognizes returning guests, loyalty tiers, and points earned from previous visits.",
    image: "/assets/service-guest.png",
    accent: "Guest relationship"
  },
  notifications: {
    title: "Notifications service",
    view: "Message events",
    description: "Reservation confirmations, pickup notices, and loyalty messages are visible in one event stream.",
    image: "/assets/service-guest.png",
    accent: "Guest messaging"
  },
  reviews: {
    title: "Reviews service",
    view: "Guest feedback",
    description: "Guests leave ratings and comments so the team can track service quality after each visit.",
    image: "/assets/service-reviews.png",
    accent: "Guest voice"
  }
};

const state = {
  activeService: "menu",
  cart: [],
  tableFilter: "all",
  lastRefresh: null
};

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function setStatus(message) {
  document.querySelector("#status").textContent = message;
}

function renderServiceStrip() {
  document.querySelector("#services").innerHTML = services
    .map(([name, description]) => {
      const service = serviceCatalog[name];
      return `
        <button class="service-tile ${state.activeService === name ? "active" : ""}" type="button" data-service="${name}">
          <img src="${service.image}" alt="${service.title}" />
          <span class="service-tile-copy">
            <strong>${service.title}</strong>
            <small>${description}</small>
          </span>
        </button>
      `;
    })
    .join("");
}

async function serviceRequest(name, options = {}) {
  const response = await fetch(`/api/${name}`, {
    headers: { "content-type": "application/json" },
    ...options
  });
  if (!response.ok) throw new Error(`${name} returned ${response.status}`);
  return response.json();
}

async function fetchAllServices() {
  const results = await Promise.all(services.map(([name]) => serviceRequest(name)));
  services.forEach(([name], index) => {
    state[name] = results[index];
  });
  state.lastRefresh = new Date();
}

function addToCart(itemName) {
  state.cart.push(itemName);
  renderCart();
  renderServicePage();
}

function removeFromCart(index) {
  state.cart.splice(index, 1);
  renderCart();
  renderServicePage();
}

function renderMenuCards(items) {
  return items
    .map(item => `
      <div class="menu-item">
        <strong>${item.name}</strong>
        <p>${item.description}</p>
        <div class="menu-actions">
          <span class="price">${money(item.price)}</span>
          <button type="button" data-add-item="${item.name}">Add</button>
        </div>
      </div>
    `)
    .join("");
}

function renderMenu() {
  const items = state.menu.data.items;
  document.querySelector("#menu-count").textContent = `${items.length} items`;
  document.querySelector("#menu-grid").innerHTML = renderMenuCards(items);
}

function cartMarkup(emptyText) {
  if (!state.cart.length) return `<p class="empty">${emptyText}</p>`;
  return state.cart
    .map((item, index) => `
      <div class="cart-row">
        <span>${item}</span>
        <button type="button" data-remove-item="${index}">Remove</button>
      </div>
    `)
    .join("");
}

function renderCart() {
  const cart = document.querySelector("#cart-list");
  if (cart) cart.innerHTML = cartMarkup("Choose dishes from the menu.");
}

function renderList(target, rows, template) {
  const node = document.querySelector(target);
  if (node) node.innerHTML = rows.map(template).join("");
}

function orderRows() {
  return state.orders.data.orders.map(order => `
    <div class="list-item">
      <div>
        <strong>${order.id} - Table ${order.table}</strong>
        <p>${order.items.join(", ")}</p>
      </div>
      <span class="badge">${order.status}</span>
    </div>
  `).join("");
}

function reservationRows() {
  return state.reservations.data.reservations.map(reservation => `
    <div class="list-item">
      <div>
        <strong>${reservation.guest}</strong>
        <p>${reservation.time} - ${reservation.partySize} guests - ${reservation.note}</p>
      </div>
      <span class="badge">${reservation.status}</span>
    </div>
  `).join("");
}

function kitchenRows() {
  return state.kitchen.data.tickets.map(ticket => `
    <div class="list-item">
      <div>
        <strong>${ticket.station}</strong>
        <p>${ticket.item} - ${ticket.elapsedMinutes} minutes elapsed</p>
      </div>
      <span class="badge">${ticket.priority}</span>
    </div>
  `).join("");
}

function inventoryRows() {
  return state.inventory.data.ingredients.map(ingredient => `
    <div class="list-item">
      <div>
        <strong>${ingredient.name}</strong>
        <p>${ingredient.quantity} ${ingredient.unit} in stock</p>
      </div>
      <span class="badge">${ingredient.status}</span>
    </div>
  `).join("");
}

function tableCards() {
  const tables = state.tables.data.tables.filter(table =>
    state.tableFilter === "all" ? true : table.status === state.tableFilter
  );
  return tables
    .map(table => `
      <div class="table-card ${table.status}">
        <strong>Table ${table.number}</strong>
        <span>${table.seats} seats</span>
        <small>${table.status}</small>
      </div>
    `)
    .join("");
}

function renderOperations() {
  renderList("#orders-list", state.orders.data.orders, order => `
    <div class="list-item">
      <div>
        <strong>${order.id} - Table ${order.table}</strong>
        <p>${order.items.join(", ")}</p>
      </div>
      <span class="badge">${order.status}</span>
    </div>
  `);

  renderList("#reservations-list", state.reservations.data.reservations, reservation => `
    <div class="list-item">
      <div>
        <strong>${reservation.guest}</strong>
        <p>${reservation.time} - ${reservation.partySize} guests - ${reservation.note}</p>
      </div>
      <span class="badge">${reservation.status}</span>
    </div>
  `);

  renderList("#kitchen-list", state.kitchen.data.tickets, ticket => `
    <div class="list-item">
      <div>
        <strong>${ticket.station}</strong>
        <p>${ticket.item} - ${ticket.elapsedMinutes} minutes elapsed</p>
      </div>
      <span class="badge">${ticket.priority}</span>
    </div>
  `);

  renderList("#inventory-list", state.inventory.data.ingredients, ingredient => `
    <div class="list-item">
      <div>
        <strong>${ingredient.name}</strong>
        <p>${ingredient.quantity} ${ingredient.unit} in stock</p>
      </div>
      <span class="badge">${ingredient.status}</span>
    </div>
  `);
}

function renderTables() {
  document.querySelector("#table-grid").innerHTML = tableCards();
  if (state.activeService === "tables") renderServicePage();
}

function renderInsights() {
  const paymentTotal = state.payments.data.settlements.reduce((sum, item) => sum + item.amount, 0);
  const topGuest = state.loyalty.data.members[0];
  const latestNotification = state.notifications.data.events[0];
  const topReview = state.reviews.data.reviews[0];
  const occupiedTables = state.tables.data.tables.filter(table => table.status === "occupied").length;
  const servedOrders = state.orders.data.orders.filter(order => order.status === "served").length;

  document.querySelector("#hero-metric").textContent =
    state.kitchen.data.tickets.length + state.orders.data.orders.filter(order => order.status !== "served").length;

  document.querySelector("#insight-grid").innerHTML = `
    <div class="insight-card">
      <strong>${money(paymentTotal)}</strong>
      <p>settled by the payments service this dinner period.</p>
    </div>
    <div class="insight-card">
      <strong>${occupiedTables} occupied tables</strong>
      <p>reported by the tables service in the dining room.</p>
    </div>
    <div class="insight-card">
      <strong>${servedOrders} served orders</strong>
      <p>advanced through the dynamic kitchen workflow.</p>
    </div>
    <div class="insight-card">
      <strong>${topGuest.name}</strong>
      <p>${topGuest.tier} member with ${topGuest.points} loyalty points.</p>
    </div>
    <div class="insight-card">
      <strong>${latestNotification.channel}</strong>
      <p>${latestNotification.message}</p>
    </div>
    <div class="insight-card">
      <strong>${topReview.rating}/5 from ${topReview.guest}</strong>
      <p>${topReview.comment}</p>
    </div>
  `;
}

function serviceBody(name) {
  if (name === "menu") {
    return `<div class="menu-grid">${renderMenuCards(state.menu.data.items)}</div>`;
  }

  if (name === "orders") {
    return `
      <div class="split-pane">
        <form class="control-form" id="service-order-form">
          <label>Table<input id="service-order-table" type="number" min="1" max="20" value="4" /></label>
          <div class="cart-list" id="service-cart-list">${cartMarkup("Add dishes from the menu page first.")}</div>
          <button type="submit">Send order</button>
        </form>
        <div class="stack-list">${orderRows()}</div>
      </div>
    `;
  }

  if (name === "reservations") {
    return `
      <div class="split-pane">
        <form class="control-form" id="service-reservation-form">
          <label>Guest<input id="service-reservation-guest" type="text" value="Derick" /></label>
          <label>Time<input id="service-reservation-time" type="time" value="19:30" /></label>
          <label>Party size<input id="service-reservation-party" type="number" min="1" max="12" value="2" /></label>
          <label>Note<input id="service-reservation-note" type="text" value="Window table preferred" /></label>
          <button type="submit">Book table</button>
        </form>
        <div class="stack-list">${reservationRows()}</div>
      </div>
    `;
  }

  if (name === "tables") {
    return `
      <div class="section-action-row">
        <label class="inline-select">Filter tables
          <select id="service-table-filter">
            <option value="all" ${state.tableFilter === "all" ? "selected" : ""}>All</option>
            <option value="available" ${state.tableFilter === "available" ? "selected" : ""}>Available</option>
            <option value="occupied" ${state.tableFilter === "occupied" ? "selected" : ""}>Occupied</option>
            <option value="cleaning" ${state.tableFilter === "cleaning" ? "selected" : ""}>Cleaning</option>
          </select>
        </label>
      </div>
      <div class="table-grid">${tableCards()}</div>
    `;
  }

  if (name === "kitchen") {
    return `
      <div class="section-action-row">
        <button type="button" id="service-advance-kitchen">Advance kitchen</button>
      </div>
      <div class="stack-list">${kitchenRows()}</div>
    `;
  }

  if (name === "inventory") {
    return `<div class="stack-list">${inventoryRows()}</div>`;
  }

  if (name === "payments") {
    return `
      <div class="stack-list">
        ${state.payments.data.settlements.map(payment => `
          <div class="list-item">
            <div>
              <strong>${payment.id} - ${money(payment.amount)}</strong>
              <p>Table ${payment.table} paid by ${payment.method}</p>
            </div>
            <span class="badge">${payment.status}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  if (name === "loyalty") {
    return `
      <div class="stack-list">
        ${state.loyalty.data.members.map(member => `
          <div class="list-item">
            <div>
              <strong>${member.name}</strong>
              <p>${member.points} points earned from recent visits</p>
            </div>
            <span class="badge">${member.tier}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  if (name === "notifications") {
    return `
      <div class="stack-list">
        ${state.notifications.data.events.map(event => `
          <div class="list-item">
            <div>
              <strong>${event.channel}</strong>
              <p>${event.message}</p>
            </div>
            <span class="badge">${event.status}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  return `
    <div class="split-pane">
      <form class="control-form" id="service-review-form">
        <label>Guest<input id="service-review-guest" type="text" value="Derick" /></label>
        <label>Rating<input id="service-review-rating" type="number" min="1" max="5" value="5" /></label>
        <label>Comment<input id="service-review-comment" type="text" value="The service page is easy to use." /></label>
        <button type="submit">Add review</button>
      </form>
      <div class="stack-list">
        ${state.reviews.data.reviews.map(review => `
          <div class="list-item">
            <div>
              <strong>${review.guest}</strong>
              <p>${review.comment}</p>
            </div>
            <span class="badge">${review.rating}/5</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderServicePage() {
  const service = serviceCatalog[state.activeService];
  document.querySelector("#service-detail").innerHTML = `
    <article class="service-page">
      <div class="service-page-copy">
        <p class="eyebrow">${service.title}</p>
        <h3>${service.view}</h3>
        <p>${service.description}</p>
        <span>${service.accent}</span>
      </div>
      <img class="service-hero-image" src="${service.image}" alt="${service.title}" />
      <div class="service-page-body">${serviceBody(state.activeService)}</div>
    </article>
  `;
  bindServiceForms();
}

function bindServiceForms() {
  document.querySelector("#service-order-form")?.addEventListener("submit", submitServiceOrder);
  document.querySelector("#service-reservation-form")?.addEventListener("submit", submitServiceReservation);
  document.querySelector("#service-review-form")?.addEventListener("submit", submitServiceReview);
  document.querySelector("#service-advance-kitchen")?.addEventListener("click", advanceKitchen);
  document.querySelector("#service-table-filter")?.addEventListener("change", event => {
    state.tableFilter = event.target.value;
    document.querySelector("#table-filter").value = state.tableFilter;
    renderTables();
  });
}

function renderAll() {
  renderServiceStrip();
  renderMenu();
  renderCart();
  renderOperations();
  renderTables();
  renderServicePage();
  renderInsights();

  const time = state.lastRefresh
    ? state.lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--";
  setStatus(`${services.length} services healthy - ${time}`);
}

async function refresh() {
  await fetchAllServices();
  renderAll();
}

async function createOrder(table) {
  await serviceRequest("orders", {
    method: "POST",
    body: JSON.stringify({ table, items: state.cart })
  });

  state.cart = [];
  await refresh();
  setStatus("Order sent to kitchen");
}

async function submitOrder(event) {
  event.preventDefault();
  if (!state.cart.length) {
    setStatus("Add at least one menu item");
    return;
  }
  await createOrder(document.querySelector("#order-table").value);
}

async function submitServiceOrder(event) {
  event.preventDefault();
  if (!state.cart.length) {
    setStatus("Add dishes from the menu page first");
    return;
  }
  await createOrder(document.querySelector("#service-order-table").value);
}

async function createReservation(payload) {
  await serviceRequest("reservations", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  await refresh();
  setStatus("Reservation booked");
}

async function submitReservation(event) {
  event.preventDefault();
  await createReservation({
    guest: document.querySelector("#reservation-guest").value,
    time: document.querySelector("#reservation-time").value,
    partySize: document.querySelector("#reservation-party").value,
    note: document.querySelector("#reservation-note").value
  });
}

async function submitServiceReservation(event) {
  event.preventDefault();
  await createReservation({
    guest: document.querySelector("#service-reservation-guest").value,
    time: document.querySelector("#service-reservation-time").value,
    partySize: document.querySelector("#service-reservation-party").value,
    note: document.querySelector("#service-reservation-note").value
  });
}

async function createReview(payload) {
  await serviceRequest("reviews", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  await refresh();
  setStatus("Review added");
}

async function submitReview(event) {
  event.preventDefault();
  await createReview({
    guest: document.querySelector("#review-guest").value,
    rating: document.querySelector("#review-rating").value,
    comment: document.querySelector("#review-comment").value
  });
}

async function submitServiceReview(event) {
  event.preventDefault();
  await createReview({
    guest: document.querySelector("#service-review-guest").value,
    rating: document.querySelector("#service-review-rating").value,
    comment: document.querySelector("#service-review-comment").value
  });
}

async function advanceKitchen() {
  await serviceRequest("kitchen", { method: "PATCH", body: JSON.stringify({ action: "advance" }) });
  await refresh();
  setStatus("Kitchen advanced");
}

function bindEvents() {
  document.addEventListener("click", event => {
    const service = event.target.closest("[data-service]")?.dataset.service;
    const addItem = event.target.dataset.addItem;
    const removeItem = event.target.dataset.removeItem;

    if (service) {
      state.activeService = service;
      renderServiceStrip();
      renderServicePage();
      document.querySelector("#service-detail").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (addItem) addToCart(addItem);
    if (removeItem) removeFromCart(Number(removeItem));
  });

  document.querySelector("#order-form").addEventListener("submit", submitOrder);
  document.querySelector("#reservation-form").addEventListener("submit", submitReservation);
  document.querySelector("#review-form").addEventListener("submit", submitReview);
  document.querySelector("#advance-kitchen").addEventListener("click", advanceKitchen);
  document.querySelector("#table-filter").addEventListener("change", event => {
    state.tableFilter = event.target.value;
    renderTables();
  });
}

async function boot() {
  renderServiceStrip();
  bindEvents();

  try {
    await refresh();
    window.setInterval(refresh, 30000);
  } catch (error) {
    setStatus("Service error");
    document.querySelector("#operations").insertAdjacentHTML(
      "afterbegin",
      `<article class="panel wide"><strong>Could not load platform data.</strong><p>${error.message}</p></article>`
    );
  }
}

boot();
