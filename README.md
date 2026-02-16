# Finance Tracker Project

This repository contains the **Finance Tracker** application for Social Berries. The project consolidates all aspects of income and expense tracking, service management, WhatsApp subscription renewals and analytics into a single, secure system. It consists of a React‑based frontend and a Node.js backend integrated with Firebase for authentication and persistence.

## Key Features and Business Rules

### 1. User Access & Roles

- **Email whitelisting:** Only `hello@socialberries.in` and `rahul@socialberries.in` can log in to the web interface. This is enforced by Firebase Authentication and Firestore rules.
- **Telegram bot access:** The Telegram bot is restricted to a private group (ID supplied by the owner during deployment).

### 2. Service Renewal Logic

For WhatsApp services, renewal dates are always based on the original onboarding date plus the service cycle (for example, every 30 days for monthly plans). Payment dates do **not** change the recurring schedule.

### 3. Transactions & Customer Entry

Transactions (income and expense) follow structured message formats. When a user logs a transaction through the bot or the web UI, the system checks whether the customer exists:

- **Income:**
  - `Date` – transaction date
  - `Customer` – existing customer identifier
  - `Amount` – payment amount
  - `Payment Mode` – cash, UPI, bank transfer, etc.
  - `Channel` – selling rate (for unit‑profit services)
- **New customer creation:** If the customer is not found, the bot requests the following information and automatically creates a customer record:
  - `Name`
  - `Mob` – mobile number
  - `Service` – the service subscribed to (e.g., WhatsApp, Telegram, voice calls, etc.)
  - `Date` – onboarding date
- **Expense:**
  - `Expense Date`
  - `Expense Type` – e.g., Salary, CRM, Ads, Workspace, Mobile Bill
  - `Amount`
  - `Mode of Payment`
  - `Period of Payment` – payment cycle (e.g., monthly, yearly)

### 4. Service Master & Profit Model

Each service is defined in the **Service Master**. Services can be of two types:

1. **Unit‑profit service:** Profit is calculated as `(Selling Rate per Unit – Base Cost per Unit) × Quantity` (e.g., voice call at ₹70.70 per unit with a base cost of ₹0.25 per unit).
2. **Lump‑sum profit service:** The entire payment is considered profit.

The Service Master defines the profit model, rates, and costs for every service.

### 5. Multi‑Service Customer Structure

A customer can subscribe to multiple services. The frontend displays service cards (tags) side by side for each customer, allowing users to add or edit services individually.

### 6. WhatsApp Customer Master Synchronisation

When a customer is created with a WhatsApp service (via the bot or web):

1. A record is added to the **customers** collection (main master).
2. A corresponding entry is added to **whatsapp_customers** with the fields:
   - `customerName` – name
   - `mobile` – phone number
   - `plan` – e.g., `Monthly` or `Yearly`
   - `status` – `ACTIVE` or `EXPIRED`
   - `onboardingDate` – date the customer started the service
   - `nextDueDate` – onboarding date + cycle (30 days for monthly plans)

Future WhatsApp renewals are tracked solely via the `whatsapp_customers` collection. If an existing customer adds a WhatsApp service later, the corresponding `whatsapp_customers` entry is created or updated.

### 7. Bot Features

- **Command parsing:** The bot interprets income/expense messages according to the specified formats and logs the data accordingly.
- **Statistics:** Users can request income, expense or profit summaries for a date range, and the bot responds with the relevant totals.
- **Due reminders:** The bot monitors all active WhatsApp customers and sends a reminder to the group two days before the due date.
- **Customer addition:** If a transaction mentions an unknown customer, the bot collects the required data and automatically adds the new customer to both the `customers` and `whatsapp_customers` collections (when applicable).

### 8. Dashboard & Frontend

The React frontend provides:

- Statistical cards, tables and charts summarising income, expenses and profits. Users can filter by date range, customer, service or payment mode.
- A **Customer Master** page to add customers (editing services only, no delete functionality).
- A **Service Master** page to define services and profit logic.
- An **Expense Master** page to manage expense categories.
- A **WhatsApp Master** page listing all WhatsApp customers, their statuses, onboarding dates and next due dates. A **Renew** button adds the cycle period to the customer’s `nextDueDate`.

### 9. Security & Best Practices

- Firestore rules restrict access to the two authorised email addresses for the web interface. The Telegram bot uses an admin account.
- Secrets such as API keys and webhook tokens are stored in environment variables and never checked into source control.
- No customer deletions are permitted; records remain in place even if a customer becomes inactive.

## Project Structure

```
finance_tracker/
├── backend/              # Node.js/Express backend for bot and API endpoints
│   ├── package.json
│   ├── src/
│   │   ├── index.ts      # Entry point
│   │   ├── bot.ts        # Telegram/WhatsApp bot logic
│   │   ├── services/
│   │   │   └── serviceMaster.ts
│   │   ├── models/
│   │   │   ├── customer.ts
│   │   │   ├── transaction.ts
│   │   │   └── whatsappCustomer.ts
│   │   └── ...
│   └── .env.example     # Environment variable definitions
├── frontend/             # React application
│   ├── package.json
│   └── src/
│       ├── App.tsx
│       ├── components/
│       └── pages/
└── firestore.rules       # Firestore security rules
```

> **Note:** This repository currently contains scaffolding files to get you started. Implementation of the complete functionality described above is an ongoing process. Refer to the `src` files in the backend and frontend directories for detailed code comments and TODOs.
