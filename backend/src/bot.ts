import { Telegraf, Context } from 'telegraf';
import { Firestore } from 'firebase-admin/firestore';

/**
 * Data model for a customer.
 */
interface Customer {
  name: string;
  mobile: string;
  services: string[];
  onboardingDate: Date;
}

/**
 * Data model for transactions (income or expense).
 */
interface Transaction {
  type: 'INCOME' | 'EXPENSE';
  date: Date;
  customer?: string;
  amount: number;
  paymentMode: string;
  channel?: number;
  expenseType?: string;
  period?: string;
}

// Map to track pending statistic queries keyed by chat ID. When a user sends
// `income`, `expense` or `profit`, we store the type here until we receive
// a date range.
const pendingStats: Record<number, string> = {};

/**
 * Initialise the Telegram bot and register handlers.
 *
 * @param db Firestore instance for persistence
 */
export async function initBot(db: Firestore): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN not set; bot not started');
    return;
  }
  const bot = new Telegraf(token);

  bot.start(async (ctx) => {
    await ctx.reply('Welcome to the Finance Tracker bot! Send your income or expense details as per the specified formats.');
  });

  bot.command('help', async (ctx) => {
    const message =
      'Here are the supported commands and formats:\n' +
      '\n' +
      '*Income entry:*\n' +
      '`YYYY-MM-DD: Customer: Amount: Payment Mode: Channel Selling Rate:`\n' +
      '\n' +
      '*Expense entry:*\n' +
      '`Expense YYYY-MM-DD: Expense Type: Amount: Mode of Payment: Period of Payment:`\n' +
      '\n' +
      '*New customer:*\n' +
      '`Name: Mob: Service: Date:`\n' +
      '\n' +
      '*Statistics:* Send `income`, `expense` or `profit` and then specify a date range in the format `YYYY-MM-DD to YYYY-MM-DD`.';
    await ctx.replyWithMarkdown(message);
  });

  // Generic text handler
  bot.on('text', async (ctx) => {
    const text = ctx.message?.text?.trim();
    if (!text) return;
    const chatId = ctx.chat?.id;

    // If a stat query is pending, interpret text as date range
    if (chatId && pendingStats[chatId]) {
      await handleStatsRange(ctx, db, pendingStats[chatId], text);
      delete pendingStats[chatId];
      return;
    }

    const lower = text.toLowerCase();
    if (lower === 'income' || lower === 'expense' || lower === 'profit') {
      if (chatId) {
        pendingStats[chatId] = lower;
        await ctx.reply('Please provide the date range in the format `YYYY-MM-DD to YYYY-MM-DD`.');
      }
      return;
    }

    // Try parse transaction
    const tx = parseTransaction(text);
    if (tx) {
      await handleTransaction(ctx, db, tx);
      return;
    }
    // Try parse new customer
    const cust = parseNewCustomer(text);
    if (cust) {
      await handleNewCustomer(ctx, db, cust);
      return;
    }
    await ctx.reply('Unrecognised input. Type /help for instructions.');
  });

  await bot.launch();
  console.log('Telegram bot started');
}

/**
 * Parse a potential income/expense text into a Transaction object.
 */
function parseTransaction(text: string): Transaction | null {
  // Income: YYYY-MM-DD: Customer: Amount: Payment Mode: Channel Selling Rate:
  const income = /^(\d{4}-\d{2}-\d{2})\s*:\s*([^:]+)\s*:\s*(\d+(?:\.\d+)?)\s*:\s*([^:]+)\s*:\s*(\d+(?:\.\d+)?)\s*:?$/;
  const matchIncome = income.exec(text);
  if (matchIncome) {
    const [, dateStr, customer, amountStr, mode, channelStr] = matchIncome;
    return {
      type: 'INCOME',
      date: new Date(dateStr),
      customer: customer.trim(),
      amount: parseFloat(amountStr),
      paymentMode: mode.trim(),
      channel: parseFloat(channelStr),
    };
  }
  // Expense: Expense YYYY-MM-DD: Expense Type: Amount: Mode of Payment: Period of Payment:
  const expense = /^Expense\s+(\d{4}-\d{2}-\d{2})\s*:\s*([^:]+)\s*:\s*(\d+(?:\.\d+)?)\s*:\s*([^:]+)\s*:\s*([^:]+)\s*:?$/i;
  const matchExpense = expense.exec(text);
  if (matchExpense) {
    const [, dateStr, type, amountStr, mode, period] = matchExpense;
    return {
      type: 'EXPENSE',
      date: new Date(dateStr),
      amount: parseFloat(amountStr),
      paymentMode: mode.trim(),
      expenseType: type.trim(),
      period: period.trim(),
    };
  }
  return null;
}

/**
 * Parse a potential new customer entry into a Customer object.
 */
function parseNewCustomer(text: string): Customer | null {
  const pattern = /^([^:]+)\s*:\s*(\+?\d{10,15})\s*:\s*([^:]+)\s*:\s*(\d{4}-\d{2}-\d{2})\s*:?$/;
  const match = pattern.exec(text);
  if (!match) return null;
  const [, name, mobile, service, dateStr] = match;
  return {
    name: name.trim(),
    mobile: mobile.trim(),
    services: [service.trim()],
    onboardingDate: new Date(dateStr),
  };
}

/**
 * Handle saving of income or expense transactions.
 */
async function handleTransaction(ctx: Context, db: Firestore, tx: Transaction) {
  try {
    if (tx.type === 'INCOME') {
      // Verify customer exists
      const customerRef = db.collection('customers').doc(tx.customer!);
      const doc = await customerRef.get();
      if (!doc.exists) {
        await ctx.reply(`Customer \`${tx.customer}\` not found. Please create the customer first (Name: Mob: Service: Date:).`);
        return;
      }
      await db.collection('transactions').add({
        type: 'INCOME',
        date: tx.date,
        customer: tx.customer,
        amount: tx.amount,
        paymentMode: tx.paymentMode,
        channel: tx.channel,
        createdAt: new Date(),
      });
      await ctx.reply('Income recorded successfully.');
    } else {
      await db.collection('expenses').add({
        date: tx.date,
        expenseType: tx.expenseType,
        amount: tx.amount,
        paymentMode: tx.paymentMode,
        period: tx.period,
        createdAt: new Date(),
      });
      await ctx.reply('Expense recorded successfully.');
    }
  } catch (err) {
    console.error('Transaction error', err);
    await ctx.reply('An error occurred while recording the transaction.');
  }
}

/**
 * Handle new customer creation. Adds record to customers collection and
 * optionally to whatsapp_customers when service includes WhatsApp.
 */
async function handleNewCustomer(ctx: Context, db: Firestore, customer: Customer) {
  try {
    const docRef = db.collection('customers').doc(customer.name);
    const doc = await docRef.get();
    if (doc.exists) {
      await ctx.reply('A customer with that name already exists.');
      return;
    }
    await docRef.set({
      name: customer.name,
      mobile: customer.mobile,
      services: customer.services,
      onboardingDate: customer.onboardingDate,
      createdAt: new Date(),
    });
    // If service includes WhatsApp, create entry in whatsapp_customers
    const hasWhatsApp = customer.services.some((svc) => /whatsapp/i.test(svc));
    if (hasWhatsApp) {
      const cycleDays = 30;
      const nextDue = new Date(customer.onboardingDate.getTime());
      nextDue.setDate(nextDue.getDate() + cycleDays);
      await db.collection('whatsapp_customers').add({
        customerName: customer.name,
        mobile: customer.mobile,
        plan: 'Monthly',
        status: 'ACTIVE',
        onboardingDate: customer.onboardingDate,
        nextDueDate: nextDue,
        createdAt: new Date(),
      });
    }
    await ctx.reply('Customer created successfully.');
  } catch (err) {
    console.error('Customer creation error', err);
    await ctx.reply('Failed to create customer.');
  }
}

/**
 * Handle statistic commands once the date range has been provided.
 */
async function handleStatsRange(ctx: Context, db: Firestore, type: string, rangeText: string) {
  const match = rangeText.match(/^(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})$/);
  if (!match) {
    await ctx.reply('Invalid date range. Please use `YYYY-MM-DD to YYYY-MM-DD`.');
    return;
  }
  const [, startStr, endStr] = match;
  const startDate = new Date(startStr);
  const endDate = new Date(endStr);
  endDate.setHours(23, 59, 59, 999);
  try {
    if (type === 'income') {
      const snap = await db.collection('transactions')
        .where('type', '==', 'INCOME')
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .get();
      let total = 0;
      snap.forEach((doc) => { total += doc.data().amount; });
      await ctx.reply(`Total income from ${startStr} to ${endStr}: ₹${total.toFixed(2)}`);
    } else if (type === 'expense') {
      const snap = await db.collection('expenses')
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .get();
      let total = 0;
      snap.forEach((doc) => { total += doc.data().amount; });
      await ctx.reply(`Total expenses from ${startStr} to ${endStr}: ₹${total.toFixed(2)}`);
    } else {
      // profit
      const incomeSnap = await db.collection('transactions')
        .where('type', '==', 'INCOME')
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .get();
      const expenseSnap = await db.collection('expenses')
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .get();
      let incomeTotal = 0;
      incomeSnap.forEach((doc) => { incomeTotal += doc.data().amount; });
      let expenseTotal = 0;
      expenseSnap.forEach((doc) => { expenseTotal += doc.data().amount; });
      const profit = incomeTotal - expenseTotal;
      await ctx.reply(`Profit from ${startStr} to ${endStr}: ₹${profit.toFixed(2)}`);
    }
  } catch (err) {
    console.error('Stats error', err);
    await ctx.reply('Failed to compute statistics.');
  }
}
