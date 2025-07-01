const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const sendTicketEmail = require('./emailService');
const sentEmails = require('./sentEmails.json');

const QUEUE_FILE = path.join(__dirname, 'sentEmails.json');

const loadSentOrders = () => {
    try {
        const raw = fs.readFileSync(QUEUE_FILE, 'utf8');
        return JSON.parse(raw);
    } catch {
        return [];
    }
};

const saveSentOrders = (orderIds) => {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(orderIds, null, 2));
};

const checkAndSendEmails = async () => {
    const sentOrderIds = loadSentOrders();

    const [rows] = await pool.query(
        `SELECT order_id FROM ticket_orders WHERE status = 'paid' ORDER BY created_at DESC`
    );

    for (const row of rows) {
        const orderId = row.order_id;
        if (sentOrderIds.includes(orderId)) continue;

        const success = await sendTicketEmail(orderId);
        if (success) {
            sentOrderIds.push(orderId);
            saveSentOrders(sentOrderIds);
        }
    }
};

module.exports = { checkAndSendEmails };
